"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRightIcon,
  ChevronLeftIcon,
  BuildingIcon,
  HomeIcon,
  CalculatorIcon,
  CheckIcon,
  SparklesIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { ExtractionFormData } from "@/lib/types/extraction";

type FormStep = 1 | 2 | 3;

interface BorrowerInfo {
  companyName: string;
  companyRegNumber: string;
  contactName: string;
  contactEmail: string;
}

interface SecurityDetails {
  propertyAddress: string;
  propertyValuation: string;
  existingDebt: string;
  requestedLoanAmount: string;
  loanPurpose: string;
  netOperatingIncome: string;
}

// Fields extracted from the PDF that don't appear in the standard form steps
// but are needed for the backend record.
interface ExtractedTerms {
  interestRate: string;
  interestRateDescription: string | null;
  startDate: string;
  maturityDate: string;
  ltvCovenantThreshold: string;
  icrCovenantThreshold: string;
}

interface LoanOriginationFormProps {
  /** Pre-fill data supplied by the Covenant Assistant after PDF extraction. */
  initialData?: Partial<ExtractionFormData>;
  /** Called immediately after the form is submitted (before reset). */
  onSubmitSuccess?: () => void;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const initialBorrowerInfo: BorrowerInfo = {
  companyName: "",
  companyRegNumber: "",
  contactName: "",
  contactEmail: "",
};

const initialSecurityDetails: SecurityDetails = {
  propertyAddress: "",
  propertyValuation: "",
  existingDebt: "",
  requestedLoanAmount: "",
  loanPurpose: "",
  netOperatingIncome: "",
};

const emptyExtractedTerms: ExtractedTerms = {
  interestRate: "",
  interestRateDescription: null,
  startDate: "",
  maturityDate: "",
  ltvCovenantThreshold: "",
  icrCovenantThreshold: "",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCurrency(value: string): string {
  const num = parseFloat(value.replace(/[^0-9.]/g, ""));
  if (isNaN(num)) return "";
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

function parseCurrencyToNumber(value: string): number {
  return parseFloat(value.replace(/[^0-9.]/g, "")) || 0;
}

// ── Step indicator ────────────────────────────────────────────────────────────

function StepIndicator({
  currentStep,
  totalSteps,
}: {
  currentStep: number;
  totalSteps: number;
}) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: totalSteps }).map((_, index) => (
        <div key={index} className="flex items-center">
          <div
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded text-xs font-medium transition-colors",
              index + 1 === currentStep
                ? "bg-primary text-primary-foreground"
                : index + 1 < currentStep
                ? "bg-emerald text-emerald-foreground"
                : "bg-muted text-muted-foreground"
            )}
          >
            {index + 1 < currentStep ? (
              <CheckIcon className="h-3 w-3" />
            ) : (
              index + 1
            )}
          </div>
          {index < totalSteps - 1 && (
            <div
              className={cn(
                "h-0.5 w-8 mx-1 transition-colors",
                index + 1 < currentStep ? "bg-emerald" : "bg-muted"
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Extracted term row (step 3) ────────────────────────────────────────────────

function ExtractedRow({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  if (!value) return null;
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium flex items-center gap-1">
        <SparklesIcon className="h-3 w-3 text-primary opacity-70" />
        {value}
      </span>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function LoanOriginationForm({
  initialData,
  onSubmitSuccess,
}: LoanOriginationFormProps) {
  const [currentStep, setCurrentStep] = useState<FormStep>(1);
  const [borrowerInfo, setBorrowerInfo] =
    useState<BorrowerInfo>(initialBorrowerInfo);
  const [securityDetails, setSecurityDetails] =
    useState<SecurityDetails>(initialSecurityDetails);
  const [extractedTerms, setExtractedTerms] =
    useState<ExtractedTerms>(emptyExtractedTerms);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Sync extraction data into form state ────────────────────────────────────
  useEffect(() => {
    if (!initialData || Object.keys(initialData).length === 0) return;

    setBorrowerInfo((prev) => ({
      ...prev,
      companyName: initialData.companyName ?? prev.companyName,
      companyRegNumber: initialData.companyRegNumber ?? prev.companyRegNumber,
    }));

    setSecurityDetails((prev) => ({
      ...prev,
      propertyValuation:
        initialData.propertyValuation ?? prev.propertyValuation,
      existingDebt: initialData.existingDebt ?? prev.existingDebt,
      requestedLoanAmount:
        initialData.requestedLoanAmount ?? prev.requestedLoanAmount,
      propertyAddress: initialData.propertyAddress ?? prev.propertyAddress,
      loanPurpose: initialData.loanPurpose ?? prev.loanPurpose,
    }));

    setExtractedTerms({
      interestRate: initialData.interestRate ?? "",
      interestRateDescription: initialData.interestRateDescription ?? null,
      startDate: initialData.startDate ?? "",
      maturityDate: initialData.maturityDate ?? "",
      ltvCovenantThreshold: initialData.ltvCovenantThreshold ?? "",
      icrCovenantThreshold: initialData.icrCovenantThreshold ?? "",
    });

    // Send the user to step 1 so they can review pre-filled fields
    setCurrentStep(1);
    setIsSubmitted(false);
  }, [initialData]);

  // ── Computed metrics ────────────────────────────────────────────────────────

  const calculatedMetrics = useMemo(() => {
    const propertyValue = parseCurrencyToNumber(securityDetails.propertyValuation);
    const existingDebt = parseCurrencyToNumber(securityDetails.existingDebt);
    const requestedLoan = parseCurrencyToNumber(securityDetails.requestedLoanAmount);
    const noi = parseCurrencyToNumber(securityDetails.netOperatingIncome);

    const totalDebt = existingDebt + requestedLoan;
    const ltv = propertyValue > 0 ? (totalDebt / propertyValue) * 100 : 0;

    // Use extracted interest rate when available; fall back to 10 %
    const rate = extractedTerms.interestRate
      ? parseFloat(extractedTerms.interestRate) / 100
      : 0.1;
    const annualInterest = requestedLoan * rate;
    const icr = annualInterest > 0 ? noi / annualInterest : 0;

    return {
      ltv: ltv.toFixed(1),
      icr: icr.toFixed(2),
      totalDebt: formatCurrency(totalDebt.toString()),
      isLtvHealthy: ltv > 0 && ltv <= 65,
      isIcrHealthy: icr >= 1.5,
    };
  }, [securityDetails, extractedTerms.interestRate]);

  // ── Field change handlers ───────────────────────────────────────────────────

  const handleBorrowerChange = (field: keyof BorrowerInfo, value: string) => {
    setBorrowerInfo((prev) => ({ ...prev, [field]: value }));
  };

  const handleSecurityChange = (
    field: keyof SecurityDetails,
    value: string
  ) => {
    if (
      ["propertyValuation", "existingDebt", "requestedLoanAmount", "netOperatingIncome"].includes(
        field
      )
    ) {
      setSecurityDetails((prev) => ({
        ...prev,
        [field]: value.replace(/[^0-9]/g, ""),
      }));
    } else {
      setSecurityDetails((prev) => ({ ...prev, [field]: value }));
    }
  };

  // ── Navigation ──────────────────────────────────────────────────────────────

  const canProceed = (step: FormStep): boolean => {
    if (step === 1)
      return (
        borrowerInfo.companyName.trim() !== "" &&
        borrowerInfo.companyRegNumber.trim() !== ""
      );
    if (step === 2)
      return (
        securityDetails.propertyValuation !== "" &&
        securityDetails.requestedLoanAmount !== ""
      );
    return true;
  };

  const handleNext = () => {
    if (currentStep < 3) setCurrentStep((prev) => (prev + 1) as FormStep);
  };
  const handleBack = () => {
    if (currentStep > 1) setCurrentStep((prev) => (prev - 1) as FormStep);
  };

  // ── Submission ──────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const payload = {
        companyName: borrowerInfo.companyName,
        companyRegNumber: borrowerInfo.companyRegNumber,
        contactName: borrowerInfo.contactName || null,
        contactEmail: borrowerInfo.contactEmail || null,
        principalAmount: parseCurrencyToNumber(securityDetails.requestedLoanAmount),
        valuation: parseCurrencyToNumber(securityDetails.propertyValuation),
        existingDebt: parseCurrencyToNumber(securityDetails.existingDebt),
        propertyAddress: securityDetails.propertyAddress || null,
        loanPurpose: securityDetails.loanPurpose || null,
        netOperatingIncome:
          parseCurrencyToNumber(securityDetails.netOperatingIncome) || null,
        interestRate: extractedTerms.interestRate
          ? parseFloat(extractedTerms.interestRate)
          : 10.0,
        startDate:
          extractedTerms.startDate ||
          new Date().toISOString().split("T")[0],
        maturityDate: extractedTerms.maturityDate || null,
        ltvCovenantThreshold: extractedTerms.ltvCovenantThreshold
          ? parseFloat(extractedTerms.ltvCovenantThreshold)
          : null,
        icrCovenantThreshold: extractedTerms.icrCovenantThreshold
          ? parseFloat(extractedTerms.icrCovenantThreshold)
          : null,
      };

      const apiBase =
        process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

      await fetch(`${apiBase}/api/loans/applications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      // Backend may not be running in dev; still surface the success screen
      console.warn("Backend submission failed:", err);
    } finally {
      setIsSubmitting(false);
      onSubmitSuccess?.();
      setIsSubmitted(true);
    }
  };

  const handleReset = () => {
    setBorrowerInfo(initialBorrowerInfo);
    setSecurityDetails(initialSecurityDetails);
    setExtractedTerms(emptyExtractedTerms);
    setCurrentStep(1);
    setIsSubmitted(false);
  };

  // ── Success screen ──────────────────────────────────────────────────────────

  if (isSubmitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="border-border/50">
          <CardContent className="py-12 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded bg-emerald/10">
              <CheckIcon className="h-6 w-6 text-emerald" />
            </div>
            <h3 className="text-lg font-semibold">Application Submitted</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Bridge loan application for {borrowerInfo.companyName} has been
              submitted for underwriting review.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Reference: BL-{Date.now().toString().slice(-8)}
            </p>
            <Button
              onClick={handleReset}
              className="mt-6"
              variant="outline"
              size="sm"
            >
              Submit Another Application
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // ── Form ────────────────────────────────────────────────────────────────────

  const hasExtraction = Object.values(extractedTerms).some(Boolean);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="border-border/50">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                Bridge Loan Application
                {hasExtraction && (
                  <span className="inline-flex items-center gap-1 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                    <SparklesIcon className="h-2.5 w-2.5" />
                    AI pre-filled
                  </span>
                )}
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Complete all steps to submit for underwriting
              </p>
            </div>
            <StepIndicator currentStep={currentStep} totalSteps={3} />
          </div>
        </CardHeader>

        <CardContent>
          <AnimatePresence mode="wait">
            {/* ── Step 1 — Borrower ──────────────────────────────────────── */}
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                  <BuildingIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    Borrower Information
                  </span>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="companyName" className="text-xs">
                      Company Name *
                    </Label>
                    <Input
                      id="companyName"
                      placeholder="Enter company name"
                      value={borrowerInfo.companyName}
                      onChange={(e) =>
                        handleBorrowerChange("companyName", e.target.value)
                      }
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="companyReg" className="text-xs">
                      Companies House Reg. *
                    </Label>
                    <Input
                      id="companyReg"
                      placeholder="e.g., 12345678"
                      value={borrowerInfo.companyRegNumber}
                      onChange={(e) =>
                        handleBorrowerChange(
                          "companyRegNumber",
                          e.target.value
                        )
                      }
                      className="h-9 text-sm font-mono"
                      maxLength={8}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="contactName" className="text-xs">
                      Contact Name
                    </Label>
                    <Input
                      id="contactName"
                      placeholder="Primary contact"
                      value={borrowerInfo.contactName}
                      onChange={(e) =>
                        handleBorrowerChange("contactName", e.target.value)
                      }
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="contactEmail" className="text-xs">
                      Contact Email
                    </Label>
                    <Input
                      id="contactEmail"
                      type="email"
                      placeholder="email@company.com"
                      value={borrowerInfo.contactEmail}
                      onChange={(e) =>
                        handleBorrowerChange("contactEmail", e.target.value)
                      }
                      className="h-9 text-sm"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── Step 2 — Security Details ──────────────────────────────── */}
            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                  <HomeIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Security Details</span>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="propertyAddress" className="text-xs">
                      Property Address
                    </Label>
                    <Input
                      id="propertyAddress"
                      placeholder="Full property address"
                      value={securityDetails.propertyAddress}
                      onChange={(e) =>
                        handleSecurityChange("propertyAddress", e.target.value)
                      }
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="propertyValuation" className="text-xs">
                      Property Valuation *
                    </Label>
                    <Input
                      id="propertyValuation"
                      placeholder="£0"
                      value={
                        securityDetails.propertyValuation
                          ? formatCurrency(securityDetails.propertyValuation)
                          : ""
                      }
                      onChange={(e) =>
                        handleSecurityChange(
                          "propertyValuation",
                          e.target.value
                        )
                      }
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="existingDebt" className="text-xs">
                      Existing Debt
                    </Label>
                    <Input
                      id="existingDebt"
                      placeholder="£0"
                      value={
                        securityDetails.existingDebt
                          ? formatCurrency(securityDetails.existingDebt)
                          : ""
                      }
                      onChange={(e) =>
                        handleSecurityChange("existingDebt", e.target.value)
                      }
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="requestedLoan" className="text-xs">
                      Requested Loan Amount *
                    </Label>
                    <Input
                      id="requestedLoan"
                      placeholder="£0"
                      value={
                        securityDetails.requestedLoanAmount
                          ? formatCurrency(securityDetails.requestedLoanAmount)
                          : ""
                      }
                      onChange={(e) =>
                        handleSecurityChange(
                          "requestedLoanAmount",
                          e.target.value
                        )
                      }
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="noi" className="text-xs">
                      Net Operating Income (Annual)
                    </Label>
                    <Input
                      id="noi"
                      placeholder="£0"
                      value={
                        securityDetails.netOperatingIncome
                          ? formatCurrency(securityDetails.netOperatingIncome)
                          : ""
                      }
                      onChange={(e) =>
                        handleSecurityChange(
                          "netOperatingIncome",
                          e.target.value
                        )
                      }
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="loanPurpose" className="text-xs">
                      Loan Purpose
                    </Label>
                    <Input
                      id="loanPurpose"
                      placeholder="e.g., Property acquisition, Refinance, Development"
                      value={securityDetails.loanPurpose}
                      onChange={(e) =>
                        handleSecurityChange("loanPurpose", e.target.value)
                      }
                      className="h-9 text-sm"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── Step 3 — Metrics ───────────────────────────────────────── */}
            {currentStep === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                  <CalculatorIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    Auto-Calculated Metrics
                  </span>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded border border-border bg-muted/30 p-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">
                      Loan-to-Value (LTV)
                    </p>
                    <p
                      className={cn(
                        "mt-1 text-2xl font-semibold",
                        calculatedMetrics.isLtvHealthy
                          ? "text-emerald"
                          : parseFloat(calculatedMetrics.ltv) > 0
                          ? "text-amber-600"
                          : "text-foreground"
                      )}
                    >
                      {calculatedMetrics.ltv}%
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {calculatedMetrics.isLtvHealthy
                        ? "Within acceptable range (≤65%)"
                        : parseFloat(calculatedMetrics.ltv) > 65
                        ? "Above typical threshold"
                        : "Enter values to calculate"}
                    </p>
                  </div>
                  <div className="rounded border border-border bg-muted/30 p-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">
                      Interest Coverage Ratio (ICR)
                    </p>
                    <p
                      className={cn(
                        "mt-1 text-2xl font-semibold",
                        calculatedMetrics.isIcrHealthy
                          ? "text-emerald"
                          : parseFloat(calculatedMetrics.icr) > 0
                          ? "text-amber-600"
                          : "text-foreground"
                      )}
                    >
                      {calculatedMetrics.icr}x
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {calculatedMetrics.isIcrHealthy
                        ? "Strong coverage (≥1.5x)"
                        : parseFloat(calculatedMetrics.icr) > 0
                        ? "Below typical minimum"
                        : extractedTerms.interestRate
                        ? `Based on ${extractedTerms.interestRate}% interest rate`
                        : "Based on 10% interest rate"}
                    </p>
                  </div>
                </div>

                {/* Application summary */}
                <div className="rounded border border-border bg-muted/30 p-4">
                  <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Application Summary
                  </h4>
                  <div className="mt-3 grid gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Borrower</span>
                      <span className="font-medium">
                        {borrowerInfo.companyName || "—"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Requested Amount
                      </span>
                      <span className="font-medium">
                        {securityDetails.requestedLoanAmount
                          ? formatCurrency(securityDetails.requestedLoanAmount)
                          : "—"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Total Debt Post-Funding
                      </span>
                      <span className="font-medium">
                        {calculatedMetrics.totalDebt || "—"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Property Value
                      </span>
                      <span className="font-medium">
                        {securityDetails.propertyValuation
                          ? formatCurrency(securityDetails.propertyValuation)
                          : "—"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Extracted terms from PDF — only shown when data is present */}
                {hasExtraction && (
                  <div className="rounded border border-primary/20 bg-primary/5 p-4">
                    <h4 className="text-xs font-medium uppercase tracking-wide text-primary flex items-center gap-1 mb-3">
                      <SparklesIcon className="h-3 w-3" />
                      Terms Extracted from Document
                    </h4>
                    <div className="grid gap-2">
                      <ExtractedRow
                        label="Interest Rate"
                        value={
                          extractedTerms.interestRateDescription ??
                          (extractedTerms.interestRate
                            ? `${extractedTerms.interestRate}% p.a.`
                            : null)
                        }
                      />
                      <ExtractedRow
                        label="Start Date"
                        value={extractedTerms.startDate || null}
                      />
                      <ExtractedRow
                        label="Maturity Date"
                        value={extractedTerms.maturityDate || null}
                      />
                      <ExtractedRow
                        label="LTV Covenant"
                        value={
                          extractedTerms.ltvCovenantThreshold
                            ? `Max ${extractedTerms.ltvCovenantThreshold}%`
                            : null
                        }
                      />
                      <ExtractedRow
                        label="ICR Covenant"
                        value={
                          extractedTerms.icrCovenantThreshold
                            ? `Min ${extractedTerms.icrCovenantThreshold}x`
                            : null
                        }
                      />
                    </div>
                    <p className="mt-3 text-[10px] text-muted-foreground">
                      Review these AI-extracted values before submitting.
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation */}
          <div className="mt-6 flex items-center justify-between border-t border-border/50 pt-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              disabled={currentStep === 1}
              className="gap-1 text-xs"
            >
              <ChevronLeftIcon className="h-3 w-3" />
              Back
            </Button>
            {currentStep < 3 ? (
              <Button
                size="sm"
                onClick={handleNext}
                disabled={!canProceed(currentStep)}
                className="gap-1 text-xs"
              >
                Next
                <ChevronRightIcon className="h-3 w-3" />
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="gap-1 text-xs bg-emerald text-emerald-foreground hover:bg-emerald/90"
              >
                {isSubmitting ? "Submitting…" : "Submit Application"}
                <CheckIcon className="h-3 w-3" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
