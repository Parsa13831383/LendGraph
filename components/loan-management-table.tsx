"use client";

import { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
} from "@tanstack/react-table";
import {
  ArrowUpDown,
  CheckCircle2Icon,
  XCircleIcon,
  SearchIcon,
  FilterIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { mockLoans, type Loan, type LoanStatus } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function StatusBadge({ status }: { status: LoanStatus }) {
  const config = {
    origination: {
      label: "Origination",
      className: "bg-slate-100 text-slate-700 border-slate-200",
    },
    underwriting: {
      label: "Underwriting",
      className: "bg-amber-50 text-amber-700 border-amber-200",
    },
    live: {
      label: "Live",
      className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
    defaulted: {
      label: "Defaulted",
      className: "bg-red-50 text-red-700 border-red-200",
    },
  };

  const { label, className } = config[status];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-2 py-0.5 text-xs font-medium border",
        className
      )}
    >
      {label}
    </span>
  );
}

function RepaymentProgress({
  interestPaid,
  totalInterest,
  principalPaid,
  totalPrincipal,
}: {
  interestPaid: number;
  totalInterest: number;
  principalPaid: number;
  totalPrincipal: number;
}) {
  const interestPercent = totalInterest > 0 ? (interestPaid / totalInterest) * 100 : 0;
  const principalPercent =
    totalPrincipal > 0 ? (principalPaid / totalPrincipal) * 100 : 0;

  return (
    <div className="w-32 space-y-1">
      <div className="flex items-center gap-2">
        <div className="h-1.5 flex-1 rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-emerald transition-all"
            style={{ width: `${Math.min(interestPercent, 100)}%` }}
          />
        </div>
        <span className="text-[10px] text-muted-foreground w-7 text-right">
          {interestPercent.toFixed(0)}%
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div className="h-1.5 flex-1 rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-slate-500 transition-all"
            style={{ width: `${Math.min(principalPercent, 100)}%` }}
          />
        </div>
        <span className="text-[10px] text-muted-foreground w-7 text-right">
          {principalPercent.toFixed(0)}%
        </span>
      </div>
    </div>
  );
}

function CovenantBadge({ status }: { status: "compliant" | "breach" }) {
  if (status === "compliant") {
    return (
      <div className="flex items-center gap-1 text-emerald">
        <CheckCircle2Icon className="h-3.5 w-3.5" />
        <span className="text-xs font-medium">Compliant</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1 text-destructive">
      <XCircleIcon className="h-3.5 w-3.5" />
      <span className="text-xs font-medium">Breach</span>
    </div>
  );
}

const columns: ColumnDef<Loan>[] = [
  {
    accessorKey: "id",
    header: "Loan ID",
    cell: ({ row }) => (
      <span className="font-mono text-xs">{row.getValue("id")}</span>
    ),
    size: 80,
  },
  {
    accessorKey: "borrowerName",
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3 h-8 text-xs"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Borrower
        <ArrowUpDown className="ml-1 h-3 w-3" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="min-w-[160px]">
        <p className="font-medium text-sm truncate">{row.getValue("borrowerName")}</p>
        <p className="text-xs text-muted-foreground">
          Co. #{row.original.companyRegNumber}
        </p>
      </div>
    ),
  },
  {
    accessorKey: "loanAmount",
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3 h-8 text-xs"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Loan Amount
        <ArrowUpDown className="ml-1 h-3 w-3" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="font-medium text-sm">
        {formatCurrency(row.getValue("loanAmount"))}
      </span>
    ),
  },
  {
    accessorKey: "ltv",
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3 h-8 text-xs"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        LTV
        <ArrowUpDown className="ml-1 h-3 w-3" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="text-sm">{row.getValue("ltv")}%</span>
    ),
  },
  {
    accessorKey: "icr",
    header: "ICR",
    cell: ({ row }) => {
      const icr = row.getValue("icr") as number;
      return (
        <span
          className={cn("text-sm font-medium", icr < 1.5 ? "text-amber-600" : "")}
        >
          {icr.toFixed(1)}x
        </span>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.getValue("status")} />,
    filterFn: (row, id, filterValue: string[]) => {
      if (!filterValue || filterValue.length === 0) return true;
      return filterValue.includes(row.getValue(id));
    },
  },
  {
    id: "repayment",
    header: "Repayment",
    cell: ({ row }) => (
      <RepaymentProgress
        interestPaid={row.original.interestPaid}
        totalInterest={row.original.totalInterest}
        principalPaid={row.original.principalPaid}
        totalPrincipal={row.original.totalPrincipal}
      />
    ),
  },
  {
    accessorKey: "covenantStatus",
    header: "Covenant",
    cell: ({ row }) => <CovenantBadge status={row.getValue("covenantStatus")} />,
  },
];

export function LoanManagementTable() {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [statusFilter, setStatusFilter] = useState<LoanStatus[]>([]);

  const filteredData = useMemo(() => {
    if (statusFilter.length === 0) return mockLoans;
    return mockLoans.filter((loan) => statusFilter.includes(loan.status));
  }, [statusFilter]);

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    state: {
      sorting,
      columnFilters,
    },
  });

  const toggleStatus = useCallback((status: LoanStatus) => {
    setStatusFilter((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status]
    );
  }, []);

  const statuses: { value: LoanStatus; label: string }[] = [
    { value: "origination", label: "Origination" },
    { value: "underwriting", label: "Underwriting" },
    { value: "live", label: "Live" },
    { value: "defaulted", label: "Defaulted" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="border-border/50">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-sm font-medium">
                Loan Portfolio
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                {filteredData.length} loans •{" "}
                {formatCurrency(
                  filteredData.reduce((sum, loan) => sum + loan.loanAmount, 0)
                )}{" "}
                total exposure
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <SearchIcon className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search borrower..."
                  value={
                    (table.getColumn("borrowerName")?.getFilterValue() as string) ??
                    ""
                  }
                  onChange={(event) =>
                    table
                      .getColumn("borrowerName")
                      ?.setFilterValue(event.target.value)
                  }
                  className="h-8 w-[180px] pl-8 text-xs"
                />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
                    <FilterIcon className="h-3 w-3" />
                    Status
                    {statusFilter.length > 0 && (
                      <span className="ml-1 rounded bg-primary px-1 text-[10px] text-primary-foreground">
                        {statusFilter.length}
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-36">
                  {statuses.map((status) => (
                    <DropdownMenuCheckboxItem
                      key={status.value}
                      checked={statusFilter.includes(status.value)}
                      onCheckedChange={() => toggleStatus(status.value)}
                      className="text-xs"
                    >
                      {status.label}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr
                    key={headerGroup.id}
                    className="border-t border-b border-border bg-muted/50"
                  >
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        className="px-4 py-3 text-left text-xs font-medium text-muted-foreground"
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row, index) => (
                  <motion.tr
                    key={row.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2, delay: index * 0.03 }}
                    className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3">
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </td>
                    ))}
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center gap-1 px-4 py-3 text-xs text-muted-foreground border-t border-border/50">
            <div className="flex items-center gap-1 mr-4">
              <div className="h-2 w-2 rounded-full bg-emerald" />
              <span>Interest</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-slate-500" />
              <span>Principal</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
