import {
  PageHeaderSkeleton,
  PlanRowSkeleton,
} from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <PageHeaderSkeleton />
      {Array.from({ length: 5 }).map((_, i) => (
        <PlanRowSkeleton key={i} />
      ))}
    </div>
  );
}
