import {
  Facebook,
  MoreVert,
  RefreshDouble,
  Star,
  WarningCircle,
} from "iconoir-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { AdAccountUI } from "@/hooks/use-ad-account";
import { Database } from "@/types/supabase";

export function StatusBadge({
  status,
}: {
  status: Database["public"]["Tables"]["ad_accounts"]["Row"]["health_status"];
}) {
  const styles: Record<string, string> = {
    healthy: "bg-green-50 text-green-700 border-green-200",
    payment_failed: "bg-red-50 text-red-700 border-red-200",
    payment_issue: "bg-orange-50 text-orange-700 border-orange-200",
    token_expired: "bg-red-50 text-red-700 border-red-200",
    disabled: "bg-slate-100 text-slate-600 border-slate-200",
    paused_by_system: "bg-yellow-50 text-yellow-700 border-yellow-200",
    not_connected: "bg-slate-100 text-slate-400",
  };

  const currentStyle = styles[status as string] ?? styles.disabled;
  const label = status?.replace(/_/g, " ") ?? "unknown";

  return (
    <Badge
      variant="outline"
      className={cn(`border ${currentStyle} font-medium capitalize`)}
    >
      {status === "healthy" && (
        <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5 animate-pulse" />
      )}
      {(status === "payment_failed" || status === "payment_issue" || status === "token_expired") && (
        <WarningCircle className="w-3 h-3 mr-1" />
      )}
      {label}
    </Badge>
  );
}

export function CompactAccountCard({
  account,
  onSetDefault,
  onRename,
  onDisconnect,
  onReconnect,
}: {
  account: AdAccountUI;
  onSetDefault: () => void;
  onRename: () => void;
  onDisconnect: () => void;
  onReconnect?: () => void;
}) {
  const isMeta = account.platform === "meta";

  return (
    <div
      className={cn(
        "grid grid-cols-[1fr_auto_auto] items-center gap-4 px-5 py-4 hover:bg-muted/30 transition-colors",
        account.isDefault && "bg-blue-50/40",
      )}
    >
      {/* Name + ID */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="h-9 w-9 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
          {isMeta ? (
            <Facebook className="h-4 w-4 text-primary" />
          ) : (
            <span className="font-bold text-xs text-primary">Tk</span>
          )}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="font-medium text-sm text-foreground truncate">
              {account.nickname || account.name}
            </p>
            {account.isDefault && (
              <Star className="h-3 w-3 text-yellow-500 fill-yellow-500 shrink-0" />
            )}
          </div>
          <p className="text-xs text-subtle-foreground truncate">
            {account.accountId} •{" "}
            {isMeta ? "Meta" : "TikTok"}
          </p>
        </div>
      </div>

      {/* Status */}
      <StatusBadge status={account.status} />

      {/* Action menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            <MoreVert className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {account.status === "token_expired" && onReconnect && (
            <>
              <DropdownMenuItem
                className="text-blue-600 focus:text-blue-600 focus:bg-blue-50"
                onClick={onReconnect}
              >
                <RefreshDouble className="h-3.5 w-3.5 mr-2" />
                Reconnect Account
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem onClick={onSetDefault} disabled={account.isDefault}>
            <Star className="h-3.5 w-3.5 mr-2" />
            Make Default
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onRename}>Rename</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-red-600 focus:text-red-600 focus:bg-red-50"
            onClick={onDisconnect}
          >
            Disconnect
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
