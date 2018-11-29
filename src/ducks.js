/* rxjs & ramda support tree-shaking */
import { of, from } from 'rxjs';
import { mergeMap, map, catchError } from 'rxjs/operators';
import { ofType } from 'redux-observable';
import * as R from 'ramda';
import update from 'immutability-helper';
import { memoize } from './utils';

const createResourceDuck = ({ reduxPath, DM }) => (resourceType) => {
  /*
  **************************************************
    Action Types
  **************************************************
  */
  const actionTypes = {
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
    action$ => action$.pipe(
      ofType(actionTypes.AJAX),
      mergeMap(
        ({
          payload: {
            cargo, options: { useLast = false } = {}, onSuccess, onFailure,
          },
        }) => from(fetch(cargo, { memoize: { renew: !useLast } })).pipe(
          map((data) => {
            onSuccess && onSuccess({ cargo, data });
            return actionCreators.ajaxSuccess({ cargo, data });
          }),
          catchError((error) => {
            onFailure && onFailure({ cargo, error });
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
  const getState = R.path([].concat(reduxPath, resourceType));
  const getMethod = method => (from, root = true) => R.path([].concat(root ? reduxPath : [], [resourceType, method]), from);
  const getStatus = method => (from, root = true) => R.path([].concat(root ? reduxPath : [], [resourceType, method, 'status']), from);

  const getters = {
    getState,
    getMethod,
    getStatus,
  };

  // eslint-disable-next-line
  /* IMPORTANT: Must use webpack.ContextReplacementPlugin to supply the correct context */
  getters.loaded = (async () => {
    try {
      const {
        getters: resourceTypeGetters,
      } = await import(/* webpackChunkName: 'rc-getters', webpackMode: 'lazy-once' */ `./getters/${resourceType}`);
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
    //   status: { loading, success, error },
    //   ...data,
    // }
  };

  const reducer = (state = initState, action) => {
    switch (action.type) {
      case actionTypes.AJAX: {
        const {
          cargo: { method },
        } = action.payload;
        return update(state, {
          [method]: {
            [state[method] ? '$merge' : '$set']: {
              status: { loading: true, success: null, error: null },
            },
          },
        });
      }
      case actionTypes.AJAX_SUCCESS: {
        const {
          cargo: { method },
          data,
        } = action.payload;
        return update(state, {
          [method]: {
            [state[method] ? '$merge' : '$set']: {
              status: { loading: false, success: true, error: '' },
              ...data[method],
            },
          },
        });
      }
      case actionTypes.AJAX_FAILURE: {
        const {
          cargo: { method },
          error,
        } = action.payload;
        return update(state, {
          [method]: {
            [state[method] ? '$merge' : '$set']: {
              status: { loading: false, success: false, error },
            },
          },
        });
      }
      case actionTypes.RESET: {
        const {
          cargo: { method },
        } = action.payload;
        return update(state, {
          [method]: { $set: { status: { loading: null, success: null, error: null } } },
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
