import * as R from 'ramda';
import { resourceTypes } from 'with-resources';

/*
**************************************************
  State Getters
**************************************************
*/
const RESOURCE_TYPE = resourceTypes.ANIMALS;

const getAnimal = ({ root, defaultValue = ' ' } = {}) => R.ifElse(
  R.anyPass([
    R.isNil,
    R.isEmpty,
    R.pipe(
      R.path(
        R.concat(root ? ['resources'] : [], [
          RESOURCE_TYPE,
          'retrieveOne',
          'status',
          'success',
        ]),
      ),
      R.not,
    ),
  ]),
  R.always(defaultValue),
  R.path(R.concat(root ? ['resources'] : [], [RESOURCE_TYPE, 'retrieveOne', 'image'])),
);

export default {
  getAnimal,
};
