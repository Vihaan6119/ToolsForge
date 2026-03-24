interface ToolPanelProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

export default function ToolPanel({ title, description, children }: ToolPanelProps) {
  return (
    <section className="rounded-2xl border border-white/12 bg-white/5 p-5 shadow-xl shadow-black/20 backdrop-blur-xl">
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      {description ? <p className="mt-1 text-sm text-slate-300">{description}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}