import * as R from 'ramda';

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

export { getIdsObject, getQueriesObject, getQueriesString };
