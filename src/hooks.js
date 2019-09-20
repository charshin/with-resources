import {
  createContext, useContext, useState, useEffect, useRef, useMemo,
} from 'react';
import { shallowEqual } from './utils';

const StoreContext = createContext(null);

/**
 * Your passed in mapState function should be memoized to avoid
 * resubscribing every render. If you use other props in mapState, use
 * useCallback to memoize the resulting function, otherwise define the mapState
 * function outside of the component:
 *
 * const mapState = useCallback(
 *   state => state.todos.get(id),
 *   // The second parameter to useCallback tells you
 *   [id],
 * );
 * const todo = useDerivedState(mapState);
 */
const useDerivedState = (mapState) => {
  const store = useContext(StoreContext);

  // Lazy initialization
  const [derivedState, setDerivedState] = useState(() => mapState(store.getState()));

  // If the store or mapState change, schedule a render with new derived state
  const [prevStore, setPrevStore] = useState(() => store);
  const [prevMapState, setPrevMapState] = useState(() => mapState);
  prevStore !== store && setPrevStore(() => store);
  prevMapState !== mapState && setPrevMapState(() => mapState);
  (prevStore !== store || prevMapState !== mapState)
    && setDerivedState(() => mapState(store.getState()));

  // We use a ref to store the last result of mapState in local component
  // state. This way we can compare with the previous version to know if
  // the component should re-render. Otherwise, we'd have pass derivedState
  // in the array of memoization paramaters to the second useEffect below,
  // which would cause it to unsubscribe and resubscribe from Redux every time
  // the state changes.
  const lastDerivedState = useRef(derivedState);
  useEffect(() => {
    lastDerivedState.current = derivedState;
  });

  useEffect(
    () => store.subscribe(() => {
      const nextDerivedState = mapState(store.getState());
      !shallowEqual(lastDerivedState.current, nextDerivedState)
          && setDerivedState(() => nextDerivedState);
    }),
    [store, mapState],
  );

  return derivedState;
};

const useDispatchableActions = (bindDispatch) => {
  const store = useContext(StoreContext);
  // * This is only for performance optimization. Do not rely on this for semantic guarantee
  // * https://reactjs.org/docs/hooks-reference.html#usememo
  return useMemo(() => bindDispatch(store.dispatch), [bindDispatch]);
};

const usePrevious = (value, initialValue) => {
  const ref = useRef(initialValue);
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
};

const useOldIf = (value, equals, initialValue) => {
  const prevValue = useRef(initialValue);
  const conceptuallySame = equals(prevValue.current, value);
  useEffect(() => {
    !conceptuallySame && (prevValue.current = value);
  });
  return conceptuallySame ? prevValue.current : value;
};

export {
  StoreContext, useDerivedState, useDispatchableActions, usePrevious, useOldIf,
};
