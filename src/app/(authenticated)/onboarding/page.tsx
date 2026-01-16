"use client";

import { PLAN_IDS } from "@/lib/constants";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Check,
  Zap,
  Users,
  Building2,
  ArrowRight,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";

import { createOrganization } from "@/actions/onboarding";

const INDUSTRIES = [
  "E-commerce (Fashion/Beauty)",
  "E-commerce (Electronics)",
  "Service Business",
  "Real Estate",
  "Food & Beverage",
  "Tech / SaaS",
  "Other",
];

const PLANS = [
  {
    id: PLAN_IDS.STARTER,
    name: "Starter",
    price: "₦10,000",
    description: "Perfect for solo founders",
    features: ["1 Ad Account", "Basic AI Targeting", "Email Support", "1 User"],
  },
  {
    id: PLAN_IDS.GROWTH,
    name: "Growth",
    price: "₦25,000",
    description: "Best for growing brands",
    features: [
      "3 Ad Accounts",
      "Advanced AI Copywriter",
      "WhatsApp Alerts",
      "3 Users",
    ],
    recommended: true,
  },
  {
    id: PLAN_IDS.AGENCY,
    name: "Agency",
    price: "₦60,000",
    description: "For digital agencies",
    features: [
      "Unlimited Accounts",
      "Client Reporting",
      "Priority Support",
      "10 Users",
    ],
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // Form State
  const [orgName, setOrgName] = useState("");
  const [industry, setIndustry] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<string>(PLAN_IDS.GROWTH);

  const progress = (step / 3) * 100;

  const handleNext = () => {
    if (step < 3) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleFinish = async () => {
    setIsLoading(true);

    // Create FormData to pass to Server Action
    const formData = new FormData();
    formData.append("orgName", orgName);
    formData.append("industry", industry);
    formData.append("plan", selectedPlan);

    // Call the Server Action
    // Note: Since the action redirects on success, we don't need to manually router.push
    const result = await createOrganization(formData);

    if (result?.error) {
      alert(result.error); // Or use a Toast
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 font-sans">
      {/* Top Logo */}
      <div className="mb-8 flex items-center gap-2">
        <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
          <Zap className="h-5 w-5 fill-current" />
        </div>
        <span className="font-heading font-bold text-xl text-slate-900">
          AdSync
        </span>
      </div>

      <div className="w-full max-w-4xl">
        {/* Progress Header */}
        <div className="mb-8 px-4">
          <div className="flex justify-between text-sm font-medium text-slate-500 mb-2">
            <span>Step {step} of 3</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress
            value={progress}
            className="h-2 bg-slate-200"
            // indicatorClassName="bg-slate-900"
          />
        </div>

        {/* Main Content Card */}
        <Card className="shadow-2xl shadow-slate-200/50 border-0 overflow-hidden bg-white">
          <div className="grid lg:grid-cols-12 min-h-[600px]">
            {/* Left Panel: Visual/Context */}
            <div className="hidden lg:flex lg:col-span-4 bg-slate-900 text-white p-10 flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600 rounded-full blur-[100px] opacity-20 -mr-20 -mt-20"></div>
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-600 rounded-full blur-[100px] opacity-20 -ml-20 -mb-20"></div>

              <div className="relative z-10">
                <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center mb-6 backdrop-blur-sm border border-white/10">
                  {step === 1 && (
                    <Building2 className="h-6 w-6 text-blue-400" />
                  )}
                  {step === 2 && <Zap className="h-6 w-6 text-yellow-400" />}
                  {step === 3 && <Users className="h-6 w-6 text-green-400" />}
                </div>
                <h2 className="text-2xl font-bold mb-2">
                  {step === 1 && "Create your workspace"}
                  {step === 2 && "Choose your plan"}
                  {step === 3 && "Connect accounts"}
                </h2>
                <p className="text-slate-400 leading-relaxed">
                  {step === 1 &&
                    "Start by naming your organization. This is where your team will collaborate."}
                  {step === 2 &&
                    "Start your 14-day free trial. No credit card required. Cancel anytime."}
                  {step === 3 &&
                    "Link your Meta or TikTok ad accounts to import your campaigns instantly."}
                </p>
              </div>

              {/* Testimonial Snippet */}
              <div className="relative z-10 bg-white/5 p-4 rounded-xl border border-white/10 backdrop-blur-md">
                <div className="flex gap-1 mb-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className="h-2 w-2 rounded-full bg-yellow-400"
                    />
                  ))}
                </div>
                <p className="text-xs text-slate-300 italic mb-2">
                  "AdSync helped me scale my shoe business to ₦5M monthly
                  revenue."
                </p>
                <p className="text-xs font-bold text-white">— Chidi, Lagos</p>
              </div>
            </div>

            {/* Right Panel: Form */}
            <div className="col-span-12 lg:col-span-8 p-8 lg:p-12 flex flex-col">
              {/* STEP 1: IDENTITY */}
              {step === 1 && (
                <div className="flex-1 flex flex-col justify-center space-y-6 max-w-md mx-auto w-full">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="orgName" className="text-base">
                        Organization Name
                      </Label>
                      <Input
                        id="orgName"
                        placeholder="e.g. Lagos Fashion Hub"
                        value={orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                        className="h-14 text-lg bg-slate-50 border-slate-200"
                        autoFocus
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="industry" className="text-base">
                        Industry
                      </Label>
                      <Select value={industry} onValueChange={setIndustry}>
                        <SelectTrigger className="h-14 text-lg bg-slate-50 border-slate-200">
                          <SelectValue placeholder="Select industry" />
                        </SelectTrigger>
                        <SelectContent>
                          {INDUSTRIES.map((ind) => (
                            <SelectItem key={ind} value={ind}>
                              {ind}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: PRICING */}
              {step === 2 && (
                <div className="flex-1 flex flex-col gap-4 overflow-y-auto">
                  <div className="grid gap-4">
                    {PLANS.map((plan) => (
                      <div
                        key={plan.id}
                        onClick={() => setSelectedPlan(plan.id)}
                        className={cn(
                          "relative flex cursor-pointer rounded-xl border-2 p-5 transition-all hover:shadow-md",
                          selectedPlan === plan.id
                            ? "border-blue-600 bg-blue-50/50"
                            : "border-slate-100 bg-white hover:border-slate-200"
                        )}
                      >
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="font-bold text-slate-900">
                              {plan.name}
                            </h3>
                            {plan.recommended && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-600 text-white uppercase tracking-wide">
                                Recommended
                              </span>
                            )}
                          </div>
                          <div className="flex items-baseline gap-1 mb-2">
                            <span className="text-2xl font-black text-slate-900">
                              {plan.price}
                            </span>
                            <span className="text-sm text-slate-500 font-medium">
                              /mo
                            </span>
                          </div>
                          <p className="text-sm text-slate-600 mb-3">
                            {plan.description}
                          </p>
                          <div className="flex flex-wrap gap-x-4 gap-y-2">
                            {plan.features.map((feature) => (
                              <span
                                key={feature}
                                className="flex items-center text-xs text-slate-700 font-medium"
                              >
                                <Check className="w-3 h-3 text-green-500 mr-1.5 shrink-0" />
                                {feature}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div
                          className={cn(
                            "w-6 h-6 rounded-full border-2 flex items-center justify-center ml-4 mt-1 transition-colors",
                            selectedPlan === plan.id
                              ? "border-blue-600 bg-blue-600"
                              : "border-slate-300"
                          )}
                        >
                          {selectedPlan === plan.id && (
                            <Check className="w-3 h-3 text-white" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 3: CONNECT */}
              {step === 3 && (
                <div className="flex-1 flex flex-col justify-center space-y-6 max-w-md mx-auto w-full">
                  <div className="grid gap-4">
                    <button className="group relative flex items-center gap-4 p-5 rounded-xl border-2 border-slate-200 hover:border-blue-600 hover:bg-blue-50 transition-all text-left">
                      <div className="w-12 h-12 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
                        <svg
                          className="w-6 h-6 text-white"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900">
                          Connect Meta
                        </h3>
                        <p className="text-sm text-slate-500">
                          Facebook & Instagram Ads
                        </p>
                      </div>
                      <ArrowRight className="ml-auto w-5 h-5 text-slate-300 group-hover:text-blue-600 transition-colors" />
                    </button>

                    <button className="group relative flex items-center gap-4 p-5 rounded-xl border-2 border-slate-200 hover:border-black hover:bg-slate-50 transition-all text-left">
                      <div className="w-12 h-12 rounded-lg bg-black flex items-center justify-center shrink-0">
                        <span className="font-black text-white text-lg">
                          Tk
                        </span>
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900">
                          Connect TikTok
                        </h3>
                        <p className="text-sm text-slate-500">
                          TikTok Ads Manager
                        </p>
                      </div>
                      <ArrowRight className="ml-auto w-5 h-5 text-slate-300 group-hover:text-black transition-colors" />
                    </button>
                  </div>

                  <p className="text-center text-xs text-slate-400">
                    You can connect more accounts later in Settings.
                  </p>
                </div>
              )}

              {/* Navigation Footer */}
              <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between">
                <Button
                  variant="ghost"
                  onClick={handleBack}
                  disabled={step === 1 || isLoading}
                  className="text-slate-500 hover:text-slate-900"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </Button>

                <div className="flex gap-3 items-center">
                  {step === 3 && (
                    <Button
                      variant="ghost"
                      onClick={handleFinish}
                      disabled={isLoading}
                    >
                      Skip for now
                    </Button>
                  )}
                  <Button
                    onClick={step === 3 ? handleFinish : handleNext}
                    disabled={step === 1 && (!orgName || !industry)}
                    className="bg-slate-900 hover:bg-slate-800 text-white min-w-[140px] h-12 rounded-xl font-bold shadow-xl shadow-slate-900/10"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />{" "}
                        Setting up...
                      </>
                    ) : (
                      <>
                        {step === 3
                          ? "Finish Setup"
                          : step === 2
                          ? "Continue to Trial"
                          : "Continue"}{" "}
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <p className="text-center mt-8 text-sm text-slate-400">
          Need help?{" "}
          <Link
            href="#"
            className="text-blue-600 font-semibold hover:underline"
          >
            Chat with support
          </Link>
        </p>
      </div>
    </div>
  );
}
