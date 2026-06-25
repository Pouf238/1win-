"use client";
import { ThemeProvider as NextThemes } from "next-themes";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemes attribute="data-theme" defaultTheme="light" enableSystem={false} disableTransitionOnChange={false}>
      {children}
    </NextThemes>
  );
}
