import { useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Text, TextInput } from "./Text";
import { useTheme } from "@react-navigation/native";
import { ReportReason } from "../api/reportService";
import { BottomSheet } from "./BottomSheet";

interface Props {
  visible: boolean;
  onSubmit: (reason: ReportReason, note?: string) => void;
  onClose: () => void;
}

const NOTE_MAX_LENGTH = 500;

const REASONS: { value: ReportReason; label: string }[] = [
  { value: "NUDITY", label: "Nudity or sexual content" },
  { value: "SPAM", label: "Spam or misleading" },
  { value: "HARASSMENT", label: "Harassment or bullying" },
  { value: "VIOLENCE", label: "Violence or dangerous content" },
  { value: "OTHER", label: "Something else" },
];

export function ReportPostSheet({ visible, onSubmit, onClose }: Props) {
  const { colors } = useTheme();
  const accent = "#ff4d2e";
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [note, setNote] = useState("");

  const reset = () => {
    setReason(null);
    setNote("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = () => {
    if (!reason) return;
    onSubmit(reason, note);
    reset();
  };

  return (
    <BottomSheet visible={visible} onClose={handleClose} avoidKeyboard>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>
          Report this post
        </Text>
      </View>

      {REASONS.map((opt) => {
        const isSelected = reason === opt.value;
        return (
          <TouchableOpacity
            key={opt.value}
            activeOpacity={0.7}
            onPress={() => setReason(opt.value)}
            style={[styles.row, { borderBottomColor: colors.border }]}
          >
            <Text style={[styles.rowLabel, { color: colors.text }]}>
              {opt.label}
            </Text>
            <View
              style={[
                styles.radio,
                {
                  borderColor: isSelected ? accent : colors.text + "40",
                  backgroundColor: isSelected ? accent : "transparent",
                },
              ]}
            >
              {isSelected && <View style={styles.radioInner} />}
            </View>
          </TouchableOpacity>
        );
      })}

      <TextInput
        style={[
          styles.note,
          {
            color: colors.text,
            borderColor: colors.border,
            backgroundColor: colors.background,
          },
        ]}
        placeholder="Add a note (optional)"
        placeholderTextColor={colors.text + "60"}
        value={note}
        onChangeText={setNote}
        multiline
        maxLength={NOTE_MAX_LENGTH}
      />

      <TouchableOpacity
        activeOpacity={0.8}
        onPress={handleSubmit}
        disabled={!reason}
        style={[
          styles.submit,
          { backgroundColor: accent, opacity: reason ? 1 : 0.4 },
        ]}
      >
        <Text style={styles.submitText}>Submit report</Text>
      </TouchableOpacity>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#fff",
  },
  note: {
    marginHorizontal: 20,
    marginTop: 16,
    minHeight: 64,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 15,
    textAlignVertical: "top",
  },
  submit: {
    marginHorizontal: 20,
    marginTop: 16,
    height: 50,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  submitText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
});
