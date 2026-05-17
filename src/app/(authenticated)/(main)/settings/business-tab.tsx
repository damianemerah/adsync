"use client";

import { useState, useTransition, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  EditPencil,
  SystemRestart,
  Trash,
  Plus,
  WarningTriangle,
  Settings,
  CheckCircle,
  NavArrowDown,
  NavArrowUp,
  Camera,
} from "iconoir-react";
import { cn } from "@/lib/utils";
import { updateOrganization, updateOrganizationLogo } from "@/actions/settings";
import { createClient } from "@/lib/supabase/client";
import { deleteOrganization, provisionOrgPixelToken } from "@/actions/organization";
import { updateAdAccountCapi } from "@/actions/ad-accounts";
import { PixelSnippetCard } from "@/components/campaigns/pixel-snippet-card";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAdAccountsList, useAdAccountMutations } from "@/hooks/use-ad-account";
import { useSubscription } from "@/hooks/use-subscription";
import { type TierId } from "@/lib/constants";
import { ConnectAccountDialog } from "@/components/ad-accounts/connect-account-dialog";
import { MetaAccountSelectDialog } from "@/components/ad-accounts/meta-account-select-dialog";
import { CompactAccountCard } from "@/components/ad-accounts/compact-card";
import { CreateBusinessDialog } from "@/components/settings/create-business-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

function BusinessAvatarUpload({ organization }: { organization: any }) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${organization.id}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(filePath);

      const res = await updateOrganizationLogo(organization.id, publicUrl);
      if (res.error) throw new Error(res.error);

      toast.success("Logo updated successfully");
    } catch (error) {
      console.error(error);
      toast.error("Failed to update logo");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div
      className={cn(
        "relative group h-16 w-16 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary shadow-sm border border-primary/20 overflow-hidden cursor-pointer",
        isUploading && "opacity-50 pointer-events-none"
      )}
      onClick={() => fileInputRef.current?.click()}
    >
      {organization.logo_url ? (
        <img
          src={organization.logo_url}
          alt={organization.name}
          className="w-full h-full object-cover group-hover:opacity-50 transition-opacity"
        />
      ) : (
        <span className="group-hover:opacity-50 transition-opacity">
          {organization.name?.[0]?.toUpperCase() || "B"}
        </span>
      )}
      <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 text-white">
        <Camera className="h-6 w-6" />
      </div>
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={handleFileChange}
      />
    </div>
  );
}

const INDUSTRIES = [
  "E-commerce (Fashion/Beauty)",
  "E-commerce (Electronics)",
  "Service Business",
  "Real Estate",
  "Food & Beverage",
  "Tech / SaaS",
  "Other",
];

