"use client";
import { HelpCenterSheet } from "@/components/layout/help-center-sheet";
import { CreditsDisplay } from "@/components/layout/credits-display";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useCreatives } from "@/hooks/use-creatives";
import {
  CloudUpload,
  FilterList,
  ViewGrid,
  List,
  Download,
  ArrowRight,
  Xmark,
  MoreVert,
  CheckCircle,
  Sparks,
  Plus,
  NavArrowDown,
  Bin,
} from "iconoir-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTable } from "@/components/ui/data-table";
import { Creative } from "@/types";
import { CreativeCard } from "@/components/creatives/creative-card";
import { useAdAccounts } from "@/hooks/use-ad-account";
import { CreativeUploadDialog } from "@/components/creatives/creative-upload-dialog";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

export default function CreativesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { creatives, isLoading, deleteCreatives, isDeleting } = useCreatives();
  const { data: accounts } = useAdAccounts();

  const [view, setView] = useState<"grid" | "list">("grid");
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [filterType, setFilterType] = useState<
    "all" | "image" | "video" | "generated_image"
  >("all");

  // Modals
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [previewItem, setPreviewItem] = useState<any>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");

  const toggleSelection = (id: string) => {
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  // Helper to open preview
  const handlePreview = (item: any) => {
    setPreviewItem({ ...item });
    setEditedName(item.name || "");
    setIsEditingName(false);
  };

  const handleUpdateName = async () => {
    if (!editedName.trim() || editedName === previewItem.name) {
      setIsEditingName(false);
      return;
    }

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("creatives")
        .update({ name: editedName.trim() })
        .eq("id", previewItem.id);

      if (error) throw error;

      setPreviewItem({ ...previewItem, name: editedName.trim() });
      setIsEditingName(false);
      queryClient.invalidateQueries({ queryKey: ["creatives"] });
      toast.success("Name updated");
    } catch (err: any) {
      toast.error("Failed to update name", { description: err.message });
    }
  };

  // Filtered creatives based on type selection
  const filteredCreatives =
    filterType === "all"
      ? creatives
      : creatives.filter((c) => c.media_type === filterType);

  // Delete a creative from storage + DB, then invalidate the list
  const handleDelete = async (id: string) => {
    try {
      await deleteCreatives([id]);
      // Remove from selection if selected
      setSelectedItems((prev) => prev.filter((s) => s !== id));
      // Close preview if this was the previewed item
      if (previewItem?.id === id) setPreviewItem(null);
      toast.success("Creative deleted");
    } catch (err: any) {
      toast.error("Failed to delete", { description: err.message });
    }
  };

  const handleBatchDelete = async () => {
    if (selectedItems.length === 0) return;

    try {
      await deleteCreatives(selectedItems);
      setSelectedItems([]);
      setIsDeleteDialogOpen(false);
      toast.success(`${selectedItems.length} assets deleted`);
    } catch (err: any) {
      toast.error("Failed to delete assets", { description: err.message });
    }
  };

  // Navigate to campaign wizard with selected creatives pre-loaded
  const handleCreateCampaign = () => {
    // Store selected IDs in sessionStorage so the wizard can pick them up
    sessionStorage.setItem(
      "preselected_creatives",
      JSON.stringify(selectedItems),
    );
    router.push("/campaigns/new");
  };

  // --- COLUMNS ---
  const columns = [
    {
      key: "select",
      title: (
        <Checkbox
          checked={
            selectedItems.length === filteredCreatives?.length &&
            filteredCreatives?.length > 0
          }
          onCheckedChange={() =>
            setSelectedItems(
              selectedItems.length === filteredCreatives?.length
                ? []
                : filteredCreatives?.map((c) => c.id) || [],
            )
          }
        />
      ),
      className: "w-12",
      render: (item: Creative) => (
        <Checkbox
          checked={selectedItems.includes(item.id)}
          onCheckedChange={() => toggleSelection(item.id)}
          onClick={(e) => e.stopPropagation()}
        />
      ),
    },
    {
      key: "asset",
      title: "Asset",
      render: (item: Creative) => (
        <div className="flex items-center gap-3 font-medium text-foreground">
          <div className="h-10 w-10 rounded-md bg-muted overflow-hidden relative shrink-0">
            <Image
              src={item.thumbnail_url || item.original_url}
              alt={item.name || "Creative"}
              fill
              className="object-cover"
            />
          </div>
          <span className="truncate max-w-[240px]" title={item.name || ""}>
            {item.name}
          </span>
        </div>
      ),
    },
    {
      key: "dimensions",
      title: "Dimensions",
      render: (item: Creative) => (
        <span className="text-muted-foreground font-mono text-xs">
          {item.width ? `${item.width}x${item.height}` : "---"}
        </span>
      ),
    },
    {
      key: "type",
      title: "Type",
      render: (item: Creative) => (
        <Badge
          variant="secondary"
          className="uppercase text-[10px] bg-muted hover:bg-muted/80 text-subtle-foreground shadow-none"
        >
          {item.media_type}
        </Badge>
      ),
    },
    {
      key: "actions",
      title: " ",
      render: () => (
        <Button size="icon" variant="ghost">
          <MoreVert className="w-4 h-4 text-muted-foreground" />
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-muted/30 font-sans">
      {/* HEADER */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="flex h-16 items-center justify-between px-2 sm:px-4 lg:px-6 container max-w-7xl mx-auto">
          <h1 className="text-xl font-heading font-bold text-foreground tracking-tight">
            Creatives
          </h1>
          <div className="flex items-center gap-3">
            <CreditsDisplay />
            <HelpCenterSheet />
            <Button
              onClick={() => router.push("/creations/studio")}
              size="sm"
              className="h-9 px-5 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-sm border border-border gap-2"
            >
              <Sparks className="w-4 h-4" /> Generate with AI
            </Button>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto p-2 md:p-4 lg:p-6">
        <div className="space-y-6 container max-w-7xl mx-auto">
          {/* Toolbar */}
          <div className="flex flex-col md:flex-row justify-end items-start md:items-center gap-4 bg-card p-2 rounded-lg shadow-sm border border-border">
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-10 rounded-md border-border text-subtle-foreground hover:text-foreground hover:bg-muted gap-2"
                  >
                    <FilterList className="w-4 h-4" />
                    {filterType === "all"
                      ? "Filter"
                      : filterType === "generated_image"
                        ? "AI Generated"
                        : filterType.charAt(0).toUpperCase() +
                          filterType.slice(1) +
                          "s"}
                    <NavArrowDown className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-44">
                  <DropdownMenuCheckboxItem
                    checked={filterType === "all"}
                    onCheckedChange={() => setFilterType("all")}
                  >
                    All Assets
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={filterType === "image"}
                    onCheckedChange={() => setFilterType("image")}
                  >
                    Images
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={filterType === "video"}
                    onCheckedChange={() => setFilterType("video")}
                  >
                    Videos
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={filterType === "generated_image"}
                    onCheckedChange={() => setFilterType("generated_image")}
                  >
                    AI Generated
                  </DropdownMenuCheckboxItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <div className="bg-muted/50 p-1 rounded-md flex border border-border">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setView("grid")}
                  className={cn(
                    "h-8 w-8 p-0 rounded-lg transition-all",
                    view === "grid"
                      ? "bg-background shadow-sm text-primary"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <ViewGrid className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setView("list")}
                  className={cn(
                    "h-8 w-8 p-0 rounded-lg transition-all",
                    view === "list"
                      ? "bg-background shadow-sm text-primary"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
              <Button
                onClick={() => setUploadModalOpen(true)}
                size="sm"
                className="h-10 px-6 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-sm hover:shadow-sm border border-border transition-all"
              >
                <CloudUpload className="w-4 h-4 mr-2" /> Upload
              </Button>
            </div>
          </div>

          {/* Tab Content: Library */}
          <div className="mt-0">
            {view === "grid" ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {/* Add New tile */}
                <div
                  onClick={() => setUploadModalOpen(true)}
                  className="aspect-square rounded-lg border-2 border-dashed border-border bg-card/50 hover:bg-primary/5 hover:border-primary/50 transition-all cursor-pointer flex flex-col items-center justify-center gap-3 text-muted-foreground hover:text-primary group"
                >
                  <div className="h-14 w-14 rounded-full bg-background shadow-sm border border-border flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Plus className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-medium">Add New</span>
                </div>

                {/* Skeleton cards while loading */}
                {isLoading &&
                  [...Array(8)].map((_, i) => (
                    <div
                      key={`skeleton-${i}`}
                      className="rounded-lg border border-border bg-card overflow-hidden animate-pulse"
                    >
                      <div className="aspect-square bg-muted" />
                      <div className="p-3 space-y-2">
                        <div className="h-3 bg-muted rounded-full w-3/4" />
                        <div className="h-2.5 bg-muted rounded-full w-1/2" />
                      </div>
                    </div>
                  ))}

                {/* Real cards */}
                {!isLoading &&
                  filteredCreatives.map((item) => (
                    <CreativeCard
                      key={item.id}
                      data={item}
                      selected={selectedItems.includes(item.id)}
                      onSelect={() => toggleSelection(item.id)}
                      onClick={() => handlePreview(item)}
                      onDelete={handleDelete}
                    />
                  ))}

                {/* Empty state when filter has no results */}
                {!isLoading &&
                  filteredCreatives.length === 0 &&
                  filterType !== "all" && (
                    <div className="col-span-full py-16 text-center text-muted-foreground">
                      <p className="font-medium">
                        No{" "}
                        {filterType === "generated_image"
                          ? "AI generated"
                          : filterType}{" "}
                        assets found.
                      </p>
                      <button
                        onClick={() => setFilterType("all")}
                        className="mt-2 text-sm text-primary hover:underline"
                      >
                        Clear filter
                      </button>
                    </div>
                  )}
              </div>
            ) : (
              <DataTable
                columns={columns}
                data={filteredCreatives}
                enableViewToggle={false}
              />
            )}
          </div>
        </div>
      </main>

      {/* Floating Action Bar */}
      {selectedItems.length > 0 && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-foreground text-background px-6 py-3 rounded-full shadow-sm border border-border flex items-center gap-6 animate-in slide-in-from-bottom-6 z-20">
          <span className="font-medium text-sm flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-primary" />
            {selectedItems.length} selected
          </span>
          <div className="h-4 w-px bg-white/20" />
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              className="text-slate-300 hover:text-white hover:bg-white/10"
              onClick={() => setIsDeleteDialogOpen(true)}
              disabled={isDeleting}
            >
              <Bin className="w-4 h-4 mr-2" /> Delete
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-slate-300 hover:text-white hover:bg-white/10"
              onClick={async () => {
                // Download all selected creatives as a zip is complex;
                // for now open each in a new tab so user can save manually.
                const selected = creatives.filter((c) =>
                  selectedItems.includes(c.id),
                );
                selected.forEach((c) => window.open(c.original_url, "_blank"));
              }}
            >
              <Download className="w-4 h-4 mr-2" /> Download
            </Button>
            <Button
              size="sm"
              className="bg-primary hover:bg-primary/90 text-primary-foreground border-0 rounded-full font-bold px-6 shadow-none"
              onClick={handleCreateCampaign}
            >
              Create Campaign <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setSelectedItems([])}
            className="ml-2 h-8 w-8 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white"
          >
            <Xmark className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* --- PREVIEW MODAL --- */}

      <Dialog
        open={!!previewItem}
        onOpenChange={(open) => !open && setPreviewItem(null)}
      >
        <DialogContent className="max-w-lg p-0 overflow-hidden bg-background border-0 shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] gap-0 h-[85vh] sm:h-[80vh]">
          <div className="relative w-full h-full flex flex-col group overflow-hidden">
            {/* Background Media Layer */}
            <div className="absolute inset-0 z-0">
              {previewItem?.media_type === "VIDEO" ||
              previewItem?.media_type === "video" ? (
                <video
                  src={previewItem.media_url || previewItem.original_url}
                  poster={previewItem.thumbnail_url}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover scale-105 group-hover:scale-100 transition-transform duration-700 ease-out"
                />
              ) : (
                <Image
                  src={
                    previewItem?.media_url ||
                    previewItem?.original_url ||
                    "/placeholder.png"
                  }
                  alt="Preview"
                  fill
                  className="object-cover scale-105 group-hover:scale-100 transition-transform duration-700 ease-out"
                />
              )}
              {/* Vibe Gradient Overlay */}
              <div className="absolute inset-0 bg-linear-to-t from-black/95 via-black/40 to-transparent opacity-80" />
            </div>

            {/* Top Floating Badges */}
            <div className="absolute top-6 left-6 flex gap-2 z-20">
              <Badge className="bg-white/10 backdrop-blur-xl text-white border-white/20 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider">
                {previewItem?.media_type}
              </Badge>
              {previewItem?.width && previewItem?.height && previewItem.width > 0 && previewItem.height > 0 && (
                <Badge className="bg-white/10 backdrop-blur-xl text-white border-white/20 px-3 py-1.5 text-[10px] font-bold">
                  {previewItem.width}x{previewItem.height}
                </Badge>
              )}
            </div>

            {/* Content Overlay Section */}
            <div className="mt-auto relative z-10 p-8 pt-24 space-y-6">
              <div className="space-y-1">
                {isEditingName ? (
                  <Input
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    onBlur={handleUpdateName}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleUpdateName();
                      if (e.key === "Escape") setIsEditingName(false);
                    }}
                    className="bg-white/10 border-white/20 text-white text-2xl font-heading font-bold h-auto py-1 px-3 mb-2 focus-visible:ring-0 focus-visible:border-white/40 rounded-xl"
                    autoFocus
                  />
                ) : (
                  <h2
                    className="text-3xl font-heading font-bold text-white leading-tight tracking-tight drop-shadow-sm cursor-pointer hover:text-white/80 transition-colors block truncate w-full"
                    onClick={() => setIsEditingName(true)}
                    title={previewItem?.name || "Library Asset"}
                  >
                    {previewItem?.name || "Library Asset"}
                  </h2>
                )}
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                  <span className="text-sm font-medium text-white/60">
                    Saved to Tenzu Library
                  </span>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1 h-14 rounded-2xl font-bold bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-white transition-all backdrop-blur-sm"
                  onClick={() => {
                    router.push(`/creations/studio/${previewItem.id}`);
                  }}
                >
                  <Sparks className="w-5 h-5 mr-2 text-primary" /> Edit
                </Button>
                <Button
                  className={cn(
                    "flex-[1.5] h-14 text-sm rounded-2xl font-bold shadow-xl transition-all",
                    selectedItems.includes(previewItem?.id)
                      ? "bg-white/20 text-white hover:bg-white/30 border border-white/20"
                      : "bg-primary hover:bg-primary/90 text-primary-foreground border-0",
                  )}
                  onClick={() => {
                    toggleSelection(previewItem.id);
                    setPreviewItem(null);
                  }}
                >
                  {selectedItems.includes(previewItem?.id) ? (
                    <>
                      <Xmark className="w-5 h-5 mr-2" /> Deselect
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5 mr-2" /> Select for Ad
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* --- MODULAR UPLOAD DIALOG --- */}
      <CreativeUploadDialog
        open={uploadModalOpen}
        onOpenChange={setUploadModalOpen}
      />

      {/* --- DELETE CONFIRMATION DIALOG --- */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-heading font-bold">
              Delete {selectedItems.length} Assets?
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-subtle-foreground">
              Are you sure you want to delete these assets? This will also
              physically remove them from Supabase storage and cannot be undone.
            </p>
          </div>
          <DialogFooter className="flex gap-3">
            <Button
              variant="ghost"
              onClick={() => setIsDeleteDialogOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleBatchDelete}
              disabled={isDeleting}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold"
            >
              {isDeleting ? "Deleting..." : "Yes, Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
