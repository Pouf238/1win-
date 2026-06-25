// ==========================================================================
// Assur Chap Mobile — Composants UI réutilisables
// ==========================================================================
import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, type TextInputProps, type ViewStyle } from "react-native";
import { radius, spacing, useColors, type Palette } from "@/lib/theme";

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const c = useColors();
  return <View style={[{ backgroundColor: c.surface, borderColor: c.border, borderWidth: 1, borderRadius: radius.lg, padding: spacing.md }, style]}>{children}</View>;
}

type BtnVariant = "primary" | "accent" | "ghost" | "soft" | "danger";
export function Button({ label, onPress, variant = "primary", loading, disabled, style }: { label: string; onPress?: () => void; variant?: BtnVariant; loading?: boolean; disabled?: boolean; style?: ViewStyle }) {
  const c = useColors();
  const map: Record<BtnVariant, { bg: string; fg: string; border?: string }> = {
    primary: { bg: c.brand, fg: "#fff" },
    accent: { bg: c.accent, fg: "#1a1205" },
    ghost: { bg: c.surface, fg: c.text, border: c.borderStrong },
    soft: { bg: c.brand50, fg: c.brand },
    danger: { bg: c.dangerBg, fg: c.danger },
  };
  const s = map[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        { backgroundColor: s.bg, borderColor: s.border ?? "transparent", borderWidth: s.border ? 1 : 0, borderRadius: radius.pill, paddingVertical: 13, paddingHorizontal: 20, alignItems: "center", justifyContent: "center", opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={s.fg} /> : <Text style={{ color: s.fg, fontWeight: "700", fontSize: 15 }}>{label}</Text>}
    </Pressable>
  );
}

type Tone = "brand" | "accent" | "success" | "danger" | "warning" | "neutral";
export function Badge({ label, tone = "neutral" }: { label: string; tone?: Tone }) {
  const c = useColors();
  const map: Record<Tone, { bg: string; fg: string }> = {
    brand: { bg: c.brand50, fg: c.brand },
    accent: { bg: c.accent50, fg: c.accent600 },
    success: { bg: c.successBg, fg: c.success },
    danger: { bg: c.dangerBg, fg: c.danger },
    warning: { bg: c.warningBg, fg: c.warning },
    neutral: { bg: c.bgAlt, fg: c.textSoft },
  };
  const s = map[tone];
  return (
    <View style={{ backgroundColor: s.bg, borderRadius: radius.pill, paddingVertical: 3, paddingHorizontal: 10, alignSelf: "flex-start" }}>
      <Text style={{ color: s.fg, fontSize: 12, fontWeight: "700" }}>{label}</Text>
    </View>
  );
}

export function Field({ label, ...props }: { label: string } & TextInputProps) {
  const c = useColors();
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: c.textSoft, fontWeight: "600", fontSize: 13 }}>{label}</Text>
      <TextInput
        placeholderTextColor={c.textMuted}
        {...props}
        style={[{ backgroundColor: c.surface, color: c.text, borderColor: c.borderStrong, borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15 }, props.style as object]}
      />
    </View>
  );
}

export function H1({ children }: { children: React.ReactNode }) {
  const c = useColors();
  return <Text style={{ color: c.text, fontSize: 24, fontWeight: "800", letterSpacing: -0.5 }}>{children}</Text>;
}
export function H2({ children }: { children: React.ReactNode }) {
  const c = useColors();
  return <Text style={{ color: c.text, fontSize: 18, fontWeight: "700" }}>{children}</Text>;
}
export function Muted({ children, style }: { children: React.ReactNode; style?: object }) {
  const c = useColors();
  return <Text style={[{ color: c.textMuted, fontSize: 13 }, style]}>{children}</Text>;
}
export function Body({ children, style }: { children: React.ReactNode; style?: object }) {
  const c = useColors();
  return <Text style={[{ color: c.text, fontSize: 15 }, style]}>{children}</Text>;
}

export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const c = useColors();
  const init = name.split(" ").map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: c.brand, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: "#fff", fontWeight: "800", fontSize: size * 0.36 }}>{init}</Text>
    </View>
  );
}

export const ui = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
});

export function useC(): Palette {
  return useColors();
}
