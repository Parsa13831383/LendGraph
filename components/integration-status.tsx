"use client";

import { motion } from "framer-motion";
import {
  CheckCircle2Icon,
  CircleIcon,
  AlertCircleIcon,
  RefreshCwIcon,
  ExternalLinkIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { integrationStatuses } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

type IntegrationStatus = "connected" | "pending" | "error";

const statusConfig: Record<
  IntegrationStatus,
  { icon: typeof CheckCircle2Icon; className: string; label: string }
> = {
  connected: {
    icon: CheckCircle2Icon,
    className: "text-emerald",
    label: "Connected",
  },
  pending: {
    icon: CircleIcon,
    className: "text-amber-500",
    label: "Pending",
  },
  error: {
    icon: AlertCircleIcon,
    className: "text-destructive",
    label: "Error",
  },
};

export function IntegrationStatus() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-medium">
                Third-Party Integrations
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Data source connectivity status
              </p>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <RefreshCwIcon className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {integrationStatuses.map((integration, index) => {
            const config = statusConfig[integration.status as IntegrationStatus];
            const Icon = config.icon;

            return (
              <motion.div
                key={integration.name}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
                className="flex items-center justify-between py-2 border-b border-border/30 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <Icon className={cn("h-4 w-4", config.className)} />
                  <div>
                    <p className="text-sm font-medium">{integration.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {integration.lastSync
                        ? `Last sync: ${integration.lastSync}`
                        : "Awaiting connection"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "text-[10px] font-medium px-1.5 py-0.5 rounded",
                      integration.status === "connected"
                        ? "bg-emerald/10 text-emerald"
                        : integration.status === "pending"
                        ? "bg-amber-500/10 text-amber-600"
                        : "bg-destructive/10 text-destructive"
                    )}
                  >
                    {config.label}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-foreground"
                  >
                    <ExternalLinkIcon className="h-3 w-3" />
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </CardContent>
      </Card>
    </motion.div>
  );
}
