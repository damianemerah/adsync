"use client"

import { cn } from "@/lib/utils"
import { Check, AlertTriangle, XCircle } from "lucide-react"

interface PreFlightCheckProps {
  label: string
  status: "success" | "warning" | "error"
  message: string
}

export function PreFlightCheck({ label, status, message }: PreFlightCheckProps) {
  return (
    <div className="flex items-start gap-3">
      <div
        className={cn(
          "mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full",
          status === "success" && "bg-green-100",
          status === "warning" && "bg-yellow-100",
          status === "error" && "bg-red-100",
        )}
      >
        {status === "success" && <Check className="h-4 w-4 text-green-600" />}
        {status === "warning" && <AlertTriangle className="h-4 w-4 text-yellow-600" />}
        {status === "error" && <XCircle className="h-4 w-4 text-red-600" />}
      </div>
      <div className="flex-1">
        <p className="font-medium text-gray-900">{label}</p>
        <p className="text-sm text-gray-600">{message}</p>
      </div>
    </div>
  )
}
