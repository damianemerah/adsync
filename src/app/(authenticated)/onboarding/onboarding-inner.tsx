"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Building,
  ArrowRight,
  SystemRestart,
  ArrowLeft,
  Shop,
  Globe,
  Shield,
  LogOut,
} from "iconoir-react";
import { MetaIcon } from "@/components/ui/meta-icon";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { PhoneInput } from "@/components/ui/phone-input";
import { Checkbox } from "@/components/ui/checkbox";
import { MetaAccountSelectDialog } from "@/components/ad-accounts/meta-account-select-dialog";
import { useAuth } from "@/components/providers/auth-provider";
import { useOnboardingStore } from "@/store/onboarding-store";

import { createOrganization } from "@/actions/organization";

const INDUSTRIES = [
  "Account & Tax",
  "Agriculture & Farming",
  "Art & Creative",
  "Automotive",
  "B2B Enterprise",
  "Beauty & Personal Care",
  "Business & Consultancy Services",
  "Consumer Services",
  "E-Commerce",
  "Education",
  "Employment Services",
  "Entertainment & Media",
  "Event Planning & Services",
  "Fashion & Apparel",
  "Finance & Insurance",
  "FMCG",
  "Food & Beverage",
  "Gaming",
  "Health & Medical",
  "Home Goods",
  "Industrial Services",
  "Legal Services",
  "Logistics & Courier",
  "Marketing Agency",
  "Photography & Videography",
  "Real Estate",
  "Retail & Wholesale",
  "Sports",
  "Technology & Startups",
  "Travel & Hospitality",
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

// ─── Reconnect empty state (for users who disconnected their account) ─────────

function ReconnectView({
  hasConnectedAccount,
  onConnect,
  onContinue,
}: {
  hasConnectedAccount: boolean;
  onConnect: () => void;
  onContinue: () => void;
}) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <header className="sticky top-0 z-10 bg-white border-b border-slate-200">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between gap-5">
          <div className="flex items-center gap-2 shrink-0">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shadow-sm border border-border shadow-primary/25">
              <Flash className="h-4 w-4 text-white fill-current" />
            </div>
            <span className="font-heading text-xl text-foreground">Tenzu</span>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto py-12 md:py-16 flex flex-col">
        <div className="px-4 w-full max-w-[560px] mx-auto my-auto space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Reconnect your ad account
            </h1>
            <p className="text-sm text-subtle-foreground">
              Your Meta ad account was disconnected. Reconnect to continue
              running and managing your campaigns.
            </p>
          </div>

          <div className="grid gap-3">
            <button
              onClick={onConnect}
              disabled={hasConnectedAccount}
              className={cn(
                "group flex items-center gap-4 p-4 rounded-lg border transition-all text-left bg-card",
                hasConnectedAccount
                  ? "border-primary bg-primary/5 opacity-80 cursor-default"
                  : "border-border hover:border-primary hover:bg-primary/5",
              )}
            >
              <div className="w-10 h-10 rounded-md bg-facebook/10 flex items-center justify-center shrink-0">
                <MetaIcon className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-sm text-foreground">
                  {hasConnectedAccount ? "Meta Connected ✓" : "Connect Meta"}
                </h4>
                <p className="text-xs text-subtle-foreground">
                  Facebook & Instagram Ads
                </p>
              </div>
              {hasConnectedAccount ? (
                <Check className="w-4 h-4 text-primary" />
              ) : (
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              )}
            </button>
          </div>

          <div className="relative bg-muted rounded-lg border border-border p-4 pt-5">
            <div className="absolute -top-3 right-4 flex bg-white border border-border rounded-md shadow-sm px-2.5 py-1 items-center gap-1.5">
              <MetaIcon className="h-3.5 w-3.5" />
              <span className="text-[10px] font-bold text-foreground tracking-wide">
                Official API
              </span>
            </div>
            <div className="flex gap-3">
              <div className="mt-0.5 shrink-0">
                <Shield className="h-5 w-5 text-primary" strokeWidth={2} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground mb-1">
                  Privacy & Security Guarantee
                </h4>
                <p className="text-xs text-subtle-foreground leading-relaxed">
                  Tenzu connects via Meta&apos;s official API with{" "}
                  <strong>read-only</strong> access. We can view your ad
                  performance and page insights — we <strong>cannot</strong>{" "}
                  post on your behalf, read your private messages, or make
                  changes to your page.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <div className="sticky bottom-0 bg-white border-t border-slate-200">
        <div className="mx-auto px-4 py-4">
          <div className="container flex items-center gap-3">
            <div className="flex-1 flex gap-2 max-w-[300px] mx-auto">
              <Button
                className="flex-1 h-12 text-base font-bold rounded-lg gap-2"
                disabled={!hasConnectedAccount}
                onClick={onContinue}
              >
                Go to Dashboard
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Inner component (uses useSearchParams inside Suspense) ──────────────────

export function OnboardingInner({
  hasExistingOrg,
}: {
  hasExistingOrg: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signOut } = useAuth();

  const {
    step,
    orgName,
    industry,
    businessDescription,
    sellingMethod,
    priceTier,
    customerGender,
    phone,
    whatsapp,
    isWhatsappSame,
    setField,
    reset,
  } = useOnboardingStore();

  const setStep = (value: number) => setField("step", value);
  const setOrgName = (value: string) => setField("orgName", value);
  const setIndustry = (value: string) => setField("industry", value);
  const setBusinessDescription = (value: string) => setField("businessDescription", value);
  const setSellingMethod = (value: string) => setField("sellingMethod", value);
  const setPriceTier = (value: string) => setField("priceTier", value);
  const setCustomerGender = (value: string) => setField("customerGender", value);
  const setPhone = (value: string) => setField("phone", value);
  const setWhatsapp = (value: string) => setField("whatsapp", value);
  const setIsWhatsappSame = (value: boolean) => setField("isWhatsappSame", value);

  const [isLoading, setIsLoading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Account connection state
  const [hasConnectedAccount, setHasConnectedAccount] = useState(false);

  // Dialog state: driven by ?meta_session= URL param
  const metaSessionId = searchParams.get("meta_session");
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (metaSessionId) {
      setDialogOpen(true);
    }
  }, [metaSessionId]);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const TOTAL_STEPS = 3;

  const buildFormData = () => {
    const formData = new FormData();
    formData.append("orgName", orgName);
    formData.append("industry", industry);
    formData.append("sellingMethod", sellingMethod);
    formData.append("priceTier", priceTier);
    formData.append("customerGender", customerGender);
    formData.append("businessDescription", businessDescription);
    formData.append("phone_number", phone);
    formData.append("whatsapp_number", isWhatsappSame ? phone : whatsapp);
    return formData;
  };

  const handleNext = () => {
    if (step < TOTAL_STEPS) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  /** Saves org first then redirects to Meta OAuth with source=onboarding */
  const handleConnectMeta = async () => {
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

    window.location.href = "/api/connect/meta?source=onboarding";
  };

  /** For returning users — org already exists, skip createOrganization */
  const handleReconnect = () => {
    window.location.href = "/api/connect/meta?source=onboarding";
  };

  /** Called by the dialog when user successfully connects an account */
  const handleAccountConnected = useCallback(() => {
    setDialogOpen(false);
    setHasConnectedAccount(true);
    // Remove meta_session from URL without a full page reload
    const url = new URL(window.location.href);
    url.searchParams.delete("meta_session");
    router.replace(url.pathname + url.search);
    toast.success("Meta ad account connected! You're all set.");
  }, [router]);

  /** Called when dialog is dismissed */
  const handleDialogClose = useCallback(() => {
    setDialogOpen(false);
    // Remove param from URL
    const url = new URL(window.location.href);
    url.searchParams.delete("meta_session");
    router.replace(url.pathname + url.search);
  }, [router]);

  // ── Returning user: show reconnect UI ──
  if (hasExistingOrg) {
    return (
      <>
        {metaSessionId && (
          <MetaAccountSelectDialog
            sessionId={metaSessionId}
            open={dialogOpen}
            onSuccess={handleAccountConnected}
            onClose={handleDialogClose}
          />
        )}
        <ReconnectView
          hasConnectedAccount={hasConnectedAccount}
          onConnect={handleReconnect}
          onContinue={() => {
            reset();
            router.push("/dashboard");
          }}
        />
      </>
    );
  }

  const isNextDisabled =
    (step === 1 &&
      (!orgName ||
        !industry ||
        !phone ||
        (!isWhatsappSame && !whatsapp))) ||
    (step === 2 && (!sellingMethod || !priceTier || !customerGender));

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* ── Meta Account Select Dialog ── */}
      {metaSessionId && (
        <MetaAccountSelectDialog
          sessionId={metaSessionId}
          open={dialogOpen}
          onSuccess={handleAccountConnected}
          onClose={handleDialogClose}
        />
      )}

      {/* ── Sticky Header ── */}
      <header className="sticky top-0 z-10 bg-white border-b border-slate-200">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between gap-5">
          {/* Logo */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shadow-sm border border-border shadow-primary/25">
              <Flash className="h-4 w-4 text-white fill-current" />
            </div>
            <span className="font-heading text-xl text-foreground">Tenzu</span>
          </div>

          {/* Step progress bars */}
          <div className="flex gap-1.5 flex-1 max-w-[300px]">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-all duration-300 max-w-[100px]",
                  s < step ? "bg-primary" : "bg-slate-200",
                )}
              />
            ))}
          </div>

          {/* Right side: step counter + logout */}
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs text-subtle-foreground font-medium">
              Step {step} of {TOTAL_STEPS}
            </span>
            <button
              onClick={() => signOut()}
              title="Sign out"
              className="flex items-center justify-center border border-border cursor-pointer h-8 w-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-slate-100 transition-colors"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Scrollable Content ── */}
      <main className="flex-1 overflow-y-auto py-12 md:py-16 flex flex-col">
        <div className="px-4 w-full max-w-[560px] mx-auto my-auto">

          {/* ── STEP 1: WORKSPACE IDENTITY ── */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center">
                <h1 className="text-2xl font-bold text-foreground mb-2">
                  Tell us about your business
                </h1>
                <p className="text-sm text-subtle-foreground">
                  We will use this information to tailor your ads to your specific business needs.
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
                    className="h-12 bg-white border-slate-200 focus:border-primary focus:ring-primary/20 text-base"
                    autoFocus
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="industry" className="text-sm font-medium">
                    Business Category
                  </Label>
                  <Select value={industry} onValueChange={setIndustry}>
                    <SelectTrigger className="w-full h-12 data-[size=default]:h-12 bg-white border-slate-200 focus:border-primary text-base [&>span]:line-clamp-1 text-left">
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

                <div className={cn("grid gap-4", !isWhatsappSame ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1")}>
                  <div className="space-y-1.5">
                    <Label htmlFor="phone" className="text-sm font-medium">
                      Phone Number
                    </Label>
                    <PhoneInput
                      id="phone"
                      value={phone}
                      onChange={(v) => setPhone(v as string)}
                      className="h-12 bg-white border-slate-200 focus-within:border-primary focus-within:ring-primary/20 text-base"
                    />
                    <div className="flex items-center space-x-2 pt-1.5">
                      <Checkbox
                        id="whatsapp-same"
                        checked={isWhatsappSame}
                        onCheckedChange={(checked) => setIsWhatsappSame(checked as boolean)}
                      />
                      <label
                        htmlFor="whatsapp-same"
                        className="text-xs font-medium leading-none text-subtle-foreground cursor-pointer"
                      >
                        This is also my WhatsApp number
                      </label>
                    </div>
                  </div>

                  {!isWhatsappSame && (
                    <div className="space-y-1.5">
                      <Label htmlFor="whatsapp" className="text-sm font-medium">
                        WhatsApp Number
                      </Label>
                      <PhoneInput
                        id="whatsapp"
                        value={whatsapp}
                        onChange={(v) => setWhatsapp(v as string)}
                        className="h-12 bg-white border-slate-200 focus-within:border-primary focus-within:ring-primary/20 text-base"
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="businessDescription"
                    className="text-sm font-medium flex justify-between"
                  >
                    What do you sell?
                    <span className="text-xs text-subtle-foreground font-normal">
                      Optional — helps our AI
                    </span>
                  </Label>
                  <Textarea
                    id="businessDescription"
                    placeholder="Briefly describe your products or services..."
                    value={businessDescription}
                    onChange={(e) => setBusinessDescription(e.target.value)}
                    className="h-24 resize-none bg-white border-slate-200 focus:border-primary"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 2: BUSINESS DETAILS ── */}
          {step === 2 && (
            <div className="space-y-7">
              <div className="text-center">
                <h1 className="text-2xl font-bold text-foreground mb-2">
                  How does your business work?
                </h1>
                <p className="text-sm text-subtle-foreground">
                  Our AI uses this to build smarter targeting for your ads.
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">How do you sell?</Label>
                <div className="grid grid-cols-1 gap-3">
                  {SELLING_METHODS.map((method) => {
                    const Icon = method.icon;
                    const isSelected = sellingMethod === method.id;
                    return (
                      <div
                        key={method.id}
                        onClick={() => setSellingMethod(method.id)}
                        className={cn(
                          "cursor-pointer rounded-lg border-2 p-3 flex items-center gap-3 transition-all bg-white",
                          isSelected
                            ? "border-primary bg-primary/5"
                            : "border-slate-200 hover:border-slate-300 hover:bg-slate-50",
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
                          <div className="text-xs text-subtle-foreground">
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Pricing tier</Label>
                  <div className="flex flex-wrap gap-2">
                    {PRICE_TIERS.map((pt) => (
                      <button
                        key={pt.id}
                        onClick={() => setPriceTier(pt.id)}
                        className={cn(
                          "cursor-pointer rounded-lg border-2 px-4 py-2 transition-all text-sm font-medium bg-white",
                          priceTier === pt.id
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50",
                        )}
                      >
                        {pt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-medium">Target audience</Label>
                  <div className="flex flex-wrap gap-2">
                    {GENDERS.map((g) => (
                      <button
                        key={g.id}
                        onClick={() => setCustomerGender(g.id)}
                        className={cn(
                          "cursor-pointer rounded-lg border-2 px-4 py-2 transition-all text-sm font-medium bg-white",
                          customerGender === g.id
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50",
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

          {/* ── STEP 3: CONNECT ACCOUNTS ── */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center">
                <h1 className="text-2xl font-bold text-foreground mb-2">
                  Connect your ad accounts
                </h1>
                <p className="text-sm text-subtle-foreground">
                  Pull in your past ads and launch your first campaign instantly.
                </p>
              </div>

              <div className="grid gap-3">
                <button
                  onClick={handleConnectMeta}
                  disabled={isLoading || hasConnectedAccount}
                  className={cn(
                    "group flex items-center gap-4 p-4 rounded-lg border transition-all text-left bg-card",
                    hasConnectedAccount
                      ? "border-primary bg-primary/5 opacity-80 cursor-default"
                      : "border-border hover:border-primary hover:bg-primary/5 disabled:opacity-50 disabled:cursor-not-allowed",
                  )}
                >
                  <div className="w-10 h-10 rounded-md bg-facebook/10 flex items-center justify-center shrink-0">
                    <MetaIcon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-sm text-foreground">
                      {hasConnectedAccount ? "Meta Connected ✓" : "Connect Meta"}
                    </h4>
                    <p className="text-xs text-subtle-foreground">
                      Facebook & Instagram Ads
                    </p>
                  </div>
                  {hasConnectedAccount ? (
                    <Check className="w-4 h-4 text-primary" />
                  ) : (
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  )}
                </button>
              </div>

              <div className="relative bg-muted rounded-lg border border-border p-4 pt-5 mt-24">
                {/* Simulated Partner Badge */}
                <div className="absolute -top-3 right-4 flex bg-white border border-border rounded-md shadow-sm px-2.5 py-1 items-center gap-1.5">
                  <MetaIcon className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-bold text-foreground tracking-wide">
                    Official API
                  </span>
                </div>

                <div className="flex gap-3">
                  <div className="mt-0.5 shrink-0">
                    <Shield className="h-5 w-5 text-primary" strokeWidth={2} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground mb-1">
                      Privacy & Security Guarantee
                    </h4>
                    <p className="text-xs text-subtle-foreground leading-relaxed">
                      Tenzu connects via Meta&apos;s official API with <strong>read-only</strong> access. We can view your ad performance and page insights — we <strong>cannot</strong> post on your behalf, read your private messages, or make changes to your page.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* ── Sticky Footer Nav ── */}
      <div className="sticky bottom-0 bg-white border-t border-slate-200">
        <div className="mx-auto px-4 py-4 ">
          <div className="container flex items-center gap-3">
            <Button
              variant="ghost"
              onClick={handleBack}
              disabled={step === 1 || isLoading}
              className="text-muted-foreground hover:text-foreground gap-1.5 shrink-0 "
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
            <div className="flex-1 flex gap-2 max-w-[300px] mx-auto">
              {step < 3 ? (
                <Button
                  onClick={handleNext}
                  disabled={isNextDisabled || isLoading}
                  className="flex-1 h-12 text-base font-bold rounded-lg gap-2"
                >
                  {isLoading ? (
                    <>
                      <SystemRestart className="w-4 h-4 animate-spin" />
                      Setting up...
                    </>
                  ) : (
                    <>
                      Continue
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              ) : (
                /* Step 3: Continue — enabled only when account is connected */
                <Button
                  className="flex-1 h-12 text-base font-bold rounded-lg gap-2"
                  disabled={!hasConnectedAccount || isLoading}
                  onClick={() => {
                    reset();
                    router.push("/dashboard");
                  }}
                >
                  {isLoading ? (
                    <>
                      <SystemRestart className="w-4 h-4 animate-spin" />
                      Setting up...
                    </>
                  ) : (
                    <>
                      Continue
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
