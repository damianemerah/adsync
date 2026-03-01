"use client";

import { useState, useTransition } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Building,
  EditPencil,
  SystemRestart,
  Trash,
  Plus,
  WarningTriangle,
} from "iconoir-react";
import { updateOrganization } from "@/actions/settings";
import { toast } from "sonner";
import { useAdAccounts } from "@/hooks/use-ad-account";
import { useSubscription } from "@/hooks/use-subscription";
import { TIER_CONFIG, TierId } from "@/lib/constants";
import { ConnectAccountDialog } from "@/components/ad-accounts/connect-account-dialog";

const INDUSTRIES = [
  "E-commerce (Fashion/Beauty)",
  "E-commerce (Electronics)",
  "Service Business",
  "Real Estate",
  "Food & Beverage",
  "Tech / SaaS",
  "Other",
];

export function BusinessTab({ organization }: { organization: any }) {
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState("accounts");
  const [connectOpen, setConnectOpen] = useState(false);

  const {
    data: accounts,
    isLoading: accountsLoading,
    disconnectAccount,
  } = useAdAccounts();
  const { data: subscription } = useSubscription();

  const currentTier = (subscription?.org?.tier || "starter") as TierId;
  const maxAccounts = TIER_CONFIG[currentTier]?.limits?.maxAdAccounts ?? 1;
  const currentCount = accounts?.length ?? 0;
  const canConnect = currentCount < maxAccounts;

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
    if (!canConnect) {
      toast.error(
        `Your ${currentTier} plan allows ${maxAccounts} ad account${maxAccounts === 1 ? "" : "s"}. Upgrade to connect more.`,
      );
      return;
    }
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

  return (
    <div className="space-y-6">
      {/* Business Profile Card */}
      <Card>
        <form onSubmit={handleSubmit}>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Business Profile</CardTitle>
              <CardDescription>
                Details about your organization. Editing these helps the AI
                generate more relevant ads.
              </CardDescription>
            </div>
            {!isEditing && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditing(true)}
              >
                <EditPencil className="mr-2 h-4 w-4" /> Edit Details
              </Button>
            )}
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Business Header */}
            <div className="flex items-center gap-6">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary border-2 border-primary/20">
                {organization.name?.[0]?.toUpperCase() || "B"}
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground">
                  {organization.name}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs capitalize">
                    {organization.subscription_tier || "starter"}
                  </Badge>
                  {organization.industry && (
                    <Badge variant="secondary" className="text-xs">
                      {organization.industry}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {isEditing ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-muted/30 p-6 rounded-xl border border-border">
                <div className="space-y-2">
                  <Label htmlFor="orgName">Company Name</Label>
                  <Input
                    id="orgName"
                    name="orgName"
                    defaultValue={organization.name || ""}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="industry">Industry</Label>
                  <Select
                    name="industry"
                    defaultValue={organization.industry || INDUSTRIES[0]}
                  >
                    <SelectTrigger>
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
                  <Label htmlFor="sellingMethod">Selling Method</Label>
                  <Select
                    name="sellingMethod"
                    defaultValue={organization.selling_method || "online"}
                  >
                    <SelectTrigger>
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
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="priceTier">Price Tier</Label>
                    <Select
                      name="priceTier"
                      defaultValue={organization.price_tier || "mid"}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select tier" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="budget">Budget</SelectItem>
                        <SelectItem value="mid">Mid-Range</SelectItem>
                        <SelectItem value="premium">Premium</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="customerGender">Target Audience</Label>
                    <Select
                      name="customerGender"
                      defaultValue={organization.customer_gender || "both"}
                    >
                      <SelectTrigger>
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
                  <Label htmlFor="businessDescription">
                    Business Description
                  </Label>
                  <Textarea
                    id="businessDescription"
                    name="businessDescription"
                    defaultValue={organization.business_description || ""}
                    placeholder="Briefly describe what you do..."
                    className="h-24 resize-none"
                  />
                  <p className="text-xs text-muted-foreground font-medium">
                    This provides background context for the AI when generating
                    campaign strategy.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-muted/30 p-6 rounded-xl border border-border">
                <div>
                  <p className="text-xs font-semibold text-subtle-foreground uppercase tracking-wider mb-1">
                    Company Name
                  </p>
                  <p className="font-medium text-foreground">
                    {organization.name}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-subtle-foreground uppercase tracking-wider mb-1">
                    Industry
                  </p>
                  <p className="font-medium text-foreground">
                    {organization.industry || (
                      <span className="text-muted-foreground italic">
                        Not set
                      </span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-subtle-foreground uppercase tracking-wider mb-1">
                    Selling Method
                  </p>
                  <p className="font-medium text-foreground capitalize">
                    {organization.selling_method || (
                      <span className="text-muted-foreground italic">
                        Not set
                      </span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-subtle-foreground uppercase tracking-wider mb-1">
                    Target Audience / Price Tier
                  </p>
                  <p className="font-medium text-foreground capitalize">
                    {organization.customer_gender || "Both"} •{" "}
                    {organization.price_tier || "Mid"}
                  </p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-xs font-semibold text-subtle-foreground uppercase tracking-wider mb-1">
                    Business Description
                  </p>
                  <p className="font-medium text-foreground">
                    {organization.business_description || (
                      <span className="text-muted-foreground italic">
                        No description provided yet. Editing this helps the AI
                        generate more relevant ads.
                      </span>
                    )}
                  </p>
                </div>
              </div>
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

      {/* Connected Accounts & Members Tabs (inspired by Wask reference) */}
      <Card>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <CardHeader className="pb-0">
            <TabsList className="w-full justify-start h-auto p-0 bg-transparent rounded-none">
              <TabsTrigger
                value="accounts"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-foreground px-4 py-2.5 text-subtle-foreground"
              >
                Connected Accounts
              </TabsTrigger>
            </TabsList>
          </CardHeader>

          <TabsContent value="accounts">
            <CardContent className="pt-4 space-y-4">
              {/* Header row */}
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">
                  {currentCount} Account{currentCount !== 1 ? "s" : ""}{" "}
                  Connected
                </p>
                <div className="flex items-center gap-3">
                  {!canConnect && (
                    <p className="text-xs text-muted-foreground">
                      {maxAccounts}/{maxAccounts} limit reached
                    </p>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleConnectClick}
                    className={!canConnect ? "opacity-60" : ""}
                  >
                    <Plus className="w-4 h-4 mr-1" /> Add Ad Account
                  </Button>
                </div>
              </div>

              {/* Tier limit warning */}
              {!canConnect && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/5 border border-destructive/20 text-sm text-destructive">
                  <WarningTriangle className="h-4 w-4 shrink-0" />
                  <p>
                    Your{" "}
                    <span className="font-bold capitalize">{currentTier}</span>{" "}
                    plan allows {maxAccounts} ad account
                    {maxAccounts === 1 ? "" : "s"}.{" "}
                    <a
                      href="/settings/subscription"
                      className="underline font-bold hover:text-destructive/80"
                    >
                      Upgrade your plan
                    </a>{" "}
                    to connect more.
                  </p>
                </div>
              )}

              {/* Account List */}
              {accountsLoading ? (
                <div className="p-6 text-center text-muted-foreground text-sm">
                  Loading accounts...
                </div>
              ) : !accounts || accounts.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground text-sm border border-dashed border-border rounded-xl">
                  No ad accounts connected yet. Click &quot;Add Ad Account&quot;
                  to get started.
                </div>
              ) : (
                <div className="border border-border rounded-xl overflow-hidden">
                  {/* Table header */}
                  <div className="grid grid-cols-[1fr_auto_auto] items-center gap-4 px-5 py-3 bg-muted/50 border-b border-border">
                    <p className="text-xs font-semibold text-subtle-foreground uppercase tracking-wider">
                      Name
                    </p>
                    <p className="text-xs font-semibold text-subtle-foreground uppercase tracking-wider w-24 text-center">
                      Status
                    </p>
                    <p className="text-xs font-semibold text-subtle-foreground uppercase tracking-wider w-16 text-right">
                      Action
                    </p>
                  </div>
                  {accounts.map((account) => (
                    <div
                      key={account.id}
                      className="grid grid-cols-[1fr_auto_auto] items-center gap-4 px-5 py-4 border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 bg-primary/10 rounded-lg flex items-center justify-center">
                          <Building className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-sm text-foreground">
                            {account.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {account.accountId} •{" "}
                            {account.platform === "meta" ? "Meta" : "TikTok"}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant={
                          account.status === "healthy"
                            ? "default"
                            : "destructive"
                        }
                        className="w-24 justify-center capitalize text-xs"
                      >
                        {account.status || "Unknown"}
                      </Badge>
                      <div className="w-16 flex justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDisconnect(account.id)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8"
                        >
                          <Trash className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </TabsContent>
        </Tabs>
      </Card>

      {/* Connect Account Dialog */}
      <ConnectAccountDialog open={connectOpen} onOpenChange={setConnectOpen} />
    </div>
  );
}
