import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle, Flash, StatsReport } from "iconoir-react";

export function SmartOptimizationSection() {
  return (
    <section className="py-16 md:py-32 bg-background overflow-hidden">
      <div className="container">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-24">
          {/* Left Visual - Image */}
          <div className="w-full lg:w-1/2 relative mb-12 lg:mb-0">
            <div className="bg-linear-to-b from-blue-100/50 to-transparent p-1 rounded-3xl relative">
              <div className="aspect-4/3 relative rounded-2xl overflow-hidden bg-white shadow-xl border border-blue-50">
                {/* Generated Smart Optimization Dashboard Image */}
                <Image
                  src="/images/smart-optimization-dashboard.png"
                  alt="Smart Optimization Dashboard"
                  width={800}
                  height={600}
                  className="object-cover w-full h-full"
                />
              </div>

              {/* Floating Badge */}
              <div className="absolute -bottom-6 -right-6 bg-white p-4 rounded-2xl shadow-lg border border-blue-50 animate-bounce-slow hidden md:block">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-bold uppercase">
                      Status
                    </p>
                    <p className="font-bold text-foreground">Rule Active</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Decorative Elements */}
            <div className="absolute -top-12 -left-12 w-32 h-32 bg-blue-200/30 rounded-full blur-2xl -z-10" />
            <div className="absolute -bottom-12 -right-12 w-40 h-40 bg-purple-200/30 rounded-full blur-2xl -z-10" />
          </div>

          {/* Right Content */}
          <div className="w-full lg:w-1/2 space-y-8">
            <Badge
              variant="secondary"
              className="bg-blue-100 text-blue-700 hover:bg-blue-100 px-4 py-1.5 rounded-full text-xs font-bold tracking-wide uppercase"
            >
              Smart Optimization
            </Badge>

            <h2 className="font-heading text-4xl md:text-5xl font-bold text-foreground leading-tight">
              Automate your daily <br />
              <span className="text-blue-600">Optimizations</span>
            </h2>

            <p className="text-xl text-muted-foreground leading-relaxed">
              Stop checking your ads 10 times a day. Set up smart rules to
              automatically pause losing ads, increase budgets for winners, and
              get notified when something important happens.
            </p>

            <div className="grid gap-6">
              <div className="flex items-start gap-4 p-4 rounded-2xl hover:bg-white hover:shadow-sm transition-all border border-transparent hover:border-blue-50">
                <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                  <StatsReport className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-foreground text-lg mb-1">
                    Auto-Stop Loss
                  </h4>
                  <p className="text-muted-foreground text-sm">
                    Automatically pause ads when CPA exceeds your limit to save
                    budget.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-2xl hover:bg-white hover:shadow-sm transition-all border border-transparent hover:border-blue-50">
                <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                  <Flash className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-foreground text-lg mb-1">
                    Smart Scaling
                  </h4>
                  <p className="text-muted-foreground text-sm">
                    Increase budget by 20% daily for high-ROAS campaigns
                    automatically.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4">
              <Button className="h-14 px-8 rounded-3xl bg-blue-600 hover:bg-blue-700 text-white shadow-soft font-bold text-lg group">
                Create Automation Rules
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
