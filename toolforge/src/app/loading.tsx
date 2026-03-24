export default function Loading() {
  return (
    <div className="mx-auto w-[min(1120px,92vw)] py-16">
      <div className="h-16 animate-pulse rounded-2xl bg-white/10" />
      <div className="mt-8 h-64 animate-pulse rounded-3xl bg-white/8" />
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-52 animate-pulse rounded-2xl bg-white/8" />
        ))}
      </div>
    </div>
  );
}
