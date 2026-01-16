"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCampaignStore } from "@/stores/campaign-store";
import { useCreatives } from "@/hooks/use-creatives";
import { CreativeUploadDialog } from "@/components/creatives/creative-upload-dialog";
import { launchCampaign } from "@/actions/campaigns"; // Ensure this action exists

import {
  ArrowLeft,
  ArrowRight,
  Check,
  Sparkles,
  Facebook,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Image as ImageIcon,
  MessageSquare,
  Target,
  Plus,
  RefreshCw,
  X,
  Smartphone,
  Info,
  Zap,
  Phone,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Clock,
  MoreVertical,
  RotateCcw,
  Eye,
  Heart,
} from "lucide-react";
import { CAMPAIGN_OBJECTIVES, AdSyncObjective } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// --- CONSTANTS ---

const BUDGET_TIERS = [
  {
    label: "Starter",
    amount: 2500,
    reach: "1.5k - 4k",
    desc: "Test the waters",
  },
  {
    label: "Recommended",
    amount: 5000,
    reach: "5k - 12k",
    desc: "Best for growth",
    popular: true,
  },
  { label: "Pro", amount: 15000, reach: "18k - 45k", desc: "Maximum scale" },
];

export default function NewCampaignPage() {
  const router = useRouter();

  // Helper to get icon
  const getIcon = (name: string) => {
    switch (name) {
      case "Phone":
        return Phone;
      case "Zap":
        return Zap;
      case "Eye":
        return Eye;
      case "Heart":
        return Heart;
      default:
        return Zap;
    }
  };

  // Local UI State
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  // Use AI Result only for immediate display (Badge rendering)
  // But rely on Store for the actual data
  const [aiResultLocal, setAiResultLocal] = useState<any>(null);

  // Data Fetching
  const { creatives, isLoading: isLoadingCreatives } = useCreatives();

  // Global Store State
  const {
    currentStep: step,
    platform,
    objective,
    campaignName, // Get from store
    targetInterests, // Get from store
    aiPrompt,
    budget,
    selectedCreatives,
    adCopy,
    locations,
    locationInput,
    customInterest,
    savedAudiences,

    // Actions
    setStep,
    updateDraft,
    resetDraft,
    saveAudience,
    destinationValue,
  } = useCampaignStore();

  // --- ACTIONS ---

  const handleAiGenerate = async () => {
    setIsGenerating(true);

    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        body: JSON.stringify({
          description: aiPrompt,
          location: "Nigeria", // Or pass specific location state if you have it
        }),
      });

      if (!res.ok) throw new Error("AI Failed");

      const result = await res.json();
      console.log("Result:📁📁", result);
      setAiResultLocal(result); // For animation effect

      // UPDATE STORE IMMEDIATELY
      updateDraft({
        targetInterests: result.interests, // Persist interests
        campaignName: `Campaign - ${new Date().toLocaleDateString()}`, // Default Name
        adCopy: {
          primary: result.copy[0],
          headline: result.headline[0],
          cta: "Shop Now",
        },
      });

      // Save to History
      saveAudience({
        prompt: aiPrompt,
        interests: result.interests,
        locations: locations,
      });
    } catch (e) {
      console.error("AI Generate Error:📁📁", e);
    } finally {
      setIsGenerating(false);
    }
  };

  const loadHistory = (item: any) => {
    updateDraft({
      aiPrompt: item.prompt,
      locations: item.locations,
      targetInterests: item.interests, // Load interests from history
    });
    setAiResultLocal(null); // Clear local AI result when loading history
  };

  // Handle adding custom interest manually
  const addCustomInterest = () => {
    if (customInterest) {
      // Update both local and store
      const newInterests = [...targetInterests, customInterest];
      updateDraft({ targetInterests: newInterests, customInterest: "" });
      // If we have local AI result, update it too to keep UI in sync
      if (aiResultLocal)
        setAiResultLocal({ ...aiResultLocal, interests: newInterests });
    }
  };

  const toggleCreative = (url: string) => {
    if (selectedCreatives.includes(url)) {
      updateDraft({
        selectedCreatives: selectedCreatives.filter((u) => u !== url),
      });
    } else {
      updateDraft({ selectedCreatives: [...selectedCreatives, url] });
    }
  };

  const addLocation = (loc: string) => {
    if (loc && !locations.includes(loc)) {
      updateDraft({ locations: [...locations, loc] });
    }
    updateDraft({ locationInput: "" });
  };

  const removeLocation = (loc: string) => {
    updateDraft({ locations: locations.filter((l) => l !== loc) });
  };

  const handleLaunch = async () => {
    setIsLaunching(true);

    console.log("Destination Value:📁📁", destinationValue);

    try {
      const result = await launchCampaign({
        name: `New Campaign - ${new Date().toLocaleDateString()}`,
        objective: objective as AdSyncObjective,
        budget: budget,
        platform: platform as "meta" | "tiktok",
        adCopy: {
          primary: adCopy.primary,
          headline: adCopy.headline,
          cta: adCopy.cta,
        },
        creatives: selectedCreatives,
        targetLocations: locations,
        targetInterests: targetInterests,
        destinationValue: destinationValue,
      });

      if (result.success) {
        resetDraft(); // Clear store
        router.push("/campaigns?success=true");
      } else {
        alert("Launch Failed: " + result.error);
      }
    } catch (e) {
      console.error(e);
      alert("An unexpected error occurred.");
    } finally {
      setIsLaunching(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-32">
      {/* 1. HEADER */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto max-w-5xl flex h-16 items-center justify-between px-6">
          <Link
            href="/campaigns"
            className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm font-medium">Exit</span>
          </Link>

          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-right">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">
                Step {step} of 4
              </p>
              <p className="text-sm font-bold text-slate-900">
                {step === 1 && "Goal & Platform"}
                {step === 2 && "AI Audience"}
                {step === 3 && "Creative & Preview"}
                {step === 4 && "Budget & Launch"}
              </p>
            </div>
            <Progress
              value={(step / 4) * 100}
              className="w-24 h-2 bg-slate-100"
            />

            {/* Global Reset */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-slate-400"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => {
                    if (confirm("Discard all changes and start over?"))
                      resetDraft();
                  }}
                  className="text-red-600"
                >
                  <RotateCcw className="h-4 w-4 mr-2" /> Start Over
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        {/* --- STEP 1: GOAL & PLATFORM --- */}
        {step === 1 && (
          <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4">
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                What is your goal?
              </h1>
              <p className="text-slate-500">
                Choose where to send your customers.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {CAMPAIGN_OBJECTIVES.map((goal) => (
                <GoalCard
                  key={goal.id}
                  title={goal.label}
                  desc={goal.description}
                  icon={getIcon(goal.iconName)}
                  selected={objective === goal.id}
                  onClick={() => updateDraft({ objective: goal.id })}
                />
              ))}
            </div>

            <div className="pt-4 border-t border-slate-200">
              <p className="text-sm font-bold text-slate-900 mb-4">
                Choose Platform
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                <PlatformCard
                  name="Meta (FB & IG)"
                  icon={Facebook}
                  color="blue"
                  selected={platform === "meta"}
                  onClick={() => updateDraft({ platform: "meta" })}
                />
                <PlatformCard
                  name="TikTok"
                  icon={() => <span className="font-bold">Tk</span>}
                  color="black"
                  selected={platform === "tiktok"}
                  onClick={() => updateDraft({ platform: "tiktok" })}
                />
              </div>
            </div>

            <Button
              size="lg"
              className="w-full h-14 text-lg font-bold bg-blue-600 hover:bg-blue-700 shadow-xl"
              disabled={!platform || !objective}
              onClick={() => setStep(2)}
            >
              Continue to Targeting <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        )}

        {/* --- STEP 2: AI AUDIENCE & TARGETING --- */}
        {step === 2 && (
          <div className="grid lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-4">
            {/* LEFT COLUMN: AI & INPUTS */}
            <div className="lg:col-span-7 space-y-6">
              <div className="space-y-2">
                <Badge
                  variant="secondary"
                  className="bg-purple-100 text-purple-700 font-bold px-3 py-1"
                >
                  AI Consultant
                </Badge>
                <h1 className="text-3xl font-bold text-slate-900">
                  Who should see this ad?
                </h1>
              </div>

              {/* Recent Searches */}
              {savedAudiences.length > 0 &&
                targetInterests.length === 0 &&
                !aiResultLocal && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                      <Clock className="h-3 w-3" /> Recent Searches
                    </h3>
                    <div className="grid gap-2">
                      {savedAudiences.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => loadHistory(item)}
                          className="p-3 bg-white border border-slate-200 rounded-lg cursor-pointer hover:border-purple-300 hover:bg-purple-50 transition-all group"
                        >
                          <p className="text-sm font-medium text-slate-700 group-hover:text-purple-700 line-clamp-1">
                            {item.prompt}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* The Prompt Box */}
              <Card className="border-purple-100 bg-white shadow-sm">
                <CardContent className="p-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-bold text-slate-700">
                      What are you selling?
                    </label>
                    {/* Clear Button */}
                    {aiPrompt && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs text-slate-400 hover:text-red-500"
                        onClick={() => {
                          updateDraft({
                            aiPrompt: "",
                            locations: ["Lagos, Nigeria"],
                            targetInterests: [], // Clear interests from store
                          });
                          setAiResultLocal(null);
                        }}
                      >
                        <X className="h-3 w-3 mr-1" /> Clear
                      </Button>
                    )}
                  </div>

                  <Textarea
                    placeholder="e.g. Handmade leather shoes for office men in Lagos..."
                    className="min-h-[100px] text-base bg-slate-50 border-slate-200 focus:ring-purple-500"
                    value={aiPrompt}
                    onChange={(e) => updateDraft({ aiPrompt: e.target.value })}
                  />

                  <Button
                    onClick={handleAiGenerate}
                    disabled={!aiPrompt || isGenerating}
                    className="w-full h-12 bg-purple-600 hover:bg-purple-700 font-bold text-white shadow-lg shadow-purple-600/20"
                  >
                    {isGenerating ? (
                      <Loader2 className="animate-spin mr-2" />
                    ) : (
                      <Sparkles className="mr-2 h-4 w-4" />
                    )}
                    {targetInterests.length > 0
                      ? "Regenerate Strategy"
                      : "Generate Audience"}
                  </Button>
                </CardContent>
              </Card>

              {/* The Results */}
              {/* STEP 2 Changes: Use targetInterests from store for rendering Badges */}
              {targetInterests.length > 0 && (
                <div className="space-y-4 animate-in zoom-in-95">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2 px-1">
                    <Target className="h-4 w-4 text-purple-600" /> Recommended
                    Interests
                  </h3>

                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex flex-wrap gap-2 mb-3">
                      {targetInterests.map((tag, idx) => (
                        <Badge
                          key={idx}
                          variant="secondary"
                          className="bg-slate-50 border text-slate-700 px-3 py-1.5 hover:border-red-200 hover:text-red-500 transition-colors cursor-pointer group"
                        >
                          {tag} {/* Render from Store */}
                        </Badge>
                      ))}
                    </div>
                    {/* Custom Input */}
                    <div className="flex items-center gap-2 max-w-sm">
                      <Input
                        placeholder="Add interest..."
                        className="h-9 text-sm bg-slate-50"
                        value={customInterest}
                        onChange={(e) =>
                          updateDraft({ customInterest: e.target.value })
                        }
                        onKeyDown={(e) =>
                          e.key === "Enter" && addCustomInterest()
                        }
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-9 border-dashed"
                        onClick={addCustomInterest}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT COLUMN: DEMOGRAPHICS */}
            <div className="lg:col-span-5 space-y-6">
              <AudienceMeter
                estimatedReach={aiResultLocal?.estimatedReach || 0}
              />

              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3 border-b bg-slate-50/50">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500">
                    Demographics
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 space-y-5">
                  {/* Locations */}
                  <div className="space-y-3">
                    <label className="text-sm font-bold text-slate-700">
                      Target Locations
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {locations.map((loc) => (
                        <Badge
                          key={loc}
                          className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200 px-2 py-1 flex items-center gap-1"
                        >
                          <MapPin className="h-3 w-3" /> {loc}
                          <X
                            className="h-3 w-3 cursor-pointer hover:text-red-500"
                            onClick={() => removeLocation(loc)}
                          />
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add city..."
                        value={locationInput}
                        onChange={(e) =>
                          updateDraft({ locationInput: e.target.value })
                        }
                        onKeyDown={(e) =>
                          e.key === "Enter" && addLocation(locationInput)
                        }
                        className="h-9"
                      />
                      <Button
                        size="sm"
                        onClick={() => addLocation(locationInput)}
                        className="h-9 bg-slate-900"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Button
                onClick={() => setStep(3)}
                className="w-full h-14 bg-slate-900 hover:bg-slate-800 font-bold text-lg shadow-xl"
                disabled={targetInterests.length === 0}
              >
                Confirm Audience <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        )}

        {/* --- STEP 3: CREATIVE --- */}
        {step === 3 && (
          <div className="grid lg:grid-cols-12 gap-10 animate-in fade-in slide-in-from-bottom-4">
            <div className="lg:col-span-7 space-y-6">
              <h1 className="text-3xl font-bold text-slate-900">Ad Content</h1>

              {/* Media Selection (Using useCreatives hook data) */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Select Media</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingCreatives ? (
                    <div className="flex justify-center p-8">
                      <Loader2 className="animate-spin text-blue-600" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-3 max-h-[300px] overflow-y-auto pr-2">
                      {/* Upload Placeholder */}
                      {/* Upload Placeholder */}
                      <div
                        onClick={() => setUploadModalOpen(true)}
                        className="aspect-square rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 hover:bg-slate-50 cursor-pointer transition-colors"
                      >
                        <ImageIcon className="h-6 w-6" />
                        <span className="text-[10px] font-bold mt-1">
                          Upload New
                        </span>
                      </div>

                      {/* Real Creatives */}
                      {creatives?.map((item: any) => (
                        <div
                          key={item.id}
                          onClick={() => toggleCreative(item.original_url)}
                          className={cn(
                            "aspect-square rounded-xl overflow-hidden border-2 cursor-pointer relative transition-all",
                            selectedCreatives.includes(item.original_url)
                              ? "border-blue-600 ring-2 ring-blue-600 ring-offset-1"
                              : "border-slate-100"
                          )}
                        >
                          {/* Using standard img for now, optimize with Next/Image later */}
                          <img
                            src={item.original_url}
                            className="w-full h-full object-cover"
                            alt="creative"
                          />
                          {selectedCreatives.includes(item.original_url) && (
                            <div className="absolute inset-0 bg-blue-600/20 flex items-center justify-center">
                              <div className="bg-blue-600 text-white p-1.5 rounded-full shadow-lg">
                                <Check className="h-4 w-4" />
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Copy Editor */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Captions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase">
                      Headline
                    </label>
                    <Input
                      value={adCopy.headline}
                      onChange={(e) =>
                        updateDraft({
                          adCopy: { ...adCopy, headline: e.target.value },
                        })
                      }
                      className="font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase">
                      Primary Text
                    </label>
                    <Textarea
                      value={adCopy.primary}
                      onChange={(e) =>
                        updateDraft({
                          adCopy: { ...adCopy, primary: e.target.value },
                        })
                      }
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase">
                      {objective === "whatsapp"
                        ? "WhatsApp Number"
                        : "Website URL"}
                    </label>
                    <Input
                      value={destinationValue}
                      onChange={(e) =>
                        updateDraft({ destinationValue: e.target.value })
                      }
                      placeholder={
                        objective === "whatsapp"
                          ? "080 1234 5678"
                          : "www.yoursite.com"
                      }
                      className="font-bold"
                    />
                    {objective === "whatsapp" && (
                      <p className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Sparkles className="h-3 w-3 text-purple-500" />
                        We will auto-format this to a "Click to Chat" link.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Button
                onClick={() => setStep(4)}
                className="w-full h-14 bg-blue-600 font-bold"
                disabled={selectedCreatives.length === 0}
              >
                Set Budget & Launch <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>

            {/* Mobile Preview */}
            <div className="lg:col-span-5 relative">
              <div className="sticky top-24 space-y-4">
                <div className="flex justify-between items-center px-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                    Mobile Preview
                  </span>
                  <Badge
                    variant="outline"
                    className="text-blue-600 border-blue-200"
                  >
                    Live Update
                  </Badge>
                </div>
                <PhoneMockup
                  adCopy={adCopy}
                  creatives={selectedCreatives}
                  objective={objective}
                />
              </div>
            </div>
          </div>
        )}

        {/* --- UPLOAD COMPONENT --- */}
        <CreativeUploadDialog
          open={uploadModalOpen}
          onOpenChange={setUploadModalOpen}
          onUploadComplete={(creative) => {
            // Auto select the new creative
            toggleCreative(creative.original_url);
            setUploadModalOpen(false);
          }}
        />

        {/* --- STEP 4: BUDGET & LAUNCH --- */}
        {step === 4 && (
          <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4">
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-bold text-slate-900">
                One last check
              </h1>
              <p className="text-slate-500">
                Select your budget and review details before launching.
              </p>
            </div>

            {/* Add Campaign Name Input */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">
                Campaign Name
              </label>
              <Input
                value={campaignName}
                onChange={(e) => updateDraft({ campaignName: e.target.value })}
                placeholder="e.g. December Holiday Sale"
                className="font-medium"
              />
            </div>

            {/* Budget Grid */}
            <div className="grid grid-cols-3 gap-3">
              {BUDGET_TIERS.map((tier) => (
                <div
                  key={tier.label}
                  onClick={() => updateDraft({ budget: tier.amount })}
                  className={cn(
                    "p-4 rounded-2xl border-2 cursor-pointer transition-all relative text-center",
                    budget === tier.amount
                      ? "border-blue-600 bg-blue-50 ring-1 ring-blue-600"
                      : "border-slate-200 bg-white hover:border-blue-300"
                  )}
                >
                  {tier.popular && (
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">
                      Recommended
                    </span>
                  )}
                  <p className="text-xs font-bold text-slate-500 mb-1">
                    {tier.label}
                  </p>
                  <p className="text-lg font-black text-slate-900">
                    ₦{tier.amount.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {tier.reach} reach
                  </p>
                </div>
              ))}
            </div>

            {/* Manual Budget */}
            <div className="relative">
              <div className="absolute inset-y-0 left-3 flex items-center text-slate-400 font-bold">
                ₦
              </div>
              <Input
                type="number"
                value={budget}
                onChange={(e) =>
                  updateDraft({ budget: parseInt(e.target.value) || 0 })
                }
                className="pl-8 h-12 text-lg font-bold bg-white"
              />
              <p className="text-xs text-slate-400 mt-2 text-right">
                Min: ₦1,000/day
              </p>
            </div>

            {/* Final Summary Card */}
            <Card className="bg-slate-900 border-slate-800 text-white">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-400" /> System
                    Check
                  </h3>
                  <Badge className="bg-green-500/20 text-green-400 border-0">
                    Ready
                  </Badge>
                </div>
                <CheckItem label="Ad Account Active" status="success" inverse />
                <CheckItem
                  label="Subscription Active"
                  status="success"
                  inverse
                />
              </CardContent>
            </Card>

            <Button
              size="lg"
              className="w-full h-16 text-xl font-bold bg-green-600 hover:bg-green-700 shadow-2xl shadow-green-600/20 rounded-2xl"
              onClick={handleLaunch}
              disabled={isLaunching}
            >
              {isLaunching ? (
                <>
                  <Loader2 className="mr-2 h-6 w-6 animate-spin" /> Launching...
                </>
              ) : (
                <>
                  Launch Campaign Now <ArrowRight className="ml-2 h-6 w-6" />
                </>
              )}
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}

// --- SUB COMPONENTS ---

function GoalCard({ title, desc, icon: Icon, selected, onClick }: any) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "p-5 rounded-2xl border-2 cursor-pointer transition-all flex items-center gap-4",
        selected
          ? "border-blue-600 bg-blue-50"
          : "bg-white border-slate-100 hover:border-slate-200"
      )}
    >
      <div
        className={cn(
          "h-12 w-12 rounded-xl flex items-center justify-center shrink-0",
          selected ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"
        )}
      >
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <p className="font-bold text-slate-900">{title}</p>
        <p className="text-sm text-slate-500">{desc}</p>
      </div>
      {selected && <CheckCircle2 className="ml-auto h-6 w-6 text-blue-600" />}
    </div>
  );
}

function PlatformCard({ name, icon: Icon, color, selected, onClick }: any) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center gap-3",
        selected
          ? `border-${color}-600 bg-${color}-50/30`
          : "border-slate-100 bg-white"
      )}
    >
      <div
        className={cn(
          "h-10 w-10 rounded-lg flex items-center justify-center text-white",
          color === "blue" ? "bg-blue-600" : "bg-black"
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <span className="font-bold text-slate-900">{name}</span>
    </div>
  );
}

function AudienceMeter({ estimatedReach }: { estimatedReach: number }) {
  const status =
    estimatedReach < 50000
      ? "Too Narrow"
      : estimatedReach > 1500000
      ? "Broad"
      : "Great";
  return (
    <Card className="bg-[#0F172A] text-white border-0 shadow-xl overflow-hidden">
      <CardContent className="p-6">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
          Potential Audience
        </p>
        <div className="flex items-baseline gap-2 mb-4">
          <span className="text-3xl font-black">
            {estimatedReach > 0 ? estimatedReach.toLocaleString() : "---"}
          </span>
          <span className="text-slate-500 text-xs font-bold">People</span>
        </div>
        <div className="h-2 w-full bg-slate-800 rounded-full flex overflow-hidden">
          <div
            className={cn(
              "h-full transition-all duration-1000",
              status === "Too Narrow"
                ? "w-1/3 bg-orange-500"
                : status === "Great"
                ? "w-2/3 bg-green-500"
                : "w-full bg-blue-500"
            )}
          />
        </div>
        <p
          className={cn(
            "mt-3 text-xs font-bold",
            status === "Great" ? "text-green-400" : "text-slate-400"
          )}
        >
          {estimatedReach === 0
            ? "Generate a strategy to see reach"
            : `${status}: Your audience size is ${status.toLowerCase()}.`}
        </p>
      </CardContent>
    </Card>
  );
}

function PhoneMockup({ adCopy, creatives, objective }: any) {
  const [activeIndex, setActiveIndex] = useState(0);
  return (
    <div className="mx-auto w-[300px] h-[580px] bg-white border-8 border-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col">
      <div className="p-3 border-b flex items-center gap-2 mt-4">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-slate-100 text-[10px]">
            AD
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="text-[10px] font-black">Your Store Name</p>
          <p className="text-[8px] text-slate-400 leading-none">Sponsored</p>
        </div>
      </div>
      <div className="flex-1 overflow-hidden flex flex-col">
        <p className="p-3 text-[10px] leading-relaxed text-slate-800 line-clamp-3">
          {adCopy.primary || "Your ad text will appear here..."}
        </p>
        <div className="flex-1 bg-slate-50 relative flex items-center">
          {creatives.length > 0 ? (
            <img
              src={creatives[activeIndex]}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full text-center text-[10px] text-slate-300 font-bold uppercase">
              No Image Selected
            </div>
          )}
          {creatives.length > 1 && (
            <>
              <Button
                size="icon"
                variant="ghost"
                className="absolute left-1 h-6 w-6 bg-white/50 rounded-full"
                onClick={() => setActiveIndex((prev) => Math.max(0, prev - 1))}
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="absolute right-1 h-6 w-6 bg-white/50 rounded-full"
                onClick={() =>
                  setActiveIndex((prev) =>
                    Math.min(creatives.length - 1, prev + 1)
                  )
                }
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
            </>
          )}
        </div>
        <div className="p-3 bg-slate-50 border-t flex justify-between items-center">
          <div className="min-w-0 pr-2">
            <p className="text-[8px] text-slate-500 uppercase font-bold tracking-tighter">
              AdSync Marketplace
            </p>
            <p className="text-[11px] font-black truncate">
              {adCopy.headline || "Headline"}
            </p>
          </div>
          <Button
            size="sm"
            className={cn(
              "h-8 px-4 text-[10px] font-black rounded-md shrink-0",
              objective === "whatsapp" ? "bg-green-600" : "bg-blue-600"
            )}
          >
            {objective === "whatsapp" ? (
              <>
                <Phone className="h-3 w-3 mr-1 fill-white" /> WhatsApp
              </>
            ) : (
              "Shop Now"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

function CheckItem({
  label,
  status,
  inverse = false,
}: {
  label: string;
  status: "success" | "error";
  inverse?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={cn(
          "h-5 w-5 rounded-full flex items-center justify-center shrink-0",
          status === "success"
            ? inverse
              ? "bg-green-500/20 text-green-400"
              : "bg-green-100 text-green-600"
            : "bg-red-100 text-red-600"
        )}
      >
        <Check className="h-3 w-3" />
      </div>
      <span
        className={cn(
          "text-sm font-medium",
          inverse ? "text-slate-200" : "text-slate-700"
        )}
      >
        {label}
      </span>
    </div>
  );
}
