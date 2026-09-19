import type { Metadata } from "next";
import { WorkoutEditor } from "@/components/workouts/WorkoutEditor";

export const metadata: Metadata = { title: "Éditer une séance" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <WorkoutEditor templateId={id} />;
}
