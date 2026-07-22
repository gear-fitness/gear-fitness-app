import React, { forwardRef, useImperativeHandle, useState } from "react";
import { View } from "react-native";

/**
 * Functional stand-in for the native pager in jest: renders only the active
 * page (like the one on screen) and honors setPage + onPageSelected, so
 * tab-switching logic and "which page am I on" assertions work in tests.
 * Swipe physics are native-only and not simulated here.
 */
const PagerView = forwardRef(function PagerView(
  {
    children,
    initialPage = 0,
    onPageSelected,
    ...props
  }: {
    children?: React.ReactNode;
    initialPage?: number;
    onPageSelected?: (event: {
      nativeEvent: { position: number };
    }) => void;
  } & Record<string, unknown>,
  ref,
) {
  const [page, setPage] = useState(initialPage);
  const select = (position: number) => {
    setPage(position);
    onPageSelected?.({ nativeEvent: { position } });
  };
  useImperativeHandle(ref, () => ({
    setPage: select,
    setPageWithoutAnimation: select,
  }));
  return <View {...props}>{React.Children.toArray(children)[page]}</View>;
});

export default PagerView;
