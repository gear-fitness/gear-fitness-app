/**
 * App-wide Text and TextInput with iOS Dynamic Type clamped.
 *
 * System text-size settings scale RN text by the OS font scale, which breaks
 * fixed layouts. These wrappers cap that scale via maxFontSizeMultiplier: the
 * default cap comes from FontScaleContext (1.5 app-wide), and FontScaleProvider
 * can tighten it for a subtree (onboarding locks to 1). An explicit
 * maxFontSizeMultiplier prop on a call site always wins over the context cap.
 *
 * Not covered by these wrappers:
 * - @expo/ui SwiftUI text (nutrition menus): follows Dynamic Type, uncappable
 *   from JS
 * - react-native-calendars (History screen): follows Dynamic Type, no cap hook
 * - native @react-native-picker/picker wheel labels (onboarding and settings):
 *   OS controlled
 * - system Alert: OS UI, scales on purpose
 * - react-native-svg chart text (ExerciseHistory, ProjectionChart): never
 *   scales at all
 */
import { createContext, useContext, type ReactNode, type Ref } from "react";
import {
  Text as RNText,
  TextInput as RNTextInput,
  type TextProps,
  type TextInputProps,
} from "react-native";

export const FontScaleContext = createContext(1.5);

export function FontScaleProvider({
  max,
  children,
}: {
  max: number;
  children: ReactNode;
}) {
  return (
    <FontScaleContext.Provider value={max}>
      {children}
    </FontScaleContext.Provider>
  );
}

export function Text({
  maxFontSizeMultiplier,
  ...props
}: TextProps & { ref?: Ref<RNText> }) {
  const cap = useContext(FontScaleContext);
  return (
    <RNText maxFontSizeMultiplier={maxFontSizeMultiplier ?? cap} {...props} />
  );
}
export type Text = RNText;

export function TextInput({
  maxFontSizeMultiplier,
  ...props
}: TextInputProps & { ref?: Ref<RNTextInput> }) {
  const cap = useContext(FontScaleContext);
  return (
    <RNTextInput
      maxFontSizeMultiplier={maxFontSizeMultiplier ?? cap}
      {...props}
    />
  );
}
export type TextInput = RNTextInput;
