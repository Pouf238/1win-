import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { LanguageProvider } from "@/i18n/LanguageProvider";
import { AuthProvider } from "@/providers/AuthProvider";
import { ToastProvider } from "@/components/Toast";

export const metadata: Metadata = {
  title: "Assur Chap — L'assurance auto digitale",
  description: "Souscrivez, payez par Mobile Money et recevez votre contrat d'assurance auto en moins de 3 minutes.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/favicon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#1F7A8C",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        <ThemeProvider>
          <LanguageProvider>
            <AuthProvider>
              <ToastProvider>{children}</ToastProvider>
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
