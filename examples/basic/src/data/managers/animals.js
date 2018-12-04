import * as R from 'ramda';
import { getQueriesString } from '../../utils';

const SERVER_URL = 'http://localhost:9000';

const validate = R.ifElse(
  R.prop('ok'),
  response => response.text(),
  response => ({ error: { code: response.status, message: response.statusText } }),
);

const DM = async ({ method, input }) => ({ [method]: await DM[method](input) });

DM.retrieveOne = async ({ params: { queries } }) => R.pipe(
  getQueriesString,
  queriesString => fetch(`${SERVER_URL}${queriesString}`).then(validate),
  response => response.then(image => ({ image })),
)(queries);

export default DM;
