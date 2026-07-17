import { DashboardSkeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl py-2">
      <DashboardSkeleton />
    </div>
  );
}
