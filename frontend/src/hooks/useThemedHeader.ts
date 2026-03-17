import React, { useLayoutEffect } from "react";
import { useNavigation } from "@react-navigation/native";
import { useThemeColors } from "./useThemeColors";
import { BackButton } from "../components/BackButton";

type ColorsType = ReturnType<typeof useThemeColors>;
type HeaderOptions = Record<string, unknown>;

export function useThemedHeader(
  getOptions?: (colors: ColorsType) => HeaderOptions,
  deps: React.DependencyList = [],
) {
  const navigation = useNavigation();
  const colors = useThemeColors();

  useLayoutEffect(() => {
    const custom = getOptions?.(colors) ?? {};
    const defaultHeaderLeft = navigation.canGoBack()
      ? () => React.createElement(BackButton, {
          onPress: () => navigation.goBack(),
          color: colors.text,
        })
      : undefined;
    navigation.setOptions({
      headerStyle: { backgroundColor: colors.bg },
      headerTitleStyle: { color: colors.text, fontWeight: "700" as const, fontSize: 17 },
      headerTintColor: colors.text,
      headerShadowVisible: false,
      headerLeft: defaultHeaderLeft,
      ...custom,
    });
  }, [navigation, colors.bg, colors.text, ...deps]);

  return { navigation, colors };
}
