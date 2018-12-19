import React from 'react';
import { Provider } from 'react-redux';
import { createStore, applyMiddleware } from 'redux';
import { createEpicMiddleware, combineEpics } from 'redux-observable';
import renderer from 'react-test-renderer';
import * as R from 'ramda';
import { getQueriesString } from '../src/utils';
import setup, { withResources, withResourcesGetters, actionCreatorsOf } from '../src';

describe('setup', () => {
  const resourceTypes = { RES: 'res' };
  const DM = {
    [resourceTypes.RES]: async ({ method, ...args }) => ({ [method]: args }),
  };
  const tools = setup({ resourceTypes, DM });

  test('should return object containing at least reducer and epics', () => {
    const expectedTools = {
      resourceTypes,
      actionTypesOf: expect.anything(),
      actionCreatorsOf: expect.anything(),
      gettersOf: expect.anything(),
      epics: expect.anything(),
      reducer: expect.anything(),
      withResources: expect.anything(),
      withResourcesGetters: expect.anything(),
    };

    expect(tools).toMatchObject(expectedTools);
  });

  test('should retain the same resourceTypes passed in', () => {
    const { resourceTypes: expectedResourceTypes } = tools;

    expect(expectedResourceTypes).toBe(resourceTypes);
  });
});

describe('it should', () => {
  const NETWORK_DELAY = 1000;
  const resourceTypes = {
    USERS: 'users',
    CONFIGS: 'configs',
  };
  const users = [
    { firstName: 'John', lastName: 'Smith', email: 'john.smith@withResources.com' },
    { firstName: 'Alice', lastName: 'Green', email: 'alice.green@withResources.com' },
  ];
  const DM = {
    [resourceTypes.USERS]: async ({ method, input }) => ({
      [method]: await DM[resourceTypes.USERS][method](input),
    }),
    [resourceTypes.CONFIGS]: async ({ method, input }) => ({
      [method]: this[method](input),
    }),
  };
  DM[resourceTypes.USERS].retrieveUsers = async ({ params: { queries } }) => R.pipe(
    getQueriesString,
    queriesString => new Promise(resolve => setTimeout(() => resolve({ users }), NETWORK_DELAY)),
    response => response.then(R.identity),
  )(queries);

  let store;

  beforeEach(() => {
    const { reducer, epics } = setup({ resourceTypes, DM });
    const epicMiddleware = createEpicMiddleware();
    store = createStore(reducer, applyMiddleware(epicMiddleware));
    epicMiddleware.run(combineEpics(...epics));
  });

  test('return list of users when action ajax is sent', (done) => {
    expect.assertions(1);

    const cargo = {
      method: 'retrieveUsers',
      input: {
        params: {
          queries: [{ name: 'page', value: 1 }, { name: 'pageSize', value: 10 }],
        },
      },
    };

    store.dispatch(
      actionCreatorsOf(resourceTypes.USERS).ajax({
        cargo,
        onSuccess: ({ data }) => {
          expect(R.path([cargo.method, 'users'], data)).toEqual(users);
          done();
        },
      }),
    );
  });

  test('render a component with users injected through data', (done) => {
    expect.assertions(1);

    @withResourcesGetters
    class TestApp extends React.Component {
      render() {
        return (
          <Provider store={store}>
            <TestComponent />
          </Provider>
        );
      }
    }

    @withResources([
      {
        resourceType: resourceTypes.USERS,
        method: 'retrieveUsers',
        input: {
          params: {
            queries: [{ name: 'page', value: 1 }, { name: 'pageSize', value: 10 }],
          },
        },
        options: { autorun: true },
      },
    ])
    class TestComponent extends React.Component {
      render() {
        const { data } = this.props;

        if (!data.status.loading) {
          expect(R.path([resourceTypes.USERS, 'retrieveUsers', 'users'], data)).toEqual(users);
          done();
        }

        return null;
      }
    }

    renderer.create(<TestApp />);
  });
});
