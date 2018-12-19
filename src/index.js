/* eslint-disable no-underscore-dangle, import/no-mutable-exports */
import React, { useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { combineReducers, bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import * as R from 'ramda';
import { getDisplayName } from './utils';
import {
  StoreContext,
  useDerivedState,
  useDispatchableActions,
  usePrevious,
  useOldIf,
} from './hooks';
import Loading from './utils/components/Loading';
import generateResourcesDucks from './ducks';

let resourceTypes;
let actionTypesOf;
let actionCreatorsOf;
let gettersOf;
let epics;
let reducer;
let withResources;
let withResourcesGetters;
let useResources;

export {
  resourceTypes,
  actionTypesOf,
  actionCreatorsOf,
  gettersOf,
  epics,
  reducer,
  withResources,
  withResourcesGetters,
  StoreContext,
  useResources,
};

export default ({ resourceTypes: _resourceTypes = {}, reduxPath = [], DM }) => {
  const resourcesDucks = generateResourcesDucks({ reduxPath, DM })(_resourceTypes);
  resourceTypes = _resourceTypes;
  actionTypesOf = R.pipe(
    R.prop(R.__, resourcesDucks),
    R.prop('actionTypes'),
  );
  actionCreatorsOf = R.pipe(
    R.prop(R.__, resourcesDucks),
    R.prop('actionCreators'),
  );
  gettersOf = R.pipe(
    R.prop(R.__, resourcesDucks),
    R.prop('getters'),
  );
  epics = R.pipe(
    R.map(R.prop('epics')),
    R.values,
    R.flatten,
  )(resourcesDucks);
  reducer = combineReducers({ ...R.map(R.prop('reducer'), resourcesDucks) });

  const mergeOperations = (operations) => {
    const groupByResourceTypeNMethod = R.pipe(
      R.groupBy(R.prop('resourceType')),
      R.map(R.groupBy(R.prop('method'))),
    );
    const mergeInputNOptions = R.map(R.map(R.reduce(R.mergeDeepRight, {})));
    const dropMethodlessIfHasMethodful = R.map(
      R.when(
        R.pipe(
          R.keys,
          R.length,
          R.lt(1),
        ),
        R.omit(['undefined']),
      ),
    );
    const extract = R.pipe(
      R.values,
      R.map(R.values),
      R.flatten,
    );

    return R.pipe(
      groupByResourceTypeNMethod,
      mergeInputNOptions,
      dropMethodlessIfHasMethodful,
      extract,
    )(operations);
  };
    const internalProps = ['data', 'actionCreators'];
    let prevData = {};
    @connect(
      // state => ({
      //   data: R.fromPairs(
      //     R.map(
      //       ({ resourceType }) => [resourceType, gettersOf(resourceType).getState(state)],
      //       operations,
      //     ),
      //   ),
      // }),
      (state) => {
        const nextData = R.fromPairs(
          R.map(
            ({ resourceType }) => [resourceType, gettersOf(resourceType).getState(state)],
            operations,
          ),
        );
        // console.log('%cnextData', 'font-size: 12px; color: #00b3b3', nextData);
        // Shallow comparison
        const changed = R.pipe(
          R.keys,
          R.any(k => prevData[k] !== nextData[k]),
        )(nextData);
        // console.log('%cchanged', 'font-size: 12px; color: #00b3b3', changed);
        // eslint-disable-next-line
        return {
          data: changed ? (prevData = nextData) : prevData,
        };
      },
      dispatch => ({
        actionCreators: R.fromPairs(
          R.map(
            ({ resourceType }) => [
              resourceType,
              bindActionCreators(actionCreatorsOf(resourceType), dispatch),
            ],
            operations,
          ),
        ),
      }),
    )
    class WithResource extends React.Component {
      static displayName = `WithResource(${getDisplayName(ComposedComponent)})`;

      static propTypes = {
        data: PropTypes.object.isRequired,
        actionCreators: PropTypes.object.isRequired,
      };

      componentDidMount() {
        this.mounted = true;
        const { actionCreators } = this.props;
        /* NOTE: Prevent internal props (i.e. data & actionCreators)
          from being passed to compute input */
        const externalProps = R.omit(internalProps, this.props);
        R.forEach(
          ({
            resourceType,
            method,
            input,
            options: { runOnDidMount = false, useLast, reset } = {},
          }) => {
            reset && actionCreators[resourceType].reset({ cargo: { method } });
            // TODO: Change name to run/execute
            runOnDidMount
              && (R.is(Function, input)
                ? actionCreators[resourceType].ajax({
                  cargo: {
                    method,
                    input: (this[`${resourceType}.${method}.input`] = input(externalProps)),
                  },
                  options: { useLast },
                })
                : actionCreators[resourceType].ajax({
                  cargo: { method, input },
                  options: { useLast },
                }));
          },
        )(operations);
      }

      componentDidUpdate() {
        const { actionCreators } = this.props;
        R.map(
          ({
            resourceType, method, input, options: { runOnInputChange = false, useLast } = {},
          }) => runOnInputChange
            && R.is(Function, input)
            && do {
              const externalProps = R.omit(internalProps, this.props);
              const computedInput = input(externalProps);
              // Deep comparison
              JSON.stringify(this[`${resourceType}.${method}.input`])
                !== JSON.stringify(computedInput)
                && actionCreators[resourceType].ajax({
                  cargo: {
                    method,
                    input: (this[`${resourceType}.${method}.input`] = computedInput),
                  },
                  options: { useLast },
                });
            },
          operations,
        );
      }

      componentWillUnmount() {
        this.mounted = false;
      }

      render() {
        const { data, actionCreators } = this.props;

        const methodfulOperations = R.filter(({ method }) => !!method)(operations);

        const status = {
          loading: R.reduce(
            R.or,
            false,
            R.map(({ resourceType, method, options: { runOnDidMount = false, reset } = {} }) => {
              switch (true) {
                case !this.mounted && runOnDidMount:
                  return true;
                case !this.mounted && reset:
                  return null;
                default:
                  return R.path([resourceType, method, 'status', 'loading'], data);
              }
            })(methodfulOperations),
          ),
          success: R.reduce(
            R.and,
            true,
            R.map(({ resourceType, method, options: { runOnDidMount = false, reset } = {} }) => {
              switch (true) {
                case !this.mounted && runOnDidMount:
                  return null;
                case !this.mounted && reset:
                  return null;
                default:
                  return R.pathOr(true, [resourceType, method, 'status', 'success'], data);
              }
            })(methodfulOperations),
          ),
          error: R.pipe(
            R.map(({ resourceType, method, options: { runOnDidMount = false, reset } = {} }) => {
              switch (true) {
                case !this.mounted && runOnDidMount:
                  return null;
                case !this.mounted && reset:
                  return null;
                default:
                  return (
                    R.path([resourceType, method, 'status', 'error'], data)
                    && `${resourceType}.${method}`
                  );
              }
            }),
            R.filter(R.complement(R.either(R.isNil, R.isEmpty))),
            R.join(', '),
            R.unless(R.isEmpty, R.concat('Got error in ')),
          )(methodfulOperations),
        };

        const passedThroughProps = R.pipe(
          R.omit(['data', 'actionCreators']),
          R.merge(R.__, {
            [`${prefix}data`]: {
              ...this.props.data,
              status,
            },
            [`${prefix}actionCreators`]: actionCreators,
          }),
        )(this.props);

        // TODO: Consider rendering Loading on the first render

        return <ComposedComponent {...passedThroughProps} />;
      }
    }

    return WithResource;
  };

  withResourcesGetters = (ComposedComponent) => {
    class WithResourcesGetters extends React.Component {
      state = {
        fetching: true,
      };

      componentDidMount() {
        Promise.all(
          R.pipe(
            R.map(R.path(['getters', 'loaded'])),
            R.values,
          )(resourcesDucks),
        ).then(() => this.setState({ fetching: false }));
      }

      render() {
        const { fetching } = this.state;

        if (fetching) return <Loading />;

        const passedThroughProps = this.props;
        return <ComposedComponent {...passedThroughProps} />;
      }
    }

    return WithResourcesGetters;
  };

  const useOperationsWithPending = (operations) => {
    const prevOperations = usePrevious(operations, []);
    const operationsWithPending = R.map(
      R.pipe(
        R.juxt([
          ({
            resourceType, method, input, options: { autorun, reset },
          }) => ({
            run:
              autorun
              && R.pipe(
                R.find(R.whereEq({ resourceType, method })),
                R.prop('input'),
                R.complement(R.identical)(input),
              )(prevOperations),
            reset:
              ['once', 'always'].includes(reset)
              && R.pipe(
                R.find(R.whereEq({ resourceType, method })),
                R.path(['options', 'reset']),
                prevReset => (reset === 'once' && prevReset !== 'once') || reset === 'always',
              )(prevOperations),
          }),
          R.identity,
        ]),
        R.apply(R.assoc('pending')),
      ),
    )(operations);
    return operationsWithPending;
  };

  useResources = (rawOperations) => {
    const operations = mergeOperations(rawOperations);
    const methodfulOperations = R.filter(R.prop('method'))(operations);

    // console.log('%coperations', 'font-size: 12px; color: #00b3b3', operations);

    const hasSameRcSet = (prevOperations, nextOperations) => {
      const prevRcSet = new Set(R.map(R.prop('resourceType'))(prevOperations));
      const nextRcSet = new Set(R.map(R.prop('resourceType'))(nextOperations));
      return R.equals(prevRcSet, nextRcSet);
    };

    /* NOTE:
      We only re-connect to redux store if the computed set of resource types changes
    */
    const mapState = useCallback(
      state => R.pipe(
        R.map(({ resourceType }) => [resourceType, gettersOf(resourceType).getState(state)]),
        R.fromPairs,
      )(operations),
      [useOldIf(operations, hasSameRcSet, [])],
    );
    const bindDispatch = useCallback(
      dispatch => R.pipe(
        R.map(({ resourceType }) => [
          resourceType,
          bindActionCreators(actionCreatorsOf(resourceType), dispatch),
        ]),
        R.fromPairs,
      )(operations),
      [useOldIf(operations, hasSameRcSet, [])],
    );

    const data = useDerivedState(mapState);
    const actionCreators = useDispatchableActions(bindDispatch);
    const operationsWithPending = useOperationsWithPending(methodfulOperations);

    const status = {
      loading: R.reduce(
        R.or,
        false,
        R.map(
          ({ resourceType, method, pending: { run: pendingRun, reset: pendingReset } }) => !!pendingRun
            || (pendingReset
              ? null
              : R.pathOr(null, [resourceType, method, 'status', 'loading'], data)),
        )(operationsWithPending),
      ),
      success: R.reduce(
        R.and,
        true,
        R.map(({ resourceType, method, pending: { run: pendingRun, reset: pendingReset } }) => (pendingRun || pendingReset
          ? null
          : R.pathOr(null, [resourceType, method, 'status', 'success'], data)))(operationsWithPending),
      ),
      error: R.pipe(
        R.map(({ resourceType, method, pending: { run: pendingRun, reset: pendingReset } = {} }) => (pendingRun || pendingReset
          ? null
          : R.path([resourceType, method, 'status', 'error'], data)
              && `${resourceType}.${method}`)),
        R.reject(R.either(R.isNil, R.isEmpty)),
        R.join(', '),
        R.unless(R.isEmpty, R.concat('Got error in ')),
      )(operationsWithPending),
    };

    useEffect(() => {
      R.forEach(({ resourceType, method, pending: { reset: pendingReset } }) => {
        pendingReset && actionCreators[resourceType].reset({ cargo: { method } });
      })(operationsWithPending);
    });

    useEffect(() => {
      R.forEach(
        ({
          resourceType,
          method,
          input,
          options: { useLast } = {},
          pending: { run: pendingRun },
        }) => {
          pendingRun
            && actionCreators[resourceType].ajax({
              cargo: { method, input },
              options: { useLast },
            });
        },
      )(operationsWithPending);
    });

    // console.log('%cuseResources', 'font-size: 12px; color: #00b3b3', {
    //   data: {
    //     ...data,
    //     status,
    //   },
    //   actionCreators,
    // });

    return {
      data: {
        ...data,
        status,
      },
      actionCreators,
    };
  };

  return {
    resourceTypes,
    actionTypesOf,
    actionCreatorsOf,
    gettersOf,
    epics,
    reducer,
    withResources,
    withResourcesGetters,
    StoreContext,
    useResources,
  };
};