// Global org pixel token section
function OrgPixelSection({ orgId, pixelToken }: { orgId: string; pixelToken?: string | null }) {
  const [token, setToken] = useState<string | null>(pixelToken ?? null);
  const [isPending, startTransition] = useTransition();

  const handleGenerate = () => {
    startTransition(async () => {
      const result = await provisionOrgPixelToken(orgId);
      if (result.error) {
        toast.error("Failed to generate pixel token", { description: result.error });
      } else if (result.token) {
        setToken(result.token);
        toast.success("Tenzu Pixel token generated!");
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-heading font-medium">Tenzu Pixel</CardTitle>
        <CardDescription>
          Paste this snippet once in your website&apos;s{" "}
          <code className="px-1 py-0.5 bg-muted rounded text-xs">&lt;head&gt;</code>.
          It tracks page views and automatically attributes purchases to whichever Tenzu campaign drove the click — no changes needed when you launch new campaigns.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {token ? (
          <PixelSnippetCard orgPixelToken={token} />
        ) : (
          <div className="flex flex-col items-start gap-3">
            <p className="text-sm text-subtle-foreground">
              Generate your pixel token to get the snippet code.
            </p>
            <Button
              onClick={handleGenerate}
              disabled={isPending}
              variant="outline"
            >
              {isPending ? (
                <>
                  <SystemRestart className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                "Generate Pixel Token"
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Per-account CAPI configuration panel
function CapiConfigPanel({ account }: { account: any }) {
  const [open, setOpen] = useState(false);
  const [pixelId, setPixelId] = useState("");
  const [capiToken, setCapiToken] = useState("");
  const [isPending, startTransition] = useTransition();

  const hasCapi = !!account.meta_pixel_id;

  const handleSave = () => {
    startTransition(async () => {
      try {
        await updateAdAccountCapi(account.id, {
          metaPixelId: pixelId,
          capiAccessToken: capiToken,
        });
        toast.success("Conversion tracking saved!");
        setOpen(false);
        setPixelId("");
        setCapiToken("");
      } catch (e: any) {
        toast.error("Failed to save", { description: e.message });
      }
    });
  };

  const handleClear = () => {
    startTransition(async () => {
      try {
        await updateAdAccountCapi(account.id, {
          metaPixelId: "",
          capiAccessToken: "",
        });
        toast.success("Conversion tracking removed.");
        setOpen(false);
      } catch (e: any) {
        toast.error("Failed to clear", { description: e.message });
      }
    });
  };

  return (
    <div className="border-t border-border/60 bg-muted/20">
      {/* Toggle row */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
      >
        <span className="flex items-center gap-2">
          <Settings className="w-3.5 h-3.5" />
          <span className="font-medium">Conversion Tracking (CAPI)</span>
          {hasCapi && (
            <span className="flex items-center gap-1 text-emerald-600 font-semibold">
              <CheckCircle className="w-3 h-3" />
              Active
            </span>
          )}
        </span>
        {open ? (
          <NavArrowUp className="w-3.5 h-3.5" />
        ) : (
          <NavArrowDown className="w-3.5 h-3.5" />
        )}
      </button>

      {open && (
        <div className="px-5 pb-4 pt-1 space-y-4">
          {/* Explainer */}
          <p className="text-xs text-subtle-foreground leading-relaxed">
            Connect Meta&apos;s Conversions API so every WhatsApp sale recorded
            in Tenzu is sent back to Meta server-side. This teaches Andromeda to
            find more buyers — no website pixel needed.
            <a
              href="https://www.facebook.com/business/help/2041148702652965"
              target="_blank"
              rel="noopener noreferrer"
              className="ml-1 underline hover:text-foreground"
            >
              How to get your Pixel ID and token →
            </a>
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                Meta Pixel ID (Dataset ID)
              </Label>
              <Input
                placeholder={
                  hasCapi ? "••••••••••• (saved)" : "e.g. 1234567890123456"
                }
                value={pixelId}
                onChange={(e) => setPixelId(e.target.value)}
                className="text-sm font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">CAPI Access Token</Label>
              <Input
                type="password"
                placeholder={
                  hasCapi ? "••••••••••• (saved)" : "Paste your token here"
                }
                value={capiToken}
                onChange={(e) => setCapiToken(e.target.value)}
                className="text-sm font-mono"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 justify-end">
            {hasCapi && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                disabled={isPending}
                className="text-destructive hover:text-destructive hover:bg-destructive/10 text-xs"
              >
                Remove
              </Button>
            )}
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isPending || (!pixelId.trim() && !capiToken.trim())}
              className="text-xs"
            >
              {isPending ? (
                <>
                  <SystemRestart className="w-3 h-3 mr-1.5 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Credentials"
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function BusinessTab({
  organization,
  activeOrgId,
  metaSessionId,
}: {
  organization: any;
  activeOrgId?: string | null;
  metaSessionId?: string;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState("accounts");
  const [connectOpen, setConnectOpen] = useState(false);
  const [createBizOpen, setCreateBizOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const { data: accounts, isLoading: accountsLoading } = useAdAccountsList();
  const {
    disconnectAccount,
    setAsDefault,
    renameAccount,
  } = useAdAccountMutations();

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const { data: subscription } = useSubscription();

  const currentTier = (subscription?.org?.tier || "starter") as TierId;
  const currentCount = accounts?.length ?? 0;

  if (!organization) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-subtle-foreground">
          No organization details found.
        </CardContent>
      </Card>
    );
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await updateOrganization(organization.id, formData);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Business details updated successfully!");
        setIsEditing(false);
      }
    });
  };

  const handleConnectClick = () => {
    setConnectOpen(true);
  };

  const handleDisconnect = async (id: string) => {
    if (confirm("Are you sure you want to disconnect this ad account?")) {
      try {
        await disconnectAccount(id);
        toast.success("Ad account disconnected");
      } catch (e: any) {
        toast.error("Failed to disconnect", { description: e.message });
      }
    }
  };

  const handleDeleteBusiness = async () => {
    if (
      !confirm(
        "Are you absolutely sure you want to delete this business? This action cannot be undone and will permanently delete all associated campaigns, ad accounts, and data.",
      )
    ) {
      return;
    }

    setIsDeleting(true);
    try {
      const result = await deleteOrganization(organization.id);
      if (result.error) {
        toast.error(result.error);
        setIsDeleting(false);
      } else {
        toast.success("Business deleted successfully");
        // Layout handles the redirect if no orgs left, or switches active org.
        // We just need to hard reload or push to dashboard to trigger a fresh Server Component render
        window.location.href = "/dashboard";
      }
    } catch (e: any) {
      toast.error("Failed to delete business", { description: e.message });
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Business Profile Card */}
      <Card>
        <form onSubmit={handleSubmit}>
          <CardHeader className="flex flex-row items-start justify-between gap-4 w-full">
           
            <div className="flex items-center gap-2 shrink-0 justify-end w-full">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCreateBizOpen(true)}
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Business
              </Button>
              {!isEditing && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditing(true)}
                >
                  <EditPencil className="mr-2 h-4 w-4" /> Edit Details
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Business Header */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-5 pb-6 border-b border-border mt-1">
              <BusinessAvatarUpload organization={organization} />
              <div className="space-y-2">
                <h3 className="font-heading text-lg font-semibold text-foreground tracking-tight leading-tight">
                  {organization.name}
                </h3>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="capitalize font-medium font-sans text-xs">
                    {currentTier} plan
                  </Badge>
                  {organization.industry && (
                    <Badge variant="secondary" className="font-medium font-sans text-xs text-secondary-foreground">
                      {organization.industry}
                    </Badge>
                  )}
                  {(organization.city || organization.state) && (
                    <span className="text-xs text-subtle-foreground">
                      {[organization.city, organization.state].filter(Boolean).join(", ")}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {isEditing ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                <div className="space-y-2">
                  <Label className="text-xs font-medium" htmlFor="orgName">Company Name</Label>
                  <Input
                    id="orgName"
                    name="orgName"
                    defaultValue={organization.name || ""}
                    required
                  />
                </div>
                <div className="space-y-2 min-w-0">
                  <Label className="text-xs font-medium" htmlFor="industry">Industry</Label>
                  <Select
                    name="industry"
                    defaultValue={organization.industry || INDUSTRIES[0]}
                  >
                    <SelectTrigger className="w-full [&>span]:line-clamp-1 text-left">
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

                <div className="space-y-2 min-w-0">
                  <Label className="text-xs font-medium" htmlFor="sellingMethod">Selling Method</Label>
                  <Select
                    name="sellingMethod"
                    defaultValue={organization.selling_method || "online"}
                  >
                    <SelectTrigger className="w-full [&>span]:line-clamp-1 text-left">
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="online">Online / Delivery</SelectItem>
                      <SelectItem value="local">In-Store / Local</SelectItem>
                      <SelectItem value="both">Both</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 flex gap-4">
                  <div className="flex-1 space-y-2 min-w-0">
                    <Label className="text-xs font-medium" htmlFor="priceTier">Price Tier</Label>
                    <Select
                      name="priceTier"
                      defaultValue={organization.price_tier || "mid"}
                    >
                      <SelectTrigger className="w-full [&>span]:line-clamp-1 text-left">
                        <SelectValue placeholder="Select tier" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="budget">Budget</SelectItem>
                        <SelectItem value="mid">Mid-Range</SelectItem>
                        <SelectItem value="premium">Premium</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1 space-y-2 min-w-0">
                    <Label className="text-xs font-medium" htmlFor="customerGender">Target Audience</Label>
                    <Select
                      name="customerGender"
                      defaultValue={organization.customer_gender || "both"}
                    >
                      <SelectTrigger className="w-full [&>span]:line-clamp-1 text-left">
                        <SelectValue placeholder="Select audience" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="female">Women</SelectItem>
                        <SelectItem value="male">Men</SelectItem>
                        <SelectItem value="both">Everyone</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label className="text-xs font-medium" htmlFor="businessDescription">
                    Business Description
                  </Label>
                  <Textarea
                    id="businessDescription"
                    name="businessDescription"
                    defaultValue={organization.business_description || ""}
                    placeholder="Briefly describe what you do..."
                    className="h-24 resize-none"
                  />
                  <p className="text-xs text-subtle-foreground font-medium">
                    This provides background context for the AI when generating
                    campaign strategy.
                  </p>
                </div>

                {/* Location */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium" htmlFor="city">City</Label>
                  <Input
                    id="city"
                    name="city"
                    defaultValue={organization.city || ""}
                    placeholder="e.g. Lagos"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium" htmlFor="state">State / Region</Label>
                  <Input
                    id="state"
                    name="state"
                    defaultValue={organization.state || ""}
                    placeholder="e.g. Lagos State"
                  />
                </div>

                {/* Contact */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium" htmlFor="businessPhone">Business Phone</Label>
                  <Input
                    id="businessPhone"
                    name="businessPhone"
                    type="tel"
                    defaultValue={organization.business_phone || ""}
                    placeholder="e.g. +234 801 234 5678"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium" htmlFor="whatsappNumber">WhatsApp Number</Label>
                  <Input
                    id="whatsappNumber"
                    name="whatsappNumber"
                    type="tel"
                    defaultValue={organization.whatsapp_number || ""}
                    placeholder="e.g. +234 801 234 5678"
                  />
                  <p className="text-xs text-subtle-foreground">
                    Used as the default CTA destination for WhatsApp campaigns.
                  </p>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label className="text-xs font-medium" htmlFor="businessWebsite">Business Website</Label>
                  <Input
                    id="businessWebsite"
                    name="businessWebsite"
                    type="url"
                    defaultValue={organization.business_website || ""}
                    placeholder="e.g. https://yourstore.com"
                  />
                  <p className="text-xs text-subtle-foreground">
                    The AI uses this to understand your business when generating campaigns.
                  </p>
                </div>
              </div>
            ) : (
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-6 pt-2">
                <div className="flex flex-col gap-1">
                  <dt className="text-xs font-medium text-subtle-foreground">Selling Method</dt>
                  <dd className="text-sm font-medium text-foreground capitalize">
                    {organization.selling_method || (
                      <span className="text-subtle-foreground italic font-normal">Not set</span>
                    )}
                  </dd>
                </div>
                <div className="flex flex-col gap-1">
                  <dt className="text-xs font-medium text-subtle-foreground">Target Audience & Price Tier</dt>
                  <dd className="text-sm font-medium text-foreground capitalize">
                    {organization.customer_gender || "Both"} •{" "}
                    {organization.price_tier || "Mid"}
                  </dd>
                </div>
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <dt className="text-xs font-medium text-subtle-foreground">Business Description</dt>
                  <dd className="text-sm text-foreground leading-relaxed max-w-3xl">
                    {organization.business_description || (
                      <span className="text-subtle-foreground italic">
                        No description provided yet. Editing this helps the AI
                        generate more relevant ads.
                      </span>
                    )}
                  </dd>
                </div>
                <div className="flex flex-col gap-3 sm:col-span-2 pt-2 border-t border-border/50">
                  <dt className="text-xs font-medium text-subtle-foreground">Contact & Web</dt>
                  <dd className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-medium text-subtle-foreground">Website</span>
                      <span className="text-sm text-foreground break-all">{organization.business_website || <span className="italic text-subtle-foreground">Not set</span>}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-medium text-subtle-foreground">Phone</span>
                      <span className="text-sm text-foreground">{organization.business_phone || <span className="italic text-subtle-foreground">Not set</span>}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-medium text-subtle-foreground">WhatsApp</span>
                      <span className="text-sm text-foreground">{organization.whatsapp_number || <span className="italic text-subtle-foreground">Not set</span>}</span>
                    </div>
                  </dd>
                </div>
              </dl>
            )}
          </CardContent>

          {isEditing && (
            <CardFooter className="bg-muted/20 border-t border-border px-6 py-4 flex justify-end gap-3 mt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsEditing(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="min-w-[120px]"
              >
                {isPending ? (
                  <>
                    <SystemRestart className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </CardFooter>
          )}
        </form>
      </Card>

      {/* Connected Accounts */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border pb-4 gap-4">
          <div className="space-y-1">
            <CardTitle className="text-lg font-heading font-medium">Connected Accounts</CardTitle>
            <CardDescription>
              {currentCount} Account{currentCount !== 1 ? "s" : ""} Connected
            </CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleConnectClick}
            >
              <Plus className="w-4 h-4 mr-1" /> Add Ad Account
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-6 space-y-4">
          
              {/* Account List */}
              {accountsLoading ? (
                <div className="p-6 text-center text-subtle-foreground text-sm">
                  Loading accounts...
                </div>
              ) :!accounts || accounts.length === 0 ? (
                <div className="p-6 text-center text-subtle-foreground text-sm border border-dashed border-border rounded-md">
                  No ad accounts connected yet. Click &quot;Add Ad Account&quot;
                  to get started.
                </div>
              ) : (
                <div className="border border-border rounded-md overflow-hidden">
                  {/* Table header */}
                  <div className="grid grid-cols-[1fr_auto_auto] items-center gap-4 px-5 py-3 bg-muted/50 border-b border-border">
                    <p className="text-xs font-semibold text-subtle-foreground uppercase tracking-wider">
                      Name
                    </p>
                    <p className="text-xs font-semibold text-subtle-foreground uppercase tracking-wider w-24 text-center">
                      Status
                    </p>
                    <p className="text-xs font-semibold text-subtle-foreground uppercase tracking-wider w-8" />
                  </div>
                  {accounts.map((account) => (
                    <div key={account.id} className="border-b border-border last:border-0">
                      <CompactAccountCard
                        account={account}
                        onSetDefault={() => {
                          setAsDefault(account.id).catch((e) =>
                            toast.error("Failed to set default", { description: e.message }),
                          );
                        }}
                        onRename={() => {
                          setRenamingId(account.id);
                          setRenameValue(account.nickname || account.name);
                        }}
                        onDisconnect={() => handleDisconnect(account.id)}
                        onReconnect={
                          account.platform === "meta"
                            ? () => { window.location.href = "/api/connect/meta"; }
                            : undefined
                        }
                      />
                      {/* CAPI config — only for Meta accounts */}
                      {account.platform === "meta" && (
                        <CapiConfigPanel account={account} />
                      )}
                    </div>
                  ))}
                </div>
              )}
        </CardContent>
      </Card>
      
      {/* Tenzu Pixel */}
      <OrgPixelSection orgId={organization.id} pixelToken={organization.pixel_token} />

      {/* Danger Zone */}
      <Card className="border-destructive/20 bg-destructive/5">
        <CardHeader>
          <CardTitle className="text-lg font-heading font-medium text-destructive flex items-center gap-2">
            <WarningTriangle className="h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription className="text-destructive/80">
            Irreversible and destructive actions for this business.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border border-destructive/20 rounded-lg bg-background/50">
            <div>
              <p className="font-semibold text-foreground">Delete Business</p>
              <p className="text-sm text-subtle-foreground mt-1">
                Permanently remove <strong>{organization.name}</strong>, along
                with all its campaigns, ad accounts, and data from Tenzu. This
                action cannot be undone.
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={handleDeleteBusiness}
              disabled={isDeleting}
              className="shrink-0"
            >
              {isDeleting ? (
                <>
                  <SystemRestart className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Business"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Connect Account Dialog */}
      <ConnectAccountDialog open={connectOpen} onOpenChange={setConnectOpen} />

      {/* Create Business Dialog */}
      <CreateBusinessDialog
        open={createBizOpen}
        onOpenChange={setCreateBizOpen}
      />

      {/* Meta account picker — shown after OAuth when user has multiple accounts */}
      {metaSessionId && (
        <MetaAccountSelectDialog
          sessionId={metaSessionId}
          open={!!metaSessionId}
          onSuccess={() => router.replace("/settings/business?success=meta_connected")}
          onClose={() => router.replace("/settings/business")}
        />
      )}

      {/* Rename Dialog */}
      <Dialog open={!!renamingId} onOpenChange={(v) => !v && setRenamingId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename Account</DialogTitle>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            placeholder="Enter a nickname"
            className="mt-2"
            onKeyDown={(e) => {
              if (e.key === "Enter" && renamingId) {
                renameAccount({ id: renamingId, newNickname: renameValue.trim() });
                setRenamingId(null);
              }
            }}
          />
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setRenamingId(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (renamingId) {
                  renameAccount({ id: renamingId, newNickname: renameValue.trim() });
                  setRenamingId(null);
                }
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
