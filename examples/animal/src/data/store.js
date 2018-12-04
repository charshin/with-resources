import { createStore, applyMiddleware, compose } from 'redux';
import { createEpicMiddleware, combineEpics } from 'redux-observable';
import setupResources from 'with-resources';
import DM from './managers';

const epicMiddleware = createEpicMiddleware();

const composeEnhancers = typeof window === 'object'
  /* eslint-disable no-underscore-dangle */
  && window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__
  ? window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__({
    // Specify extension’s options like name, actionsBlacklist, actionsCreators, serialize...
    /* eslint-enable */
    serialize: {
      replacer: (key, value) => (typeof value === 'symbol' ? String(value) : value),
    },
    maxAge: 100,
    features: {
      pause: true, // start/pause recording of dispatched actions
      lock: true, // lock/unlock dispatching actions and side effects
      persist: true, // persist states on page reloading
      export: true, // export history of actions in a file. Default is 'custom', true --> computed state
      import: true, // import history of actions from a file. Default is 'custom', true --> computed state
      jump: true, // jump back and forth (time travelling)
      skip: true, // skip (cancel) actions
      reorder: true, // drag and drop actions in the history list
      dispatch: true, // dispatch custom actions or action creators
      test: true, // generate tests for the selected actions
    },
  })
  : compose;

const middlewares = applyMiddleware(epicMiddleware);

const { reducer, epics } = setupResources({
  resourceTypes: { ANIMALS: 'animals' },
  DM,
});

const store = createStore(reducer, composeEnhancers(middlewares));
epicMiddleware.run(combineEpics(...epics));

export default store;
