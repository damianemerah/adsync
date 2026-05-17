"use client"

import Link from "next/link"
import { WarningTriangle, InfoCircle, XmarkCircle, ArrowRight } from "iconoir-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { CreativeInsight, InsightSeverity } from "@/lib/creative-signals"

interface InsightCardProps {
  insight: CreativeInsight
}

const severityConfig: Record<
  InsightSeverity,
  { dot: string; badge: string; icon: React.ElementType; label: string }
> = {
  critical: {
    dot: "bg-destructive",
    badge: "bg-destructive/10 text-destructive border-destructive/20",
    icon: XmarkCircle,
    label: "Critical",
  },
  warning: {
    dot: "bg-yellow-500",
    badge: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20 dark:text-yellow-400",
    icon: WarningTriangle,
    label: "Warning",
  },
  opportunity: {
    dot: "bg-emerald-500",
    badge: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400",
    icon: InfoCircle,
    label: "Opportunity",
  },
}

export function InsightCard({ insight }: InsightCardProps) {
  const config = severityConfig[insight.severity]
  const Icon = config.icon
  const isExternal = insight.ctaHref.startsWith("http")

  return (
    <div className="bg-card border border-border rounded-lg p-4 flex items-start gap-4 transition-shadow hover:shadow-sm">
      {/* Severity icon */}
      <div
        className={cn(
          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
          insight.severity === "critical" && "bg-destructive/10",
          insight.severity === "warning" && "bg-yellow-500/10",
          insight.severity === "opportunity" && "bg-emerald-500/10"
        )}
      >
        <Icon
          className={cn(
            "h-4 w-4",
            insight.severity === "critical" && "text-destructive",
            insight.severity === "warning" && "text-yellow-600 dark:text-yellow-400",
            insight.severity === "opportunity" && "text-emerald-600 dark:text-emerald-400"
          )}
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <Badge variant="outline" className={cn("text-[10px] px-2 py-0.5 h-5 font-semibold", config.badge)}>
            {config.label}
          </Badge>
          {insight.campaignName && (
            <span className="text-[11px] text-subtle-foreground truncate max-w-[200px]">
              {insight.campaignName}
            </span>
          )}
        </div>

        <p className="text-sm font-semibold text-foreground leading-snug mb-1">
          {insight.title}
        </p>
        <p className="text-xs text-subtle-foreground leading-relaxed mb-3">
          {insight.description}
        </p>

        <div className="flex flex-wrap items-center gap-3">
          {/* Impact chip */}
          <span className="inline-flex items-center gap-1.5 text-xs font-mono font-medium text-foreground bg-muted rounded-md px-2 py-1 border border-border">
            <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", config.dot)} />
            {insight.impactLabel}
          </span>

          {/* CTA */}
          {isExternal ? (
            <a href={insight.ctaHref} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="h-7 text-xs rounded-md gap-1.5">
                {insight.ctaLabel}
                <ArrowRight className="h-3 w-3" />
              </Button>
            </a>
          ) : (
            <Link href={insight.ctaHref}>
              <Button size="sm" className="h-7 text-xs rounded-md gap-1.5 bg-ai hover:bg-ai/90 text-white">
                {insight.ctaLabel}
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
