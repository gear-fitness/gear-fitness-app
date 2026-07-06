import { StyleSheet } from "react-native";

// Layout/typography shared by the lifting (ExerciseDetailContent) and cardio
// (CardioDetailContent) detail screens. These two screens render the same
// chrome (top bar timer, header, hero input card, note modal, footer actions),
// so their styles were previously duplicated verbatim in both files and drifted
// apart on any tweak. Extracted here as the single source of truth.
//
// Colors/theme are intentionally NOT included: like the rest of the codebase,
// each screen layers color onto these static styles at the call site, e.g.
// style={[styles.timerText, { color: colors.text }]}. Each screen spreads
// sharedDetailStyles into its own StyleSheet.create alongside its screen-only
// keys (see the `styles` definitions in each component).
export const sharedDetailStyles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 8,
    paddingBottom: 0,
  },

  topBar: {
    paddingTop: 12,
    paddingBottom: 14,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },

  timerTap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },

  timerIcon: { width: 22, height: 22 },
  timerText: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.5,
    fontVariant: ["tabular-nums"],
  },
  timerCaption: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1.2,
    marginLeft: 4,
  },

  topBarActions: {
    position: "absolute",
    right: 16,
    top: 8,
    flexDirection: "row",
    gap: 8,
  },
  topBarButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },

  divider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },

  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },

  caption: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1.2,
    marginBottom: 6,
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  title: {
    flexShrink: 1,
    fontSize: 32,
    fontWeight: "700",
    letterSpacing: -0.8,
    lineHeight: 36,
  },

  titleSwapIcon: {
    width: 22,
    height: 22,
  },

  heroCard: {
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 16,
    borderRadius: 20,
    overflow: "hidden",
  },

  heroDivider: {
    height: StyleSheet.hairlineWidth,
  },

  scroll: {
    flex: 1,
  },

  scrollContent: {
    paddingBottom: 8,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },

  modalCard: {
    width: "100%",
    borderRadius: 20,
    padding: 20,
  },

  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.2,
    marginBottom: 12,
  },

  modalInput: {
    minHeight: 100,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    textAlignVertical: "top",
  },

  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 14,
  },

  modalSecondary: {
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  modalSecondaryText: {
    fontSize: 15,
    fontWeight: "500",
  },

  modalPrimary: {
    height: 40,
    paddingHorizontal: 18,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  modalPrimaryText: {
    fontSize: 15,
    fontWeight: "600",
  },

  footerCard: {
    marginHorizontal: 12,
    marginBottom: 20,
    padding: 6,
    borderRadius: 16,
    flexDirection: "row",
    gap: 4,
  },

  footerSecondary: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  footerSecondaryText: {
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: -0.2,
  },

  footerPrimary: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  footerPrimaryText: {
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
});

// Hero input metrics (the large Duration/Reps/Weight value + unit). Identical in
// both detail screens so the fields render at the exact same scale.
export const detailHeroStyles = StyleSheet.create({
  row: {
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  label: {
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 4,
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  input: {
    flex: 1,
    fontSize: 84,
    fontWeight: "700",
    letterSpacing: -3,
    lineHeight: 90,
    padding: 0,
    margin: 0,
    fontVariant: ["tabular-nums"],
  },
  unit: {
    fontSize: 26,
    fontWeight: "500",
    marginLeft: 8,
  },
});
