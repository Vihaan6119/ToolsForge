import Footer from "@/components/home/footer";
import HeroSection from "@/components/home/hero-section";
import Navbar from "@/components/ui/navbar";
import SectionSkeleton from "@/components/ui/section-skeleton";
import dynamic from "next/dynamic";

const ToolsGridSection = dynamic(() => import("@/components/home/tools-grid-section"), {
  loading: () => <SectionSkeleton />,
});

const PopularToolsSection = dynamic(() => import("@/components/home/popular-tools-section"), {
  loading: () => <SectionSkeleton />,
});

const FeaturesSection = dynamic(() => import("@/components/home/features-section"), {
  loading: () => <SectionSkeleton />,
});

const PricingSection = dynamic(() => import("@/components/home/pricing-section"), {
  loading: () => <SectionSkeleton />,
});

export default function HomePage() {
  return (
    <div className="relative pb-12">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_10%_10%,rgba(56,189,248,0.16),transparent_36%),radial-gradient(circle_at_90%_0%,rgba(59,130,246,0.14),transparent_35%),radial-gradient(circle_at_50%_110%,rgba(34,211,238,0.12),transparent_40%)]" />
      <Navbar />
      <main className="mx-auto flex w-[min(1120px,92vw)] flex-col gap-20">
        <HeroSection />
        <ToolsGridSection />
        <PopularToolsSection />
        <FeaturesSection />
        <PricingSection />
        <Footer />
      </main>
    </div>
  );
}
