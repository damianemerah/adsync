"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useCreatives } from "@/hooks/use-creatives";
import { useSocialMedia } from "@/hooks/use-social-media";
import {
  CloudUpload,
  Filter,
  Grid3x3,
  List as ListIcon,
  Download,
  ArrowRight,
  X,
  MoreVertical,
  CheckCircle2,
  Sparkles,
  MessageCircle,
  Heart,
  Plus,
  ExternalLink,
} from "lucide-react";

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

export default function CreativesPage() {
  const { creatives, isLoading } = useCreatives();
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useSocialMedia();
  const { data: accounts } = useAdAccounts();

  // Flatten pages into one list of posts
  const socialPosts = data?.pages.flatMap((page) => page.posts) || [];

  const [activeTab, setActiveTab] = useState("library");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  // Modals
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [previewItem, setPreviewItem] = useState<any>(null);

  // Check if a Meta account is connected
  const isMetaConnected = accounts?.some(
    (acc) => acc.platform === "meta" && acc.status === "active"
  );

  const toggleSelection = (id: string) => {
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Helper to open preview
  const handlePreview = (item: any, type: "library" | "social") => {
    setPreviewItem({ ...item, _type: type });
  };

  // --- COLUMNS ---
  const columns = [
    {
      key: "select",
      title: (
        <Checkbox
          checked={
            selectedItems.length === creatives?.length && creatives?.length > 0
          }
          onCheckedChange={() =>
            setSelectedItems(
              selectedItems.length === creatives?.length
                ? []
                : creatives?.map((c) => c.id) || []
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
        <div className="flex items-center gap-3 font-medium text-slate-900">
          <div className="h-10 w-10 rounded-lg bg-slate-100 overflow-hidden relative shrink-0">
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
        <span className="text-slate-500 font-mono text-xs">
          {item.width ? `${item.width}x${item.height}` : "---"}
        </span>
      ),
    },
    {
      key: "type",
      title: "Type",
      render: (item: Creative) => (
        <Badge variant="secondary" className="uppercase text-[10px]">
          {item.media_type}
        </Badge>
      ),
    },
    {
      key: "actions",
      title: " ",
      render: () => (
        <Button size="icon" variant="ghost">
          <MoreVertical className="w-4 h-4 text-slate-400" />
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-50 font-sans">
      {/* HEADER */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="flex h-16 items-center justify-between px-8">
          <h1 className="text-xl font-heading font-bold text-slate-900">
            Creatives
          </h1>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto p-8">
        <Tabs
          defaultValue="library"
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          {/* Toolbar */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-2 rounded-xl border border-slate-100 shadow-sm">
            <TabsList className="bg-slate-100 p-1 rounded-lg h-10">
              <TabsTrigger
                value="library"
                className="rounded-md px-4 h-8 text-sm data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm"
              >
                Media Library
              </TabsTrigger>
              <TabsTrigger
                value="social"
                className="rounded-md px-4 h-8 text-sm data-[state=active]:bg-white data-[state=active]:text-purple-600 data-[state=active]:shadow-sm"
              >
                Social Posts
              </TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-2">
              {activeTab === "library" && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 border-slate-200 text-slate-600"
                  >
                    <Filter className="w-4 h-4 mr-2" /> Filter
                  </Button>
                  <div className="bg-slate-100 p-1 rounded-lg flex border border-slate-200">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setView("grid")}
                      className={`h-7 w-7 p-0 rounded-md ${
                        view === "grid"
                          ? "bg-white shadow-sm text-blue-600"
                          : "text-slate-500"
                      }`}
                    >
                      <Grid3x3 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setView("list")}
                      className={`h-7 w-7 p-0 rounded-md ${
                        view === "list"
                          ? "bg-white shadow-sm text-blue-600"
                          : "text-slate-500"
                      }`}
                    >
                      <ListIcon className="w-4 h-4" />
                    </Button>
                  </div>
                  <Button
                    onClick={() => setUploadModalOpen(true)}
                    size="sm"
                    className="h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20 font-bold text-white"
                  >
                    <CloudUpload className="w-4 h-4 mr-2" /> Upload
                  </Button>
                </>
              )}
              {activeTab === "social" && !isMetaConnected && (
                <Button
                  size="sm"
                  className="h-9 px-4 bg-purple-600 hover:bg-purple-700 text-white font-bold"
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
                <div
                  onClick={() => setUploadModalOpen(true)}
                  className="aspect-square rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-blue-50 hover:border-blue-300 transition-all cursor-pointer flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-blue-600 group"
                >
                  <div className="h-12 w-12 rounded-full bg-white shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Plus className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-medium">Add New</span>
                </div>

                {creatives.map((item) => (
                  <CreativeCard
                    key={item.id}
                    data={item}
                    selected={selectedItems.includes(item.id)}
                    onSelect={() => toggleSelection(item.id)}
                    onClick={() => handlePreview(item, "library")}
                  />
                ))}
              </div>
            ) : (
              <DataTable
                columns={columns}
                data={creatives}
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
                <div className="col-span-full text-center py-10 text-slate-500">
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
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-6 animate-in slide-in-from-bottom-6 z-20">
          <span className="font-medium text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-400" />
            {selectedItems.length} selected
          </span>
          <div className="h-4 w-px bg-slate-700" />
          <div className="flex gap-2">
            {activeTab === "library" ? (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-slate-300 hover:text-white hover:bg-slate-800"
                >
                  <Download className="w-4 h-4 mr-2" /> Download
                </Button>
                <Button
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-500 text-white border-0 rounded-lg font-bold"
                >
                  Create Campaign <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                className="bg-purple-600 hover:bg-purple-500 text-white border-0 rounded-lg font-bold"
              >
                <Sparkles className="w-4 h-4 mr-2" /> Boost Post
              </Button>
            )}
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setSelectedItems([])}
            className="ml-2 h-8 w-8 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* --- PREVIEW MODAL --- */}

      <Dialog
        open={!!previewItem}
        onOpenChange={(open) => !open && setPreviewItem(null)}
      >
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black/95 border-slate-800 text-white">
          <div className="grid md:grid-cols-2 h-[80vh]">
            {/* Media Side */}
            <div className="bg-black flex items-center justify-center relative">
              {previewItem?.media_type === "VIDEO" ||
              previewItem?.media_type === "video" ? (
                <video
                  src={previewItem.media_url || previewItem.original_url}
                  controls
                  className="max-h-full max-w-full"
                />
              ) : (
                <div className="relative w-full h-full">
                  <Image
                    src={
                      previewItem?.media_url || previewItem?.original_url || ""
                    }
                    alt="Preview"
                    fill
                    className="object-contain"
                  />
                </div>
              )}
            </div>

            {/* Info Side */}
            <div className="p-8 bg-slate-900 flex flex-col border-l border-slate-800">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-white mb-2">
                  {previewItem?._type === "social"
                    ? "Instagram Post"
                    : "Library Asset"}
                </DialogTitle>
              </DialogHeader>

              <div className="flex-1 space-y-6 mt-4">
                {previewItem?._type === "social" ? (
                  <>
                    <div className="flex gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Heart className="w-4 h-4 text-pink-500" />{" "}
                        {previewItem.likes}
                      </div>
                      <div className="flex items-center gap-1">
                        <MessageCircle className="w-4 h-4 text-blue-400" />{" "}
                        {previewItem.comments}
                      </div>
                    </div>
                    <p className="text-slate-300 text-sm leading-relaxed border-l-2 border-slate-700 pl-3">
                      {previewItem.caption}
                    </p>
                    <Button
                      variant="outline"
                      className="w-full border-slate-700 text-slate-300 hover:bg-slate-800"
                      asChild
                    >
                      <a href={previewItem.permalink} target="_blank">
                        View on Instagram{" "}
                        <ExternalLink className="ml-2 w-3 h-3" />
                      </a>
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="space-y-1">
                      <p className="text-xs text-slate-500 uppercase font-bold">
                        Filename
                      </p>
                      <p className="font-mono text-sm">{previewItem?.name}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-slate-500 uppercase font-bold">
                        Dimensions
                      </p>
                      <p className="font-mono text-sm">
                        {previewItem?.width} x {previewItem?.height}
                      </p>
                    </div>
                  </>
                )}
              </div>

              <DialogFooter className="mt-auto pt-6 border-t border-slate-800">
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-500 font-bold"
                  onClick={() => {
                    toggleSelection(previewItem.id);
                    setPreviewItem(null);
                  }}
                >
                  {selectedItems.includes(previewItem?.id)
                    ? "Deselect"
                    : "Select for Ad"}
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
