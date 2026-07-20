import {
  ContentSlotSkeleton,
  PageHeaderSkeleton,
} from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeaderSkeleton />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <ContentSlotSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
