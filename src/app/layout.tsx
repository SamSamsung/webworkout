import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppShell } from "@/components/AppShell";
import { Providers } from "@/components/Providers";
import { BadgeToaster } from "@/components/BadgeToaster";
import { asset } from "@/lib/base-path";

export const metadata: Metadata = {
  title: {
    default: "IronQuest — la musculation qui se joue",
    template: "%s · IronQuest",
  },
  description:
    "472 exercices détaillés, suivi de records, séances chronométrées, XP, badges et défis entre amis. Fonctionne hors ligne, sans compte.",
  applicationName: "IronQuest",
  keywords: ["musculation", "exercices", "fitness", "poids du corps", "street workout", "programme", "records", "XP"],
  manifest: asset("/manifest.webmanifest"),
  icons: { apple: asset("/apple-touch-icon.png") },
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "IronQuest" },
  openGraph: {
    title: "IronQuest — la musculation qui se joue",
    description: "La base d'exercices la plus complète, transformée en jeu de progression.",
    type: "website",
    locale: "fr_FR",
  },
};

export const viewport: Viewport = {
  themeColor: "#08070f",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="antialiased">
        <Providers>
          <AppShell>{children}</AppShell>
          <BadgeToaster />
        </Providers>
      </body>
    </html>
  );
}
