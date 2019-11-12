import { useEffect, useRef } from 'react';

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
  usePrevious, useOldIf,
};
