import React, { useRef, useEffect } from "react";
import {
  Modal,
  View,
  Animated,
  Pressable,
  Text,
  StyleSheet,
} from "react-native";
import { useThemeColors } from "../../../hooks/useThemeColors";

const SHEET_TRANSLATE_CLOSED = 500;

interface PickerSheetProps {
  visible: boolean;
  title: string;
  colors: ReturnType<typeof useThemeColors>;
  onClose: () => void;
  onDone: () => void;
  unitToggle?: React.ReactNode;
  children: React.ReactNode;
}

export function PickerSheet({
  visible,
  title,
  colors,
  onClose,
  onDone,
  unitToggle,
  children,
}: PickerSheetProps) {
  const backdrop = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(SHEET_TRANSLATE_CLOSED)).current;

  useEffect(() => {
    if (visible) {
      backdrop.setValue(0);
      slide.setValue(SHEET_TRANSLATE_CLOSED);
      Animated.parallel([
        Animated.timing(backdrop, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(slide, { toValue: 0, damping: 22, stiffness: 220, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  useEffect(() => {
    return () => {
      backdrop.stopAnimation();
      slide.stopAnimation();
    };
  }, []);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(backdrop, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(slide, { toValue: SHEET_TRANSLATE_CLOSED, duration: 220, useNativeDriver: true }),
    ]).start(() => onClose());
  };

  const handleDone = () => {
    Animated.parallel([
      Animated.timing(backdrop, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(slide, { toValue: SHEET_TRANSLATE_CLOSED, duration: 220, useNativeDriver: true }),
    ]).start(() => onDone());
  };

  const s = makeStyles(colors);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <Pressable style={StyleSheet.absoluteFill} onPress={handleClose}>
        <Animated.View style={[StyleSheet.absoluteFill, s.dim, { opacity: backdrop }]} />
      </Pressable>
      <Animated.View style={[s.sheet, { transform: [{ translateY: slide }] }]}>
        <View style={s.handle} />
        <View style={s.header}>
          <Text style={s.title}>{title}</Text>
        </View>
        {unitToggle && <View style={s.unitToggleWrap}>{unitToggle}</View>}
        {children}
        <Pressable onPress={handleDone} style={s.doneBtn}>
          <Text style={s.doneBtnText}>Done</Text>
        </Pressable>
      </Animated.View>
    </Modal>
  );
}

function makeStyles(c: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    dim: {
      backgroundColor: "rgba(0,0,0,0.5)",
    },
    sheet: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: c.bg,
      borderTopLeftRadius: 32,
      borderTopRightRadius: 32,
      paddingBottom: 40,
    },
    handle: {
      width: 40,
      height: 4,
      backgroundColor: c.trackBg,
      borderRadius: 99,
      alignSelf: "center",
      marginTop: 12,
      marginBottom: 4,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    title: {
      fontSize: 16,
      fontWeight: "600",
      color: c.text,
    },
    doneLink: {
      fontSize: 15,
      fontWeight: "600",
      color: c.text,
    },
    unitToggleWrap: {
      marginHorizontal: 16,
      marginTop: 10,
    },
    doneBtn: {
      marginHorizontal: 16,
      marginTop: 10,
      height: 56,
      borderRadius: 999,
      backgroundColor: c.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    doneBtnText: {
      color: c.accentText,
      fontSize: 17,
      fontWeight: "700",
    },
  });
}
