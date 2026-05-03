"use client";

import { motion } from "framer-motion";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  TrendingUpIcon,
  WalletIcon,
  PercentIcon,
  ActivityIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Area,
  AreaChart,
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
import { mockPortfolioMetrics } from "@/lib/mock-data";

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `£${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `£${(value / 1000).toFixed(0)}K`;
  }
  return `£${value}`;
}

function MetricCard({
  title,
  value,
  change,
  changeType,
  icon: Icon,
  delay,
}: {
  title: string;
  value: string;
  change: string;
  changeType: "positive" | "negative" | "neutral";
  icon: React.ElementType;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      <Card className="border-border/50 bg-card">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {title}
              </p>
              <p className="text-2xl font-semibold tracking-tight">{value}</p>
              <div className="flex items-center gap-1 text-xs">
                {changeType === "positive" && (
                  <ArrowUpIcon className="h-3 w-3 text-emerald" />
                )}
                {changeType === "negative" && (
                  <ArrowDownIcon className="h-3 w-3 text-destructive" />
                )}
                <span
                  className={
                    changeType === "positive"
                      ? "text-emerald"
                      : changeType === "negative"
                      ? "text-destructive"
                      : "text-muted-foreground"
                  }
                >
                  {change}
                </span>
              </div>
            </div>
            <div className="rounded bg-muted p-2">
              <Icon className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

const COLORS = [
  "oklch(0.65 0.18 160)",
  "oklch(0.55 0.12 250)",
  "oklch(0.7 0.15 45)",
  "oklch(0.5 0.18 25)",
];

export function DashboardOverview() {
  const metrics = mockPortfolioMetrics;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Heartbeat of Private Credit</h2>
          <p className="text-sm text-muted-foreground">
            Real-time portfolio performance metrics
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ActivityIcon className="h-3 w-3 text-emerald animate-pulse" />
          <span>Live</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Capital Deployed"
          value={formatCurrency(metrics.totalCapitalDeployed)}
          change="+12.5% vs last month"
          changeType="positive"
          icon={WalletIcon}
          delay={0}
        />
        <MetricCard
          title="Weighted Average LTV"
          value={`${metrics.weightedAverageLTV}%`}
          change="Within target range"
          changeType="neutral"
          icon={PercentIcon}
          delay={0.1}
        />
        <MetricCard
          title="Portfolio IRR"
          value={`${metrics.portfolioIRR}%`}
          change="+2.3% vs benchmark"
          changeType="positive"
          icon={TrendingUpIcon}
          delay={0.2}
        />
        <MetricCard
          title="Active Loans"
          value={`${metrics.activeLoans} / ${metrics.totalLoans}`}
          change={`${metrics.defaultRate}% default rate`}
          changeType="negative"
          icon={ActivityIcon}
          delay={0.3}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="lg:col-span-2"
        >
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Monthly Capital Deployment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={metrics.monthlyDeployment}>
                    <defs>
                      <linearGradient
                        id="deploymentGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="oklch(0.65 0.18 160)"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="oklch(0.65 0.18 160)"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="month"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: "oklch(0.45 0.02 250)" }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: "oklch(0.45 0.02 250)" }}
                      tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="rounded border border-border bg-card px-3 py-2 shadow-lg">
                              <p className="text-xs font-medium">
                                {formatCurrency(payload[0].value as number)}
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="amount"
                      stroke="oklch(0.65 0.18 160)"
                      strokeWidth={2}
                      fill="url(#deploymentGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
        >
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Portfolio by Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={metrics.statusDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      dataKey="amount"
                      nameKey="status"
                      strokeWidth={0}
                    >
                      {metrics.statusDistribution.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="rounded border border-border bg-card px-3 py-2 shadow-lg">
                              <p className="text-xs font-medium">{data.status}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatCurrency(data.amount)}
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
              <div className="mt-2 grid grid-cols-2 gap-1">
                {metrics.statusDistribution.map((item, index) => (
                  <div key={item.status} className="flex items-center gap-2 text-xs">
                    <div
                      className="h-2 w-2 rounded-sm"
                      style={{ backgroundColor: COLORS[index] }}
                    />
                    <span className="text-muted-foreground">{item.status}</span>
                  </div>
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
            <CardTitle className="text-sm font-medium">LTV Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[160px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.ltvDistribution} barSize={32}>
                  <XAxis
                    dataKey="range"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "oklch(0.45 0.02 250)" }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "oklch(0.45 0.02 250)" }}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="rounded border border-border bg-card px-3 py-2 shadow-lg">
                            <p className="text-xs font-medium">
                              {payload[0].value} loans
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="count" fill="oklch(0.55 0.12 250)" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
