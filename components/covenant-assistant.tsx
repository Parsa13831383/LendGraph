"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BotIcon,
  SendIcon,
  FileTextIcon,
  SparklesIcon,
  XIcon,
  UploadIcon,
  AlertTriangleIcon,
  CheckCircle2Icon,
  ArrowRightIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { ExtractionResult } from "@/lib/types/extraction";
import { toFormData } from "@/lib/types/extraction";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  extraction?: ExtractionResult;  // only set on extraction result messages
}

interface CovenantAssistantProps {
  onExtractionComplete?: (data: ReturnType<typeof toFormData>) => void;
  onSwitchTab?: (tab: "origination") => void;
}

// ── Chat response logic ───────────────────────────────────────────────────────

function getStaticResponse(input: string): string {
  const lower = input.toLowerCase();
  if (lower.includes("ltv") || lower.includes("loan to value"))
    return "Based on current portfolio data, the weighted average LTV is **61.2%**, within the typical covenant threshold of 65–70%. Brighton Marina Ventures is at 70% LTV and in breach status.";
  if (lower.includes("covenant") || lower.includes("breach"))
    return "Found **1 covenant breach**:\n\n• Brighton Marina Ventures (L005): ICR at 0.9x, below the 1.25x minimum.\n\nAll other loans are currently compliant.";
  return "I can help with:\n\n• **Document extraction** — upload a PDF to extract key terms\n• **Covenant monitoring** — check current breach status\n• **LTV analysis** — review loan-to-value metrics\n\nWhat would you like to know?";
}

// ── Extraction result card ────────────────────────────────────────────────────

