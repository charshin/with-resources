/* eslint-disable no-underscore-dangle, import/no-mutable-exports */
import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { combineReducers, bindActionCreators } from 'redux';
import { connect, shallowEqual, useSelector, useDispatch } from 'react-redux';
import * as R from 'ramda';
import hash from 'object-hash';
import { getDisplayName } from './utils';
import { usePrevious } from './hooks';
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

  withResources = (rawOperations, { prefix = '' } = {}) => (ComposedComponent) => {
    const operations = mergeOperations(rawOperations);
    const internalProps = ['data', 'actionCreators'];
    let prevData = {};
    @connect(
      (state) => {
        const nextData = R.fromPairs(
          R.map(
            ({ resourceType }) => [resourceType, gettersOf(resourceType).getResource(state)],
            operations,
          ),
        );
        // eslint-disable-next-line
        return {
          data: shallowEqual(prevData, nextData) ? prevData : (prevData = nextData),
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
            resourceType, method, input = {}, options: { autorun, useLast, reset } = {},
          }) => {
            reset && actionCreators[resourceType].reset({ cargo: { method, input } });
            autorun
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
            resourceType, method, input = {}, options: { runOnInputChange = true, useLast } = {},
          }) => runOnInputChange
            && R.is(Function, input)
            && do {
              const externalProps = R.omit(internalProps, this.props);
              const prevInput = this[`${resourceType}.${method}.input`];
              const nextInput = input(externalProps);
              this[`${resourceType}.${method}.input`] = nextInput;
              shallowEqual(prevInput, nextInput)
                && actionCreators[resourceType].ajax({
                  cargo: {
                    method,
                    input: nextInput,
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
            R.map(({ resourceType, method, input = {}, options: { autorun, reset } = {} }) => {
              switch (true) {
                case !this.mounted && autorun:
                  return true;
                case !this.mounted && reset:
                  return null;
                default:
                  return R.pathOr(null, [resourceType, method, hash(input), 'status', 'loading'], data);
              }
            })(methodfulOperations),
          ),
          success: R.reduce(
            R.and,
            true,
            R.map(({ resourceType, method, input = {}, options: { autorun, reset } = {} }) => {
              switch (true) {
                case !this.mounted && autorun:
                  return null;
                case !this.mounted && reset:
                  return null;
                default:
                  return R.pathOr(null, [resourceType, method, hash(input), 'status', 'success'], data);
              }
            })(methodfulOperations),
          ),
          error: R.pipe(
            R.map(({ resourceType, method, input = {}, options: { autorun, reset } = {} }) => {
              switch (true) {
                case !this.mounted && autorun:
                  return null;
                case !this.mounted && reset:
                  return null;
                default:
                  return (
                    R.path([resourceType, method, hash(input), 'status', 'error'], data)
                    && `${resourceType}.${method}.${hash(input)}`
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

        // console.log('%cpassedThroughProps: ', 'font-size: 12px; color: #00b3b3', passedThroughProps);

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

  const useRegistry = (operations) => {
    const prevOperations = usePrevious(operations, []);
    const register = R.difference(operations, prevOperations);
    const deregister = R.difference(prevOperations, operations);
    return { register, deregister };
  };

  useResources = (rawOperations) => {
    const operations = R.uniqBy(R.omit(['options']))(rawOperations);
    const methodfulOperations = R.filter(R.prop('method'))(operations);
    const optionslessMethodfulOperations = R.map(R.omit(['options']))(methodfulOperations);

    // console.log('%coperations', 'font-size: 12px; color: lightcoral', operations);
    // console.log('%cmethodfulOperations', 'font-size: 12px; color: lightcoral', methodfulOperations);
    // console.log('%coptionslessMethodfulOperations', 'font-size: 12px; color: lightcoral', optionslessMethodfulOperations);

    const currRegisteredOperationsRef = useRef(optionslessMethodfulOperations);
    currRegisteredOperationsRef.current = optionslessMethodfulOperations;

    const registry = useRegistry(optionslessMethodfulOperations);

    const data = useSelector(state => R.pipe(
      R.map(({ resourceType }) => [resourceType, gettersOf(resourceType).getResource(state)]),
      R.fromPairs,
    )(operations), shallowEqual);
    const dispatch = useDispatch();
    const actionCreators = useMemo(() => R.pipe(
      R.map(({ resourceType }) => [
        resourceType,
        bindActionCreators(actionCreatorsOf(resourceType), dispatch),
      ]),
      R.fromPairs,
    )(operations), [operations, dispatch]);

    const currActionCreatorsRef = useRef(actionCreators);
    currActionCreatorsRef.current = actionCreators;

    useEffect(() => {
      R.forEach(({ resourceType, method, input = {} }) => {
        actionCreators[resourceType].register({
          cargo: { method, input },
          options: R.pipe(
            R.find(R.whereEq({ resourceType, method, input })),
            R.prop('options'),
          )(methodfulOperations),
        });
      })(registry.register);
      R.forEach(({ resourceType, method, input = {} }) => {
        actionCreators[resourceType].deregister({
          cargo: { method, input },
          options: R.pipe(
            R.find(R.whereEq({ resourceType, method, input })),
            R.prop('options'),
          )(methodfulOperations),
        });
      })(registry.deregister);
    });

    useEffect(() => () => {
      R.forEach(({ resourceType, method, input = {} }) => {
        currActionCreatorsRef.current[resourceType].deregister({
          cargo: { method, input },
          options: R.pipe(
            R.find(R.whereEq({ resourceType, method, input })),
            R.prop('options'),
          )(methodfulOperations),
        });
      })(currRegisteredOperationsRef.current);
    }, []);

    // const status = {
    //   loading: R.reduce(
    //     R.or,
    //     false,
    //     R.map(({ resourceType, method, input = {} }) => R.pathOr(
    //       null, [resourceType, method, hash(input), 'status', 'loading'], data,
    //     ))(optionslessMethodfulOperations),
    //   ),
    //   success: R.reduce(
    //     R.and,
    //     true,
    //     R.map(({ resourceType, method, input = {} }) => R.pathOr(
    //       null, [resourceType, method, hash(input), 'status', 'success'], data,
    //     ))(optionslessMethodfulOperations),
    //   ),
    //   error: R.pipe(
    //     R.map(({ resourceType, method, input = {} }) => R.path(
    //       [resourceType, method, hash(input), 'status', 'error'], data,
    //     ) && `${resourceType}.${method}.${hash(input)}`),
    //     R.reject(R.either(R.isNil, R.isEmpty)),
    //     R.join(', '),
    //     R.unless(R.isEmpty, R.concat('Got error in ')),
    //   )(optionslessMethodfulOperations),
    // };

    return {
      data,
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
    useResources,
  };
};
