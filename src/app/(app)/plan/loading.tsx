import { PlanRowSkeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="h-8 w-48 bg-muted" />
      {Array.from({ length: 5 }).map((_, i) => (
        <PlanRowSkeleton key={i} />
      ))}
    </div>
  );
}