function ExtractionCard({
  result,
  onApply,
}: {
  result: ExtractionResult;
  onApply: () => void;
}) {
  const fields: { label: string; value: string | null | undefined }[] = [
    { label: "Borrower", value: result.borrower_name },
    { label: "Principal", value: result.principal_amount ? `£${result.principal_amount.toLocaleString("en-GB")}` : null },
    { label: "Valuation", value: result.property_valuation ? `£${result.property_valuation.toLocaleString("en-GB")}` : null },
    { label: "Interest Rate", value: result.interest_rate_description ?? (result.interest_rate ? `${result.interest_rate}% p.a.` : null) },
    { label: "Maturity", value: result.maturity_date },
    { label: "LTV Covenant", value: result.ltv_covenant_threshold ? `Max ${result.ltv_covenant_threshold}%` : null },
    { label: "ICR Covenant", value: result.icr_covenant_threshold ? `Min ${result.icr_covenant_threshold}x` : null },
  ].filter((f) => f.value != null);

  const confidenceColor = {
    high: "text-emerald-600",
    medium: "text-amber-600",
    low: "text-red-600",
  }[result.confidence];

  return (
    <div className="rounded border border-border bg-card text-xs space-y-2 p-3 mt-1">
      <div className="flex items-center justify-between">
        <span className="font-medium text-foreground">Extracted Terms</span>
        <span className={cn("font-medium capitalize", confidenceColor)}>
          {result.confidence} confidence
        </span>
      </div>

      <div className="space-y-1">
        {fields.map(({ label, value }) => (
          <div key={label} className="flex justify-between gap-2">
            <span className="text-muted-foreground shrink-0">{label}</span>
            <span className="font-medium text-right truncate">{value}</span>
          </div>
        ))}
      </div>

      {result.warnings.length > 0 && (
        <div className="rounded bg-amber-50 border border-amber-200 px-2 py-1.5 space-y-0.5">
          <div className="flex items-center gap-1 text-amber-700 font-medium">
            <AlertTriangleIcon className="h-3 w-3" />
            <span>Warnings</span>
          </div>
          {result.warnings.map((w, i) => (
            <p key={i} className="text-amber-700 pl-4">
              {w}
            </p>
          ))}
        </div>
      )}

      <Button
        size="sm"
        className="w-full h-7 text-xs gap-1"
        onClick={onApply}
      >
        <CheckCircle2Icon className="h-3 w-3" />
        Apply to New Loan Form
        <ArrowRightIcon className="h-3 w-3" />
      </Button>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function CovenantAssistant({
  onExtractionComplete,
  onSwitchTab,
}: CovenantAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "I can extract key terms from loan documents. Upload a PDF or ask me about covenant metrics.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const pushAssistant = useCallback(
    (content: string, extraction?: ExtractionResult) => {
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content,
          timestamp: new Date(),
          extraction,
        },
      ]);
    },
    []
  );

  // ── PDF upload ──────────────────────────────────────────────────────────────

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    // Reset input so the same file can be re-uploaded
    event.target.value = "";
    if (!file) return;

    setUploadedFile(file.name);
    setIsProcessing(true);

    setMessages((prev) => [
      ...prev,
      {
        id: `user-${Date.now()}`,
        role: "user",
        content: `Uploaded: ${file.name}`,
        timestamp: new Date(),
      },
    ]);

    pushAssistant("Analysing document — extracting key terms and covenants…");

    try {
      const body = new FormData();
      body.append("file", file);

      const response = await fetch("/api/covenant-extract", {
        method: "POST",
        body,
      });

      const data = await response.json();

      if (!response.ok) {
        pushAssistant(`⚠ Extraction failed: ${data.error ?? "Unknown error."}`);
        setUploadedFile(null);
        return;
      }

      const result = data as ExtractionResult;

      pushAssistant(
        `**Analysis complete** — ${result.confidence} confidence extraction from ${file.name}.`,
        result
      );
    } catch {
      pushAssistant(
        "⚠ Network error while extracting the document. Please check your connection and try again."
      );
      setUploadedFile(null);
    } finally {
      setIsProcessing(false);
    }
  };

  // ── Apply extraction to form ───────────────────────────────────────────────

  const handleApply = useCallback(
    (result: ExtractionResult) => {
      const formData = toFormData(result);
      onExtractionComplete?.(formData);
      onSwitchTab?.("origination");
      setIsOpen(false);
    },
    [onExtractionComplete, onSwitchTab]
  );

  // ── Text chat ───────────────────────────────────────────────────────────────

  const handleSend = async () => {
    if (!input.trim() || isProcessing) return;
    const text = input;
    setInput("");
    setIsProcessing(true);

    setMessages((prev) => [
      ...prev,
      { id: `user-${Date.now()}`, role: "user", content: text, timestamp: new Date() },
    ]);

    await new Promise((r) => setTimeout(r, 700));
    pushAssistant(getStaticResponse(text));
    setIsProcessing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      <motion.button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 flex h-12 w-12 items-center justify-center rounded bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors z-50"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Open Covenant Assistant"
      >
        <BotIcon className="h-5 w-5" />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 right-6 w-[400px] rounded border border-border bg-card shadow-xl z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded bg-primary/10">
                  <SparklesIcon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-medium">Covenant Assistant</h3>
                  <p className="text-[10px] text-muted-foreground">
                    AI-powered document analysis
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setIsOpen(false)}
              >
                <XIcon className="h-4 w-4" />
              </Button>
            </div>

            {/* Messages */}
            <div className="h-[360px] overflow-y-auto p-4 space-y-3">
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "flex",
                    message.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[90%] rounded px-3 py-2 text-sm",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    )}
                  >
                    <div
                      className="prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{
                        __html: message.content
                          .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                          .replace(/\n/g, "<br />"),
                      }}
                    />
                    {/* Inline extraction card */}
                    {message.extraction && (
                      <ExtractionCard
                        result={message.extraction}
                        onApply={() => handleApply(message.extraction!)}
                      />
                    )}
                  </div>
                </motion.div>
              ))}

              {isProcessing && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-2 text-xs text-muted-foreground"
                >
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce"
                        style={{ animationDelay: `${i * 0.1}s` }}
                      />
                    ))}
                  </div>
                  <span>Processing…</span>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Uploaded file pill */}
            {uploadedFile && (
              <div className="mx-4 mb-2 flex items-center gap-2 rounded bg-muted px-2 py-1.5 text-xs">
                <FileTextIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="truncate flex-1">{uploadedFile}</span>
                <button
                  onClick={() => setUploadedFile(null)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <XIcon className="h-3 w-3" />
                </button>
              </div>
            )}

            {/* Input row */}
            <div className="border-t border-border p-3">
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                  title="Upload a loan document PDF"
                >
                  <UploadIcon className="h-3.5 w-3.5" />
                </Button>
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about covenants…"
                  className="h-8 text-sm"
                  disabled={isProcessing}
                />
                <Button
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={handleSend}
                  disabled={!input.trim() || isProcessing}
                >
                  <SendIcon className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
