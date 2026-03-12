import { ContentSection } from "@/components/home/content-section";
import { CTASection } from "@/components/home/cta-section";
import { FeatureDeepDive } from "@/components/home/feature-deep-dive";
import { FeaturesSection } from "@/components/home/features-section";
import { HeroHeader } from "@/components/home/hero-header";
import { HeroSection } from "@/components/home/hero-section";
import { PersonasGrid } from "@/components/home/personas-grid";
import { WallOfLove } from "@/components/home/wall-of-love";
import { Footer } from "@/components/layout/footer";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background font-sans selection:bg-primary/20 selection:text-primary">
      <HeroHeader />

      <main className="flex-1">
        <HeroSection />
        <ContentSection />
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
