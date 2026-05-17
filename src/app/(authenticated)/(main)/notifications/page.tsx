"use client";

import { useState } from "react";
import { useNotifications, Notification } from "@/hooks/use-notifications";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Bell,
  DoubleCheck,
  WarningCircle,
  WarningTriangle,
  InfoCircle,
  CheckCircle,
  Trash,
  CreditCard,
  Megaphone,
  SystemRestart,
} from "iconoir-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

export default function NotificationsPage() {
  const { notifications, isLoading, unreadCount, markAllRead, markRead, deleteNotification } =
    useNotifications();
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const filteredList =
    filter === "all" ? notifications : notifications.filter((n) => !n.is_read);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center ml-64">
        <SystemRestart className="animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col min-w-0">
      {/* Header */}
      <PageHeader
        title="Notifications"
        showHelpCenter={false}
        leftContent={
          unreadCount > 0 && (
            <Badge className="bg-primary hover:bg-primary text-primary-foreground border-0">
              {unreadCount} New
            </Badge>
          )
        }
      >
        <Button
          variant="outline"
          size="sm"
          onClick={() => markAllRead()}
          disabled={unreadCount === 0}
          className="text-foreground"
        >
          <DoubleCheck className="h-4 w-4 mr-2" /> Mark all read
        </Button>
      </PageHeader>

      <main className="flex-1 flex flex-col w-full">
        {/* Filters */}
        <div className="px-4 sm:px-8 pt-6 sm:pt-8">
          <Tabs
            value={filter}
            className="w-full"
            onValueChange={(v) => setFilter(v as "all" | "unread")}
          >
            <TabsList className="bg-muted p-1 h-auto gap-2 rounded-lg w-full max-w-4xl mx-auto ">
              <TabsTrigger value="all" className="px-4 py-2 text-slate-600 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm hover:bg-slate-100 rounded-md transition-colors">
                All
              </TabsTrigger>
              <TabsTrigger value="unread" className="px-4 py-2 text-slate-600 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm hover:bg-slate-100 rounded-md transition-colors">
                Unread {unreadCount > 0 && `(${unreadCount})`}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 sm:px-8 py-6 max-w-4xl mx-auto w-full">

            {/* List */}
            <div className="space-y-3">
              {filteredList.length === 0 ? (
                <div className="text-center py-20">
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
                    onRead={() => markRead(notification.id)}
                    onDelete={() => deleteNotification(notification.id)}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function NotificationItem({
  notification,
  onRead,
  onDelete,
}: {
  notification: Notification;
  onRead: () => void;
  onDelete: () => void;
}) {
  const type =
    (notification.type as "critical" | "warning" | "success" | "info") ||
    "info";
  const category = notification.category || "system";



  const timeAgo = notification.created_at
    ? formatDistanceToNow(new Date(notification.created_at), {
        addSuffix: true,
      })
    : "";

  return (
    <div
      className={cn(
        "group flex items-start gap-4 p-4 rounded-md border transition-all bg-white relative cursor-pointer hover:bg-slate-50",
        notification.is_read
          ? "border-slate-200"
          : "border-l-4 border-l-blue-600 border-y-slate-200 border-r-slate-200",
      )}
      onClick={() => !notification.is_read && onRead()}
    >

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start">
          <h3
            className={cn(
              "text-sm font-bold",
              notification.is_read ? "text-slate-700" : "text-slate-900",
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
              <Button
                asChild
                size="sm"
                variant="outline"
                className="h-8 text-xs font-semibold"
                onClick={(e) => e.stopPropagation()}
              >
                <Link href={notification.action_url}>
                  {notification.action_label}
                </Link>
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs font-semibold pointer-events-none"
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
        <Trash className="h-4 w-4" />
      </button>
    </div>
  );
}
