import React from "react";
import { View, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PaywallContent } from "../onboarding/components/PaywallContent";
import { useOnboardingColors } from "../onboarding/components/useOnboardingColors";
import { FloatingCloseButton } from "../../components/FloatingCloseButton";

/**
 * Standalone Gear Plus paywall presented as a modal (e.g. from the "Try Plus"
 * upsell on your own profile). Reuses the same PaywallContent as onboarding;
 * dismissing or purchasing just closes it. Uses the shared floating close
 * button (top-left) like the app's other fullscreen modals.
 */
export function PaywallScreen() {
  const navigation = useNavigation() as any;
  const insets = useSafeAreaInsets();
  const colors = useOnboardingColors();
  const close = () => navigation.goBack();

  return (
    <View style={[styles.root, { backgroundColor: colors.screenBg }]}>
      <FloatingCloseButton
        onPress={close}
        icon="close"
        position="left"
        accessibilityLabel="Close"
      />
      <PaywallContent
        // No fixed header bar: content scrolls under the floating close button
        // (like RoutineList). The top inset clears the notch + button initially.
        header={null}
        scrollTopInset={insets.top + 56}
        onDone={close}
        showDismiss={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
