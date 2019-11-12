/* rxjs & ramda support tree-shaking */
import { of, from } from 'rxjs';
import { filter, mergeMap, map, catchError } from 'rxjs/operators';
import { ofType } from 'redux-observable';
import * as R from 'ramda';
import update, { extend } from 'immutability-helper';
import hash from 'object-hash';
import { memoize } from './utils';

/* Extend update functionality */
extend('$auto', (value, object) => (object ? update(object, value) : update({}, value)));
extend('$autoArray', (value, object) => (object ? update(object, value) : update([], value)));

const createResourceDuck = ({ reduxPath, DM }) => (resourceType) => {
  /*
  **************************************************
    Action Types
  **************************************************
  */
  const actionTypes = {
    REGISTER: Symbol(`${resourceType}/REGISTER`),
    DEREGISTER: Symbol(`${resourceType}/DEREGISTER`),
    AJAX: Symbol(`${resourceType}/AJAX`),
    AJAX_SUCCESS: Symbol(`${resourceType}/AJAX_SUCCESS`),
    AJAX_FAILURE: Symbol(`${resourceType}/AJAX_FAILURE`),
    RESET: Symbol(`${resourceType}/RESET`),
    CLEAR_CACHE: Symbol(`${resourceType}/CLEAR_CACHE`),
  };

  /*
  **************************************************
    Action Creators
  **************************************************
  */
  const actionCreators = {
    register: payload => ({ type: actionTypes.REGISTER, payload }),
    deregister: payload => ({ type: actionTypes.DEREGISTER, payload }),
    ajax: payload => ({ type: actionTypes.AJAX, payload }),
    ajaxSuccess: payload => ({ type: actionTypes.AJAX_SUCCESS, payload }),
    ajaxFailure: payload => ({ type: actionTypes.AJAX_FAILURE, payload }),
    reset: payload => ({ type: actionTypes.RESET, payload }),
    clearCache: payload => ({ type: actionTypes.CLEAR_CACHE, payload }),
  };

  /*
  **************************************************
    Caching Mechanism
    Scope: per entire resource
    Opt-in: useLast (if last result is available in cache)
    Timeout: 15mins & session-based (manually done via RESET on new session)
  **************************************************
  */
  const CACHE_TIMEOUT = 900000;
  let fetch = memoize(DM[resourceType], { timeout: CACHE_TIMEOUT });

  /*
  **************************************************
    Epics
  **************************************************
  */
  const epics = [
    (action$, state$) => action$.pipe(
      ofType(actionTypes.REGISTER),
      // * action REGISTER flows through the reducer first
      filter(({ payload: { cargo: { method, input = {} }, options: { ajaxOnHotRegister } = {} } }) => (
        // * Run ajax when:
        // *   - ajaxOnHotRegister is specified or
        // *   - this is the first methodful operation to register, i.e. renderCount is 1
        // *   - or the last ajax failed
        ajaxOnHotRegister
        || (
          R.path(
            [].concat(reduxPath, [resourceType, method, hash(input), 'meta', 'renderCount']),
            state$.value,
          ) === 1
        ) || (
          R.path(
            [].concat(reduxPath, [resourceType, method, hash(input), 'status', 'success']),
            state$.value,
          ) === false
        )
      )),
      map(R.pipe(R.prop('payload'), actionCreators.ajax.bind(null))),
    ),
    (action$, state$) => action$.pipe(
      ofType(actionTypes.DEREGISTER),
      // * action DEREGISTER flows through the reducer first
      filter(({ payload: { cargo: { method, input = {} }, options: { resetOnLastDeregister } = {} } }) => (R.path(
        [].concat(reduxPath, [resourceType, method, hash(input), 'meta', 'renderCount']),
        state$.value,
      ) === 0) && resetOnLastDeregister),
      map(R.pipe(R.prop('payload'), actionCreators.reset.bind(null))),
    ),
    action$ => action$.pipe(
      ofType(actionTypes.AJAX),
      mergeMap(
        ({
          payload: {
            cargo, options: { useLast = false } = {}, onSuccess, onFailure,
          },
        }) => from(fetch(cargo, { memoize: { renew: !useLast } })).pipe(
          map((data) => {
            // * Update state first before triggering callback
            setTimeout(() => onSuccess?.({ cargo, data }), 0);
            return actionCreators.ajaxSuccess({ cargo, data });
          }),
          catchError((error) => {
            // * Update state first before triggering callback
            setTimeout(() => onFailure?.({ cargo, error }), 0);
            return of(actionCreators.ajaxFailure({ cargo, error }));
          }),
        ),
      ),
    ),
  ];

  /*
  **************************************************
    State Getters
  **************************************************
  */
  const getResource = R.path([].concat(reduxPath, resourceType));
  const getMethod = ({ root } = {}) => method => R.path([].concat(root ? reduxPath : [], [resourceType, method]));
  const getOperation = ({ root } = {}) => (method, inputObjOrHash = {}) => R.path([].concat(root ? reduxPath : [], [resourceType, method, typeof inputObjOrHash === 'string' ? inputObjOrHash : hash(inputObjOrHash)]));

  const getters = {
    getResource,
    getMethod,
    getOperation,
  };

  // eslint-disable-next-line
  /* IMPORTANT: Must use webpack.ContextReplacementPlugin to supply the correct context */
  getters.loaded = (async () => {
    try {
      const { default: resourceTypeGetters } = await import(/* webpackChunkName: 'rc-getters', webpackMode: 'lazy-once', webpackExclude:  /README.md/ */ `./getters/${resourceType}`);
      R.forEachObjIndexed((v, k) => {
        getters[k] = v;
      }, resourceTypeGetters);
      return true;
    } catch (error) {
      process.env.NODE_ENV === 'development'
        // eslint-disable-next-line
        && console.warn(
          `%cUnable to import getters for resource ${resourceType}`,
          'font-size: 12px; color: lightcoral',
          error,
        );
      return false;
    }
  })();

  /*
  **************************************************
    Reducer
  **************************************************
  */
  const initState = {
    // methods
    // [method]: {
    //   [hash(input)]: {
    //     input,
    //     status: { loading, success, error },
    //     meta: { renderCount, hot, lastAjaxSuccess, lastReset }
    //     data,
    //   }
    // }
  };

  const reducer = (state = initState, action) => {
    switch (action.type) {
      case actionTypes.REGISTER: {
        const {
          cargo: { method, input = {} },
        } = action.payload;
        const hashedInput = hash(input);

        return update(state, {
          [method]: {
            $auto: {
              [hashedInput]: {
                $auto: {
                  $merge: {
                    ...(state[method]?.[hashedInput]?.meta?.renderCount > 0 ? {}
                      : {
                        input,
                        status: { loading: null, success: null, error: null },
                      }
                    ),
                  },
                  meta: {
                    $auto: {
                      renderCount: R.ifElse(R.isNil, R.always(1), R.inc),
                    },
                  },
                },
              },
            },
          },
        });
      }
      case actionTypes.DEREGISTER: {
        const {
          cargo: { method, input = {} },
        } = action.payload;
        const hashedInput = hash(input);

        return update(state, {
          [method]: {
            $auto: {
              [hashedInput]: {
                $auto: {
                  meta: {
                    $auto: {
                      renderCount: R.ifElse(R.isNil, R.always(0), R.dec),
                      $merge: {
                        hot: state[method]?.[hashedInput]?.meta?.renderCount > 1,
                      },
                    },
                  },
                },
              },
            },
          },
        });
      }
      case actionTypes.AJAX: {
        const {
          cargo: { method, input = {} },
        } = action.payload;
        const hashedInput = hash(input);

        return update(state, {
          [method]: {
            $auto: {
              [hashedInput]: {
                $auto: {
                  $merge: {
                    status: { loading: true, success: null, error: null },
                  },
                },
              },
            },
          },
        });
      }
      case actionTypes.AJAX_SUCCESS: {
        const {
          cargo: { method, input = {} },
          data,
        } = action.payload;
        const hashedInput = hash(input);

        return update(state, {
          [method]: {
            $auto: {
              [hashedInput]: {
                $auto: {
                  $merge: {
                    status: { loading: false, success: true, error: '' },
                    data: data[method],
                  },
                  meta: {
                    $auto: {
                      $merge: {
                        hot: true,
                        lastAjaxSuccess: new Date(),
                      },
                    },
                  },
                },
              },
            },
          },
        });
      }
      case actionTypes.AJAX_FAILURE: {
        const {
          cargo: { method, input = {} },
          error,
        } = action.payload;
        const hashedInput = hash(input);

        return update(state, {
          [method]: {
            $auto: {
              [hashedInput]: {
                $auto: {
                  $merge: {
                    status: { loading: false, success: false, error },
                  },
                },
              },
            },
          },
        });
      }
      case actionTypes.RESET: {
        const {
          cargo: { method, input = {} },
        } = action.payload;
        const hashedInput = hash(input);

        return update(state, {
          [method]: {
            $auto: {
              [hashedInput]: {
                $set: {
                  input,
                  status: { loading: null, success: null, error: null },
                  meta: { lastReset: new Date() },
                },
              },
            },
          },
        });
      }
      case actionTypes.CLEAR_CACHE: {
        const { options: { timeout = CACHE_TIMEOUT } = {} } = action.payload;
        fetch = memoize(DM[resourceType], { timeout });
        return state;
      }
      default: {
        return state;
      }
    }
  };

  return {
    actionTypes,
    actionCreators,
    epics,
    getters,
    reducer,
  };
};

const generateResourcesDucks = config => R.pipe(
  R.values,
  R.juxt([R.identity, R.map(createResourceDuck(config))]),
  R.apply(R.zipObj),
);

export default generateResourcesDucks;
