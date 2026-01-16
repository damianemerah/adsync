"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  BarChart3,
  Target,
  ImageIcon,
  Activity,
  ChevronRight,
  Edit,
  MoreVertical,
  DollarSign,
  Eye,
  MousePointer,
  TrendingUp,
  Facebook,
  Instagram,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";

// Mock Data (Keep outside component for stability)
const campaignData = {
  id: "1",
  name: "Summer Fashion Collection 2024",
  status: "active",
  objective: "traffic",
  platforms: ["facebook", "instagram"],
  startDate: new Date("2024-06-01"),
  totalSpend: 45230,
  totalBudget: 100000,
  impressions: 234567,
  clicks: 12345,
  ctr: 5.27,
  costPerClick: 3.66,
  hasIssue: true,
};

const performanceData = [
  { date: "Jun 1", value: 12500 },
  { date: "Jun 5", value: 18200 },
  { date: "Jun 10", value: 15800 },
  { date: "Jun 15", value: 22400 },
  { date: "Jun 20", value: 28900 },
  { date: "Jun 25", value: 26300 },
  { date: "Jun 30", value: 31200 },
];

export default function CampaignDetailPage() {
  const params = useParams();
  const [activeTab, setActiveTab] = useState("overview");
  const [status, setStatus] = useState(campaignData.status);

  // Safety Check: If ID is 'new', redirect to the wizard page (We will build this next)
  if (params?.id === "new") {
    // In Next.js App Router, this should be handled by a separate file `app/campaigns/new/page.tsx`
    // but as a fallback:
    return <div className="p-10">Redirecting to builder...</div>;
  }

  return (
    <div>
      {/* Header Area */}
      <div className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-8 py-6">
          {/* Breadcrumbs */}
          <div className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-500">
            <Link
              href="/campaigns"
              className="hover:text-slate-900 transition-colors"
            >
              Campaigns
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-slate-900">{campaignData.name}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-5">
              {/* Platform Icon Stack */}
              <div className="flex -space-x-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 shadow-md ring-4 ring-white z-10">
                  <Facebook className="h-6 w-6 text-white" />
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-tr from-yellow-400 via-red-500 to-purple-500 shadow-md ring-4 ring-white">
                  <Instagram className="h-6 w-6 text-white" />
                </div>
              </div>

              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  {campaignData.name}
                </h1>
                <div className="mt-1.5 flex items-center gap-3">
                  <Badge
                    variant="secondary"
                    className={cn(
                      "capitalize px-2.5 py-0.5",
                      status === "active"
                        ? "bg-green-100 text-green-700"
                        : "bg-slate-100 text-slate-600"
                    )}
                  >
                    <span
                      className={cn(
                        "mr-1.5 h-1.5 w-1.5 rounded-full",
                        status === "active" && "animate-pulse bg-green-500"
                      )}
                    />
                    {status}
                  </Badge>
                  <span className="text-sm font-medium text-slate-500">
                    {campaignData.objective === "traffic"
                      ? "Traffic Objective"
                      : "Awareness"}
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="text-sm text-slate-500">
                    Started Jun 1, 2024
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Pause/Resume Toggle */}
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2 shadow-sm">
                <span className="text-sm font-semibold text-slate-700">
                  {status === "active" ? "Active" : "Paused"}
                </span>
                <Switch
                  checked={status === "active"}
                  onCheckedChange={() =>
                    setStatus(status === "active" ? "paused" : "active")
                  }
                />
              </div>

              <Button
                variant="outline"
                className="gap-2 bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              >
                <Edit className="h-4 w-4" />
                Edit Campaign
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="bg-white border-slate-200"
                  >
                    <MoreVertical className="h-4 w-4 text-slate-600" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem>Duplicate</DropdownMenuItem>
                  <DropdownMenuItem>Export CSV</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-red-600">
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-t border-slate-100 bg-white px-8">
          <div className="mx-auto max-w-7xl">
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="h-12 bg-transparent p-0 w-full justify-start gap-8">
                <TabTrigger
                  value="overview"
                  icon={BarChart3}
                  label="Overview"
                />
                <TabTrigger
                  value="adsets"
                  icon={Target}
                  label="Ad Sets"
                  count={3}
                />
                <TabTrigger
                  value="ads"
                  icon={ImageIcon}
                  label="Ads"
                  count={4}
                />
                <TabTrigger
                  value="activity"
                  icon={Activity}
                  label="Activity Log"
                />
              </TabsList>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <main className="flex-1 p-8 mx-auto max-w-7xl w-full">
        {activeTab === "overview" && (
          <OverviewContent data={campaignData} performance={performanceData} />
        )}

        {activeTab === "adsets" && (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
            <p className="text-slate-500">
              Ad Sets List Component goes here...
            </p>
          </div>
        )}
        {/* Implement other tabs similarly using reusable list components */}
      </main>
    </div>
  );
}

// --- Sub-Components ---

function TabTrigger({ value, icon: Icon, label, count }: any) {
  return (
    <TabsTrigger
      value={value}
      className="gap-2 px-0 h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:shadow-none bg-transparent font-medium text-slate-500 hover:text-slate-800 transition-colors"
    >
      <Icon className="h-4 w-4" />
      {label}
      {count && (
        <Badge
          variant="secondary"
          className="ml-1 bg-slate-100 text-slate-600 hover:bg-slate-200"
        >
          {count}
        </Badge>
      )}
    </TabsTrigger>
  );
}

function MetricCard({
  label,
  value,
  change,
  trend,
  subtitle,
  icon: Icon,
  color,
}: any) {
  return (
    <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">{label}</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
            {subtitle && (
              <p className="mt-1 text-xs text-slate-400">{subtitle}</p>
            )}
          </div>
          <div className={`p-3 rounded-xl bg-${color}-50`}>
            <Icon className={`h-5 w-5 text-${color}-600`} />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-1.5">
          {trend === "up" ? (
            <TrendingUp className="h-4 w-4 text-green-600" />
          ) : (
            <TrendingUp className="h-4 w-4 text-red-600 rotate-180" />
          )}
          <span
            className={cn(
              "text-sm font-bold",
              trend === "up" ? "text-green-600" : "text-red-600"
            )}
          >
            {change}
          </span>
          <span className="text-xs text-slate-400">vs last period</span>
        </div>
      </CardContent>
    </Card>
  );
}

