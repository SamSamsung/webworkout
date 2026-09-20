import type { Metadata } from "next";
import { ChallengesPage } from "@/components/challenges/ChallengesPage";

export const metadata: Metadata = {
  title: "Défis chronométrés",
  description:
    "Bring Sally Up, gainage maximal, suspension, chaise au mur : des défis au chronomètre avec paliers à décrocher et record personnel.",
};

export default function Page() {
  return <ChallengesPage />;
}
