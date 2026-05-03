"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboardIcon,
  FilePlusIcon,
  TableIcon,
  UsersIcon,
  SettingsIcon,
  BellIcon,
  SearchIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DashboardOverview } from "@/components/dashboard-overview";
import { LoanOriginationForm } from "@/components/loan-origination-form";
import { LoanManagementTable } from "@/components/loan-management-table";
import { InvestorIntelligence } from "@/components/investor-intelligence";
import { CovenantAssistant } from "@/components/covenant-assistant";
import { IntegrationStatus } from "@/components/integration-status";
import { cn } from "@/lib/utils";
import type { toFormData } from "@/lib/types/extraction";

type Tab = "dashboard" | "origination" | "loans" | "investors";
type ExtractionFormData = ReturnType<typeof toFormData>;

const tabs: { id: Tab; label: string; icon: typeof LayoutDashboardIcon }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboardIcon },
  { id: "origination", label: "New Loan", icon: FilePlusIcon },
  { id: "loans", label: "Portfolio", icon: TableIcon },
  { id: "investors", label: "Investors", icon: UsersIcon },
];

export default function LendGraphPage() {
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  // Extraction data flows: CovenantAssistant → here → LoanOriginationForm
  const [extractionData, setExtractionData] =
    useState<Partial<ExtractionFormData> | null>(null);

  const handleExtractionComplete = useCallback(
    (data: Partial<ExtractionFormData>) => {
      setExtractionData(data);
      setActiveTab("origination");
    },
    []
  );

  const handleSwitchTab = useCallback((tab: "origination") => {
    setActiveTab(tab);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded bg-primary">
                  <span className="text-sm font-bold text-primary-foreground">
                    LG
                  </span>
                </div>
                <div>
                  <span className="text-sm font-semibold tracking-tight">
                    LendGraph
                  </span>
                  <span className="ml-1.5 rounded bg-emerald/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald">
                    PRO
                  </span>
                </div>
              </div>
              <nav className="hidden md:flex items-center gap-1">
                {tabs.map((tab) => (
                  <Button
                    key={tab.id}
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "gap-2 text-xs font-medium transition-colors",
                      activeTab === tab.id
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <tab.icon className="h-3.5 w-3.5" />
                    {tab.label}
                  </Button>
                ))}
              </nav>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative hidden sm:block">
                <SearchIcon className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search loans, borrowers..."
                  className="h-8 w-[200px] pl-8 text-xs"
                />
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 relative">
                <BellIcon className="h-4 w-4" />
                <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald text-[9px] font-medium text-emerald-foreground">
                  3
                </span>
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <SettingsIcon className="h-4 w-4" />
              </Button>
              <div className="h-8 w-8 rounded bg-muted flex items-center justify-center">
                <span className="text-xs font-medium">JD</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="md:hidden border-b border-border bg-card px-4 py-2 overflow-x-auto">
        <div className="flex items-center gap-1">
          {tabs.map((tab) => (
            <Button
              key={tab.id}
              variant="ghost"
              size="sm"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "gap-1.5 text-xs font-medium whitespace-nowrap",
                activeTab === tab.id
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground"
              )}
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </Button>
          ))}
        </div>
      </div>

      <main className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8 py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === "dashboard" && (
              <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
                <DashboardOverview />
                <div className="space-y-4">
                  <IntegrationStatus />
                </div>
              </div>
            )}

            {activeTab === "origination" && (
              <div className="max-w-2xl mx-auto">
                <LoanOriginationForm
                  initialData={extractionData ?? undefined}
                  onSubmitSuccess={() => setExtractionData(null)}
                />
              </div>
            )}

            {activeTab === "loans" && <LoanManagementTable />}

            {activeTab === "investors" && <InvestorIntelligence />}
          </motion.div>
        </AnimatePresence>
      </main>

      <CovenantAssistant
        onExtractionComplete={handleExtractionComplete}
        onSwitchTab={handleSwitchTab}
      />
    </div>
  );
}
