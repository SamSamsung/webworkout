import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "IronQuest — la musculation qui se joue",
    template: "%s · IronQuest",
  },
  description:
    "Base de données d'exercices de musculation exhaustive, suivi de records, séances chronométrées, XP, badges et défis entre amis.",
  applicationName: "IronQuest",
  keywords: ["musculation", "exercices", "fitness", "poids du corps", "street workout", "programme", "records"],
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "IronQuest" },
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
      <body className="antialiased">{children}</body>
    </html>
  );
}
