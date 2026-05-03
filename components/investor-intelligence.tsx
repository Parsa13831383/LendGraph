"use client";

import { motion } from "framer-motion";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  WalletIcon,
  PieChartIcon,
  TrendingUpIcon,
  CircleDollarSignIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { mockInvestor } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `£${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `£${(value / 1000).toFixed(0)}K`;
  }
  return `£${value}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const ALLOCATION_COLORS = [
  "oklch(0.65 0.18 160)",
  "oklch(0.55 0.12 250)",
  "oklch(0.7 0.15 45)",
  "oklch(0.6 0.14 200)",
  "oklch(0.75 0.12 90)",
];

export function InvestorIntelligence() {
  const investor = mockInvestor;
  const utilizationRate = (investor.drawnAmount / investor.totalCommitment) * 100;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Investor Intelligence</h2>
          <p className="text-sm text-muted-foreground">
            {investor.name} • Capital deployment overview
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            title: "Total Commitment",
            value: formatCurrency(investor.totalCommitment),
            icon: WalletIcon,
            description: "Fund size",
          },
          {
            title: "Drawn Amount",
            value: formatCurrency(investor.drawnAmount),
            icon: CircleDollarSignIcon,
            description: `${utilizationRate.toFixed(1)}% utilized`,
          },
          {
            title: "Available Capital",
            value: formatCurrency(investor.availableCapital),
            icon: TrendingUpIcon,
            description: "Ready to deploy",
          },
          {
            title: "Active Allocations",
            value: investor.allocations.length.toString(),
            icon: PieChartIcon,
            description: "Loan positions",
          },
        ].map((metric, index) => (
          <motion.div
            key={metric.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
          >
            <Card className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {metric.title}
                    </p>
                    <p className="text-2xl font-semibold tracking-tight">
                      {metric.value}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {metric.description}
                    </p>
                  </div>
                  <div className="rounded bg-muted p-2">
                    <metric.icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          <Card className="border-border/50 h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Capital Allocation Engine
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Current loan funding distribution
              </p>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                <div className="h-[180px] w-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={investor.allocations}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={75}
                        dataKey="amount"
                        nameKey="loanName"
                        strokeWidth={0}
                      >
                        {investor.allocations.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={ALLOCATION_COLORS[index % ALLOCATION_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="rounded border border-border bg-card px-3 py-2 shadow-lg">
                                <p className="text-xs font-medium truncate max-w-[160px]">
                                  {data.loanName}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {formatCurrency(data.amount)} ({data.percentage}%)
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-2">
                  {investor.allocations.map((allocation, index) => (
                    <div
                      key={allocation.loanId}
                      className="flex items-center justify-between text-sm"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className="h-2 w-2 rounded-sm shrink-0"
                          style={{
                            backgroundColor:
                              ALLOCATION_COLORS[index % ALLOCATION_COLORS.length],
                          }}
                        />
                        <span className="truncate text-xs text-muted-foreground">
                          {allocation.loanName}
                        </span>
                      </div>
                      <span className="text-xs font-medium shrink-0 ml-2">
                        {allocation.percentage}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
        >
          <Card className="border-border/50 h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Drawdown History
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Recent capital movements
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 max-h-[260px] overflow-y-auto pr-2">
                {investor.drawdownHistory.map((item, index) => (
                  <motion.div
                    key={`${item.date}-${index}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: index * 0.05 }}
                    className="flex items-center justify-between py-2 border-b border-border/30 last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "flex h-7 w-7 items-center justify-center rounded",
                          item.type === "drawdown"
                            ? "bg-slate-100"
                            : "bg-emerald/10"
                        )}
                      >
                        {item.type === "drawdown" ? (
                          <ArrowDownIcon className="h-3.5 w-3.5 text-slate-600" />
                        ) : (
                          <ArrowUpIcon className="h-3.5 w-3.5 text-emerald" />
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-medium capitalize">
                          {item.type}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {formatDate(item.date)}
                        </p>
                      </div>
                    </div>
                    <span
                      className={cn(
                        "text-sm font-medium",
                        item.type === "distribution" && "text-emerald"
                      )}
                    >
                      {item.type === "distribution" ? "+" : "-"}
                      {formatCurrency(item.amount)}
                    </span>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.6 }}
      >
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Allocation by Loan Size
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[140px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={investor.allocations}
                  layout="vertical"
                  barSize={16}
                >
                  <XAxis
                    type="number"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "oklch(0.45 0.02 250)" }}
                    tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`}
                  />
                  <YAxis
                    dataKey="loanId"
                    type="category"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "oklch(0.45 0.02 250)" }}
                    width={40}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="rounded border border-border bg-card px-3 py-2 shadow-lg">
                            <p className="text-xs font-medium">{data.loanName}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatCurrency(data.amount)}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="amount" fill="oklch(0.65 0.18 160)" radius={[0, 2, 2, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
