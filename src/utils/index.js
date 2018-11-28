const getDisplayName = ComposedComponent => ComposedComponent.displayName || ComposedComponent.name || 'Component';

const memoize = (method, { path = [], timeout = Infinity } = {}) => {
  const cache = {};
  const fresh = {};

  /* eslint-disable */
  return function () {
    // NOTE: arguments is an Array-like object
    let renew = false;
    const args = R.when(
      // ASSUME: Last element of arguments is a potential option object for memoize
      argsList => R.length(argsList) > 0 && R.both(R.is(Object), R.has('memoize'))(R.last(argsList)),
      argsList => ({ memoize: { renew } } = R.last(argsList)) && R.init(argsList),
    )(Array.from(arguments));
    
    const cachedArgs = JSON.stringify(R.path(path, args));
    const invoke = renew || !cache[cachedArgs] || !fresh[cachedArgs];

    // NOTE: We can cache Promise as well (including rejected Promise)!!!
    cache[cachedArgs] = invoke ? method.apply(this, args) : cache[cachedArgs];
    
    invoke && do {
      fresh[cachedArgs] = true;
      timeout !== Infinity && setTimeout(() => fresh[cachedArgs] = false, timeout);
    }

    return cache[cachedArgs];
  };
  /* eslint-enable */
};

export {
  getDisplayName,
  memoize,
};
