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
import { Textarea } from "@/components/ui/textarea";
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
  Star,
  Shield,
  Sparks,
} from "iconoir-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

import { createOrganization } from "@/actions/organization";
import {
  getPaymentContext,
  initializePaystackTransaction,
} from "@/actions/paystack";

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
  { id: "budget", label: "Budget / Affordable" },
  { id: "mid", label: "Mid-Range" },
  { id: "premium", label: "Premium / Luxury" },
];

const GENDERS = [
  { id: "female", label: "Women" },
  { id: "male", label: "Men" },
  { id: "both", label: "Everyone" },
];

const PLANS = [
  {
    id: PLAN_IDS.STARTER,
    name: "Starter",
    price: formatCurrency(PLAN_PRICES.starter),
    priceNum: PLAN_PRICES.starter,
    description: "Perfect for solo hustlers",
    features: [
      `${TIER_CONFIG.starter.limits.maxAdAccounts} Ad Account`,
      `${PLAN_CREDITS.starter} AI Credits/mo`,
      "AI Copy & Image Generation",
      "Email Support",
    ],
  },
  {
    id: PLAN_IDS.GROWTH,
    name: "Growth",
    price: formatCurrency(PLAN_PRICES.growth),
    priceNum: PLAN_PRICES.growth,
    description: "Best for growing brands",
    features: [
      `${TIER_CONFIG.growth.limits.maxAdAccounts} Ad Accounts`,
      `${PLAN_CREDITS.growth} AI Credits/mo`,
      "Advanced AI with Industry Skills",
      "WhatsApp Alerts",
      `${TIER_CONFIG.growth.limits.maxTeamMembers} Team Members`,
    ],
    recommended: true,
  },
  {
    id: PLAN_IDS.AGENCY,
    name: "Agency",
    price: formatCurrency(PLAN_PRICES.agency),
    priceNum: PLAN_PRICES.agency,
    description: "For digital agencies",
    features: [
      "Unlimited Ad Accounts",
      `${PLAN_CREDITS.agency} AI Credits/mo`,
      "Premium AI + Priority Support",
      `${TIER_CONFIG.agency.limits.maxTeamMembers} Team Members`,
    ],
  },
];

