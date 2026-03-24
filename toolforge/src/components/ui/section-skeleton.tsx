export default function SectionSkeleton() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <div className="h-5 w-40 animate-pulse rounded bg-white/15" />
      <div className="mt-3 h-4 w-72 max-w-full animate-pulse rounded bg-white/10" />
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-28 animate-pulse rounded-xl bg-white/10" />
        ))}
      </div>
    </div>
  );
}
