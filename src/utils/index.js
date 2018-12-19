import * as R from 'ramda';

const getDisplayName = ComposedComponent => ComposedComponent.displayName || ComposedComponent.name || 'Component';

const getIdsObject = R.pipe(
  R.map(({ name, value }) => ({ [name]: value })),
  R.mergeAll,
);

const getQueriesObject = R.pipe(
  R.map(({ name, value }) => ({ [name]: value })),
  R.mergeAll,
);

const getQueriesString = R.pipe(
  R.filter(({ value }) => value),
  R.map(({ name, value }) => `${name}=${value}`),
  R.join('&'),
  R.unless(R.isEmpty(), R.concat('?')),
);

const formatBytes = (bytes, decimals = 2) => {
  if (bytes <= 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Byte(s)', 'KB(s)', 'MB(s)', 'GB(s)', 'TB(s)', 'PB(s)', 'EB(s)', 'ZB(s)', 'YB(s)'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / k ** i).toFixed(decimals))} ${sizes[i]}`;
};

const round = (number, precision) => {
  const shift = (num, exponent) => {
    const numArray = `${num}`.split('e');
    return +`${numArray[0]}e${numArray[1] ? +numArray[1] + exponent : exponent}`;
  };
  return shift(Math.round(shift(number, +precision)), -precision);
};

const memoize = (method, { path = [], timeout = Infinity } = {}) => {
  const cache = {};
  const fresh = {};

  /* eslint-disable */
  return function() {
    // NOTE: arguments is an Array-like object
    let renew = false;
    const args = R.when(
      // ASSUME: Last element of arguments is a potential option object for memoize
      argsList =>
        R.length(argsList) > 0 && R.both(R.is(Object), R.has('memoize'))(R.last(argsList)),
      argsList =>
        ({
          memoize: { renew },
        } = R.last(argsList)) && R.init(argsList),
    )(Array.from(arguments));

    const cachedArgs = JSON.stringify(R.path(path, args));
    const invoke = renew || !cache[cachedArgs] || !fresh[cachedArgs];

    // NOTE: We can cache Promise as well (including rejected Promise)!!!
    cache[cachedArgs] = invoke ? method.apply(this, args) : cache[cachedArgs];

    invoke &&
      do {
        fresh[cachedArgs] = true;
        timeout !== Infinity && setTimeout(() => (fresh[cachedArgs] = false), timeout);
      };

    return cache[cachedArgs];
  };
  /* eslint-enable */
};

// NOTE: Order of comparison is important when their set of props are different
const shallowDiff = R.curry((a, b) => {
  let diffProps = '';
  R.forEachObjIndexed((v, k) => {
    v !== b[k] && (diffProps += `${k}, `);
  })(a);
  return R.dropLast(2, diffProps);
});

const shallowEqual = (objA, objB) => {
  const hasOwn = Object.prototype.hasOwnProperty;

  // eslint-disable-next-line
  const is = (x, y) => (x === y ? x !== 0 || y !== 0 || 1 / x === 1 / y : x !== x && y !== y);

  if (is(objA, objB)) return true;

  if (typeof objA !== 'object' || objA === null || typeof objB !== 'object' || objB === null) {
    return false;
  }

  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);

  if (keysA.length !== keysB.length) return false;

  // eslint-disable-next-line
  for (let i = 0; i < keysA.length; i++) {
    if (!hasOwn.call(objB, keysA[i]) || !is(objA[keysA[i]], objB[keysA[i]])) {
      return false;
    }
  }

  return true;
};

// TODO: Rename to findByProp
const findBy = R.curry((name, value, arr) => R.find(R.propEq(name, value), arr));
const findByPath = R.curry((path, value, arr) => R.find(R.pathEq(path, value), arr));
const findIndexBy = R.curry((name, value, arr) => R.findIndex(R.propEq(name, value), arr));
const findIndexByPath = R.curry((path, value, arr) => R.findIndex(R.pathEq(path, value), arr));

const switchProp = R.curry((toProp, fromProp, fromValue, arr) => R.pipe(
  R.find(R.propEq(fromProp, fromValue)),
  R.unless(R.isNil, R.prop(toProp)),
)(arr));
const switchPath = R.curry((toPath, fromPath, fromValue, arr) => R.pipe(
  R.find(R.pathEq(fromPath, fromValue)),
  R.unless(R.isNil, R.path(toPath)),
)(arr));

const toObjBy = R.curry((name, arr) => R.pipe(
  R.groupBy(R.prop(name)),
  R.map(R.prop(0)),
  R.omit(['undefined']),
)(arr));

const removeBy = R.curry((name, value, arr) => R.reject(R.propEq(name, value))(arr));
const removeByPath = R.curry((path, value, arr) => R.reject(R.pathEq(path, value))(arr));

const initialsOf = (name, noLetters = 2, delimiter = ' ', binder = '') => R.pipe(
  R.split(delimiter),
  R.map(R.head),
  R.join(binder),
  R.take(noLetters),
)(name);

export {
  getDisplayName,
  getIdsObject,
  getQueriesObject,
  getQueriesString,
  formatBytes,
  round,
  memoize,
  shallowEqual,
  shallowDiff,
  findBy,
  findByPath,
  findIndexBy,
  findIndexByPath,
  switchProp,
  switchPath,
  toObjBy,
  removeBy,
  removeByPath,
  initialsOf,
};
