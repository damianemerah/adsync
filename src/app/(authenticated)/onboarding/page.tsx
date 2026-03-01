"use client";

import {
  PLAN_IDS,
  PLAN_PRICES,
  PLAN_CREDITS,
  TIER_CONFIG,
} from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea"; // Added Textarea
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
    price: formatCurrency(PLAN_PRICES.starter),
    description: "Perfect for solo hustlers",
    features: [
      `${TIER_CONFIG.starter.limits.maxAdAccounts} Ad Account`,
      `${PLAN_CREDITS.starter} AI Credits/mo`,
      "AI Copy & Images",
      "Email Support",
      `${TIER_CONFIG.starter.limits.maxTeamMembers} User`,
    ],
  },
  {
    id: PLAN_IDS.GROWTH,
    name: "Growth",
    price: formatCurrency(PLAN_PRICES.growth),
    description: "Best for growing brands",
    features: [
      `${TIER_CONFIG.growth.limits.maxAdAccounts} Ad Accounts`,
      `${PLAN_CREDITS.growth} AI Credits/mo`,
      "Advanced AI with Industry Skills",
      "WhatsApp Alerts",
      `${TIER_CONFIG.growth.limits.maxTeamMembers} Users`,
    ],
    recommended: true,
  },
  {
    id: PLAN_IDS.AGENCY,
    name: "Agency",
    price: formatCurrency(PLAN_PRICES.agency),
    description: "For digital agencies",
    features: [
      "Unlimited Accounts",
      `${formatCurrency(PLAN_CREDITS.agency).replace("₦", "")} AI Credits/mo`, // formatting large number
      "Premium AI + Reporting",
      "Priority Support",
      `${TIER_CONFIG.agency.limits.maxTeamMembers} Users`,
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
  const [businessDescription, setBusinessDescription] = useState("");
  const [sellingMethod, setSellingMethod] = useState("online");
  const [priceTier, setPriceTier] = useState("mid");
  const [customerGender, setCustomerGender] = useState("female");
  const [userRole, setUserRole] = useState("owner");
  const [selectedPlan, setSelectedPlan] = useState<string>(PLAN_IDS.GROWTH);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("onboarding_state");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.step) setStep(parsed.step);
        if (parsed.orgName) setOrgName(parsed.orgName);
        if (parsed.industry) setIndustry(parsed.industry);
        if (parsed.businessDescription)
          setBusinessDescription(parsed.businessDescription);
        if (parsed.sellingMethod) setSellingMethod(parsed.sellingMethod);
        if (parsed.priceTier) setPriceTier(parsed.priceTier);
        if (parsed.customerGender) setCustomerGender(parsed.customerGender);
        if (parsed.userRole) setUserRole(parsed.userRole);
        if (parsed.selectedPlan) setSelectedPlan(parsed.selectedPlan);
      } catch (e) {
        console.error("Error parsing onboarding state", e);
      }
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      const state = {
        step,
        orgName,
        industry,
        businessDescription,
        sellingMethod,
        priceTier,
        customerGender,
        userRole,
        selectedPlan,
      };
      localStorage.setItem("onboarding_state", JSON.stringify(state));
    }
  }, [
    isLoaded,
    step,
    orgName,
    industry,
    businessDescription,
    sellingMethod,
    priceTier,
    customerGender,
    userRole,
    selectedPlan,
  ]);

  const progress = (step / 5) * 100;

  const handleNext = () => {
    if (step < 5) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleConnect = async (url: string) => {
    setIsLoading(true);

    const formData = new FormData();
    formData.append("orgName", orgName);
    formData.append("industry", industry);
    formData.append("sellingMethod", sellingMethod);
    formData.append("priceTier", priceTier);
    formData.append("customerGender", customerGender);
    formData.append("plan", selectedPlan);
    formData.append("userRole", userRole);
    formData.append("businessDescription", businessDescription);

    // Create the organization but don't redirect to dashboard
    const result = await createOrganization(formData, false);

    if (result?.error) {
      alert(result.error);
      setIsLoading(false);
      return;
    }

    // After success, navigate to the provider connect URL
    window.location.href = url;
  };

  const handleFinish = async () => {
    setIsLoading(true);
    localStorage.removeItem("onboarding_state");

    // Create FormData to pass to Server Action
    const formData = new FormData();
    formData.append("orgName", orgName);
    formData.append("industry", industry);
    formData.append("sellingMethod", sellingMethod);
    formData.append("priceTier", priceTier);
    formData.append("customerGender", customerGender);
    formData.append("plan", selectedPlan);
    formData.append("userRole", userRole);
    formData.append("businessDescription", businessDescription);

    // Call the Server Action
    const result = await createOrganization(formData, true);

    if (result?.error) {
      alert(result.error); // Or use a Toast
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col items-center justify-center p-4 font-sans">
      {/* Top Logo */}
      <div className="mb-8 flex items-center gap-2">
        <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
          <Flash className="h-5 w-5 fill-current" />
        </div>
        <span className="font-heading font-bold text-xl text-foreground">
          Sellam
        </span>
      </div>

      <div className="w-full max-w-4xl">
        {/* Progress Header */}
        <div className="mb-8 px-4">
          <div className="flex justify-between text-sm font-medium text-subtle-foreground mb-2">
            <span>Step {step} of 5</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2 bg-slate-200" />
        </div>

        {/* Main Content Card */}
        <Card className="shadow-2xl shadow-slate-200/50 border-0 overflow-hidden bg-white">
          <div className="grid lg:grid-cols-12 min-h-[600px]">
            {/* Left Panel: Visual/Context */}
            <div className="hidden lg:flex lg:col-span-4 bg-foreground text-background p-10 flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary rounded-full blur-[100px] opacity-20 -mr-20 -mt-20"></div>
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-ai rounded-full blur-[100px] opacity-20 -ml-20 -mb-20"></div>

              <div className="relative z-10">
                <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center mb-6 backdrop-blur-sm border border-white/10">
                  {step === 1 && <Building className="h-6 w-6 text-primary" />}
                  {step === 2 && <Bag className="h-6 w-6 text-pink-400" />}
                  {step === 3 && <User className="h-6 w-6 text-ai" />}
                  {step === 4 && <Flash className="h-6 w-6 text-yellow-400" />}
                  {step === 5 && <Group className="h-6 w-6 text-green-400" />}
                </div>
                <h2 className="text-2xl font-bold mb-2">
                  {step === 1 && "Create your workspace"}
                  {step === 2 && "Business Details"}
                  {step === 3 && "Tell us about you"}
                  {step === 4 && "Choose your membership"}
                  {step === 5 && "Connect ad accounts"}
                </h2>
                <p className="text-primary-foreground/70 leading-relaxed">
                  {step === 1 &&
                    "Start by naming your business. This is where you track your sales."}
                  {step === 2 &&
                    "Help our AI understand your business model so we can help you get more sales."}
                  {step === 3 &&
                    "We'll tailor your experience based on your role."}
                  {step === 4 &&
                    "Start your 14-day free access. No international card required. Cancel anytime."}
                  {step === 5 &&
                    "Link your Facebook, Instagram, or TikTok accounts to import your past ads instantly."}
                </p>
              </div>

              {/* Testimonial Snippet */}
              <div className="relative z-10 bg-white/5 p-5 rounded-3xl border border-white/10 backdrop-blur-md">
                <div className="flex gap-1 mb-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className="h-2.5 w-2.5 rounded-full bg-yellow-400"
                    />
                  ))}
                </div>
                <p className="text-sm text-primary-foreground/90 italic mb-3">
                  "Sellam helped me scale my shoe business to ₦5M monthly
                  sales."
                </p>
                <p className="text-xs font-bold text-primary-foreground">
                  — Chidi, Lagos
                </p>
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
                        className="h-14 text-lg bg-muted/30 border-border"
                        autoFocus
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="industry" className="text-base">
                        Industry
                      </Label>
                      <Select value={industry} onValueChange={setIndustry}>
                        <SelectTrigger className="h-14 text-lg bg-muted/30 border-border">
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

                    <div className="space-y-2">
                      <Label
                        htmlFor="businessDescription"
                        className="text-base flex justify-between items-center"
                      >
                        <span>What do you do?</span>
                        <span className="text-xs text-subtle-foreground font-normal">
                          Optional
                        </span>
                      </Label>
                      <Textarea
                        id="businessDescription"
                        placeholder="Briefly describe your products, services, or business goals..."
                        value={businessDescription}
                        onChange={(e) => setBusinessDescription(e.target.value)}
                        className="h-24 resize-none bg-muted/30 border-border"
                      />
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
                                ? "border-primary bg-primary/10/50"
                                : "border-border hover:bg-muted/30",
                            )}
                          >
                            <div className="h-10 w-10 rounded-full bg-white border flex items-center justify-center text-subtle-foreground shrink-0">
                              <Icon className="h-5 w-5" />
                            </div>
                            <div>
                              <div className="font-bold text-sm text-foreground">
                                {method.label}
                              </div>
                              <div className="text-xs text-subtle-foreground">
                                {method.desc}
                              </div>
                            </div>
                            {sellingMethod === method.id && (
                              <Check className="h-5 w-5 text-primary ml-auto" />
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
                                ? "border-primary bg-primary/10 text-blue-700"
                                : "border-border text-subtle-foreground hover:bg-muted/30",
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
                                : "border-border text-subtle-foreground hover:bg-muted/30",
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
                          desc: "I own the business I want to get sales for.",
                        },
                        {
                          id: "marketer",
                          label: "Marketer / Freelancer",
                          desc: "I run ads for other businesses.",
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
                            "cursor-pointer rounded-xl border-2 p-4 transition-all hover:bg-muted/30",
                            userRole === role.id
                              ? "border-primary bg-primary/10/50"
                              : "border-border bg-white",
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-bold text-foreground">
                                {role.label}
                              </div>
                              <div className="text-xs text-subtle-foreground">
                                {role.desc}
                              </div>
                            </div>
                            {userRole === role.id && (
                              <Check className="h-5 w-5 text-primary" />
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
                            ? "border-primary bg-primary/10/50"
                            : "border-border bg-white hover:border-border",
                        )}
                      >
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="font-bold text-foreground">
                              {plan.name}
                            </h3>
                            {plan.recommended && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-primary text-white uppercase tracking-wide">
                                Recommended
                              </span>
                            )}
                          </div>
                          <div className="flex items-baseline gap-1 mb-2">
                            <span className="text-2xl font-black text-foreground">
                              {plan.price}
                            </span>
                            <span className="text-sm text-subtle-foreground font-medium">
                              /mo
                            </span>
                          </div>
                          <p className="text-sm text-subtle-foreground mb-3">
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
                              ? "border-primary bg-primary"
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
                      onClick={() => handleConnect("/api/connect/meta")}
                      disabled={isLoading}
                      className="group relative flex items-center gap-4 p-5 rounded-xl border-2 border-border hover:border-primary hover:bg-primary/10 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="w-12 h-12 rounded-lg bg-primary flex items-center justify-center shrink-0">
                        <svg
                          className="w-6 h-6 text-white"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-bold text-foreground">
                          Connect Meta
                        </h3>
                        <p className="text-sm text-subtle-foreground">
                          Facebook & Instagram Ads
                        </p>
                      </div>
                      <ArrowRight className="ml-auto w-5 h-5 text-slate-300 group-hover:text-primary transition-colors" />
                    </button>

                    <button
                      onClick={() => handleConnect("/api/connect/tiktok")}
                      disabled={isLoading}
                      className="group relative flex items-center gap-4 p-5 rounded-xl border-2 border-border hover:border-black hover:bg-muted/30 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="w-12 h-12 rounded-lg bg-black flex items-center justify-center shrink-0">
                        <span className="font-black text-white text-lg">
                          Tk
                        </span>
                      </div>
                      <div>
                        <h3 className="font-bold text-foreground">
                          Connect TikTok
                        </h3>
                        <p className="text-sm text-subtle-foreground">
                          TikTok Ads Manager
                        </p>
                      </div>
                      <ArrowRight className="ml-auto w-5 h-5 text-slate-300 group-hover:text-black transition-colors" />
                    </button>
                  </div>

                  <p className="text-center text-xs text-muted-foreground">
                    You can connect more accounts later in Settings.
                  </p>
                </div>
              )}

              {/* Navigation Footer */}
              <div className="mt-8 pt-6 border-t border-border flex items-center justify-between">
                <Button
                  variant="ghost"
                  onClick={handleBack}
                  disabled={step === 1 || isLoading}
                  className="text-subtle-foreground hover:text-foreground"
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

        <p className="text-center mt-8 text-sm text-muted-foreground">
          Need help?{" "}
          <Link href="#" className="text-primary font-semibold hover:underline">
            Chat with support
          </Link>
        </p>
      </div>
    </div>
  );
}