function OverviewContent({ data, performance }: any) {
  return (
    <div className="space-y-8">
      {/* Metrics */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Total Spend"
          value="₦45,230"
          change="+12%"
          trend="up"
          subtitle="of ₦100k budget"
          icon={DollarSign}
          color="blue"
        />
        <MetricCard
          label="Impressions"
          value="234k"
          change="+8%"
          trend="up"
          icon={Eye}
          color="purple"
        />
        <MetricCard
          label="Clicks"
          value="12,345"
          change="+15%"
          trend="up"
          icon={MousePointer}
          color="green"
        />
        <MetricCard
          label="CTR"
          value="5.27%"
          change="-0.5%"
          trend="down"
          subtitle="₦3.66 per click"
          icon={Target}
          color="orange"
        />
      </div>

      {/* Main Chart */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-bold text-slate-900">
              Performance Trend
            </CardTitle>
            <Select defaultValue="impressions">
              <SelectTrigger className="w-[160px] h-9 bg-slate-50 border-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="impressions">Impressions</SelectItem>
                <SelectItem value="clicks">Clicks</SelectItem>
                <SelectItem value="spend">Spend</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={performance}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#f1f5f9"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  stroke="#64748b"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  dy={10}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  dx={-10}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                  cursor={{ stroke: "#cbd5e1", strokeWidth: 1 }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#2563EB"
                  strokeWidth={3}
                  dot={{ fill: "#2563EB", r: 4, strokeWidth: 0 }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// "use client"

// import type React from "react"

// import { useState } from "react"
// import Link from "next/link"
// import { useParams, useRouter } from "next/navigation"
// import {
//   BarChart3,
//   Target,
//   ImageIcon,
//   Activity,
//   ChevronRight,
//   Edit,
//   MoreVertical,
//   Copy,
//   Download,
//   RefreshCw,
//   Trash,
//   DollarSign,
//   Eye,
//   MousePointer,
//   TrendingUp,
//   AlertTriangle,
//   Plus,
//   Filter,
//   Users,
//   MapPin,
//   Facebook,
//   Instagram,
//   Clock,
//   Check,
//   ArrowRight,
//   ArrowLeft,
//   Save,
//   Loader2,
//   Rocket,
//   X,
// } from "lucide-react"
// import { Badge } from "@/components/ui/badge"
// import { Button } from "@/components/ui/button"
// import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
// import { Switch } from "@/components/ui/switch"
// import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuSeparator,
//   DropdownMenuTrigger,
// } from "@/components/ui/dropdown-menu"
// import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
// import { Progress } from "@/components/ui/progress"
// import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
// import { cn } from "@/lib/utils"

// // Mock data - in a real app, this would come from an API
// const campaignData = {
//   id: "1",
//   name: "Summer Fashion Collection 2024",
//   status: "active",
//   objective: "traffic",
//   platforms: ["facebook", "instagram"],
//   startDate: new Date("2024-06-01"),
//   totalSpend: 45230,
//   totalBudget: 100000,
//   impressions: 234567,
//   clicks: 12345,
//   ctr: 5.27,
//   costPerClick: 3.66,
//   hasIssue: true,
// }

// const performanceData = [
//   { date: "Jun 1", value: 12500 },
//   { date: "Jun 5", value: 18200 },
//   { date: "Jun 10", value: 15800 },
//   { date: "Jun 15", value: 22400 },
//   { date: "Jun 20", value: 28900 },
//   { date: "Jun 25", value: 26300 },
//   { date: "Jun 30", value: 31200 },
// ]

// const topAd = {
//   imageUrl: "/modern-ad-dashboard-interface-showing-campaign-ana.jpg",
//   primaryText:
//     "Discover our latest summer collection with exclusive designs that blend comfort and style. Limited time offer - shop now!",
//   headline: "Summer Fashion Sale - Up to 50% Off",
//   ctr: 6.8,
//   clicks: 3456,
//   spend: "12,450",
// }

// const ageGroups = [
//   { range: "18-24", percentage: 28 },
//   { range: "25-34", percentage: 42 },
//   { range: "35-44", percentage: 18 },
//   { range: "45+", percentage: 12 },
// ]

// const genderSplit = { female: 64, male: 36 }

// const topLocations = [
//   { city: "Lagos", clicks: 4521 },
//   { city: "Abuja", clicks: 2834 },
//   { city: "Port Harcourt", clicks: 1923 },
// ]

// const adSets = [
//   {
//     id: "1",
//     name: "Women 25-34 Lagos",
//     status: "active",
//     targeting: {
//       ageMin: 25,
//       ageMax: 34,
//       location: "Lagos, Nigeria",
//       interestCount: 8,
//     },
//     budget: 15000,
//     spend: 8234,
//     impressions: 89234,
//     ctr: 5.6,
//   },
//   {
//     id: "2",
//     name: "Men 18-44 Major Cities",
//     status: "active",
//     targeting: {
//       ageMin: 18,
//       ageMax: 44,
//       location: "Lagos, Abuja, PH",
//       interestCount: 12,
//     },
//     budget: 20000,
//     spend: 12456,
//     impressions: 124567,
//     ctr: 4.8,
//   },
//   {
//     id: "3",
//     name: "Lookalike Audience",
//     status: "paused",
//     targeting: {
//       ageMin: 20,
//       ageMax: 45,
//       location: "Nigeria",
//       interestCount: 5,
//     },
//     budget: 10000,
//     spend: 3240,
//     impressions: 45678,
//     ctr: 3.2,
//   },
// ]

// const ads = [
//   {
//     id: "1",
//     name: "Summer Dress Carousel",
//     imageUrl: "/modern-ad-dashboard-interface-showing-campaign-ana.jpg",
//     status: "active",
//     headline: "Summer Fashion Sale",
//     impressions: 45678,
//     clicks: 2345,
//     ctr: 5.1,
//     spend: 8234,
//   },
//   {
//     id: "2",
//     name: "Beach Collection Video",
//     imageUrl: "/mobile-phone-showing-social-media-ad-preview.jpg",
//     status: "active",
//     headline: "Beach Ready Collection",
//     impressions: 67890,
//     clicks: 3456,
//     ctr: 5.1,
//     spend: 12456,
//   },
//   {
//     id: "3",
//     name: "Accessories Promo",
//     imageUrl: "/image-cropping-interface-showing-different-aspect-.jpg",
//     status: "rejected",
//     headline: "Complete Your Look",
//     impressions: 12345,
//     clicks: 456,
//     ctr: 3.7,
//     spend: 2340,
//     rejectionReason: "Image contains excessive text overlay",
//   },
//   {
//     id: "4",
//     name: "Sale Announcement",
//     imageUrl: "/modern-ad-dashboard-interface-showing-campaign-ana.jpg",
//     status: "pending_review",
//     headline: "50% Off Everything",
//     impressions: 0,
//     clicks: 0,
//     ctr: 0,
//     spend: 0,
//   },
// ]

// const activityLog = [
//   {
//     id: "1",
//     type: "status_change",
//     title: "Campaign activated",
//     description: "Campaign was activated and started running",
//     timestamp: new Date("2024-06-01T09:00:00"),
//     user: "John Doe",
//   },
//   {
//     id: "2",
//     type: "edit",
//     title: "Budget increased",
//     description: "Daily budget increased from ₦2,000 to ₦3,500",
//     timestamp: new Date("2024-06-05T14:30:00"),
//     user: "Sarah Smith",
//   },
//   {
//     id: "3",
//     type: "rejection",
//     title: "Ad rejected",
//     description: "Ad 'Accessories Promo' was rejected by Facebook",
//     timestamp: new Date("2024-06-10T11:20:00"),
//     user: "System",
//   },
//   {
//     id: "4",
//     type: "edit",
//     title: "Targeting updated",
//     description: "Added new interests to 'Women 25-34 Lagos' ad set",
//     timestamp: new Date("2024-06-15T16:45:00"),
//     user: "John Doe",
//   },
// ]

// function MetricCard({
//   label,
//   value,
//   change,
//   trend,
//   subtitle,
//   children,
// }: {
//   label: string
//   value: string
//   change: string
//   trend: "up" | "down"
//   subtitle?: string
//   children: React.ReactNode
// }) {
//   return (
//     <Card>
//       <CardContent className="p-6">
//         <div className="flex items-start justify-between">
//           <div className="flex-1">
//             <p className="text-sm text-gray-600">{label}</p>
//             <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
//             {subtitle && <p className="mt-1 text-xs text-gray-500">{subtitle}</p>}
//             <div className="mt-3 flex items-center gap-1">
//               <span className={cn("text-sm font-medium", trend === "up" ? "text-green-600" : "text-red-600")}>
//                 {change}
//               </span>
//               <span className="text-sm text-gray-500">vs last period</span>
//             </div>
//           </div>
//           <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-50">{children}</div>
//         </div>
//       </CardContent>
//     </Card>
//   )
// }

// function NewCampaignWizard() {
//   const router = useRouter()
//   const [currentStep, setCurrentStep] = useState(1)

//   // Step 1: Platform
//   const [selectedPlatform, setSelectedPlatform] = useState<"meta" | "tiktok" | "both" | null>(null)

//   // Step 2: AI Targeting
//   const [businessDescription, setBusinessDescription] = useState("")
//   const [targetCustomer, setTargetCustomer] = useState("")
//   const [location, setLocation] = useState("")
//   const [radius, setRadius] = useState("25")
//   const [ageMin, setAgeMin] = useState("25")
//   const [ageMax, setAgeMax] = useState("45")
//   const [gender, setGender] = useState("all")
//   const [intent, setIntent] = useState("")
//   const [competitors, setCompetitors] = useState("")
//   const [spending, setSpending] = useState("mid")
//   const [isGenerating, setIsGenerating] = useState(false)
//   const [targetingGenerated, setTargetingGenerated] = useState(false)
//   const [aiReasoning, setAiReasoning] = useState("")
//   const [interests, setInterests] = useState<Array<{ id: string; name: string }>>([])
//   const [customInterest, setCustomInterest] = useState("")

//   // Step 3: Campaign Details
//   const [campaignName, setCampaignName] = useState("")
//   const [objective, setObjective] = useState("traffic")
//   const [budget, setBudget] = useState(5000)
//   const [scheduleType, setScheduleType] = useState("immediate")
//   const [startDate, setStartDate] = useState<Date>()
//   const [endDate, setEndDate] = useState<Date>()

//   // Step 4: Creative & Copy
//   const [selectedCreative, setSelectedCreative] = useState<any>(null)
//   const [selectedPrimaryText, setSelectedPrimaryText] = useState(0)
//   const [selectedHeadline, setSelectedHeadline] = useState("")
//   const [callToAction, setCallToAction] = useState("SHOP_NOW")
//   const [destinationUrl, setDestinationUrl] = useState("")
//   const [isGeneratingCopy, setIsGeneratingCopy] = useState(false)

//   // Step 5: Review
//   const [agreedToTerms, setAgreedToTerms] = useState(false)
//   const [isLaunching, setIsLaunching] = useState(false)

//   const steps = [
//     { number: 1, label: "Platform" },
//     { number: 2, label: "AI Targeting" },
//     { number: 3, label: "Campaign Details" },
//     { number: 4, label: "Creative & Copy" },
//     { number: 5, label: "Review & Launch" },
//   ]

//   const getStepStatus = (stepNumber: number) => {
//     if (stepNumber < currentStep) return "complete"
//     if (stepNumber === currentStep) return "current"
//     return "upcoming"
//   }

//   const canProceedFromStep = (step: number) => {
//     switch (step) {
//       case 1:
//         return selectedPlatform !== null
//       case 2:
//         return targetingGenerated
//       case 3:
//         return campaignName && budget > 0
//       case 4:
//         return selectedCreative && destinationUrl
//       case 5:
//         return agreedToTerms
//       default:
//         return false
//     }
//   }

//   const handleNext = () => {
//     if (currentStep < 5 && canProceedFromStep(currentStep)) {
//       setCurrentStep(currentStep + 1)
//     }
//   }

//   const handleBack = () => {
//     if (currentStep > 1) {
//       setCurrentStep(currentStep - 1)
//     }
//   }

//   const generateTargeting = async () => {
//     setIsGenerating(true)
//     // Simulate AI generation
//     await new Promise((resolve) => setTimeout(resolve, 2500))

//     setAiReasoning(
//       "Based on your description of premium leather handbags for professional women aged 25-45 in Lagos, " +
//         "I've identified a sophisticated, fashion-conscious audience with disposable income. The targeting focuses " +
//         "on professionals who follow luxury brands and engage with fashion content.",
//     )

//     setInterests([
//       { id: "1", name: "Fashion design" },
//       { id: "2", name: "Luxury goods" },
//       { id: "3", name: "Professional development" },
//       { id: "4", name: "Online shopping" },
//       { id: "5", name: "Designer handbags" },
//       { id: "6", name: "Business attire" },
//     ])

//     setTargetingGenerated(true)
//     setIsGenerating(false)
//   }

//   const saveDraft = () => {
//     // Save draft logic
//     console.log("Draft saved")
//   }

//   const launchCampaign = async () => {
//     setIsLaunching(true)
//     await new Promise((resolve) => setTimeout(resolve, 2000))
//     router.push("/campaigns?success=true")
//   }

//   return (
//     <div className="min-h-screen bg-gray-50 pb-32">
//       {/* Progress Header */}
//       <div className="sticky top-16 z-40 border-b border-gray-200 bg-white/95 backdrop-blur-xl">
//         <div className="mx-auto max-w-5xl px-6 py-4">
//           <nav aria-label="Progress">
//             <ol className="flex items-center justify-between">
//               {steps.map((step, idx) => (
//                 <li key={step.number} className="relative flex flex-col items-center">
//                   <div
//                     className={cn(
//                       "flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-semibold transition-all",
//                       getStepStatus(step.number) === "complete" && "border-green-600 bg-green-600 text-white",
//                       getStepStatus(step.number) === "current" && "border-blue-600 bg-blue-50 text-blue-600",
//                       getStepStatus(step.number) === "upcoming" && "border-gray-300 bg-white text-gray-400",
//                     )}
//                   >
//                     {getStepStatus(step.number) === "complete" ? (
//                       <Check className="h-5 w-5" />
//                     ) : (
//                       <span>{step.number}</span>
//                     )}
//                   </div>
//                   <span
//                     className={cn(
//                       "mt-2 text-xs font-medium",
//                       getStepStatus(step.number) === "current" ? "text-blue-600" : "text-gray-500",
//                     )}
//                   >
//                     {step.label}
//                   </span>

//                   {idx < steps.length - 1 && (
//                     <div className="absolute left-[calc(50%+20px)] top-5 hidden w-[calc(100vw/5-40px)] border-t-2 border-gray-300 md:block" />
//                   )}
//                 </li>
//               ))}
//             </ol>
//           </nav>
//         </div>
//       </div>

//       {/* Step Content */}
//       {currentStep === 1 && (
//         <div className="mx-auto max-w-3xl px-6 py-12">
//           <div className="text-center">
//             <h1 className="text-3xl font-bold tracking-tight text-gray-900">Choose Your Platform</h1>
//             <p className="mt-2 text-gray-600">Select where you want to run your ads</p>
//           </div>

//           <div className="mt-12 grid gap-6 md:grid-cols-2">
//             {/* Meta Card */}
//             <Card
//               className={cn(
//                 "group cursor-pointer border-2 transition-all hover:border-blue-600 hover:shadow-lg",
//                 selectedPlatform === "meta" && "border-blue-600 bg-blue-50",
//               )}
//               onClick={() => setSelectedPlatform("meta")}
//             >
//               <CardContent className="p-8 text-center">
//                 <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600">
//                   <Facebook className="h-10 w-10 text-white" />
//                 </div>

//                 <h3 className="mt-6 text-xl font-bold text-gray-900">Meta (Facebook & Instagram)</h3>
//                 <p className="mt-2 text-sm text-gray-600">Reach 3.2B+ users across Facebook and Instagram</p>

//                 <ul className="mt-6 space-y-2 text-left text-sm">
//                   <li className="flex items-center gap-2 text-gray-700">
//                     <Check className="h-4 w-4 text-green-600" />
//                     Detailed interest targeting
//                   </li>
//                   <li className="flex items-center gap-2 text-gray-700">
//                     <Check className="h-4 w-4 text-green-600" />
//                     Stories & Feed placements
//                   </li>
//                   <li className="flex items-center gap-2 text-gray-700">
//                     <Check className="h-4 w-4 text-green-600" />
//                     Advanced demographics
//                   </li>
//                 </ul>

//                 <Badge className="mt-6 bg-blue-50 text-blue-700 hover:bg-blue-50">Most Popular</Badge>
//               </CardContent>
//             </Card>

//             {/* TikTok Card */}
//             <Card
//               className={cn(
//                 "group cursor-pointer border-2 transition-all hover:border-gray-900 hover:shadow-lg",
//                 selectedPlatform === "tiktok" && "border-gray-900 bg-gray-50",
//               )}
//               onClick={() => setSelectedPlatform("tiktok")}
//             >
//               <CardContent className="p-8 text-center">
//                 <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-gray-800 to-gray-900">
//                   <svg className="h-10 w-10 text-white" fill="currentColor" viewBox="0 0 24 24">
//                     <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
//                   </svg>
//                 </div>

//                 <h3 className="mt-6 text-xl font-bold text-gray-900">TikTok</h3>
//                 <p className="mt-2 text-sm text-gray-600">Connect with 1B+ engaged users on TikTok</p>

//                 <ul className="mt-6 space-y-2 text-left text-sm">
//                   <li className="flex items-center gap-2 text-gray-700">
//                     <Check className="h-4 w-4 text-green-600" />
//                     Gen Z & Millennial audience
//                   </li>
//                   <li className="flex items-center gap-2 text-gray-700">
//                     <Check className="h-4 w-4 text-green-600" />
//                     Full-screen video format
//                   </li>
//                   <li className="flex items-center gap-2 text-gray-700">
//                     <Check className="h-4 w-4 text-green-600" />
//                     Trending content boost
//                   </li>
//                 </ul>

//                 <Badge className="mt-6 bg-gray-100 text-gray-700 hover:bg-gray-100">High Engagement</Badge>
//               </CardContent>
//             </Card>
//           </div>

//           {/* Multi-Platform Option */}
//           <div className="mt-8">
//             <Card
//               className={cn(
//                 "cursor-pointer border-2 border-dashed transition-all",
//                 selectedPlatform === "both" ? "border-blue-600 bg-blue-50" : "border-gray-300 bg-gray-50",
//               )}
//               onClick={() => setSelectedPlatform("both")}
//             >
//               <CardContent className="p-6">
//                 <div className="flex items-center justify-between">
//                   <div className="flex items-center gap-4">
//                     <div className="flex -space-x-2">
//                       <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 ring-2 ring-white">
//                         <Facebook className="h-6 w-6 text-white" />
//                       </div>
//                       <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-900 ring-2 ring-white">
//                         <svg className="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 24 24">
//                           <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
//                         </svg>
//                       </div>
//                     </div>
//                     <div>
//                       <p className="font-semibold text-gray-900">Run on Both Platforms</p>
//                       <p className="text-sm text-gray-600">Maximize reach with unified campaigns</p>
//                     </div>
//                   </div>
//                   <ArrowRight className="h-5 w-5 text-gray-400" />
//                 </div>
//               </CardContent>
//             </Card>
//           </div>
//         </div>
//       )}

//       {currentStep === 2 && (
//         <div className="mx-auto max-w-3xl px-6 py-12">
//           <div className="text-center">
//             <h1 className="text-3xl font-bold tracking-tight text-gray-900">AI-Powered Targeting</h1>
//             <p className="mt-2 text-gray-600">Let our AI build the perfect audience for your campaign</p>
//           </div>

//           <div className="mt-12 grid gap-8">
//             <Card>
//               <CardHeader>
//                 <CardTitle>Describe Your Business</CardTitle>
//                 <CardDescription>Provide details to help the AI understand your goals.</CardDescription>
//               </CardHeader>
//               <CardContent>
//                 <div className="space-y-4">
//                   <label className="block text-sm font-medium text-gray-700">Business Description</label>
//                   <textarea
//                     rows={4}
//                     className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
//                     value={businessDescription}
//                     onChange={(e) => setBusinessDescription(e.target.value)}
//                     placeholder="e.g., We sell handmade artisanal leather bags for professional women."
//                   />

//                   <label className="block text-sm font-medium text-gray-700">Ideal Customer</label>
//                   <textarea
//                     rows={3}
//                     className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
//                     value={targetCustomer}
//                     onChange={(e) => setTargetCustomer(e.target.value)}
//                     placeholder="e.g., Women aged 25-45, professionals, interested in fashion and luxury goods."
//                   />
//                 </div>
//               </CardContent>
//             </Card>

//             <Card>
//               <CardHeader>
//                 <CardTitle>Targeting Parameters</CardTitle>
//                 <CardDescription>Fine-tune the audience parameters for precision.</CardDescription>
//               </CardHeader>
//               <CardContent>
//                 <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
//                   <div>
//                     <label className="block text-sm font-medium text-gray-700">Location</label>
//                     <input
//                       type="text"
//                       className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
//                       value={location}
//                       onChange={(e) => setLocation(e.target.value)}
//                       placeholder="e.g., Lagos, Nigeria"
//                     />
//                   </div>
//                   <div>
//                     <label className="block text-sm font-medium text-gray-700">Radius (km)</label>
//                     <input
//                       type="number"
//                       className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
//                       value={radius}
//                       onChange={(e) => setRadius(e.target.value)}
//                       placeholder="25"
//                     />
//                   </div>
//                   <div>
//                     <label className="block text-sm font-medium text-gray-700">Age Min</label>
//                     <input
//                       type="number"
//                       className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
//                       value={ageMin}
//                       onChange={(e) => setAgeMin(e.target.value)}
//                       placeholder="25"
//                     />
//                   </div>
//                   <div>
//                     <label className="block text-sm font-medium text-gray-700">Age Max</label>
//                     <input
//                       type="number"
//                       className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
//                       value={ageMax}
//                       onChange={(e) => setAgeMax(e.target.value)}
//                       placeholder="45"
//                     />
//                   </div>
//                   <div>
//                     <label className="block text-sm font-medium text-gray-700">Gender</label>
//                     <Select value={gender} onValueChange={setGender}>
//                       <SelectTrigger className="w-full">
//                         <SelectValue placeholder="All Genders" />
//                       </SelectTrigger>
//                       <SelectContent>
//                         <SelectItem value="all">All Genders</SelectItem>
//                         <SelectItem value="female">Female</SelectItem>
//                         <SelectItem value="male">Male</SelectItem>
//                       </SelectContent>
//                     </Select>
//                   </div>
//                   <div>
//                     <label className="block text-sm font-medium text-gray-700">Purchase Intent</label>
//                     <input
//                       type="text"
//                       className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
//                       value={intent}
//                       onChange={(e) => setIntent(e.target.value)}
//                       placeholder="e.g., High purchase intent for luxury fashion"
//                     />
//                   </div>
//                 </div>

//                 <div className="mt-4">
//                   <label className="block text-sm font-medium text-gray-700">Competitors (Optional)</label>
//                   <input
//                     type="text"
//                     className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
//                     value={competitors}
//                     onChange={(e) => setCompetitors(e.target.value)}
//                     placeholder="e.g., Louis Vuitton, Gucci, Prada"
//                   />
//                 </div>
//               </CardContent>
//             </Card>

//             <Card>
//               <CardHeader>
//                 <CardTitle>Audience Refinement</CardTitle>
//                 <CardDescription>Further refine by interests and spending habits.</CardDescription>
//               </CardHeader>
//               <CardContent>
//                 <div className="space-y-4">
//                   <div>
//                     <label className="block text-sm font-medium text-gray-700">Interests</label>
//                     <div className="mt-1">
//                       {interests.length > 0 && (
//                         <div className="flex flex-wrap gap-2">
//                           {interests.map((interest) => (
//                             <Badge key={interest.id} variant="outline" className="group relative pl-3">
//                               {interest.name}
//                               <button
//                                 onClick={() => setInterests(interests.filter((i) => i.id !== interest.id))}
//                                 className="ml-1 rounded-full p-0.5 hover:bg-red-100"
//                               >
//                                 <X className="h-3 w-3 text-gray-500 group-hover:text-red-600" />
//                               </button>
//                             </Badge>
//                           ))}
//                         </div>
//                       )}
//                       <div className="flex mt-2">
//                         <input
//                           type="text"
//                           className="block w-full rounded-l-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
//                           placeholder="Add interest..."
//                           value={customInterest}
//                           onChange={(e) => setCustomInterest(e.target.value)}
//                           onKeyDown={(e) => {
//                             if (e.key === "Enter" && customInterest.trim()) {
//                               setInterests([...interests, { id: crypto.randomUUID(), name: customInterest.trim() }])
//                               setCustomInterest("")
//                             }
//                           }}
//                         />
//                         <Button
//                           onClick={() => {
//                             if (customInterest.trim()) {
//                               setInterests([...interests, { id: crypto.randomUUID(), name: customInterest.trim() }])
//                               setCustomInterest("")
//                             }
//                           }}
//                           disabled={!customInterest.trim()}
//                           className="rounded-l-none"
//                         >
//                           Add
//                         </Button>
//                       </div>
//                     </div>
//                   </div>

//                   <div>
//                     <label className="block text-sm font-medium text-gray-700">Average Customer Spending</label>
//                     <Select value={spending} onValueChange={setSpending}>
//                       <SelectTrigger className="w-full">
//                         <SelectValue placeholder="Select spending level" />
//                       </SelectTrigger>
//                       <SelectContent>
//                         <SelectItem value="low">Low</SelectItem>
//                         <SelectItem value="mid">Medium</SelectItem>
//                         <SelectItem value="high">High</SelectItem>
//                       </SelectContent>
//                     </Select>
//                   </div>
//                 </div>
//               </CardContent>
//             </Card>

//             <Button onClick={generateTargeting} disabled={isGenerating || targetingGenerated} className="w-full">
//               {isGenerating ? (
//                 <Loader2 className="h-4 w-4 animate-spin" />
//               ) : targetingGenerated ? (
//                 "Targeting Generated"
//               ) : (
//                 "Generate Targeting"
//               )}
//             </Button>

//             {targetingGenerated && (
//               <Card>
//                 <CardHeader>
//                   <CardTitle>AI Reasoning</CardTitle>
//                 </CardHeader>
//                 <CardContent>
//                   <p className="text-sm text-gray-600">{aiReasoning}</p>
//                 </CardContent>
//               </Card>
//             )}
//           </div>
//         </div>
//       )}

//       {currentStep === 3 && (
//         <div className="mx-auto max-w-3xl px-6 py-12">
//           <div className="text-center">
//             <h1 className="text-3xl font-bold tracking-tight text-gray-900">Campaign Details</h1>
//             <p className="mt-2 text-gray-600">Set up the core information for your campaign.</p>
//           </div>

//           <div className="mt-12 space-y-8">
//             <Card>
//               <CardHeader>
//                 <CardTitle>Basic Information</CardTitle>
//               </CardHeader>
//               <CardContent>
//                 <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
//                   <div className="sm:col-span-2">
//                     <label className="block text-sm font-medium text-gray-700">Campaign Name</label>
//                     <input
//                       type="text"
//                       className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
//                       value={campaignName}
//                       onChange={(e) => setCampaignName(e.target.value)}
//                       placeholder="e.g., Summer Collection Launch"
//                     />
//                   </div>
//                   <div>
//                     <label className="block text-sm font-medium text-gray-700">Objective</label>
//                     <Select value={objective} onValueChange={setObjective}>
//                       <SelectTrigger className="w-full">
//                         <SelectValue placeholder="Select objective" />
//                       </SelectTrigger>
//                       <SelectContent>
//                         <SelectItem value="traffic">Traffic</SelectItem>
//                         <SelectItem value="awareness">Awareness</SelectItem>
//                         <SelectItem value="conversions">Conversions</SelectItem>
//                       </SelectContent>
//                     </Select>
//                   </div>
//                   <div>
//                     <label className="block text-sm font-medium text-gray-700">Budget (₦)</label>
//                     <input
//                       type="number"
//                       className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
//                       value={budget}
//                       onChange={(e) => setBudget(Number(e.target.value))}
//                       placeholder="5000"
//                       min="1000"
//                     />
//                   </div>
//                 </div>
//               </CardContent>
//             </Card>

//             <Card>
//               <CardHeader>
//                 <CardTitle>Scheduling</CardTitle>
//               </CardHeader>
//               <CardContent>
//                 <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
//                   <div>
//                     <label className="block text-sm font-medium text-gray-700">Schedule Type</label>
//                     <Select value={scheduleType} onValueChange={setScheduleType}>
//                       <SelectTrigger className="w-full">
//                         <SelectValue placeholder="Select schedule type" />
//                       </SelectTrigger>
//                       <SelectContent>
//                         <SelectItem value="immediate">Run Immediately</SelectItem>
//                         <SelectItem value="scheduled">Scheduled Start</SelectItem>
//                       </SelectContent>
//                     </Select>
//                   </div>
//                   {scheduleType === "scheduled" && (
//                     <>
//                       <div>
//                         <label className="block text-sm font-medium text-gray-700">Start Date</label>
//                         <input
//                           type="date"
//                           className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
//                           value={startDate?.toISOString().split("T")[0]}
//                           onChange={(e) => setStartDate(new Date(e.target.value))}
//                         />
//                       </div>
//                       <div>
//                         <label className="block text-sm font-medium text-gray-700">End Date (Optional)</label>
//                         <input
//                           type="date"
//                           className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
//                           value={endDate?.toISOString().split("T")[0]}
//                           onChange={(e) => setEndDate(new Date(e.target.value))}
//                         />
//                       </div>
//                     </>
//                   )}
//                 </div>
//               </CardContent>
//             </Card>
//           </div>
//         </div>
//       )}

//       {currentStep === 4 && (
//         <div className="mx-auto max-w-3xl px-6 py-12">
//           <div className="text-center">
//             <h1 className="text-3xl font-bold tracking-tight text-gray-900">Creative & Copy</h1>
//             <p className="mt-2 text-gray-600">Select or generate compelling visuals and text.</p>
//           </div>

//           <div className="mt-12 space-y-8">
//             <Card>
//               <CardHeader>
//                 <CardTitle>Choose Your Creative</CardTitle>
//                 <CardDescription>Select an image or video for your ad.</CardDescription>
//               </CardHeader>
//               <CardContent>
//                 {/* Placeholder for creative selection UI */}
//                 <div className="flex h-48 w-full items-center justify-center rounded-lg border-2 border-dashed border-gray-300">
//                   <div className="text-center">
//                     <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
//                     <p className="mt-2 text-sm text-gray-600">Upload or select from library</p>
//                     <Button variant="link" className="text-blue-600">
//                       Browse Library
//                     </Button>
//                   </div>
//                 </div>
//                 {/* You would typically have a grid of selectable images/videos here */}
//               </CardContent>
//             </Card>

//             <Card>
//               <CardHeader>
//                 <CardTitle>Ad Copy</CardTitle>
//                 <CardDescription>Craft engaging text to capture attention.</CardDescription>
//               </CardHeader>
//               <CardContent>
//                 <div className="space-y-4">
//                   <div>
//                     <label className="block text-sm font-medium text-gray-700">Primary Text</label>
//                     <textarea
//                       rows={4}
//                       className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
//                       placeholder="e.g., Discover our latest summer collection..."
//                       // Value would be dynamically updated or selected
//                       value={selectedCreative ? selectedCreative.primaryText : ""}
//                       onChange={(e) => setSelectedPrimaryText(0)} // Simplified for now
//                     />
//                   </div>
//                   <div>
//                     <label className="block text-sm font-medium text-gray-700">Headline</label>
//                     <input
//                       type="text"
//                       className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
//                       placeholder="e.g., Summer Fashion Sale"
//                       // Value would be dynamically updated or selected
//                       value={selectedCreative ? selectedCreative.headline : ""}
//                       onChange={(e) => setSelectedHeadline(e.target.value)}
//                     />
//                   </div>
//                   <div>
//                     <label className="block text-sm font-medium text-gray-700">Call to Action</label>
//                     <Select value={callToAction} onValueChange={setCallToAction}>
//                       <SelectTrigger className="w-full">
//                         <SelectValue placeholder="Select CTA" />
//                       </SelectTrigger>
//                       <SelectContent>
//                         <SelectItem value="SHOP_NOW">Shop Now</SelectItem>
//                         <SelectItem value="LEARN_MORE">Learn More</SelectItem>
//                         <SelectItem value="SIGN_UP">Sign Up</SelectItem>
//                         <SelectItem value="CONTACT_US">Contact Us</SelectItem>
//                       </SelectContent>
//                     </Select>
//                   </div>
//                   <div>
//                     <label className="block text-sm font-medium text-gray-700">Destination URL</label>
//                     <input
//                       type="url"
//                       className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
//                       value={destinationUrl}
//                       onChange={(e) => setDestinationUrl(e.target.value)}
//                       placeholder="https://www.yourwebsite.com/product"
//                     />
//                   </div>
//                 </div>
//               </CardContent>
//               <CardFooter className="flex justify-end">
//                 <Button onClick={() => setIsGeneratingCopy(true)} disabled={isGeneratingCopy}>
//                   {isGeneratingCopy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Generate Copy Ideas"}
//                 </Button>
//               </CardFooter>
//             </Card>
//           </div>
//         </div>
//       )}

//       {currentStep === 5 && (
//         <div className="mx-auto max-w-3xl px-6 py-12">
//           <div className="text-center">
//             <h1 className="text-3xl font-bold tracking-tight text-gray-900">Review & Launch</h1>
//             <p className="mt-2 text-gray-600">Check all details before launching your campaign.</p>
//           </div>

//           <div className="mt-12 space-y-8">
//             <Card>
//               <CardHeader>
//                 <CardTitle>Campaign Summary</CardTitle>
//               </CardHeader>
//               <CardContent>
//                 <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
//                   <div>
//                     <p className="text-sm font-medium text-gray-700">Campaign Name</p>
//                     <p className="mt-1 text-gray-900">{campaignName || "Not Set"}</p>
//                   </div>
//                   <div>
//                     <p className="text-sm font-medium text-gray-700">Objective</p>
//                     <p className="mt-1 text-gray-900">{objective || "Not Set"}</p>
//                   </div>
//                   <div>
//                     <p className="text-sm font-medium text-gray-700">Platform(s)</p>
//                     <p className="mt-1 text-gray-900">{selectedPlatform || "Not Set"}</p>
//                   </div>
//                   <div>
//                     <p className="text-sm font-medium text-gray-700">Budget</p>
//                     <p className="mt-1 text-gray-900">₦{budget.toLocaleString()}</p>
//                   </div>
//                   <div>
//                     <p className="text-sm font-medium text-gray-700">Schedule Type</p>
//                     <p className="mt-1 text-gray-900">{scheduleType}</p>
//                   </div>
//                   {scheduleType === "scheduled" && (
//                     <>
//                       <div>
//                         <p className="text-sm font-medium text-gray-700">Start Date</p>
//                         <p className="mt-1 text-gray-900">{startDate?.toLocaleDateString() || "Not Set"}</p>
//                       </div>
//                       <div>
//                         <p className="text-sm font-medium text-gray-700">End Date</p>
//                         <p className="mt-1 text-gray-900">{endDate?.toLocaleDateString() || "Not Set"}</p>
//                       </div>
//                     </>
//                   )}
//                 </div>

//                 <div className="mt-6">
//                   <p className="text-sm font-medium text-gray-700">Targeting Summary</p>
//                   <p className="mt-1 text-sm text-gray-600">
//                     {location}, {radius}km radius, Age {ageMin}-{ageMax}, Gender: {gender}, Interests:{" "}
//                     {interests.map((i) => i.name).join(", ") || "None specified"}
//                   </p>
//                 </div>

//                 <div className="mt-6">
//                   <p className="text-sm font-medium text-gray-700">Creative & Copy</p>
//                   <p className="mt-1 text-sm text-gray-600">Placeholder for selected creative and copy details</p>
//                 </div>
//               </CardContent>
//             </Card>

//             <Card>
//               <CardHeader>
//                 <CardTitle>Terms & Conditions</CardTitle>
//               </CardHeader>
//               <CardContent>
//                 <div className="flex items-start gap-3">
//                   <input
//                     type="checkbox"
//                     id="terms"
//                     checked={agreedToTerms}
//                     onChange={(e) => setAgreedToTerms(e.target.checked)}
//                     className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
//                   />
//                   <label htmlFor="terms" className="text-sm text-gray-700">
//                     I agree to the{" "}
//                     <a href="#" className="font-medium text-blue-600 hover:underline">
//                       Platform Terms of Service
//                     </a>{" "}
//                     and{" "}
//                     <a href="#" className="font-medium text-blue-600 hover:underline">
//                       AdSync Privacy Policy
//                     </a>
//                     .
//                   </label>
//                 </div>
//               </CardContent>
//             </Card>
//           </div>
//         </div>
//       )}

//       {/* Footer Navigation */}
//       <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur-xl">
//         <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
//           <Button variant="ghost" onClick={handleBack} disabled={currentStep === 1}>
//             <ArrowLeft className="mr-2 h-4 w-4" />
//             Back
//           </Button>

//           <p className="text-sm text-gray-500">Step {currentStep} of 5</p>

//           <div className="flex items-center gap-3">
//             <Button variant="outline" onClick={saveDraft}>
//               <Save className="mr-2 h-4 w-4" />
//               Save Draft
//             </Button>

//             {currentStep < 5 ? (
//               <Button size="lg" onClick={handleNext} disabled={!canProceedFromStep(currentStep)}>
//                 Continue
//                 <ArrowRight className="ml-2 h-4 w-4" />
//               </Button>
//             ) : (
//               <Button
//                 size="lg"
//                 onClick={launchCampaign}
//                 disabled={!agreedToTerms || isLaunching}
//                 className="gap-2 bg-gradient-to-r from-green-600 to-blue-600 shadow-lg"
//               >
//                 {isLaunching ? (
//                   <>
//                     <Loader2 className="h-5 w-5 animate-spin" />
//                     Launching...
//                   </>
//                 ) : (
//                   <>
//                     <Rocket className="h-5 w-5" />
//                     Launch Campaign
//                   </>
//                 )}
//               </Button>
//             )}
//           </div>
//         </div>
//       </div>
//     </div>
//   )
// }

// export default function CampaignDetailPage() {
//   const params = useParams()
//   const router = useRouter()

//   const [activeTab, setActiveTab] = useState("overview")
//   const [status, setStatus] = useState(campaignData.status)
//   const [chartMetric, setChartMetric] = useState("impressions")
//   const [dateRange, setDateRange] = useState("30d")

//   const toggleStatus = () => {
//     setStatus(status === "active" ? "paused" : "active")
//   }

//   // Check if params.id is defined before accessing its properties
//   if (params?.id === "new") {
//     return <NewCampaignWizard />
//   }

//   return (
//     <div className="min-h-screen bg-gray-50">
//       {/* Sidebar Navigation */}
//       <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-gray-200 bg-gray-50">
//         <div className="flex h-16 items-center gap-2 border-b border-gray-200 px-6">
//           <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
//             <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
//               <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
//             </svg>
//           </div>
//           <span className="text-xl font-bold text-gray-900">AdSync</span>
//         </div>

//         <nav className="flex flex-col gap-1 p-4">
//           <a href="/dashboard" className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-600 hover:bg-gray-100">
//             <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
//               <rect x="3" y="3" width="7" height="7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
//               <rect x="14" y="3" width="7" height="7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
//               <rect x="14" y="14" width="7" height="7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
//               <rect x="3" y="14" width="7" height="7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
//             </svg>
//             <span>Overview</span>
//           </a>
//           <a
//             href="/campaigns"
//             className="flex items-center gap-3 rounded-lg bg-blue-50 px-3 py-2 font-medium text-blue-600"
//           >
//             <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
//               <circle cx="12" cy="12" r="10" strokeWidth="2" />
//               <circle cx="12" cy="12" r="6" strokeWidth="2" />
//               <circle cx="12" cy="12" r="2" strokeWidth="2" />
//             </svg>
//             <span>Campaigns</span>
//             <Badge className="ml-auto h-5 rounded-full bg-blue-600 px-2 text-xs text-white">3</Badge>
//           </a>
//           <a
//             href="/creatives"
//             className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-600 hover:bg-gray-100"
//           >
//             <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
//               <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="2" />
//               <circle cx="9" cy="9" r="2" strokeWidth="2" />
//               <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" strokeWidth="2" strokeLinecap="round" />
//             </svg>
//             <span>Creatives</span>
//           </a>
//           <a
//             href="/ad-accounts"
//             className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-600 hover:bg-gray-100"
//           >
//             <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
//               <rect x="2" y="7" width="20" height="14" rx="2" strokeWidth="2" />
//               <circle cx="9" cy="9" r="2" strokeWidth="2" />
//               <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" strokeWidth="2" />
//             </svg>
//             <span>Ad Accounts</span>
//           </a>

//           <div className="my-2 h-px bg-gray-200" />

//           <a href="#" className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-600 hover:bg-gray-100">
//             <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
//               <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" strokeWidth="2" strokeLinecap="round" />
//               <circle cx="9" cy="7" r="4" strokeWidth="2" />
//               <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" strokeWidth="2" strokeLinecap="round" />
//             </svg>
//             <span>Team</span>
//           </a>
//           <a href="#" className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-600 hover:bg-gray-100">
//             <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
//               <circle cx="12" cy="12" r="3" strokeWidth="2" />
//               <path
//                 d="M12 1v6m0 6v6m9-9h-6M7 12H1M18.364 5.636l-4.243 4.243m0 4.242l4.243 4.243M5.636 5.636l4.243 4.243m0 4.242l-4.243 4.243"
//                 strokeWidth="2"
//                 strokeLinecap="round"
//               />
//             </svg>
//             <span>Settings</span>
//           </a>
//         </nav>

//         <div className="absolute bottom-4 left-4 right-4">
//           <Card className="border-0 bg-gradient-to-br from-blue-600 to-purple-600 text-white">
//             <CardContent className="p-4">
//               <p className="text-sm font-medium">Starter Plan</p>
//               <p className="text-xs opacity-90">7/10 AI requests used</p>
//               <Button className="mt-3 w-full bg-white text-blue-600 hover:bg-gray-100">Upgrade</Button>
//             </CardContent>
//           </Card>
//         </div>
//       </aside>

//       {/* Main Content with Left Margin for Sidebar */}
//       <div className="ml-64">
//         {/* Campaign Header */}
//         <div className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur-xl">
//           <div className="mx-auto max-w-7xl px-6 py-4">
//             {/* Breadcrumb */}
//             <div className="mb-3 flex items-center gap-2 text-sm text-gray-500">
//               <Link href="/campaigns" className="hover:text-gray-900">
//                 Campaigns
//               </Link>
//               <ChevronRight className="h-4 w-4" />
//               <span className="text-gray-900">{campaignData.name}</span>
//             </div>

//             {/* Main Header Row */}
//             <div className="flex items-center justify-between">
//               {/* Left: Campaign Info */}
//               <div className="flex items-center gap-4">
//                 {/* Platform Icons */}
//                 <div className="flex -space-x-2">
//                   <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 ring-2 ring-white">
//                     <Facebook className="h-6 w-6 text-white" />
//                   </div>
//                   <div className="flex h-12 w-12 items-center justify-center rounded-full bg-pink-600 ring-2 ring-white">
//                     <Instagram className="h-6 w-6 text-white" />
//                   </div>
//                 </div>

//                 {/* Title & Status */}
//                 <div>
//                   <h1 className="text-2xl font-bold text-gray-900">{campaignData.name}</h1>
//                   <div className="mt-1 flex items-center gap-3">
//                     <Badge variant={status === "active" ? "default" : "secondary"} className="capitalize">
//                       <div
//                         className={cn(
//                           "mr-1.5 h-2 w-2 rounded-full",
//                           status === "active" && "animate-pulse bg-green-400",
//                         )}
//                       />
//                       {status}
//                     </Badge>
//                     <span className="text-sm text-gray-500">
//                       {campaignData.objective === "traffic" ? "Traffic Campaign" : "Awareness Campaign"}
//                     </span>
//                     <span className="text-sm text-gray-500">•</span>
//                     <span className="text-sm text-gray-500">
//                       Started{" "}
//                       {campaignData.startDate.toLocaleDateString("en-US", {
//                         month: "short",
//                         day: "numeric",
//                         year: "numeric",
//                       })}
//                     </span>
//                   </div>
//                 </div>
//               </div>

//               {/* Right: Actions */}
//               <div className="flex items-center gap-2">
//                 {/* Status Toggle */}
//                 <div className="flex items-center gap-2 rounded-lg border bg-gray-50 px-3 py-2">
//                   <span className="text-sm font-medium text-gray-700">{status === "active" ? "Active" : "Paused"}</span>
//                   <Switch checked={status === "active"} onCheckedChange={toggleStatus} />
//                 </div>

//                 {/* Edit Button */}
//                 <Button variant="outline" className="gap-2 bg-transparent">
//                   <Edit className="h-4 w-4" />
//                   Edit
//                 </Button>

//                 {/* More Actions */}
//                 <DropdownMenu>
//                   <DropdownMenuTrigger asChild>
//                     <Button variant="outline" size="icon">
//                       <MoreVertical className="h-4 w-4" />
//                     </Button>
//                   </DropdownMenuTrigger>
//                   <DropdownMenuContent align="end">
//                     <DropdownMenuItem className="gap-2">
//                       <Copy className="h-4 w-4" />
//                       Duplicate Campaign
//                     </DropdownMenuItem>
//                     <DropdownMenuItem className="gap-2">
//                       <Download className="h-4 w-4" />
//                       Export Report
//                     </DropdownMenuItem>
//                     <DropdownMenuItem className="gap-2">
//                       <RefreshCw className="h-4 w-4" />
//                       Sync with Platform
//                     </DropdownMenuItem>
//                     <DropdownMenuSeparator />
//                     <DropdownMenuItem className="gap-2 text-red-600">
//                       <Trash className="h-4 w-4" />
//                       Delete Campaign
//                     </DropdownMenuItem>
//                   </DropdownMenuContent>
//                 </DropdownMenu>
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* Tab Navigation */}
//         <div className="border-b border-gray-200 bg-white">
//           <div className="mx-auto max-w-7xl px-6">
//             <Tabs value={activeTab} onValueChange={setActiveTab}>
//               <TabsList className="h-12 bg-transparent">
//                 <TabsTrigger value="overview" className="gap-2">
//                   <BarChart3 className="h-4 w-4" />
//                   Overview
//                 </TabsTrigger>
//                 <TabsTrigger value="adsets" className="gap-2">
//                   <Target className="h-4 w-4" />
//                   Ad Sets
//                   <Badge variant="secondary" className="ml-1">
//                     {adSets.length}
//                   </Badge>
//                 </TabsTrigger>
//                 <TabsTrigger value="ads" className="gap-2">
//                   <ImageIcon className="h-4 w-4" />
//                   Ads
//                   <Badge variant="secondary" className="ml-1">
//                     {ads.length}
//                   </Badge>
//                 </TabsTrigger>
//                 <TabsTrigger value="activity" className="gap-2">
//                   <Activity className="h-4 w-4" />
//                   Activity
//                 </TabsTrigger>
//               </TabsList>
//             </Tabs>
//           </div>
//         </div>

//         {/* Tab Content */}
//         <div className="mx-auto max-w-7xl px-6 py-8">
//           {activeTab === "overview" && (
//             <div className="space-y-6">
//               {/* Alert Banner */}
//               {campaignData.hasIssue && (
//                 <Alert variant="default" className="border-yellow-200 bg-yellow-50">
//                   <AlertTriangle className="h-4 w-4 text-yellow-600" />
//                   <AlertTitle className="text-yellow-900">Low Daily Budget</AlertTitle>
//                   <AlertDescription className="text-yellow-800">
//                     Your daily budget is below the recommended minimum for optimal delivery.
//                     <Button variant="link" className="ml-2 p-0 text-yellow-900 underline">
//                       Increase Budget
//                     </Button>
//                   </AlertDescription>
//                 </Alert>
//               )}

//               {/* Key Metrics */}
//               <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
//                 <MetricCard
//                   label="Total Spend"
//                   value={`₦${campaignData.totalSpend.toLocaleString()}`}
//                   change="+12.5%"
//                   trend="up"
//                   subtitle={`of ₦${campaignData.totalBudget.toLocaleString()} budget`}
//                 >
//                   <DollarSign className="h-5 w-5 text-blue-600" />
//                 </MetricCard>

//                 <MetricCard
//                   label="Impressions"
//                   value={campaignData.impressions.toLocaleString()}
//                   change="+8.3%"
//                   trend="up"
//                 >
//                   <Eye className="h-5 w-5 text-purple-600" />
//                 </MetricCard>

//                 <MetricCard label="Clicks" value={campaignData.clicks.toLocaleString()} change="+15.2%" trend="up">
//                   <MousePointer className="h-5 w-5 text-green-600" />
//                 </MetricCard>

//                 <MetricCard
//                   label="CTR"
//                   value={`${campaignData.ctr}%`}
//                   change="+0.5%"
//                   trend="up"
//                   subtitle={`₦${campaignData.costPerClick} cost/click`}
//                 >
//                   <TrendingUp className="h-5 w-5 text-orange-600" />
//                 </MetricCard>
//               </div>

//               {/* Performance Chart */}
//               <Card>
//                 <CardHeader>
//                   <div className="flex items-center justify-between">
//                     <CardTitle>Performance Over Time</CardTitle>
//                     <div className="flex items-center gap-2">
//                       {/* Metric Selector */}
//                       <Select value={chartMetric} onValueChange={setChartMetric}>
//                         <SelectTrigger className="w-[140px]">
//                           <SelectValue />
//                         </SelectTrigger>
//                         <SelectContent>
//                           <SelectItem value="impressions">Impressions</SelectItem>
//                           <SelectItem value="clicks">Clicks</SelectItem>
//                           <SelectItem value="spend">Spend</SelectItem>
//                           <SelectItem value="ctr">CTR</SelectItem>
//                         </SelectContent>
//                       </Select>

//                       {/* Date Range */}
//                       <Select value={dateRange} onValueChange={setDateRange}>
//                         <SelectTrigger className="w-[140px]">
//                           <SelectValue />
//                         </SelectTrigger>
//                         <SelectContent>
//                           <SelectItem value="7d">Last 7 days</SelectItem>
//                           <SelectItem value="30d">Last 30 days</SelectItem>
//                           <SelectItem value="90d">Last 90 days</SelectItem>
//                           <SelectItem value="custom">Custom range</SelectItem>
//                         </SelectContent>
//                       </Select>
//                     </div>
//                   </div>
//                 </CardHeader>
//                 <CardContent>
//                   <div className="h-[300px]">
//                     <ResponsiveContainer width="100%" height="100%">
//                       <LineChart data={performanceData}>
//                         <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
//                         <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
//                         <YAxis stroke="#6b7280" fontSize={12} />
//                         <Tooltip
//                           contentStyle={{
//                             backgroundColor: "white",
//                             border: "1px solid #e5e7eb",
//                             borderRadius: "8px",
//                           }}
//                         />
//                         <Line
//                           type="monotone"
//                           dataKey="value"
//                           stroke="#3b82f6"
//                           strokeWidth={2}
//                           dot={{ fill: "#3b82f6", r: 4 }}
//                           activeDot={{ r: 6 }}
//                         />
//                       </LineChart>
//                     </ResponsiveContainer>
//                   </div>
//                 </CardContent>
//               </Card>

//               {/* Two Column Layout */}
//               <div className="grid gap-6 lg:grid-cols-2">
//                 {/* Ad Preview */}
//                 <Card>
//                   <CardHeader>
//                     <CardTitle>Best Performing Ad</CardTitle>
//                     <CardDescription>Highest CTR in this campaign</CardDescription>
//                   </CardHeader>
//                   <CardContent>
//                     <div className="space-y-4">
//                       {/* Creative */}
//                       <div className="relative aspect-square overflow-hidden rounded-lg">
//                         <img
//                           src={topAd.imageUrl || "/placeholder.svg"}
//                           alt="Top performing ad"
//                           className="h-full w-full object-cover"
//                         />
//                         <Badge className="absolute right-2 top-2 bg-green-600">Top Performer</Badge>
//                       </div>

//                       {/* Copy */}
//                       <div className="space-y-2">
//                         <p className="text-sm leading-relaxed text-gray-700">{topAd.primaryText}</p>
//                         <p className="font-semibold text-gray-900">{topAd.headline}</p>
//                       </div>

//                       {/* Metrics */}
//                       <div className="grid grid-cols-3 gap-3 rounded-lg bg-gray-50 p-3">
//                         <div>
//                           <p className="text-xs text-gray-500">CTR</p>
//                           <p className="mt-1 font-bold text-gray-900">{topAd.ctr}%</p>
//                         </div>
//                         <div>
//                           <p className="text-xs text-gray-500">Clicks</p>
//                           <p className="mt-1 font-bold text-gray-900">{topAd.clicks}</p>
//                         </div>
//                         <div>
//                           <p className="text-xs text-gray-500">Spend</p>
//                           <p className="mt-1 font-bold text-gray-900">₦{topAd.spend}</p>
//                         </div>
//                       </div>

//                       <Button variant="outline" className="w-full gap-2 bg-transparent">
//                         <Eye className="h-4 w-4" />
//                         View Full Details
//                       </Button>
//                     </div>
//                   </CardContent>
//                 </Card>

//                 {/* Audience Insights */}
//                 <Card>
//                   <CardHeader>
//                     <CardTitle>Audience Breakdown</CardTitle>
//                     <CardDescription>Who's seeing and clicking your ads</CardDescription>
//                   </CardHeader>
//                   <CardContent className="space-y-6">
//                     {/* Age Distribution */}
//                     <div>
//                       <h4 className="mb-3 text-sm font-semibold text-gray-900">Age Groups</h4>
//                       <div className="space-y-3">
//                         {ageGroups.map((group) => (
//                           <div key={group.range}>
//                             <div className="mb-1 flex items-center justify-between text-sm">
//                               <span className="text-gray-700">{group.range}</span>
//                               <span className="font-medium text-gray-900">{group.percentage}%</span>
//                             </div>
//                             <Progress value={group.percentage} className="h-2" />
//                           </div>
//                         ))}
//                       </div>
//                     </div>

//                     {/* Gender Split */}
//                     <div>
//                       <h4 className="mb-3 text-sm font-semibold text-gray-900">Gender</h4>
//                       <div className="flex gap-3">
//                         <div className="flex-1 rounded-lg bg-blue-50 p-4 text-center">
//                           <p className="text-2xl font-bold text-blue-600">{genderSplit.female}%</p>
//                           <p className="mt-1 text-xs text-gray-600">Female</p>
//                         </div>
//                         <div className="flex-1 rounded-lg bg-purple-50 p-4 text-center">
//                           <p className="text-2xl font-bold text-purple-600">{genderSplit.male}%</p>
//                           <p className="mt-1 text-xs text-gray-600">Male</p>
//                         </div>
//                       </div>
//                     </div>

//                     {/* Top Locations */}
//                     <div>
//                       <h4 className="mb-3 text-sm font-semibold text-gray-900">Top Locations</h4>
//                       <div className="space-y-2">
//                         {topLocations.map((location, idx) => (
//                           <div key={location.city} className="flex items-center justify-between text-sm">
//                             <div className="flex items-center gap-2">
//                               <span className="text-gray-500">#{idx + 1}</span>
//                               <MapPin className="h-4 w-4 text-gray-400" />
//                               <span className="text-gray-900">{location.city}</span>
//                             </div>
//                             <span className="font-medium text-gray-700">{location.clicks} clicks</span>
//                           </div>
//                         ))}
//                       </div>
//                     </div>
//                   </CardContent>
//                 </Card>
//               </div>
//             </div>
//           )}

//           {activeTab === "adsets" && (
//             <div className="space-y-6">
//               {/* Header Actions */}
//               <div className="flex items-center justify-between">
//                 <div>
//                   <h2 className="text-xl font-bold text-gray-900">Ad Sets</h2>
//                   <p className="text-sm text-gray-600">Manage targeting and optimization for each ad set</p>
//                 </div>
//                 <Button className="gap-2">
//                   <Plus className="h-4 w-4" />
//                   Create Ad Set
//                 </Button>
//               </div>

//               {/* Ad Sets List */}
//               <div className="space-y-4">
//                 {adSets.map((adSet) => (
//                   <Card key={adSet.id} className="transition-shadow hover:shadow-md">
//                     <CardContent className="p-6">
//                       <div className="flex items-start justify-between">
//                         {/* Left: Info */}
//                         <div className="flex-1">
//                           <div className="flex items-center gap-3">
//                             <h3 className="text-lg font-semibold text-gray-900">{adSet.name}</h3>
//                             <Badge variant={adSet.status === "active" ? "default" : "secondary"}>{adSet.status}</Badge>
//                           </div>

//                           {/* Targeting Summary */}
//                           <div className="mt-3 flex flex-wrap gap-2">
//                             <Badge variant="outline" className="gap-1">
//                               <Users className="h-3 w-3" />
//                               {adSet.targeting.ageMin}-{adSet.targeting.ageMax} years
//                             </Badge>
//                             <Badge variant="outline" className="gap-1">
//                               <MapPin className="h-3 w-3" />
//                               {adSet.targeting.location}
//                             </Badge>
//                             <Badge variant="outline" className="gap-1">
//                               <Target className="h-3 w-3" />
//                               {adSet.targeting.interestCount} interests
//                             </Badge>
//                           </div>

//                           {/* Metrics Row */}
//                           <div className="mt-4 grid grid-cols-4 gap-4">
//                             <div>
//                               <p className="text-xs text-gray-500">Budget</p>
//                               <p className="mt-1 font-semibold text-gray-900">₦{adSet.budget.toLocaleString()}</p>
//                             </div>
//                             <div>
//                               <p className="text-xs text-gray-500">Spend</p>
//                               <p className="mt-1 font-semibold text-gray-900">₦{adSet.spend.toLocaleString()}</p>
//                             </div>
//                             <div>
//                               <p className="text-xs text-gray-500">Impressions</p>
//                               <p className="mt-1 font-semibold text-gray-900">{adSet.impressions.toLocaleString()}</p>
//                             </div>
//                             <div>
//                               <p className="text-xs text-gray-500">CTR</p>
//                               <p className="mt-1 font-semibold text-gray-900">{adSet.ctr}%</p>
//                             </div>
//                           </div>
//                         </div>

//                         {/* Right: Actions */}
//                         <DropdownMenu>
//                           <DropdownMenuTrigger asChild>
//                             <Button variant="ghost" size="icon">
//                               <MoreVertical className="h-4 w-4" />
//                             </Button>
//                           </DropdownMenuTrigger>
//                           <DropdownMenuContent align="end">
//                             <DropdownMenuItem>View Targeting</DropdownMenuItem>
//                             <DropdownMenuItem>Edit Budget</DropdownMenuItem>
//                             <DropdownMenuItem>Duplicate</DropdownMenuItem>
//                             <DropdownMenuSeparator />
//                             <DropdownMenuItem className="text-red-600">Delete</DropdownMenuItem>
//                           </DropdownMenuContent>
//                         </DropdownMenu>
//                       </div>
//                     </CardContent>
//                   </Card>
//                 ))}
//               </div>
//             </div>
//           )}

//           {activeTab === "ads" && (
//             <div className="space-y-6">
//               {/* Header */}
//               <div className="flex items-center justify-between">
//                 <div>
//                   <h2 className="text-xl font-bold text-gray-900">Ads</h2>
//                   <p className="text-sm text-gray-600">All creative variations in this campaign</p>
//                 </div>
//                 <div className="flex gap-2">
//                   <Button variant="outline" className="gap-2 bg-transparent">
//                     <Filter className="h-4 w-4" />
//                     Filter
//                   </Button>
//                   <Button className="gap-2">
//                     <Plus className="h-4 w-4" />
//                     Create Ad
//                   </Button>
//                 </div>
//               </div>

//               {/* Ads Grid */}
//               <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
//                 {ads.map((ad) => (
//                   <Card key={ad.id} className="overflow-hidden transition-shadow hover:shadow-lg">
//                     {/* Creative */}
//                     <div className="relative aspect-square bg-gray-100">
//                       <img
//                         src={ad.imageUrl || "/placeholder.svg"}
//                         alt={ad.name}
//                         className="h-full w-full object-cover"
//                       />
//                       <Badge
//                         className={cn(
//                           "absolute right-2 top-2",
//                           ad.status === "active" && "bg-green-600",
//                           ad.status === "rejected" && "bg-red-600",
//                           ad.status === "pending_review" && "bg-yellow-600",
//                         )}
//                       >
//                         {ad.status === "active" && "Active"}
//                         {ad.status === "rejected" && "Rejected"}
//                         {ad.status === "pending_review" && "Pending"}
//                       </Badge>
//                     </div>

//                     {/* Info */}
//                     <CardContent className="p-4">
//                       <h3 className="font-semibold text-gray-900">{ad.name}</h3>
//                       <p className="mt-1 text-sm text-gray-600">{ad.headline}</p>

//                       {ad.status === "rejected" && (
//                         <Alert variant="destructive" className="mt-3">
//                           <AlertDescription className="text-xs">{ad.rejectionReason}</AlertDescription>
//                         </Alert>
//                       )}

//                       {ad.status !== "pending_review" && (
//                         <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
//                           <div>
//                             <p className="text-gray-500">CTR</p>
//                             <p className="font-semibold text-gray-900">{ad.ctr}%</p>
//                           </div>
//                           <div>
//                             <p className="text-gray-500">Spend</p>
//                             <p className="font-semibold text-gray-900">₦{ad.spend.toLocaleString()}</p>
//                           </div>
//                         </div>
//                       )}

//                       <Button variant="outline" size="sm" className="mt-3 w-full bg-transparent">
//                         View Details
//                       </Button>
//                     </CardContent>
//                   </Card>
//                 ))}
//               </div>
//             </div>
//           )}

//           {activeTab === "activity" && (
//             <div className="space-y-6">
//               {/* Header */}
//               <div>
//                 <h2 className="text-xl font-bold text-gray-900">Activity Log</h2>
//                 <p className="text-sm text-gray-600">Recent changes and events for this campaign</p>
//               </div>

//               {/* Activity Timeline */}
//               <div className="space-y-4">
//                 {activityLog.map((activity, idx) => (
//                   <Card key={activity.id}>
//                     <CardContent className="p-6">
//                       <div className="flex gap-4">
//                         {/* Icon */}
//                         <div
//                           className={cn(
//                             "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full",
//                             activity.type === "status_change" && "bg-green-100",
//                             activity.type === "edit" && "bg-blue-100",
//                             activity.type === "rejection" && "bg-red-100",
//                           )}
//                         >
//                           {activity.type === "status_change" && <Activity className="h-5 w-5 text-green-600" />}
//                           {activity.type === "edit" && <Edit className="h-5 w-5 text-blue-600" />}
//                           {activity.type === "rejection" && <AlertTriangle className="h-5 w-5 text-red-600" />}
//                         </div>

//                         {/* Content */}
//                         <div className="flex-1">
//                           <h3 className="font-semibold text-gray-900">{activity.title}</h3>
//                           <p className="mt-1 text-sm text-gray-600">{activity.description}</p>
//                           <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
//                             <span className="flex items-center gap-1">
//                               <Clock className="h-3 w-3" />
//                               {activity.timestamp.toLocaleString("en-US", {
//                                 month: "short",
//                                 day: "numeric",
//                                 hour: "numeric",
//                                 minute: "2-digit",
//                               })}
//                             </span>
//                             <span>•</span>
//                             <span>{activity.user}</span>
//                           </div>
//                         </div>
//                       </div>
//                     </CardContent>
//                   </Card>
//                 ))}
//               </div>
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   )
// }
