import {
  Facebook,
  MoreVertical,
  Star,
  CreditCard,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  const styles = {
    active: "bg-green-50 text-green-700 border-green-200",
    payment_failed: "bg-red-50 text-red-700 border-red-200",
    disabled: "bg-slate-100 text-slate-600 border-slate-200",
    not_connected: "bg-slate-100 text-slate-400",
  };

  const currentStyle = styles[status as keyof typeof styles] || styles.disabled;
  const label = status?.replace("_", " ") || "unknown";

  return (
    <Badge
      variant="outline"
      className={cn(`border ${currentStyle} font-medium capitalize h-6 px-2`)}
    >
      {status === "active" && (
        <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5 animate-pulse" />
      )}
      {status === "payment_failed" && <AlertCircle className="w-3 h-3 mr-1" />}
      {label}
    </Badge>
  );
}

export function CompactAccountCard({
  account,
  onSetDefault,
  onRename,
  onDisconnect,
}: {
  account: AdAccountUI;
  onSetDefault: () => void;
  onRename: () => void;
  onDisconnect: () => void;
}) {
  const isMeta = account.platform === "meta";

  return (
    <Card
      className={cn(
        `group hover:shadow-lg transition-all duration-300`,
        account.isDefault ? "ring-1 ring-blue-600 border-blue-600/50" : ""
      )}
    >
      <CardContent className="p-5">
        {/* Header: Icon + Name + Menu */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                `h-10 w-10 rounded-lg flex items-center justify-center text-white shadow-sm`,
                isMeta ? "bg-blue-600" : "bg-black"
              )}
            >
              {isMeta ? (
                <Facebook className="h-5 w-5" />
              ) : (
                <span className="font-bold">Tk</span>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3
                  className="font-bold text-slate-900 truncate max-w-[120px]"
                  title={account.nickname || account.name}
                >
                  {account.nickname || account.name}
                </h3>
                {account.isDefault && (
                  <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                )}
              </div>
              <p className="text-[10px] font-mono text-slate-400">
                ID: {account.accountId}
              </p>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 -mr-2 text-slate-400 hover:text-slate-700"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={onSetDefault}
                disabled={account.isDefault}
              >
                Make Default
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onRename}>Rename</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-600 focus:text-red-600 focus:bg-red-50"
                onClick={onDisconnect} // Hook it up here
              >
                Disconnect
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Body: Balance */}
        <div className="mb-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Available Credit
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">
              {account.balance}
            </span>
            <span className="text-xs text-slate-400">
              / {account.spendCap} limit
            </span>
          </div>
        </div>

        {/* Footer: Status & Pay Method */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <StatusBadge status={account.status} />

          <div
            className="flex items-center gap-1.5 text-xs text-slate-500"
            title="Payment Method"
          >
            <CreditCard className="h-3 w-3" />
            <span>•••• {account.paymentMethod.last4}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
