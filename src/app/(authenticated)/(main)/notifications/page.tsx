"use client";

import { useState } from "react";
import { useNotifications, Notification } from "@/hooks/use-notifications";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Bell,
  CheckCheck,
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle2,
  Trash2,
  CreditCard,
  Target,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

export default function NotificationsPage() {
  const { notifications, isLoading, markAllRead, deleteNotification } =
    useNotifications();
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const filteredList =
    filter === "all" ? notifications : notifications.filter((n) => !n.is_read);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center ml-64">
        <Loader2 className="animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col min-w-0">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="flex h-16 items-center justify-between px-8">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-heading font-bold text-slate-900">
              Notifications
            </h1>
            {unreadCount > 0 && (
              <Badge className="bg-blue-600 hover:bg-blue-600">
                {unreadCount} New
              </Badge>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAllRead()}
              disabled={unreadCount === 0}
              className="text-slate-600"
            >
              <CheckCheck className="h-4 w-4 mr-2" /> Mark all read
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 p-8 max-w-4xl mx-auto w-full">
        {/* Filters */}
        <div className="flex items-center justify-between mb-6">
          <Tabs
            defaultValue="all"
            className="w-full"
            onValueChange={(v) => setFilter(v as "all")}
          >
            <TabsList className="bg-white border border-slate-200 p-1">
              <TabsTrigger value="all" className="px-4">
                All
              </TabsTrigger>
              <TabsTrigger value="unread" className="px-4">
                Unread
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* List */}
        <div className="space-y-3">
          {filteredList.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-xl border border-dashed border-slate-200">
              <div className="h-12 w-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <Bell className="h-6 w-6 text-slate-300" />
              </div>
              <p className="text-slate-500 font-medium">
                No notifications found.
              </p>
            </div>
          ) : (
            filteredList.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onDelete={() => deleteNotification(notification.id)}
              />
            ))
          )}
        </div>
      </main>
    </div>
  );
}

function NotificationItem({
  notification,
  onDelete,
}: {
  notification: Notification;
  onDelete: () => void;
}) {
  const type =
    (notification.type as "critical" | "warning" | "success" | "info") ||
    "info";
  const category = notification.category || "system";

  // Icon Logic
  const getIcon = (type: string, category: string) => {
    if (category === "budget") return <CreditCard className="h-5 w-5" />;
    if (category === "campaign") return <Target className="h-5 w-5" />;
    if (type === "critical") return <AlertCircle className="h-5 w-5" />;
    if (type === "warning") return <AlertTriangle className="h-5 w-5" />;
    if (type === "success") return <CheckCircle2 className="h-5 w-5" />;
    return <Info className="h-5 w-5" />;
  };

  // Color Logic
  const getColors = (type: string) => {
    switch (type) {
      case "critical":
        return "bg-red-50 text-red-600 border-red-100";
      case "warning":
        return "bg-orange-50 text-orange-600 border-orange-100";
      case "success":
        return "bg-green-50 text-green-600 border-green-100";
      default:
        return "bg-blue-50 text-blue-600 border-blue-100";
    }
  };

  const colors = getColors(type);
  const timeAgo = notification.created_at
    ? formatDistanceToNow(new Date(notification.created_at), {
        addSuffix: true,
      })
    : "";

  return (
    <div
      className={cn(
        "group flex items-start gap-4 p-4 rounded-xl border transition-all hover:shadow-sm bg-white relative",
        notification.is_read
          ? "border-slate-200"
          : "border-l-4 border-l-blue-600 border-y-slate-200 border-r-slate-200 bg-blue-50/10"
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          "h-10 w-10 rounded-full flex items-center justify-center shrink-0 border",
          colors
        )}
      >
        {getIcon(type, category)}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start">
          <h3
            className={cn(
              "text-sm font-bold",
              notification.is_read ? "text-slate-700" : "text-slate-900"
            )}
          >
            {notification.title}
          </h3>
          <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap ml-2">
            {timeAgo}
          </span>
        </div>

        <p className="text-sm text-slate-600 mt-1 leading-relaxed">
          {notification.message}
        </p>

        {notification.action_label && (
          <div className="mt-3">
            {notification.action_url ? (
              <Link href={notification.action_url}>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs font-semibold"
                >
                  {notification.action_label}
                </Button>
              </Link>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs font-semibold"
              >
                {notification.action_label}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Actions (Delete) */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-red-500 group-hover:bg-red-50 rounded-full transition-all absolute top-2 right-2"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
