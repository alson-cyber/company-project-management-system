import { DashboardSkeleton } from "@/components/ui/skeleton";

export default function LoadingProject() {
  return <DashboardSkeleton label="Loading project…" tiles={4} />;
}
