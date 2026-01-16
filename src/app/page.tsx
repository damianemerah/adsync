import Image from "next/image";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  CheckCircle2,
  MessageSquare,
  Sparkles,
  Target,
  Zap,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 font-sans">
      <Navbar />

      <main className="flex-1">
        {/* HERO */}
        <section className="relative pt-20 pb-32 overflow-hidden bg-white">
          <div className="container mx-auto px-4 text-center">
            {/* <Badge variant="secondary" className="mb-6 px-4 py-1.5 rounded-full text-blue-700 bg-blue-50 font-semibold border-blue-100">
              ✨ Now serving 2,000+ Nigerian SMEs
            </Badge> */}

            <h1 className="font-heading text-5xl font-bold text-slate-900 tracking-tight mb-6 max-w-4xl mx-auto leading-tight">
              Run Professional Ads on <br />
              <span className="text-blue-600">Meta & TikTok</span>
              <br />
              in 2 Minutes.
            </h1>

            {/* <p className="text-lg md:text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed">
              AdSync uses AI to handle the targeting, copywriting, and monitoring for you.
              Fund your wallet in Naira. Get alerts on WhatsApp.
            </p> */}

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button
                size="lg"
                className="h-14 px-8 text-lg rounded-xl bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-600/20 font-bold"
              >
                Start Free Trial
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-14 px-8 text-lg rounded-xl border-2 font-bold text-slate-700 hover:bg-slate-50"
              >
                View Demo
              </Button>
            </div>

            {/* Hero Image Mockup */}
            <div className="-mt-6 mx-auto max-w-7xl">
              <div className=" aspect-video relative rounded-md">
                <Image
                  src="/images/Homepage-BigHero.webp"
                  alt="Dashboard Screenshot"
                  width={1920}
                  height={1080}
                  priority
                  className="absolute inset-0 w-full h-full object-contain rounded-md"
                />
              </div>
            </div>
          </div>
        </section>

        {/* LOGOS */}
        <section className="py-10 border-y border-slate-100 bg-white">
          <div className="container mx-auto px-4">
            <p className="text-center text-sm font-semibold text-slate-400 uppercase tracking-widest mb-6">
              Trusted By
            </p>
            <div className="flex flex-wrap justify-center gap-12 opacity-50 grayscale hover:grayscale-0 transition-all">
              {/* Replace with your logos */}
              {["Shopify", "Paystack", "Flutterwave", "PiggyVest"].map(
                (logo) => (
                  <span key={logo} className="text-xl font-bold text-slate-800">
                    {logo}
                  </span>
                )
              )}
            </div>
          </div>
        </section>

        {/* FEATURES GRID */}
        <section id="features" className="py-24 bg-slate-50">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="font-heading text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                Everything you need to grow.
              </h2>
              <p className="text-lg text-slate-600">
                We stripped away the complexity of Ads Manager and replaced it
                with intelligence.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <FeatureCard
                icon={Sparkles}
                title="AI Consultant"
                desc="Tell us what you sell. Our AI builds the audience and writes the copy instantly."
                color="text-purple-600"
                bg="bg-purple-50"
              />
              <FeatureCard
                icon={MessageSquare}
                title="WhatsApp Alerts"
                desc="Get notified instantly if your ad account runs out of money or an ad is rejected."
                color="text-green-600"
                bg="bg-green-50"
              />
              <FeatureCard
                icon={Target}
                title="Smart Targeting"
                desc="We validate every interest against the Meta API to ensure your ads actually run."
                color="text-blue-600"
                bg="bg-blue-50"
              />
              <FeatureCard
                icon={Zap}
                title="Instant Launch"
                desc="Launch campaigns to Facebook, Instagram, and TikTok from one dashboard."
                color="text-orange-600"
                bg="bg-orange-50"
              />
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24 bg-[#0F172A] text-white">
          <div className="container mx-auto px-4 text-center">
            <h2 className="font-heading text-3xl md:text-5xl font-bold mb-6">
              Ready to scale your business?
            </h2>
            <p className="text-slate-300 text-lg mb-8 max-w-xl mx-auto">
              Join 2,000+ Nigerian business owners who switched to AdSync.
            </p>
            <Button
              size="lg"
              className="h-14 px-10 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold text-lg"
            >
              Get Started Now
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

// Helper Component for Feature Cards
function FeatureCard({ icon: Icon, title, desc, color, bg }: any) {
  return (
    <Card className="p-8 border-0 shadow-sm hover:shadow-xl transition-shadow duration-300">
      <div
        className={`h-12 w-12 rounded-xl ${bg} flex items-center justify-center mb-6`}
      >
        <Icon className={`h-6 w-6 ${color}`} />
      </div>
      <h3 className="font-heading text-xl font-bold text-slate-900 mb-3">
        {title}
      </h3>
      <p className="text-slate-600 leading-relaxed font-medium">{desc}</p>
    </Card>
  );
}
