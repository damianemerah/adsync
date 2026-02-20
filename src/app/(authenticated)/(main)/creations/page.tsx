"use client";
import { HelpCenterSheet } from "@/components/layout/help-center-sheet";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useCreatives } from "@/hooks/use-creatives";
import { useSocialMedia } from "@/hooks/use-social-media";
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
  Message,
  Heart,
  Plus,
  OpenNewWindow,
  NavArrowDown,
} from "iconoir-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTable } from "@/components/ui/data-table";
import { SocialPostCard } from "@/components/creatives/social-post-card";
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
  const { creatives, isLoading } = useCreatives();
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useSocialMedia();
  const { data: accounts } = useAdAccounts();

  // Flatten pages into one list of posts
  const socialPosts = data?.pages.flatMap((page) => page.posts) || [];

  const [activeTab, setActiveTab] = useState("library");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [filterType, setFilterType] = useState<
    "all" | "image" | "video" | "generated_image"
  >("all");

  // Modals
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [previewItem, setPreviewItem] = useState<any>(null);

  // Check if a Meta account is connected
  const isMetaConnected = accounts?.some(
    (acc) => acc.platform === "meta" && acc.status === "active",
  );

  const toggleSelection = (id: string) => {
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  // Helper to open preview
  const handlePreview = (item: any, type: "library" | "social") => {
    console.log(item);
    setPreviewItem({ ...item, _type: type });
  };

  // Filtered creatives based on type selection
  const filteredCreatives =
    filterType === "all"
      ? creatives
      : creatives.filter((c) => c.media_type === filterType);

  // Delete a creative from storage + DB, then invalidate the list
  const handleDelete = async (id: string) => {
    try {
      const supabase = createClient();
      const { error } = await supabase.from("creatives").delete().eq("id", id);
      if (error) throw error;
      // Remove from selection if selected
      setSelectedItems((prev) => prev.filter((s) => s !== id));
      // Close preview if this was the previewed item
      if (previewItem?.id === id) setPreviewItem(null);
      queryClient.invalidateQueries({ queryKey: ["creatives"] });
      toast.success("Creative deleted");
    } catch (err: any) {
      toast.error("Failed to delete", { description: err.message });
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
          <div className="h-10 w-10 rounded-xl bg-muted overflow-hidden relative shrink-0">
            <Image
              src={item.original_url}
              alt={item.name || "Creative"}
              fill
              className="object-cover"
            />
          </div>
          {item.name}
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
            <HelpCenterSheet />
            <Button
              onClick={() => router.push("/creations/studio")}
              size="sm"
              className="h-9 px-5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-soft gap-2"
            >
              <Sparks className="w-4 h-4" /> Generate with AI
            </Button>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto p-2 md:p-4 lg:p-6">
        <Tabs
          defaultValue="library"
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6 container max-w-7xl mx-auto"
        >
          {/* Toolbar */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card p-2 rounded-3xl border border-border shadow-soft">
            <TabsList className="bg-muted/50 p-1 rounded-2xl h-12">
              <TabsTrigger
                value="library"
                className="rounded-xl px-6 h-10 text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all"
              >
                Media Library
              </TabsTrigger>
              <TabsTrigger
                value="social"
                className="rounded-xl px-6 h-10 text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all"
              >
                Social Posts
              </TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-2">
              {activeTab === "library" && (
                <>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-10 rounded-xl border-border text-subtle-foreground hover:text-foreground hover:bg-muted gap-2"
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
                  <div className="bg-muted/50 p-1 rounded-xl flex border border-border">
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
                    className="h-10 px-6 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-soft hover:shadow-lg transition-all"
                  >
                    <CloudUpload className="w-4 h-4 mr-2" /> Upload
                  </Button>
                </>
              )}
              {activeTab === "social" && !isMetaConnected && (
                <Button
                  size="sm"
                  className="h-10 px-6 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl shadow-soft"
                  onClick={() => (window.location.href = "/api/connect/meta")}
                >
                  <Plus className="w-4 h-4 mr-2" /> Connect Account
                </Button>
              )}
            </div>
          </div>

          {/* Tab Content: Library */}
          <TabsContent value="library" className="mt-0">
            {view === "grid" ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {/* Add New tile */}
                <div
                  onClick={() => setUploadModalOpen(true)}
                  className="aspect-square rounded-3xl border-2 border-dashed border-border bg-card/50 hover:bg-primary/5 hover:border-primary/50 transition-all cursor-pointer flex flex-col items-center justify-center gap-3 text-muted-foreground hover:text-primary group"
                >
                  <div className="h-14 w-14 rounded-full bg-background shadow-soft flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Plus className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-medium">Add New</span>
                </div>

                {/* Skeleton cards while loading */}
                {isLoading &&
                  [...Array(8)].map((_, i) => (
                    <div
                      key={`skeleton-${i}`}
                      className="rounded-3xl border border-border bg-card overflow-hidden animate-pulse"
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
                      onClick={() => handlePreview(item, "library")}
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
          </TabsContent>

          {/* Tab Content: Social */}
          <TabsContent value="social" className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {socialPosts.map((post) => (
                <SocialPostCard
                  key={post.id}
                  post={post}
                  selected={selectedItems.includes(post.id)}
                  onSelect={() => toggleSelection(post.id)}
                  onClick={() => handlePreview(post, "social")} // Add click handler
                />
              ))}
              {socialPosts?.length === 0 && (
                <div className="col-span-full text-center py-10 text-muted-foreground">
                  No Instagram posts found. Connect your account in Settings.
                </div>
              )}
            </div>

            {/* Load More Button */}
            {hasNextPage && (
              <div className="py-8 text-center">
                <Button
                  variant="outline"
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                >
                  {isFetchingNextPage ? "Loading..." : "Load More Posts"}
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Floating Action Bar */}
      {selectedItems.length > 0 && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-foreground text-background px-6 py-3 rounded-full shadow-soft flex items-center gap-6 animate-in slide-in-from-bottom-6 z-20 border border-white/10">
          <span className="font-medium text-sm flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-primary" />
            {selectedItems.length} selected
          </span>
          <div className="h-4 w-px bg-white/20" />
          <div className="flex gap-2">
            {activeTab === "library" ? (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-slate-300 hover:text-white hover:bg-white/10"
                  onClick={async () => {
                    // Download all selected creatives as a zip is complex;
                    // for now open each in a new tab so user can save manually.
                    // TODO: implement server-side zip download.
                    const selected = creatives.filter((c) =>
                      selectedItems.includes(c.id),
                    );
                    selected.forEach((c) =>
                      window.open(c.original_url, "_blank"),
                    );
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
              </>
            ) : (
              <Button
                size="sm"
                className="bg-primary hover:bg-primary/90 text-primary-foreground border-0 rounded-full font-bold px-6 shadow-none"
                onClick={() => {
                  // Boost post: redirect to campaign wizard with social objective pre-set
                  sessionStorage.setItem("preselected_objective", "engagement");
                  router.push("/campaigns/new");
                }}
              >
                <Sparks className="w-4 h-4 mr-2" /> Boost Post
              </Button>
            )}
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
        <DialogContent className="max-w-5xl p-0 overflow-hidden bg-background border-0 shadow-soft rounded-3xl gap-0">
          <div className="grid md:grid-cols-5 h-[80vh]">
            {/* Media Side (3/5 width) */}
            <div className="md:col-span-3 bg-muted/30 flex items-center justify-center relative p-8 group">
              {/* Floating Badges */}
              <div className="absolute top-6 left-6 flex gap-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <Badge
                  variant="secondary"
                  className="bg-black/40 backdrop-blur-md text-white border-white/10 hover:bg-black/50 px-3 py-1.5 text-xs font-medium"
                >
                  {previewItem?.width} x {previewItem?.height}
                </Badge>
                <Badge
                  variant="secondary"
                  className="bg-black/40 backdrop-blur-md text-white border-white/10 hover:bg-black/50 uppercase px-3 py-1.5 text-xs font-medium"
                >
                  {previewItem?.media_type}
                </Badge>
              </div>

              {previewItem?.media_type === "VIDEO" ||
              previewItem?.media_type === "video" ? (
                <video
                  src={previewItem.media_url || previewItem.original_url}
                  controls
                  className="max-h-full max-w-full rounded-2xl shadow-xl"
                />
              ) : (
                <div className="relative w-full h-full">
                  <Image
                    src={
                      previewItem?.media_url || previewItem?.original_url || ""
                    }
                    alt="Preview"
                    fill
                    className="object-contain drop-shadow-xl"
                  />
                </div>
              )}
            </div>

            {/* Info Side (2/5 width) */}
            <div className="md:col-span-2 p-8 bg-card flex flex-col border-l border-border relative">
              <DialogHeader>
                <DialogTitle className="text-3xl font-heading font-bold text-foreground mb-2 leading-tight">
                  {previewItem?._type === "social"
                    ? "Instagram Post"
                    : previewItem?.name || "Library Asset"}
                </DialogTitle>
                <p className="text-sm text-muted-foreground font-medium flex items-center gap-2">
                  {previewItem?._type === "social" ? (
                    <>
                      <span className="w-2 h-2 rounded-full bg-pink-500" />
                      Imported from Meta
                    </>
                  ) : (
                    <>
                      <span className="w-2 h-2 rounded-full bg-primary" />
                      Uploaded to AdSync
                    </>
                  )}
                </p>
              </DialogHeader>

              <div className="flex-1 space-y-8 mt-8 overflow-y-auto pr-2 no-scrollbar">
                {previewItem?._type === "social" ? (
                  <>
                    {/* Stats Grid */}
                    <div className="flex gap-6 py-4 border-y border-border/50">
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[10px] uppercase font-bold text-subtle-foreground tracking-wider">
                          Likes
                        </span>
                        <div className="flex items-center gap-2 text-foreground font-bold text-xl">
                          <Heart className="w-5 h-5 text-pink-500 fill-pink-500" />
                          {previewItem.likes}
                        </div>
                      </div>
                      <div className="h-full w-px bg-border/50" />
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[10px] uppercase font-bold text-subtle-foreground tracking-wider">
                          Comments
                        </span>
                        <div className="flex items-center gap-2 text-foreground font-bold text-xl">
                          <Message className="w-5 h-5 text-blue-500 fill-blue-500" />
                          {previewItem.comments}
                        </div>
                      </div>
                    </div>

                    {/* Caption */}
                    <div className="space-y-3">
                      <p className="text-foreground text-sm leading-relaxed whitespace-pre-wrap">
                        {previewItem.caption || "No caption provided."}
                      </p>
                    </div>

                    {/* External Link */}
                    <Button
                      variant="outline"
                      className="w-full h-12 rounded-full border-border text-subtle-foreground hover:text-foreground hover:bg-muted hover:border-border transition-all"
                      asChild
                    >
                      <a href={previewItem.permalink} target="_blank">
                        View on Instagram{" "}
                        <OpenNewWindow className="ml-2 w-4 h-4 opacity-50" />
                      </a>
                    </Button>
                  </>
                ) : (
                  <>
                    {/* Simplified Metadata for Library Assets */}
                    <div className="space-y-6">
                      <div className="bg-muted/30 p-4 rounded-2xl border border-border/50">
                        <p className="text-xs font-medium text-subtle-foreground mb-1 uppercase tracking-wider">
                          Filename
                        </p>
                        <p className="font-mono text-sm text-foreground break-all">
                          {previewItem?.name}
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <DialogFooter className="mt-auto pt-6 border-t border-border flex gap-3 z-10">
                <Button
                  variant="outline"
                  className="flex-1 h-12 rounded-full font-bold border-2 border-border text-muted-foreground hover:border-primary/50 hover:bg-primary/5 hover:text-primary transition-all"
                  onClick={() => {
                    router.push(`/creations/studio/${previewItem.id}`);
                  }}
                >
                  <Sparks className="w-4 h-4 mr-2" /> Edit
                </Button>
                <Button
                  className={cn(
                    "flex-1 h-12 text-sm rounded-full font-bold shadow-lg transition-all",
                    selectedItems.includes(previewItem?.id)
                      ? "bg-muted text-muted-foreground hover:bg-muted/80 shadow-none border border-border"
                      : "bg-primary hover:bg-primary/90 text-primary-foreground shadow-soft",
                  )}
                  onClick={() => {
                    toggleSelection(previewItem.id);
                    setPreviewItem(null);
                  }}
                >
                  {selectedItems.includes(previewItem?.id) ? (
                    <>
                      <Xmark className="w-4 h-4 mr-2" /> Deselect
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" /> Select for Ad
                    </>
                  )}
                </Button>
              </DialogFooter>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* --- MODULAR UPLOAD DIALOG --- */}
      <CreativeUploadDialog
        open={uploadModalOpen}
        onOpenChange={setUploadModalOpen}
      />
    </div>
  );
}
