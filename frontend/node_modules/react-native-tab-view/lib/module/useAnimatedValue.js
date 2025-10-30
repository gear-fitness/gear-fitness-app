"use strict";

import * as React from 'react';
import { Animated } from 'react-native';
export function useAnimatedValue(initialValue) {
  const lazyRef = React.useRef(undefined);
  if (lazyRef.current === undefined) {
    lazyRef.current = new Animated.Value(initialValue);
  }
  return lazyRef.current;
}
//# sourceMappingURL=useAnimatedValue.js.map