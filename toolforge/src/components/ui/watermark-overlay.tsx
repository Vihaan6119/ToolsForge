interface WatermarkOverlayProps {
  text?: string;
}

export default function WatermarkOverlay({ text = "TOOLFORGE.COM" }: WatermarkOverlayProps) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
      <div className="absolute inset-0 bg-slate-950/20 backdrop-blur-[1px]" />
      <div className="absolute inset-[-45%] rotate-[-18deg]">
        <div className="grid grid-cols-2 gap-x-12 gap-y-10 opacity-30 sm:grid-cols-3">
          {Array.from({ length: 24 }).map((_, index) => (
            <span
              key={`${text}-${index}`}
              className="select-none text-xl font-bold tracking-[0.35em] text-white/80"
            >
              {text}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
