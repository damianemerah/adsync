"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import {
  Bell,
  DoubleCheck,
  WarningCircle,
  WarningTriangle,
  InfoCircle,
  CheckCircle,
  CreditCard,
  Megaphone,
} from "iconoir-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useNotifications, Notification } from "@/hooks/use-notifications";

export function NotificationBell() {
  const router = useRouter();
  const { notifications, unreadCount, markAllRead, markRead } =
    useNotifications();

  const recent = notifications.slice(0, 6);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-11 w-11 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white leading-none ring-2 ring-background">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-[380px] p-0 rounded-2xl border-border shadow-soft overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-foreground">
              Notifications
            </span>
            {unreadCount > 0 && (
              <Badge className="bg-destructive hover:bg-destructive h-5 text-[10px] px-1.5">
                {unreadCount} new
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={() => markAllRead()}
              className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors font-medium"
            >
              <DoubleCheck className="h-3.5 w-3.5" />
              Mark all read
            </button>
          )}
        </div>

        {/* List */}
        <div className="max-h-[360px] overflow-y-auto divide-y divide-border">
          {recent.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-6">
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-3">
                <Bell className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">
                You're all caught up
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                We'll alert you when something needs attention.
              </p>
            </div>
          ) : (
            recent.map((n) => (
              <NotificationRow
                key={n.id}
                notification={n}
                onRead={() => markRead(n.id)}
              />
            ))
          )}
        </div>

        {/* Footer */}
        {recent.length > 0 && (
          <div className="border-t border-border bg-muted/20">
            <Link
              href="/notifications"
              className="flex items-center justify-center py-3 text-xs font-semibold text-primary hover:text-primary/80 hover:bg-muted/50 transition-colors"
            >
              View all notifications →
            </Link>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

function NotificationRow({
  notification,
  onRead,
}: {
  notification: Notification;
  onRead: () => void;
}) {
  const type = (notification.type as string) || "info";
  const category = notification.category || "system";

  const getIcon = () => {
    if (category === "budget" || category === "billing")
      return <CreditCard className="h-4 w-4" />;
    if (category === "campaign") return <Megaphone className="h-4 w-4" />;
    if (type === "critical") return <WarningCircle className="h-4 w-4" />;
    if (type === "warning") return <WarningTriangle className="h-4 w-4" />;
    if (type === "success") return <CheckCircle className="h-4 w-4" />;
    return <InfoCircle className="h-4 w-4" />;
  };

  const getIconColors = () => {
    switch (type) {
      case "critical":
        return "bg-red-50 text-red-500";
      case "warning":
        return "bg-orange-50 text-orange-500";
      case "success":
        return "bg-green-50 text-green-600";
      default:
        return "bg-blue-50 text-blue-500";
    }
  };

  const timeAgo = notification.created_at
    ? formatDistanceToNow(new Date(notification.created_at), {
        addSuffix: true,
      })
    : "";

  const content = (
    <div
      className={cn(
        "flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-muted/40 transition-colors",
        !notification.is_read && "bg-primary/[0.03]",
      )}
      onClick={onRead}
    >
      {/* Unread dot */}
      <div className="relative shrink-0 mt-0.5">
        <div
          className={cn(
            "h-8 w-8 rounded-full flex items-center justify-center",
            getIconColors(),
          )}
        >
          {getIcon()}
        </div>
        {!notification.is_read && (
          <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary ring-1 ring-background" />
        )}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-[13px] leading-snug",
            notification.is_read
              ? "text-muted-foreground font-normal"
              : "text-foreground font-semibold",
          )}
        >
          {notification.title}
        </p>
        <p className="text-[12px] text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
          {notification.message}
        </p>
        <span className="text-[10px] text-muted-foreground/70 mt-1 block font-medium">
          {timeAgo}
        </span>
      </div>
    </div>
  );

  // If there's an action URL, wrap with a link
  if (notification.action_url) {
    return (
      <Link href={notification.action_url} onClick={onRead}>
        {content}
      </Link>
    );
  }

  return content;
}
