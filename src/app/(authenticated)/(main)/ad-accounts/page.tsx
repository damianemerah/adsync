"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Facebook,
  RefreshCw,
  Plus,
  LayoutGrid,
  List as ListIcon,
  Search,
  Loader2,
  AlertCircle,
  Trash2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Sidebar } from "@/components/layout/sidebar";
import { CompactAccountCard } from "@/components/ad-accounts/compact-card"; // Make sure you extract this component
import { useAdAccounts } from "@/hooks/use-ad-account";
import { Label } from "@/components/ui/label";
// If you haven't extracted CompactAccountCard yet, keep it in this file.

export default function AdAccountsPage() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [currentAccountToRename, setCurrentAccountToRename] = useState<
    string | null
  >(null);
  const [newNickname, setNewNickname] = useState<string>("");

  // State for Disconnection
  const [disconnectId, setDisconnectId] = useState<string | null>(null);

  // 1. Fetch Real Data
  const {
    data: accounts,
    isLoading,
    isError,
    error,
    refetch,
    disconnectAccount,
    setAsDefault,
    renameAccount,
  } = useAdAccounts();

  const handleRename = async () => {
    if (!currentAccountToRename) return;
    await renameAccount({
      id: currentAccountToRename,
      newNickname,
    });
    setCurrentAccountToRename(null);
    setNewNickname("");
    setRenameModalOpen(false);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch(); // TanStack Query refetch
    setIsRefreshing(false);
  };

  const handleDisconnect = async () => {
    if (!disconnectId) return;
    try {
      await disconnectAccount(disconnectId);
      setDisconnectId(null);
    } catch (e) {
      console.error("Failed to disconnect", e);
    }
  };

  // 2. Loading State
  if (isLoading) {
    return (
      <div className="flex h-screen bg-slate-50">
        <Sidebar />
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  // 3. Error State
  if (isError) {
    return (
      <div className="flex h-screen bg-slate-50">
        <Sidebar />
        <div className="flex flex-1 p-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error Loading Accounts</AlertTitle>
            <AlertDescription>{error?.message}</AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div>
        {/* Header */}
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur-md">
          <div className="flex h-16 items-center justify-between px-8">
            <h1 className="text-xl font-heading font-bold text-slate-900">
              Ad Accounts
            </h1>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="bg-white"
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
              />
              Sync
            </Button>
          </div>
        </header>

        {/* Toolbar */}
        <div className="border-b border-slate-200 bg-slate-50/50 px-8 py-4 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search accounts..."
              className="pl-10 bg-white border-slate-200"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="bg-white border border-slate-200 p-1 rounded-lg flex">
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
                className="h-8 px-3"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
                className="h-8 px-3"
              >
                <ListIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <main className="flex-1 p-8 max-w-7xl mx-auto w-full space-y-8">
          {/* Empty State */}
          {accounts?.length === 0 && (
            <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
              <div className="mx-auto h-12 w-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
                <Plus className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                No Ad Accounts Linked
              </h3>
              <p className="text-slate-500 mb-6">
                Connect your first account to start running ads.
              </p>
              <Button
                onClick={() => setConnectModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Connect Now
              </Button>
            </div>
          )}

          {/* GRID VIEW */}
          {viewMode === "grid" && accounts && accounts.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {accounts.map((account) => (
                <CompactAccountCard
                  key={account.id}
                  account={account}
                  onSetDefault={() => setAsDefault(account.id)}
                  onRename={() => {
                    setCurrentAccountToRename(account.id);
                    setNewNickname(account.nickname || account.name);
                    setRenameModalOpen(true);
                  }}
                  onDisconnect={() => setDisconnectId(account.id)}
                />
              ))}

              {/* "Add New" Placeholder */}
              <div
                onClick={() => setConnectModalOpen(true)}
                className="border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center p-6 cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all group min-h-[180px]"
              >
                <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-3 group-hover:bg-blue-100 transition-colors">
                  <Plus className="h-6 w-6 text-slate-400 group-hover:text-blue-600" />
                </div>
                <span className="font-semibold text-slate-600 group-hover:text-blue-700">
                  Connect Account
                </span>
              </div>
            </div>
          )}

          {/* List View Implementation... (Use DataTable component we built earlier) */}
        </main>
      </div>

      {/* Connect Modal */}
      <Dialog open={connectModalOpen} onOpenChange={setConnectModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Connect Ad Account</DialogTitle>
            <DialogDescription>Choose a platform to connect.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            {/* META BUTTON - Wires to API */}
            <Button
              variant="outline"
              className="h-24 flex flex-col gap-2 hover:border-blue-600 hover:bg-blue-50"
              onClick={() => (window.location.href = "/api/connect/meta")}
            >
              <Facebook className="h-8 w-8 text-blue-600" />
              <span className="font-bold text-slate-700">Meta Ads</span>
            </Button>

            <Button
              variant="outline"
              className="h-24 flex flex-col gap-2 hover:border-black hover:bg-slate-50"
              onClick={() => alert("Coming soon in Phase 2")}
            >
              <span className="h-8 w-8 flex items-center justify-center font-black text-2xl">
                Tk
              </span>
              <span className="font-bold text-slate-700">TikTok Ads</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rename Modal */}
      <Dialog open={renameModalOpen} onOpenChange={setRenameModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Account</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <Label>Nickname</Label>
            <Input
              placeholder="e.g. Christmas Promo Account"
              value={newNickname}
              onChange={(e) => setNewNickname(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRename}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DISCONNECT CONFIRMATION MODAL */}
      <Dialog
        open={!!disconnectId}
        onOpenChange={(open) => !open && setDisconnectId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <Trash2 className="h-5 w-5" /> Disconnect Account?
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to disconnect this ad account? Active
              campaigns will keep running on Facebook, but you won't be able to
              manage them here.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisconnectId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDisconnect}>
              Disconnect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
