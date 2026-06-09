import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { StepProps } from "../stepProps";
import { StepScaffold } from "./StepScaffold";
import { useOnboardingColors } from "./useOnboardingColors";
import { FOUNDER_ACCOUNTS } from "../founders";

export function FollowFoundersStep({
  draft,
  updateDraft,
  onNext,
  onBack,
  progress,
}: StepProps) {
  const colors = useOnboardingColors();
  const following = draft.pendingFollows ?? [];

  const toggle = (username: string) => {
    const next = following.includes(username)
      ? following.filter((u) => u !== username)
      : [...following, username];
    updateDraft({ pendingFollows: next });
  };

  const followAll = () =>
    updateDraft({ pendingFollows: FOUNDER_ACCOUNTS.map((a) => a.username) });

  const allSelected = following.length === FOUNDER_ACCOUNTS.length;

  return (
    <StepScaffold
      progress={progress}
      onBack={onBack}
      heading="Build your accountability circle"
      subheading="People who train together stick with it. Follow the founders and your crew to stay motivated."
      onContinue={onNext}
      continueLabel={following.length > 0 ? "Continue" : "Maybe later"}
      footerExtra={
        !allSelected ? (
          <Pressable onPress={followAll} style={styles.followAll}>
            <Text style={[styles.followAllText, { color: colors.secondary }]}>
              Follow everyone
            </Text>
          </Pressable>
        ) : null
      }
    >
      <View style={styles.list}>
        {FOUNDER_ACCOUNTS.map((acct) => {
          const active = following.includes(acct.username);
          return (
            <View
              key={acct.username}
              style={[
                styles.row,
                { backgroundColor: colors.cardBg, borderColor: colors.border },
              ]}
            >
              <View
                style={[styles.avatar, { backgroundColor: colors.surface }]}
              >
                <Text style={styles.avatarEmoji}>{acct.emoji}</Text>
              </View>
              <View style={styles.info}>
                <Text style={[styles.name, { color: colors.text }]}>
                  {acct.name}
                </Text>
                <Text
                  style={[styles.blurb, { color: colors.secondary }]}
                  numberOfLines={2}
                >
                  {acct.blurb}
                </Text>
              </View>
              <Pressable
                onPress={() => toggle(acct.username)}
                style={[
                  styles.followBtn,
                  active
                    ? { backgroundColor: colors.surface }
                    : { backgroundColor: colors.accent },
                ]}
              >
                <Text
                  style={[
                    styles.followBtnText,
                    { color: active ? colors.text : colors.accentText },
                  ]}
                >
                  {active ? "Following" : "Follow"}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </View>
    </StepScaffold>
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
    gap: 10,
  },
  row: {
    borderRadius: 20,
    borderWidth: 1.5,
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarEmoji: {
    fontSize: 24,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: "700",
  },
  blurb: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 1,
  },
  followBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 999,
  },
  followBtnText: {
    fontSize: 14,
    fontWeight: "700",
  },
  followAll: {
    paddingVertical: 12,
    alignItems: "center",
  },
  followAllText: {
    fontSize: 14,
    fontWeight: "500",
  },
});
