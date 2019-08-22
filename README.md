# with-resources

A higher order component to help fetch resources

[![npm](https://img.shields.io/npm/v/with-resources.svg?style=popout)](https://www.npmjs.com/package/with-resources)

This React HOC facilitates fetching and grouping data into categories called _**resources**_ which is freely defined by user. User just needs to supply the _**data manager**_ which is in charge of fetching the data for each resource defined.

## Requirements

This tool has the following requirements:

- _peerDependencies_:

```js
"react": "^16.0.0",
"react-redux": "^5.0.0",
"redux": ">=4 <5",
"redux-observable": "^1.0.0",
"rxjs": ">=6.0.0-beta.0 <7"
```

- Setup of [redux store](https://redux.js.org/introduction) and provide it to the app using [react-redux Provider](https://react-redux.js.org/api/provider)

- Setup of [redux-observable](https://redux-observable.js.org/) as redux middleware to handle side-effects

- Data manager to fetch data for each resource

## Installation

Make sure that you have installed all the _peer dependencies_

```sh
yarn add with-resources
```

or

```sh
npm install with-resources --save
```

## Development Setup

###### _Resource Types_

_**with-resources**_ requires an object _resourceTypes_ to prepare the resources. It must be in the following format:

```js
{
  USERS: 'users',
  DIGITAL_ASSETS: 'digitalAssets',
}
```

keys are in _CAPS_SNAKE_CASE_ and referred in code; values are in _camelCase_ and serve as key to select the corresponding _data manager_ or _getter_ for a particular resource. Both should end with 's' to indicate plurality.

###### _Data manager_

Each resource needs their own data manager to fetch data. Each data manager must adhere to the following format to interface with _**with-resources**_:

```js
const DM = async ({ method, input }) => ({ [method]: await DM[method](input) });
```

and have individual functions to fetch data corresponding to each _**method**_ (CRUD following RESTful convention):

```js
/*
  C - Create
  adapter: {
    fe2be: to massage body from FE to BE format
    be2fe: to massage response from BE to FE format
  }
*/
DM.create = async ({ content }) =>
  R.pipe(
    adapter.fe2be,
    payload =>
      fetch(`${endpoint}/${resource}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
        .then(res => res.json())
        .then(adapter.be2fe)
        .catch(err => ({ err }))
  )(content);
```

```js
/*
  R - retrieve
*/
DM.retrieveOne = async () =>
  fetch(`${endpoint}/${resource}`, { method: "GET" })
    .then(res => res.json())
    .then(adapter.be2fe)
    .catch(err => ({ err }));
```

```js
/*
  R - retrieve
  queries: [
    { name: "page", value: 0 },
    { name: "pageSize", value: 10 },
  ]
  getQueriesString: convert to query string: "?page=1&pageSize=10"
*/
DM.retrieveMany = async ({ params: { queries } }) =>
  R.pipe(
    getQueriesString,
    queriesString =>
      fetch(`${endpoint}/${resource}${queriesString}`, { method: "GET" })
        .then(res => res.json())
        .then(adapter.be2fe)
        .catch(err => ({ err }))
  )(queries);
```

```js
/*
  U - Update
  ids: [
    { name: "resourceId", value: 1234 },
  ]
  getIdsObject: convert to { resourceId: 1234 }
*/
DM.update = async ({ params: { ids }, content }) =>
  R.pipe(
    R.juxt([
      R.pipe(
        R.prop("ids"),
        getIdsObject
      ),
      R.prop("content")
    ]),
    ([{ resourceId }, content]) =>
      R.pipe(
        adapter.fe2be,
        payload =>
          fetch(`${endpoint}/${resource}/${resourceId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          })
            .then(res => res.json())
            .then(adapter.be2fe)
            .catch(err => ({ err }))
      )(content)
  )({ ids, content });
```

```js
/*
  D - Delete
*/
DM.delete = async ({ params: { ids } }) =>
  R.pipe(
    getIdsObject,
    ({ resourceId }) =>
      fetch(`${endpoint}/${resource}/${resourceId}`, { method: "DELETE" })
        .then(res => res.json())
        .catch(err => ({ err }))
  )(ids);
```

_data/managers/index.js_

```js
import resourceType1 from "./resourceType1";
import resourceType2 from "./resourceType2";

export default {
  resourceType1,
  resourceType2
};
```

###### _Redux Store_

_data/store.js_

```js
import { createStore, applyMiddleware, compose } from "redux";
import { createEpicMiddleware, combineEpics } from "redux-observable";
import setupResources from "with-resources";
import DM from "./managers";

const epicMiddleware = createEpicMiddleware();
const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

const { reducer, epics } = setupResources({
  resourceTypes: {
    RESOURCE_TYPE_1: "resourceType1",
    RESOURCE_TYPE_2: "resourceType2"
  },
  DM
});

const store = createStore(
  reducer,
  composeEnhancers(applyMiddleware(epicMiddleware))
);
epicMiddleware.run(combineEpics(...epics));

export default store;
```

## API & Usage

###### _Default export of with-resources_
The default export of _**with-resources**_ (setupResources) receives a config object:

`{ resourceTypes = {}, reduxPath = [], DM }`

- resourceTypes is the object containing the resources you want to set up (see above)
- reduxPath is the location of your root resources in redux store (depending on where you put the reducer returned from _setupResources_)
- DM is the object containing the data managers for each resources

###### HOC: _withResources(operations)_
Each operation represents one request to a resource. It has the following format:
```js
{
  resourceType: resourceTypes.USERS,
  method: 'retrieveFriends',
  // input: mapper or object below
  input: {
    params: {
      ids: [
        { name: 'userId', value: 777 },
      ],
      queries: [
        { name: 'page', value: 1 },
        { name: 'pageSize', value: 10 },
      ],
    },
    content: {},
  },
  options: {
    autorun: false,
    runOnInputChange: true,
    reset: false,
    useLast: false,
  },
}
```
Each operation has the analogy to a RESTful resource request:

- resourceType: the resource to request, it can be retrieved via resourceTypes which can be imported from **_with-resources_** after calling setupResources 

- method: follow CRUD convention, the DM for the requested _resourceType_ must have the implementation for the specified _method_

- input: allow customizing of url parameters such as _id_ and _query string_, _content_ is useful for C & U method. _input_ can be a mapper function, receiving parent props and yielding the described object

- options:
  - autorun: auto execute the request when component mounted, and whenever the input object changes (_runOnInputChange_ must be true). Default is false
  - runOnInputChange: effective when _autorun_ is true. Default is true. If you want to execute the input mapper function once, set _runOnInputChange_ to false
  - reset: useful when you need to reset the redux state for a _method_ of a _resourceType_. Default is false
  - useLast: use the last retrieved result if any (see Caching mechanism)

The operation above can be understood as making the following RESTful api request:

```js
GET /endpoint/users/777/friends?page=1&pageSize=10
```

###### Injected props
_**withResources**_ will inject a pair of _**data**_ and _**actionCreators**_ to the wrapped component

- data: an object with the following format:
```js
{
  status: { loading, success, error }, // combined status of all operations
  users: {
    retrieveFriends: {
      status: { loading, success, error }, // individual status of method
      // data fetched
    },
    // other methods
  }
}
```

- actionCreators: a list of bound & readily dispatched action creators grouped by resource types, including _ajax_, _clearCache_, _reset_
```js
{
  users: { ajax, clearCache, reset },
  // other resource type
}
```
Instead of setting _autorun_ to _true_, you can use the injected _actionCreators[resourceType].ajax_ to fetch data at your own will. It receives a _**cargo**_ (and optional callbacks) in the following format: 
```js
cargo: {
  method: 'retrieveFriends',
  input: {
    params: {
      ids: [
        { name: 'userId', value: 777 },
      ],
      queries: [
        { name: 'page', value: 1 },
        { name: 'pageSize', value: 10 },
      ],
    },
  },
  options: {
    useLast: true,
  }
},
onSuccess: ({ data: { retrieveFriends: { list = [] } = {} } }) => {
  // ...
},
onFailure: ({ error }) => {
  // ...
},
```

###### _Resource Getters_ (Optional)
Instead of traversing the redux store path to get the data you want, i.e.
`R.pathOr([], [resourceTypes.USERS, 'retrieveFriends', 'list'], data)`

First, you can supply a list of _getters_ to _**with-resources**_ and use them to get the data, i.e.
`gettersOf(resourceTypes.USERS).getFriends()(data)`, _gettersOf_ can be imported from _**with-resources**_

`data/getters/users.js`
```js
import * as R from 'ramda';
import { resourceTypes } from 'with-resources';

/*
**************************************************
  State Getters
**************************************************
*/
const RESOURCE_TYPE = resourceTypes.USERS;

// supply true to root if you use getFriends with redux state
const getFriends = ({ root, defaultValue = [] } = {}) => R.ifElse(
  R.anyPass([
    R.isNil,
    R.isEmpty,
    R.pipe(
      R.path(
        R.concat(root ? ['resources'] : [], [
          RESOURCE_TYPE,
          'retrieveFriends',
          'status',
          'success',
        ]),
      ),
      R.not,
    ),
  ]),
  R.always(defaultValue),
  R.path(R.concat(root ? ['resources'] : [], [RESOURCE_TYPE, 'retrieveFriends', 'list'])),
);

export default {
  getFriends,
};
```

Next, you need to tell webpack where to look for the resources' getters by replacing the context (since _**with-resources**_ use dynamic import of resources' getters files)

`webpack.config.js`
```js
plugins: [
    new webpack.ContextReplacementPlugin(/getters/, path.resolve(__dirname, 'src/data/getters')),
  ],
]
```

The idea behind it is not just for quick access of data, but for maintenance purpose. Let's say, you access the same piece of data in many places in your app, changing the location of your root resources in redux requires rectifying the access path for all the places.

By default, each resource has 3 predefined getters, namely `getState`, `getMethod`, `getStatus`

`getState(state)` gives you access to the resource in redux by supplying the redux state
```js
gettersOf(resourcesTypes.USERS).getState(state)
```

`getMethod({ root })(method)` receives a config object (_root_ = true means accessing from redux state), and a _method_ (i.e retrieveFriends), and gives you access to the data of _method_ in redux
```js
gettersOf(resourcesTypes.USERS).getMethod()('retrieveFriends')(data).list
```

`getStatus({ root })(method)` receives a config object (_root_ = true means accessing from redux state), and a _method_ (i.e retrieveFriends), and gives you access to the status of _method_
```js
gettersOf(resourcesTypes.USERS).getStatus()('retrieveFriends')(data).success
```

###### _Caching mechanism_
Caching mechanism has the following characteristics:
  - It is an opt-in mechanism, i.e. **_with-resources_** always return newly fetched data unless user specifies _useLast: true_.
  - It is done per entire resource, i.e. if you clear cache (using action _CLEAR_CACHE_), the cache for the entire resource will be cleared (not just any particular method of the resource).
  - Timeout: default to 15mins (Note: _CLEAR_CACHE_ should be called on new session to limit the caching to session-based)


## Examples

The animal example uses _**withResources**_ to fetch image of fox, cat or dog.

Start the server by running
```sh
npm run example:server
```
or
```sh
yarn example:server
```

Then, start the web app at `localhost:7000` by running
```sh
npm run example:animal
```
or
```sh
yarn example:animal
```

<img src='examples/animal/public/screenshots/fox.png' width=350/>
<img src='examples/animal/public/screenshots/cat.png' width=350/>
<img src='examples/animal/public/screenshots/dog.png' width=350/>

## React Hook
_**with-resources**_ also provides experimental hook, i.e. `useResources`
    
###### _Usage_
Before using `useResources`, you need to meet the following requirements:
- Install version `^16.7.0-alpha.2` of `react`
- supply the `store` as the _context_ to _**with-resources**_

`index.js`
```js
import { StoreContext } from 'with-resources';
import store from './data/store';
import AppHook from './app.hook';

<StoreContext.Provider value={store}>
  <App />
</StoreContext.Provider>
```

Inside `app.hook.js`
```js
...
const { data, actionCreators } = useResources([
  {
    resourceType: resourceTypes.ANIMALS,
    method: 'retrieveOne',
    input: useMemo(
      () => ({
        params: {
          queries: [{ name: 'kind', value: 'fox' }],
        },
      }),
      [],
    ),
    options: { autorun: true },
  },
]);
```

Make sure that you use `useMemo` to pass the same object _input_ to `useResources` on every render, otherwise `useResources` will trigger a new request with the new object _input_.

## Server Side Rendering
>Coming soon 🚧🚧🚧

## Author

Charlie Chau – chaunhihien@gmail.com

Distributed under the MIT license. See `LICENSE` for more information.

[https://github.com/charshin](https://github.com/charshin/)

