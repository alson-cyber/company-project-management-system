import { ListSkeleton } from "@/components/ui/skeleton";

export default function LoadingTeam() {
  return <ListSkeleton label="Loading team…" rows={5} />;
}