const LEFT_PANEL_CONTENT = [
  {
    title: "Create your workspace",
    body: "Start by naming your business. This is where all your campaigns and sales data will live.",
    quote: "Sellam helped me scale my shoe business to ₦5M monthly sales.",
    author: "Chidi, Lagos",
  },
  {
    title: "Business Details",
    body: "Help our AI understand your business model so it can craft smarter campaigns for you.",
    quote:
      "The AI knows my customers better than I did after just one campaign.",
    author: "Amaka, Abuja",
  },
  {
    title: "Tell us about you",
    body: "We'll tailor your dashboard and AI recommendations based on your role.",
    quote:
      "I manage 12 clients and Sellam cuts my campaign setup time in half.",
    author: "Tunde, Port Harcourt",
  },
  {
    title: "Start your free trial",
    body: "14 days of full access. No credit card needed. Cancel anytime. Real results from day one.",
    quote:
      "Within the first week I saw a 3× ROAS on my first campaign. Incredible.",
    author: "Chidinma, Enugu",
  },
  {
    title: "Connect your ad accounts",
    body: "Link Facebook, Instagram, or TikTok to pull in your ad history and launch your first campaign.",
    quote:
      "Setup took 5 minutes. My first campaign was live the same afternoon.",
    author: "Seun, Lagos",
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isPaymentLoading, setIsPaymentLoading] = useState(false);

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
  const panelContent = LEFT_PANEL_CONTENT[step - 1];
  const activePlan = PLANS.find((p) => p.id === selectedPlan) ?? PLANS[1];

  const buildFormData = () => {
    const formData = new FormData();
    formData.append("orgName", orgName);
    formData.append("industry", industry);
    formData.append("sellingMethod", sellingMethod);
    formData.append("priceTier", priceTier);
    formData.append("customerGender", customerGender);
    formData.append("userRole", userRole);
    formData.append("businessDescription", businessDescription);
    // Note: plan is NOT sent here — trial is always Growth (locked server-side).
    // selectedPlan is only used client-side for the "subscribe now" payment path.
    return formData;
  };

  const handleNext = () => {
    if (step < 5) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleConnect = async (url: string) => {
    setIsLoading(true);
    const result = await createOrganization(buildFormData(), {
      isOnboarding: true,
      shouldRedirect: false,
    });

    if (result?.error) {
      toast.error(result.error);
      setIsLoading(false);
      return;
    }

    window.location.href = url;
  };

  const handleFinish = async () => {
    setIsLoading(true);
    localStorage.removeItem("onboarding_state");
    const result = await createOrganization(buildFormData(), {
      isOnboarding: true,
      shouldRedirect: true,
    });
    if (result?.error) {
      toast.error(result.error);
      setIsLoading(false);
    }
  };

  const handleSubscribeNow = async () => {
    setIsPaymentLoading(true);
    try {
      // 1. Create org first so getPaymentContext can read the cookie
      const result = await createOrganization(buildFormData(), {
        isOnboarding: true,
        shouldRedirect: false,
      });
      if (result?.error) throw new Error(result.error);

      // 2. Get authenticated email + org ID
      const { email, orgId } = await getPaymentContext();

      // 3. Initialize Paystack transaction
      const callbackUrl = `${window.location.origin}/settings/subscription?success=true`;
      const { authorization_url } = await initializePaystackTransaction(
        email,
        selectedPlan,
        callbackUrl,
        orgId,
      );

      localStorage.removeItem("onboarding_state");
      window.location.href = authorization_url;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not start payment";
      toast.error(msg);
      setIsPaymentLoading(false);
    }
  };

  const isNextDisabled =
    (step === 1 && (!orgName || !industry)) ||
    (step === 2 && (!sellingMethod || !priceTier || !customerGender)) ||
    (step === 3 && !userRole);

  const stepIcons = [Building, Bag, User, Flash, Group];
  const StepIcon = stepIcons[step - 1];

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 flex flex-col items-center justify-center p-4 font-sans">
      {/* Top Logo */}
      <div className="mb-6 flex items-center gap-2">
        <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/25">
          <Flash className="h-4 w-4 text-white fill-current" />
        </div>
        <span className="font-heading font-bold text-xl text-foreground">
          Sellam
        </span>
      </div>

      <div className="w-full max-w-4xl">
        {/* Progress Header */}
        <div className="mb-5 px-1">
          <div className="flex justify-between text-xs font-medium text-muted-foreground mb-2">
            <span>Step {step} of 5</span>
            <span>{Math.round(progress)}% complete</span>
          </div>
          <Progress value={progress} className="h-1.5 bg-slate-200" />
        </div>

        {/* Main Card */}
        <Card className="shadow-2xl shadow-slate-300/30 border-0 overflow-hidden bg-white">
          <div className="grid lg:grid-cols-12 min-h-[620px]">
            {/* Left Panel */}
            <div className="hidden lg:flex lg:col-span-4 bg-foreground text-background p-10 flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-72 h-72 bg-primary rounded-full blur-[120px] opacity-15 -mr-24 -mt-24 pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-72 h-72 bg-violet-500 rounded-full blur-[120px] opacity-10 -ml-24 -mb-24 pointer-events-none" />

              <div className="relative z-10">
                <div className="h-11 w-11 rounded-2xl bg-white/10 flex items-center justify-center mb-5 border border-white/15">
                  <StepIcon className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-2xl font-bold mb-2.5 leading-tight">
                  {panelContent.title}
                </h2>
                <p className="text-white/65 leading-relaxed text-sm">
                  {panelContent.body}
                </p>
              </div>

              {/* Step indicators */}
              <div className="relative z-10 flex gap-1.5 my-6">
                {[1, 2, 3, 4, 5].map((s) => (
                  <div
                    key={s}
                    className={cn(
                      "h-1 rounded-full transition-all duration-300",
                      s === step
                        ? "w-6 bg-primary"
                        : s < step
                          ? "w-3 bg-primary/50"
                          : "w-3 bg-white/20",
                    )}
                  />
                ))}
              </div>

              {/* Testimonial */}
              <div className="relative z-10 bg-white/5 p-5 rounded-2xl border border-white/10">
                <div className="flex gap-0.5 mb-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star
                      key={i}
                      className="h-3 w-3 text-yellow-400 fill-current"
                    />
                  ))}
                </div>
                <p className="text-sm text-white/85 italic mb-3 leading-relaxed">
                  &ldquo;{panelContent.quote}&rdquo;
                </p>
                <p className="text-xs font-semibold text-white/60">
                  — {panelContent.author}
                </p>
              </div>
            </div>

            {/* Right Panel: Form */}
            <div className="col-span-12 lg:col-span-8 p-8 lg:p-12 flex flex-col">
              {/* ── STEP 1: WORKSPACE IDENTITY ── */}
              {step === 1 && (
                <div className="flex-1 flex flex-col justify-center space-y-5 max-w-md mx-auto w-full">
                  <div>
                    <h3 className="text-xl font-bold text-foreground mb-1">
                      Name your workspace
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      This is how your business will appear in Sellam.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="orgName" className="text-sm font-medium">
                        Business Name
                      </Label>
                      <Input
                        id="orgName"
                        placeholder="e.g. Lagos Fashion Hub"
                        value={orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                        className="h-12 bg-slate-50 border-slate-200 focus:border-primary focus:ring-primary/20 text-base"
                        autoFocus
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="industry" className="text-sm font-medium">
                        Industry
                      </Label>
                      <Select value={industry} onValueChange={setIndustry}>
                        <SelectTrigger className="h-12 bg-slate-50 border-slate-200 focus:border-primary text-base">
                          <SelectValue placeholder="What best describes your business?" />
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

                    <div className="space-y-1.5">
                      <Label
                        htmlFor="businessDescription"
                        className="text-sm font-medium flex justify-between"
                      >
                        What do you sell?
                        <span className="text-xs text-muted-foreground font-normal">
                          Optional — helps our AI
                        </span>
                      </Label>
                      <Textarea
                        id="businessDescription"
                        placeholder="Briefly describe your products or services..."
                        value={businessDescription}
                        onChange={(e) => setBusinessDescription(e.target.value)}
                        className="h-24 resize-none bg-slate-50 border-slate-200 focus:border-primary"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ── STEP 2: BUSINESS DETAILS ── */}
              {step === 2 && (
                <div className="flex-1 flex flex-col justify-center space-y-7 max-w-md mx-auto w-full">
                  <div>
                    <h3 className="text-xl font-bold text-foreground mb-1">
                      How does your business work?
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Our AI uses this to build smarter targeting for your ads.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      How do you sell?
                    </Label>
                    <div className="grid grid-cols-1 gap-2">
                      {SELLING_METHODS.map((method) => {
                        const Icon = method.icon;
                        const isSelected = sellingMethod === method.id;
                        return (
                          <div
                            key={method.id}
                            onClick={() => setSellingMethod(method.id)}
                            className={cn(
                              "cursor-pointer rounded-xl border-2 p-3 flex items-center gap-3 transition-all",
                              isSelected
                                ? "border-primary bg-primary/5"
                                : "border-slate-200 hover:border-slate-300 bg-white",
                            )}
                          >
                            <div
                              className={cn(
                                "h-9 w-9 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                                isSelected
                                  ? "bg-primary/10 text-primary"
                                  : "bg-slate-100 text-slate-500",
                              )}
                            >
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="flex-1">
                              <div className="font-semibold text-sm text-foreground">
                                {method.label}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {method.desc}
                              </div>
                            </div>
                            <div
                              className={cn(
                                "h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                                isSelected
                                  ? "border-primary bg-primary"
                                  : "border-slate-300",
                              )}
                            >
                              {isSelected && (
                                <Check className="h-3 w-3 text-white" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">
                        Pricing tier
                      </Label>
                      <div className="flex flex-col gap-2">
                        {PRICE_TIERS.map((pt) => (
                          <button
                            key={pt.id}
                            onClick={() => setPriceTier(pt.id)}
                            className={cn(
                              "cursor-pointer rounded-lg border-2 px-3 py-2 text-center transition-all text-xs font-semibold",
                              priceTier === pt.id
                                ? "border-primary bg-primary/5 text-primary"
                                : "border-slate-200 text-slate-500 hover:border-slate-300",
                            )}
                          >
                            {pt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">
                        Target audience
                      </Label>
                      <div className="flex flex-col gap-2">
                        {GENDERS.map((g) => (
                          <button
                            key={g.id}
                            onClick={() => setCustomerGender(g.id)}
                            className={cn(
                              "cursor-pointer rounded-lg border-2 px-3 py-2 text-center transition-all text-xs font-semibold",
                              customerGender === g.id
                                ? "border-violet-500 bg-violet-50 text-violet-700"
                                : "border-slate-200 text-slate-500 hover:border-slate-300",
                            )}
                          >
                            {g.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── STEP 3: ROLE ── */}
              {step === 3 && (
                <div className="flex-1 flex flex-col justify-center space-y-5 max-w-md mx-auto w-full">
                  <div>
                    <h3 className="text-xl font-bold text-foreground mb-1">
                      What describes you best?
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      We'll personalize your experience around your role.
                    </p>
                  </div>

                  <div className="grid gap-3">
                    {[
                      {
                        id: "owner",
                        label: "Business Owner",
                        desc: "I own the business I want to grow.",
                        icon: Building,
                      },
                      {
                        id: "marketer",
                        label: "Marketer / Freelancer",
                        desc: "I run ads for other businesses.",
                        icon: Sparks,
                      },
                      {
                        id: "creator",
                        label: "Content Creator",
                        desc: "I want to boost my own content.",
                        icon: Star,
                      },
                    ].map((role) => {
                      const Icon = role.icon;
                      const isSelected = userRole === role.id;
                      return (
                        <div
                          key={role.id}
                          onClick={() => setUserRole(role.id)}
                          className={cn(
                            "cursor-pointer rounded-xl border-2 p-4 transition-all",
                            isSelected
                              ? "border-primary bg-primary/5"
                              : "border-slate-200 bg-white hover:border-slate-300",
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                                isSelected
                                  ? "bg-primary/10 text-primary"
                                  : "bg-slate-100 text-slate-400",
                              )}
                            >
                              <Icon className="h-5 w-5" />
                            </div>
                            <div className="flex-1">
                              <div className="font-bold text-sm text-foreground">
                                {role.label}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {role.desc}
                              </div>
                            </div>
                            <div
                              className={cn(
                                "h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                                isSelected
                                  ? "border-primary bg-primary"
                                  : "border-slate-300",
                              )}
                            >
                              {isSelected && (
                                <Check className="h-3 w-3 text-white" />
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── STEP 4: FREE TRIAL ── */}
              {step === 4 && (() => {
                const growthPlan = PLANS.find((p) => p.id === PLAN_IDS.GROWTH)!;
                return (
                  <div className="flex-1 flex flex-col justify-center gap-5 max-w-md mx-auto w-full">
                    <div>
                      <h3 className="text-xl font-bold text-foreground mb-1">
                        Start your free trial
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        14 days of full Growth access. No credit card required.
                      </p>
                    </div>

                    {/* Trial Card — always Growth, no plan switching */}
                    <div className="relative rounded-2xl border-2 border-primary/20 bg-linear-to-br from-slate-900 to-slate-800 p-6 overflow-hidden text-white">
                      {/* Glow */}
                      <div className="absolute top-0 right-0 w-48 h-48 bg-primary rounded-full blur-[80px] opacity-20 -mr-16 -mt-16 pointer-events-none" />
                      <div className="absolute bottom-0 left-0 w-48 h-48 bg-violet-500 rounded-full blur-[80px] opacity-15 -ml-16 -mb-16 pointer-events-none" />

                      {/* Badge row */}
                      <div className="relative z-10 flex items-center justify-between mb-4">
                        <div className="inline-flex items-center gap-1.5 bg-white/10 border border-white/20 rounded-full px-3 py-1 text-xs font-semibold">
                          <Flash className="h-3 w-3 text-yellow-400 fill-current" />
                          Growth Plan — 14-Day Free Trial
                        </div>
                        <span className="text-[11px] text-white/50 font-medium">
                          No card needed
                        </span>
                      </div>

                      {/* Price */}
                      <div className="relative z-10">
                        <div className="flex items-baseline gap-1 mb-0.5">
                          <span className="text-3xl font-black">
                            {growthPlan.price}
                          </span>
                          <span className="text-white/50 text-sm">
                            /mo after trial
                          </span>
                        </div>
                        <p className="text-white/60 text-xs mb-4">
                          {growthPlan.description}
                        </p>

                        <div className="grid grid-cols-1 gap-2">
                          {growthPlan.features.map((feature) => (
                            <div
                              key={feature}
                              className="flex items-center gap-2 text-sm"
                            >
                              <div className="h-4 w-4 rounded-full bg-green-400/20 flex items-center justify-center shrink-0">
                                <Check className="h-2.5 w-2.5 text-green-400" />
                              </div>
                              <span className="text-white/85">{feature}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Subscribe now option */}
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-px bg-slate-200" />
                      <span className="text-xs text-muted-foreground shrink-0">
                        or
                      </span>
                      <div className="flex-1 h-px bg-slate-200" />
                    </div>

                    <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-4 space-y-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          Ready to subscribe now?
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Skip the trial — pick a plan and get instant access.
                        </p>
                      </div>

                      {/* Plan picker (only used for the subscribe-now path) */}
                      <div className="flex gap-1.5">
                        {PLANS.map((plan) => (
                          <button
                            key={plan.id}
                            onClick={() => setSelectedPlan(plan.id)}
                            className={cn(
                              "flex-1 py-2 text-xs font-bold rounded-lg border-2 transition-all",
                              selectedPlan === plan.id
                                ? "border-primary bg-primary/5 text-primary"
                                : "border-slate-200 text-slate-500 hover:border-slate-300",
                            )}
                          >
                            {plan.name}
                          </button>
                        ))}
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-foreground">
                          {activePlan.price}/mo
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleSubscribeNow}
                          disabled={isPaymentLoading || isLoading}
                          className="shrink-0 font-semibold border-primary/30 text-primary hover:bg-primary/5 hover:border-primary"
                        >
                          {isPaymentLoading ? (
                            <SystemRestart className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              Pay now{" "}
                              <ArrowRight className="h-3 w-3 ml-1" />
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* ── STEP 5: CONNECT ACCOUNTS ── */}
              {step === 5 && (
                <div className="flex-1 flex flex-col justify-center space-y-5 max-w-md mx-auto w-full">
                  <div>
                    <h3 className="text-xl font-bold text-foreground mb-1">
                      Connect your ad accounts
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Pull in your past ads and launch your first campaign
                      instantly.
                    </p>
                  </div>

                  <div className="grid gap-3">
                    <button
                      onClick={() => handleConnect("/api/connect/meta")}
                      disabled={isLoading}
                      className="group flex items-center gap-4 p-4 rounded-xl border-2 border-slate-200 hover:border-primary hover:bg-primary/5 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed bg-white"
                    >
                      <div className="w-11 h-11 rounded-xl bg-blue-600 flex items-center justify-center shrink-0 shadow-md shadow-blue-600/25">
                        <svg
                          className="w-5 h-5 text-white"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-sm text-foreground">
                          Connect Meta
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          Facebook & Instagram Ads
                        </p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-primary transition-colors" />
                    </button>

                    <button
                      onClick={() => handleConnect("/api/connect/tiktok")}
                      disabled={isLoading}
                      className="group flex items-center gap-4 p-4 rounded-xl border-2 border-slate-200 hover:border-slate-800 hover:bg-slate-50 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed bg-white"
                    >
                      <div className="w-11 h-11 rounded-xl bg-slate-900 flex items-center justify-center shrink-0 shadow-md shadow-slate-900/20">
                        <span className="font-black text-white text-sm">
                          Tk
                        </span>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-sm text-foreground">
                          Connect TikTok
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          TikTok Ads Manager
                        </p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-700 transition-colors" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <Shield className="h-4 w-4 text-slate-400 shrink-0" />
                    <p className="text-xs text-muted-foreground">
                      Read-only access. We never post or spend on your behalf.
                      You can add more accounts later in Settings.
                    </p>
                  </div>
                </div>
              )}

              {/* ── Navigation Footer ── */}
              <div className="mt-8 pt-5 border-t border-slate-100 flex items-center justify-between">
                <Button
                  variant="ghost"
                  onClick={handleBack}
                  disabled={step === 1 || isLoading || isPaymentLoading}
                  className="text-muted-foreground hover:text-foreground gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </Button>

                <div className="flex gap-3 items-center">
                  {step === 5 && (
                    <Button
                      variant="ghost"
                      onClick={handleFinish}
                      disabled={isLoading}
                      className="text-muted-foreground hover:text-foreground text-sm"
                    >
                      Skip for now
                    </Button>
                  )}
                  <Button
                    onClick={step === 5 ? handleFinish : handleNext}
                    disabled={isNextDisabled || isLoading || isPaymentLoading}
                    className="bg-slate-900 hover:bg-slate-800 text-white min-w-[150px] h-11 rounded-xl font-bold shadow-lg shadow-slate-900/15 gap-2"
                  >
                    {isLoading ? (
                      <>
                        <SystemRestart className="w-4 h-4 animate-spin" />
                        Setting up...
                      </>
                    ) : step === 5 ? (
                      <>
                        Finish Setup
                        <ArrowRight className="w-4 h-4" />
                      </>
                    ) : step === 4 ? (
                      <>
                        Start Free Trial
                        <ArrowRight className="w-4 h-4" />
                      </>
                    ) : (
                      <>
                        Continue
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <p className="text-center mt-6 text-sm text-muted-foreground">
          Need help?{" "}
          <Link href="#" className="text-primary font-semibold hover:underline">
            Chat with support
          </Link>
        </p>
      </div>
    </div>
  );
}
