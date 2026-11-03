import { ListSkeleton } from "@/components/ui/skeleton";

export default function LoadingFiles() {
  return <ListSkeleton label="Loading files…" rows={5} />;
}
