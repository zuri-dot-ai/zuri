import {
  ContentDayGroupSkeleton,
  PageHeaderSkeleton,
} from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeaderSkeleton />
      <div className="space-y-5">
        {Array.from({ length: 3 }).map((_, i) => (
          <ContentDayGroupSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
