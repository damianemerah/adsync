import { ContentSection } from "@/components/home/content-section";
import { CTASection } from "@/components/home/cta-section";
import { FeatureDeepDive } from "@/components/home/feature-deep-dive";
import { FeaturesSection } from "@/components/home/features-section";
import { HeroHeader } from "@/components/home/hero-header";
import { HeroSection } from "@/components/home/hero-section";
import { PersonasGrid } from "@/components/home/personas-grid";
import { WallOfLove } from "@/components/home/wall-of-love";
import { Footer } from "@/components/layout/footer";

function TrustBar() {
  return (
    <div className="w-full bg-background border-b border-border py-8 overflow-hidden flex items-center justify-center">
      <div className="container px-6 flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-50 grayscale hover:grayscale-0 transition-all duration-300">
        <span className="font-bold text-xl font-heading">Meta</span>
        <span className="font-bold text-xl font-heading">WhatsApp</span>
        <span className="font-bold text-xl font-heading">Paystack</span>
        <span className="font-bold text-xl font-heading">OpenAI</span>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background font-sans selection:bg-primary/20 selection:text-primary">
      <HeroHeader />

      <main className="flex-1">
        <HeroSection />
        <ContentSection />
        <TrustBar />
        <FeatureDeepDive />
        <FeaturesSection />
        <PersonasGrid />
        <WallOfLove />
        <CTASection />
      </main>

      <Footer />
    </div>
  );
}
