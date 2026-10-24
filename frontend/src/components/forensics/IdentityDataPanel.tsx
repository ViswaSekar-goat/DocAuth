"use client";

import {
    ScanLine, CreditCard, User, Users, Calendar,
    QrCode, Camera, PenLine, CheckCircle2, XCircle, Copy, Check, Shield
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface IdentityDataPanelProps {
    data: Record<string, any> | null;
    documentType?: string | null;
}

// ── Identity fields as specified ──────────────────────────────────────────────
const IDENTITY_FIELDS = [
    {
        key: "document_type",
        fallbackKeys: ["Document Type"],
        label: "Document Type",
        icon: ScanLine,
        transform: (v: string) => v?.replace(/_/g, " ") || null,
    },
    {
        key: "pan_number",
        fallbackKeys: ["id_number", "Document Number"],
        label: "PAN Number",
        icon: CreditCard,
        mono: true,
    },
    {
        key: "full_name",
        fallbackKeys: ["name", "holder_name", "Full Name"],
        label: "Full Name",
        icon: User,
    },
    {
        key: "father_name",
        fallbackKeys: ["Father Name", "Guardian Name"],
        label: "Father Name",
        icon: Users,
    },
    {
        key: "date_of_birth",
        fallbackKeys: ["dob", "Date of Birth"],
        label: "Date of Birth",
        icon: Calendar,
        mono: true,
    },
    {
        key: "income_tax_header",
        fallbackKeys: ["it_header"],
        label: "Income Tax Header",
        icon: Shield,
        isBool: true,
    },
    {
        key: "photo_detected",
        fallbackKeys: [],
        label: "Photo Detected",
        icon: Camera,
        isBool: true,
    },
    {
        key: "signature_detected",
        fallbackKeys: [],
        label: "Signature Detected",
        icon: PenLine,
        isBool: true,
    },
    {
        key: "qr_detected",
        fallbackKeys: ["qr_location"],
        label: "QR Code Detected",
        icon: QrCode,
        isBool: true,
    },
    {
        key: "emblem_detected",
        fallbackKeys: ["emblem_present"],
        label: "Emblem Detected",
        icon: Shield,
        isBool: true,
    },
];

function resolveValue(data: Record<string, any>, field: typeof IDENTITY_FIELDS[0]): string | null {
    const allKeys = [field.key, ...field.fallbackKeys];
    const nestedData = (data?.extracted_data || data?.extracted_fields || {}) as Record<string, any>;

    for (const k of allKeys) {
        // 1. Check top-level (Direct or Nested Object)
        let v = data[k];
        if (v && typeof v === "object" && v.value) {
            const raw = String(v.value);
            if (raw && raw !== "null" && raw !== "None" && raw !== "") {
                if (field.transform) return field.transform(raw);
                return raw;
            }
        } else if (v !== undefined && v !== null && v !== "" && v !== "null" && v !== "None") {
            const raw = String(v);
            if (raw && raw !== "null" && raw !== "None" && raw !== "") {
                if (field.transform) return field.transform(raw);
                return raw;
            }
        }

        // 2. Check nested extracted_fields
        const vNested = nestedData[k];
        if (vNested && typeof vNested === "object" && vNested.value) {
            const raw = String(vNested.value);
            if (raw && raw !== "null" && raw !== "None" && raw !== "" && raw !== "Not detected") {
                if (field.transform) return field.transform(raw);
                return raw;
            }
        } else if (vNested !== undefined && vNested !== null && vNested !== "" && vNested !== "null" && vNested !== "None") {
            const raw = String(vNested);
            if (raw && raw !== "null" && raw !== "None" && raw !== "" && raw !== "Not detected") {
                if (field.transform) return field.transform(raw);
                return raw;
            }
        }
    }
    return null;
}

function normalizeBool(value: string | null): boolean | null {
    if (!value) return null;
    const v = value.toLowerCase();
    if (v === "yes" || v === "true" || v === "1" || v === "front" || v === "back") return true;
    if (v === "no" || v === "false" || v === "0" || v === "none" || v === "not detected") return false;
    return null;
}

export function IdentityDataPanel({ data, documentType }: IdentityDataPanelProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        if (!data) return;
        const out: Record<string, string> = {};
        IDENTITY_FIELDS.forEach(f => {
            out[f.label] = resolveValue(data, f) || "Not detected";
        });
        navigator.clipboard.writeText(JSON.stringify(out, null, 2));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const docLabel = (() => {
        if (!documentType) return "Identity Document";
        const dt = documentType.toUpperCase();
        if (dt.includes("PAN")) return "PAN Card";
        if (dt.includes("AADHAAR")) return "Aadhaar Card";
        // If docType is UNKNOWN/BANK/STATEMENT, identity panel still shows — default to PAN Card
        if (dt.includes("UNKNOWN") || dt.includes("BANK") || dt.includes("STATEMENT"))
            return "PAN Card";
        return documentType.replace(/_/g, " ");
    })();

    return (
        <div className="glass-panel p-6 space-y-4">
            {/* ── Header ──────────────────────────────────────────────── */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 border border-primary/20">
                        <ScanLine className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h2 className="font-bold text-sm tracking-tight">Identity Data</h2>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                            OCR parsed identity document output
                        </p>
                    </div>
                </div>

                {data && (
                    <button
                        onClick={handleCopy}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-secondary text-xs font-medium hover:bg-secondary/80 transition-colors"
                    >
                        {copied ? (
                            <><Check className="w-3.5 h-3.5 text-success" /><span className="text-success">Copied</span></>
                        ) : (
                            <><Copy className="w-3.5 h-3.5" /><span>Copy JSON</span></>
                        )}
                    </button>
                )}
            </div>

            {/* ── Document type badge ────────────────────────────────── */}
            <div className="flex items-center gap-2">
                <span className="text-[9px] text-muted-foreground uppercase tracking-widest">Document Type:</span>
                <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wide">
                    {docLabel}
                </span>
            </div>

            {data ? (
                <div className="space-y-2">
                    {IDENTITY_FIELDS.map((field) => {
                        const rawValue = resolveValue(data, field);
                        const boolVal = field.isBool ? normalizeBool(rawValue) : null;
                        const isEmpty = rawValue === null;
                        const FieldIcon = field.icon;

                        return (
                            <div
                                key={field.key}
                                className={cn(
                                    "flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-200",
                                    isEmpty
                                        ? "bg-secondary/5 border-border/20"
                                        : field.isBool
                                            ? boolVal
                                                ? "bg-success/5 border-success/15"
                                                : "bg-destructive/5 border-destructive/15"
                                            : "bg-primary/5 border-primary/10 hover:bg-primary/8"
                                )}
                            >
                                {/* Icon */}
                                <FieldIcon className={cn(
                                    "w-4 h-4 flex-shrink-0",
                                    isEmpty
                                        ? "text-muted-foreground/20"
                                        : field.isBool
                                            ? boolVal ? "text-success/70" : "text-destructive/70"
                                            : "text-primary/60"
                                )} />

                                {/* Label */}
                                <div className="flex-1 min-w-0">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50 mb-0.5">
                                        {field.label}
                                    </p>
                                    <p className={cn(
                                        "text-sm font-semibold truncate",
                                        isEmpty && "italic text-xs text-muted-foreground/30",
                                        field.mono && !isEmpty && "font-mono tracking-wider",
                                        field.isBool && !isEmpty && boolVal && "text-success",
                                        field.isBool && !isEmpty && !boolVal && "text-destructive/80"
                                    )}>
                                        {isEmpty ? "Not detected" : rawValue!}
                                    </p>
                                </div>

                                {/* Bool tick/cross */}
                                {field.isBool && !isEmpty && (
                                    boolVal
                                        ? <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
                                        : <XCircle className="w-4 h-4 text-destructive/70 flex-shrink-0" />
                                )}
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="rounded-xl border border-border/20 bg-secondary/5 p-8 text-center">
                    <ScanLine className="w-10 h-10 text-muted-foreground/15 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground/40">No identity data extracted yet</p>
                    <p className="text-[10px] text-muted-foreground/25 mt-1">Upload a PAN card to begin</p>
                </div>
            )}
        </div>
    );
}
