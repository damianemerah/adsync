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
  Flash,
  Group,
  Building,
  ArrowRight,
  SystemRestart,
  ArrowLeft,
  Shop,
  Globe,
  Bag,
  User,
  Coins,
} from "iconoir-react";
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

const SELLING_METHODS = [
  {
    id: "online",
    label: "Online / Delivery",
    desc: "I ship nationwide or deliver to customers.",
    icon: Globe,
  },
  {
    id: "local",
    label: "In-Store / Local",
    desc: "Customers come to my physical location.",
    icon: Shop,
  },
  {
    id: "both",
    label: "Both",
    desc: "I have a shop but also deliver.",
    icon: Building,
  },
];

const PRICE_TIERS = [
  { id: "budget", label: "Budget / Affordable", icon: Coins },
  { id: "mid", label: "Mid-Range", icon: Coins },
  { id: "premium", label: "Premium / Luxury", icon: Coins },
];

const GENDERS = [
  { id: "female", label: "Women", icon: User },
  { id: "male", label: "Men", icon: User },
  { id: "both", label: "Everyone", icon: Group },
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
  const [sellingMethod, setSellingMethod] = useState("online");
  const [priceTier, setPriceTier] = useState("mid");
  const [customerGender, setCustomerGender] = useState("female");
  const [userRole, setUserRole] = useState("owner");
  const [selectedPlan, setSelectedPlan] = useState<string>(PLAN_IDS.GROWTH);

  const progress = (step / 5) * 100;

  const handleNext = () => {
    if (step < 5) setStep(step + 1);
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
    formData.append("sellingMethod", sellingMethod);
    formData.append("priceTier", priceTier);
    formData.append("customerGender", customerGender);
    formData.append("plan", selectedPlan);
    formData.append("userRole", userRole);

    // Call the Server Action
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
          <Flash className="h-5 w-5 fill-current" />
        </div>
        <span className="font-heading font-bold text-xl text-slate-900">
          AdSync
        </span>
      </div>

      <div className="w-full max-w-4xl">
        {/* Progress Header */}
        <div className="mb-8 px-4">
          <div className="flex justify-between text-sm font-medium text-slate-500 mb-2">
            <span>Step {step} of 5</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2 bg-slate-200" />
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
                  {step === 1 && <Building className="h-6 w-6 text-blue-400" />}
                  {step === 2 && <Bag className="h-6 w-6 text-pink-400" />}
                  {step === 3 && <User className="h-6 w-6 text-purple-400" />}
                  {step === 4 && <Flash className="h-6 w-6 text-yellow-400" />}
                  {step === 5 && <Group className="h-6 w-6 text-green-400" />}
                </div>
                <h2 className="text-2xl font-bold mb-2">
                  {step === 1 && "Create your workspace"}
                  {step === 2 && "Business Details"}
                  {step === 3 && "Tell us about you"}
                  {step === 4 && "Choose your plan"}
                  {step === 5 && "Connect accounts"}
                </h2>
                <p className="text-slate-400 leading-relaxed">
                  {step === 1 &&
                    "Start by naming your business. This is where your team will collaborate."}
                  {step === 2 &&
                    "Help our AI understand your business model for better ad targeting."}
                  {step === 3 &&
                    "We'll tailor your experience based on your role."}
                  {step === 4 &&
                    "Start your 14-day free trial. No credit card required. Cancel anytime."}
                  {step === 5 &&
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
                        Business Name
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

              {/* STEP 2: BUSINESS DETAILS (NEW) */}
              {step === 2 && (
                <div className="flex-1 flex flex-col justify-center space-y-8 max-w-md mx-auto w-full">
                  {/* Selling Method */}
                  <div className="space-y-3">
                    <Label className="text-base">How do you sell?</Label>
                    <div className="grid grid-cols-1 gap-2">
                      {SELLING_METHODS.map((method) => {
                        const Icon = method.icon;
                        return (
                          <div
                            key={method.id}
                            onClick={() => setSellingMethod(method.id)}
                            className={cn(
                              "cursor-pointer rounded-xl border p-3 flex items-center gap-3 transition-all",
                              sellingMethod === method.id
                                ? "border-blue-600 bg-blue-50/50"
                                : "border-slate-200 hover:bg-slate-50",
                            )}
                          >
                            <div className="h-10 w-10 rounded-full bg-white border flex items-center justify-center text-slate-600 shrink-0">
                              <Icon className="h-5 w-5" />
                            </div>
                            <div>
                              <div className="font-bold text-sm text-slate-900">
                                {method.label}
                              </div>
                              <div className="text-xs text-slate-500">
                                {method.desc}
                              </div>
                            </div>
                            {sellingMethod === method.id && (
                              <Check className="h-5 w-5 text-blue-600 ml-auto" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Price Tier & Gender Row */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <Label className="text-base">Pricing?</Label>
                      <div className="flex flex-col gap-2">
                        {PRICE_TIERS.map((pt) => (
                          <div
                            key={pt.id}
                            onClick={() => setPriceTier(pt.id)}
                            className={cn(
                              "cursor-pointer rounded-xl border p-2 text-center transition-all text-xs font-bold",
                              priceTier === pt.id
                                ? "border-blue-600 bg-blue-50 text-blue-700"
                                : "border-slate-200 text-slate-600 hover:bg-slate-50",
                            )}
                          >
                            {pt.label}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-base">Audience?</Label>
                      <div className="flex flex-col gap-2">
                        {GENDERS.map((g) => (
                          <div
                            key={g.id}
                            onClick={() => setCustomerGender(g.id)}
                            className={cn(
                              "cursor-pointer rounded-xl border p-2 text-center transition-all text-xs font-bold",
                              customerGender === g.id
                                ? "border-purple-600 bg-purple-50 text-purple-700"
                                : "border-slate-200 text-slate-600 hover:bg-slate-50",
                            )}
                          >
                            {g.label}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: ROLE */}
              {step === 3 && (
                <div className="flex-1 flex flex-col justify-center space-y-6 max-w-md mx-auto w-full">
                  <div className="space-y-4">
                    <Label className="text-base">
                      What describes you best?
                    </Label>
                    <div className="grid gap-3">
                      {[
                        {
                          id: "owner",
                          label: "Business Owner",
                          desc: "I own the business I want to advertise.",
                        },
                        {
                          id: "marketer",
                          label: "Marketer / Freelancer",
                          desc: "I manage ads for other businesses.",
                        },
                        {
                          id: "creator",
                          label: "Content Creator",
                          desc: "I want to boost my own content.",
                        },
                      ].map((role) => (
                        <div
                          key={role.id}
                          onClick={() => setUserRole(role.id)}
                          className={cn(
                            "cursor-pointer rounded-xl border-2 p-4 transition-all hover:bg-slate-50",
                            userRole === role.id
                              ? "border-blue-600 bg-blue-50/50"
                              : "border-slate-100 bg-white",
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-bold text-slate-900">
                                {role.label}
                              </div>
                              <div className="text-xs text-slate-500">
                                {role.desc}
                              </div>
                            </div>
                            {userRole === role.id && (
                              <Check className="h-5 w-5 text-blue-600" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 4: PRICING */}
              {step === 4 && (
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
                            : "border-slate-100 bg-white hover:border-slate-200",
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
                              : "border-slate-300",
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

              {/* STEP 5: CONNECT */}
              {step === 5 && (
                <div className="flex-1 flex flex-col justify-center space-y-6 max-w-md mx-auto w-full">
                  <div className="grid gap-4">
                    <button
                      onClick={() =>
                        (window.location.href = "/api/connect/meta")
                      }
                      className="group relative flex items-center gap-4 p-5 rounded-xl border-2 border-slate-200 hover:border-blue-600 hover:bg-blue-50 transition-all text-left"
                    >
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
                  {step === 5 && (
                    <Button
                      variant="ghost"
                      onClick={handleFinish}
                      disabled={isLoading}
                    >
                      Skip for now
                    </Button>
                  )}
                  <Button
                    onClick={step === 5 ? handleFinish : handleNext}
                    disabled={
                      (step === 1 && (!orgName || !industry)) ||
                      (step === 2 &&
                        (!sellingMethod || !priceTier || !customerGender)) ||
                      (step === 3 && !userRole)
                    }
                    className="bg-slate-900 hover:bg-slate-800 text-white min-w-[140px] h-12 rounded-xl font-bold shadow-xl shadow-slate-900/10"
                  >
                    {isLoading ? (
                      <>
                        <SystemRestart className="w-4 h-4 animate-spin mr-2" />{" "}
                        Setting up...
                      </>
                    ) : (
                      <>
                        {step === 5
                          ? "Finish Setup"
                          : step === 4
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
