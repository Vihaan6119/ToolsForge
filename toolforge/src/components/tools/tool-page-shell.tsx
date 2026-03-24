import Navbar from "@/components/ui/navbar";

interface ToolPageShellProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

export default function ToolPageShell({ title, description, children }: ToolPageShellProps) {
  return (
    <div className="relative pb-16">
      <Navbar />
      <main className="mx-auto w-[min(1120px,92vw)] space-y-8">
        <section className="rounded-3xl border border-white/12 bg-white/5 p-6 shadow-2xl shadow-cyan-950/30 backdrop-blur-xl sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">Tool Workspace</p>
          <h1 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">{title}</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-300 sm:text-base">{description}</p>
        </section>

        {children}
      </main>
    </div>
  );
}