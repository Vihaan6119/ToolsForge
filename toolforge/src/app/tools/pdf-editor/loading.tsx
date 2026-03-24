export default function LoadingPdfEditor() {
  return (
    <div className="mx-auto w-[min(1120px,92vw)] py-12">
      <div className="h-40 animate-pulse rounded-3xl bg-white/8" />
      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <div className="h-130 animate-pulse rounded-2xl bg-white/8" />
        <div className="h-130 animate-pulse rounded-2xl bg-white/8" />
      </div>
    </div>
  );
}
