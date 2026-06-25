// ==========================================================================
// Assur Chap Mobile — Thème (couleurs de marque, clair/sombre)
// ==========================================================================
import { useColorScheme } from "react-native";

export interface Palette {
  brand: string;
  brand700: string;
  brand50: string;
  accent: string;
  accent600: string;
  accent50: string;
  success: string;
  successBg: string;
  danger: string;
  dangerBg: string;
  warning: string;
  warningBg: string;
  bg: string;
  bgAlt: string;
  surface: string;
  surface2: string;
  border: string;
  borderStrong: string;
  text: string;
  textSoft: string;
  textMuted: string;
}

const light: Palette = {
  brand: "#1F7A8C",
  brand700: "#155767",
  brand50: "#e9f3f5",
  accent: "#F4A62A",
  accent600: "#e2961b",
  accent50: "#fdf3e0",
  success: "#1f9d6b",
  successBg: "#e7f6ef",
  danger: "#d64545",
  dangerBg: "#fbeaea",
  warning: "#d98a17",
  warningBg: "#fbf2e2",
  bg: "#FFFFFF",
  bgAlt: "#F5F5F5",
  surface: "#FFFFFF",
  surface2: "#fafbfc",
  border: "#e6e8eb",
  borderStrong: "#d3d7dc",
  text: "#131a1d",
  textSoft: "#4a565c",
  textMuted: "#7b878d",
};

const dark: Palette = {
  brand: "#38a9bf",
  brand700: "#2f98ad",
  brand50: "#112a30",
  accent: "#f7b347",
  accent600: "#f7b347",
  accent50: "#2a210f",
  success: "#1f9d6b",
  successBg: "#102a20",
  danger: "#e06a6a",
  dangerBg: "#2c1414",
  warning: "#e0a23a",
  warningBg: "#2b2210",
  bg: "#0c1416",
  bgAlt: "#0f1b1e",
  surface: "#122023",
  surface2: "#16282c",
  border: "#1e3338",
  borderStrong: "#2a474d",
  text: "#eef4f5",
  textSoft: "#b4c4c8",
  textMuted: "#7e9298",
};

export const radius = { sm: 10, md: 16, lg: 22, pill: 999 };
export const spacing = { xs: 6, sm: 10, md: 16, lg: 22, xl: 28 };

export function useColors(): Palette {
  const scheme = useColorScheme();
  return scheme === "dark" ? dark : light;
}

export function useIsDark(): boolean {
  return useColorScheme() === "dark";
}
