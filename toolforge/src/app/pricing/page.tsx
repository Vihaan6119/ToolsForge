import Navbar from "@/components/ui/navbar";
import Link from "next/link";

export default function PricingPage() {
  return (
    <div className="relative pb-16">
      <Navbar />
      <main className="mx-auto w-[min(980px,92vw)] space-y-8">
        <section className="rounded-3xl border border-white/12 bg-white/5 p-6 shadow-2xl shadow-cyan-950/30 backdrop-blur-xl sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">Pricing</p>
          <h1 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">Premium Plan</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-300 sm:text-base">
            Premium checkout is not enabled yet. You can still review plan benefits and continue using free tools.
          </p>
        </section>

        <section className="rounded-2xl border border-cyan-300/35 bg-linear-to-br from-cyan-300/20 via-blue-300/10 to-transparent p-6 shadow-xl shadow-cyan-950/50">
          <h2 className="text-2xl font-semibold text-white">$9/month</h2>
          <p className="mt-1 text-sm text-slate-200">For creators, teams, and high-frequency workflows.</p>

          <ul className="mt-5 space-y-2 text-sm text-slate-100">
            <li>Unlimited uses on premium tools</li>
            <li>No watermark on exports</li>
            <li>Priority processing queue</li>
            <li>Advanced editing controls</li>
            <li>Priority support</li>
          </ul>

          <div className="mt-6 flex flex-wrap gap-2">
            <button
              type="button"
              disabled
              className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 opacity-50"
              aria-disabled="true"
            >
              Subscribe (Coming Soon)
            </button>
            <Link
              href="/contact"
              className="rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15"
            >
              Contact Sales
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
