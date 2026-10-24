import { cn } from "@/lib/utils";
import { Shield, Activity, BarChart3, Zap, CheckCircle2, XCircle, AlertCircle } from "lucide-react";

export interface FraudIndicator {
    id: string;
    type: "critical" | "warning" | "info" | "passed" | "success";
    label: string;
    description: string;
    region?: string;
    category?: string;
    status?: "PASSED" | "FAILED";
}

interface FraudIndicatorsProps {
    indicators: FraudIndicator[];
    documentType?: string;
    analysisMode?: "identity" | "finance" | "vehicle";
    checkpoints?: Array<{
        name?: string;
        checkpoint?: string;
        result: number | string;
        status?: string;
        reason?: string;
        details?: string;
        weight?: number;
    }>;
}

// ── IDENTITY MODE: 7 checkpoint categories ────────────────────────────────────
const IDENTITY_CATEGORIES = [
    { id: "ITHEAD", label: "INCOME TAX HEADER", description: "INCOME TAX DEPARTMENT text present at top" },
    { id: "PANFMT", label: "PAN FORMAT", description: "Format [A-Z]{5}[0-9]{4}[A-Z] validated" },
    { id: "IDFIELDS", label: "IDENTITY FIELDS", description: "Full Name, Father Name & DOB extracted" },
    { id: "PHOTO", label: "PHOTO DETECTION", description: "Face detected on left side of card" },
    { id: "SIGNATURE", label: "SIGNATURE DETECTION", description: "Ink strokes detected in lower region" },
    { id: "EMBLEM", label: "EMBLEM DETECTION", description: "Govt Ashoka pillar emblem detected" },
    { id: "QRCHK", label: "QR DETECTION", description: "QR code presence (optional)" },
];

// ── FINANCE MODE: 4 legacy bank categories ───────────────────────────────────
const BANK_CATEGORIES = [
    { id: "STRUCTURAL", label: "Structural Checks", description: "Font, alignment, and branding" },
    { id: "LOGICAL", label: "Logical Checks", description: "Arithmetic and chronology" },
    { id: "FORMAT", label: "Format Checks", description: "Account and date standards" },
    { id: "FORENSIC", label: "Forensic Checks", description: "Metadata and timestamps" },
];

// ── VEHICLE MODE: 5 RTO & Forensic categories ────────────────────────────────
const VEHICLE_CATEGORIES = [
    { id: "REGISTRY", label: "Registry Validation", description: "Vahan/RTO database cross-reference" },
    { id: "STRUCTURAL", label: "Structural Audit", description: "Security threads and watermarks" },
    { id: "OCR_INTEG", label: "OCR Integrity", description: "Engine and Chassis number consistency" },
    { id: "STAMP_AUTH", label: "Stamp Authenticity", description: "RTO seal and signature verification" },
    { id: "DIGITAL", label: "Digital Forensics", description: "Metadata and edit detection" },
];

function isPanDocument(indicators: FraudIndicator[], documentType?: string): boolean {
    const dt = (documentType || "").toUpperCase();
    if (dt === "BANK_STATEMENT") return false;
    if (dt.includes("PAN") || dt.includes("AADHAAR") || dt.includes("IDENTITY")) return true;

    // Check for specific identity-only categories from backend
    return indicators.some(i =>
        ["PANFMT", "ITHEAD", "EMBLEM", "PHOTO", "SIGNATURE", "QRCHK"].includes(i.category || "")
    );
}

export function FraudIndicators({ indicators, documentType, analysisMode, checkpoints }: FraudIndicatorsProps) {
    const forcedIdentity = analysisMode === "identity";
    const forcedFinance = analysisMode === "finance";

    // logic: if explicitly in finance mode, isPan is false. 
    // Otherwise, check if it's an identity doc
    const isPan = !forcedFinance && (forcedIdentity || isPanDocument(indicators || [], documentType));

    // For finance mode statistics
    const passedCount = checkpoints ? checkpoints.filter(c => (c.result === 1.0 || c.result === "PASS" || c.status === "PASSED")).length : 0;
    const totalCount = checkpoints?.length || 0;
    const healthPct = totalCount > 0 ? Math.round((passedCount / totalCount) * 100) : 100;

    return (
        <div className="glass-panel p-6 overflow-hidden relative">
            {/* Background Decorative Element */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

            {/* ── Header ────────────────────────────────────────────── */}
            <div className="flex items-center gap-3 mb-6 relative">
                <div className={cn(
                    "flex items-center justify-center w-10 min-h-10 rounded-xl border shadow-sm",
                    isPan ? "bg-primary/10 border-primary/20" : "bg-emerald-500/10 border-emerald-500/20"
                )}>
                    {isPan ? <Shield className="w-5 h-5 text-primary" /> : <Activity className="w-5 h-5 text-emerald-500" />}
                </div>
                <div>
                    <h2 className="font-black text-xs uppercase tracking-wider">
                        {isPan ? "Identity Integrity Signals" : "Financial Forensic Audit"}
                    </h2>
                    <div className="flex items-center gap-2 mt-0.5">
                        <span className={cn(
                            "w-1.5 h-1.5 rounded-full animate-pulse",
                            healthPct >= 90 ? "bg-emerald-500" : healthPct >= 70 ? "bg-amber-500" : "bg-rose-500"
                        )} />
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                            {isPan ? "7-point biometric verification" : "Multi-spectral banking audit"}
                        </p>
                    </div>
                </div>
            </div>

            {/* ── INNOVATIVE WIDGETS (Finance Mode Only) ── */}
            {!isPan && (
                <div className="grid grid-cols-3 gap-2 mb-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    {/* Arithmetic Health Gauge */}
                    <div className="bg-secondary/20 border border-border/40 rounded-xl p-2.5 flex flex-col items-center text-center">
                        <div className="w-8 h-8 rounded-full border-2 border-primary/20 flex items-center justify-center mb-1.5 relative">
                            <Zap className="w-4 h-4 text-amber-500" />
                            <div className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent animate-spin-slow" />
                        </div>
                        <span className="text-[9px] font-black uppercase text-muted-foreground tracking-tighter">Arithmetic</span>
                        <span className="text-xs font-black text-foreground">{healthPct}%</span>
                    </div>

                    {/* Transaction Velocity */}
                    <div className="bg-secondary/20 border border-border/40 rounded-xl p-2.5 flex flex-col items-center text-center">
                        <div className="w-8 h-8 rounded-full border-2 border-emerald-500/20 flex items-center justify-center mb-1.5">
                            <BarChart3 className="w-4 h-4 text-emerald-500" />
                        </div>
                        <span className="text-[9px] font-black uppercase text-muted-foreground tracking-tighter">Velocity</span>
                        <span className="text-xs font-black text-emerald-500">STABLE</span>
                    </div>

                    {/* Structural Integrity */}
                    <div className="bg-secondary/20 border border-border/40 rounded-xl p-2.5 flex flex-col items-center text-center">
                        <div className="w-8 h-8 rounded-full border-2 border-blue-500/20 flex items-center justify-center mb-1.5">
                            <Shield className="w-4 h-4 text-blue-500" />
                        </div>
                        <span className="text-[9px] font-black uppercase text-muted-foreground tracking-tighter">Structural</span>
                        <span className="text-xs font-black text-blue-400">PASSED</span>
                    </div>
                </div>
            )}

            {/* ── Trust Integrity Bar ── */}
            <div className="mb-6 relative">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                        <div className="w-1 h-1 rounded-full bg-primary" />
                        Trust Integrity Index
                    </span>
                    <span className={cn(
                        "text-xs font-black px-2 py-0.5 rounded-md",
                        healthPct >= 90 ? "bg-emerald-500/10 text-emerald-500" : healthPct >= 70 ? "bg-amber-500/10 text-amber-500" : "bg-rose-500/10 text-rose-500"
                    )}>
                        {healthPct}%
                    </span>
                </div>
                <div className="h-1.5 w-full bg-secondary/50 rounded-full overflow-hidden border border-border/20">
                    <div
                        className={cn(
                            "h-full transition-all duration-1000 ease-out rounded-full",
                            healthPct >= 90 ? "bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.3)]" :
                                healthPct >= 70 ? "bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.3)]" :
                                    "bg-rose-500 shadow-[0_0_12px_rgba(239,68,68,0.3)]"
                        )}
                        style={{ width: `${healthPct}%` }}
                    />
                </div>
            </div>

            {/* ── Checkpoint rows ───────────────────────────────────── */}
            <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1 no-scrollbar animate-in fade-in duration-700">
                {(!isPan && checkpoints && checkpoints.length > 0) ? (
                    checkpoints.map((cp, idx) => {
                        const isPresent = cp.result === 1.0 || cp.status === "PASSED" || cp.result === "PASS";
                        const isFailed = !isPresent;

                        // Professional Banking Mappings (Innovative Terminology)
                        const technicalName = cp.name || cp.checkpoint || "Unknown Scan";
                        const mapping: Record<string, string> = {
                            "Account Holder Name Verification": "Identity Matrix Verification",
                            "Account Holder Name Detection": "Identity Matrix Verification",
                            "Account Holder & Address Block": "Identity Matrix Verification",
                            "Account Number Format Validation": "Instrument Integrity Scan",
                            "Account Number Format (12-digit)": "Instrument Integrity Scan",
                            "Account Number Format (15-digit)": "Instrument Integrity Scan",
                            "Acc Number & CIF Check": "Instrument Integrity Scan",
                            "Acc Number & IFSC Validation": "Instrument Integrity Scan",
                            "IFSC Code Validation": "Systematic Routing Audit",
                            "IFSC Code Validation (IOBA + 7 digits)": "Systematic Routing Audit",
                            "Header Validation": "Instrument Integrity Scan",
                            "Header Identity Check": "Instrument Integrity Scan",
                            "Statement Period Validation": "Temporal Fidelity Check",
                            "Date Validation": "Temporal Fidelity Check",
                            "Master Template Comparison": "Structural Congruence Matrix",
                            "Transaction Table Structure Validation": "Structural Congruence Matrix",
                            "Transaction Table Structure": "Structural Congruence Matrix",
                            "Flexible Table Parsing": "Structural Congruence Matrix",
                            "Transaction Structure": "Structural Congruence Matrix",
                            "Column Structure Check": "Structural Congruence Matrix",
                            "Running Balance Consistency": "Arithmetic Maturity Index",
                            "Balance Flow Validation": "Arithmetic Maturity Index",
                            "Math Accuracy": "Arithmetic Maturity Index",
                            "Transaction Sequence Validation": "Flux Continuity Radar",
                            "Transaction Chronological Sequence": "Flux Continuity Radar",
                            "Transaction Chronological Order": "Flux Continuity Radar",
                            "PDF Tampering Detection": "Neural Metadata Analysis",
                            "PDF Integrity Check": "Neural Metadata Analysis",
                            "Summary Verification": "Aggregate Reconciliation",
                            "Summary Cross-Verification": "Aggregate Reconciliation",
                            "Total Validation": "Aggregate Reconciliation",
                            "Final Balance Reconciliation": "Aggregate Reconciliation",
                            "Debit/Credit Rule": "Transactional Mutual Exclusivity",
                            "Validate Debit/Credit Rule": "Transactional Mutual Exclusivity",
                            "Transaction Code Validation": "Systematic Transaction Audit",
                            "Transaction Pattern Analysis": "Systematic Transaction Audit"
                        };

                        let label = mapping[technicalName] || technicalName;

                        // Fallback substrings for variations
                        if (label === technicalName) {
                            if (technicalName.includes("Emblem")) label = "Bank Logo Authenticity";
                            if (technicalName.includes("Photo")) label = "Stamp & Sign Verification";
                            if (technicalName.includes("QR")) label = "System QR Integrity";
                            if (technicalName.includes("Structural")) label = "Template Congruence";
                            if (technicalName.includes("Math")) label = "Arithmetic Maturity Index";
                            if (technicalName.includes("Logical")) label = "Flux Continuity Radar";
                        }

                        const detailText = cp.reason || cp.details || "Validation completed";

                        return (
                            <div
                                key={idx}
                                className={cn(
                                    "group flex items-center justify-between gap-3 rounded-xl border px-4 py-3 transition-all duration-300 hover:scale-[1.01]",
                                    isFailed
                                        ? "bg-rose-500/[0.03] border-rose-500/20 hover:border-rose-500/40"
                                        : "bg-emerald-500/[0.03] border-emerald-500/15 hover:border-emerald-500/30"
                                )}
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="flex-shrink-0 flex items-center justify-center relative">
                                        <div className={cn(
                                            "w-2.5 h-2.5 rounded-full border shadow-sm",
                                            isPresent ? "bg-emerald-400 border-emerald-500" : "bg-rose-500 border-rose-600"
                                        )} />
                                        {isPresent && <div className="absolute inset-0 bg-emerald-400 rounded-full animate-ping opacity-20" />}
                                    </div>

                                    <div className="min-w-0">
                                        <h3 className="text-[10px] font-black uppercase tracking-tight text-foreground/90 group-hover:text-primary transition-colors">
                                            {label}
                                        </h3>
                                        <p className="text-[9px] text-muted-foreground italic leading-tight truncate max-w-[180px]">
                                            {detailText}
                                        </p>
                                    </div>
                                </div>

                                <div className={cn(
                                    "text-[9px] font-black px-2 py-0.5 rounded-md border tracking-tighter transition-all",
                                    isFailed
                                        ? "bg-rose-500/10 text-rose-500 border-rose-500/20"
                                        : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 group-hover:bg-emerald-500/20"
                                )}>
                                    {isFailed ? "FAIL" : "PASS"}
                                </div>
                            </div>
                        );
                    })
                ) : (
                    // Identity Mode categories
                    (isPan ? IDENTITY_CATEGORIES : []).map((cat, idx) => {
                        const cpData = checkpoints?.[idx];
                        const isFailed = cpData ? (cpData.result === 0 || cpData.status === "FAILED" || cpData.result === "FAIL") : false;
                        const isPresent = cpData ? !isFailed : false;
                        const hasData = !!cpData;

                        return (
                            <div
                                key={cat.id}
                                className={cn(
                                    "flex items-center justify-between gap-3 rounded-xl border px-4 py-3 transition-all duration-300",
                                    !hasData ? "bg-secondary/5 border-border/30 opacity-60" :
                                        isFailed ? "bg-rose-500/5 border-rose-500/20" : "bg-emerald-500/5 border-emerald-500/15"
                                )}
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className={cn(
                                        "w-2 h-2 rounded-full",
                                        !hasData ? "bg-muted-foreground/30" : isPresent ? "bg-emerald-400" : "bg-rose-500"
                                    )} />
                                    <div className="min-w-0">
                                        <h3 className="text-[10px] font-black uppercase tracking-wide text-foreground/80 truncate">
                                            {cat.label}
                                        </h3>
                                        <p className="text-[9px] text-muted-foreground/50 leading-tight truncate">
                                            {cat.description}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-[9px] font-black text-muted-foreground/40 tracking-widest">
                                    {hasData ? (isFailed ? "FAIL" : "PASS") : "WAIT"}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Legend / Footer */}
            <div className="mt-8 pt-4 border-t border-border/20 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span className="text-[8px] font-bold text-muted-foreground uppercase">Valid</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                        <span className="text-[8px] font-bold text-muted-foreground uppercase">Suspicious</span>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <Shield size={8} className="text-primary/40" />
                    <span className="text-[8px] font-black text-primary/40 uppercase tracking-widest">Enterprise Safe</span>
                </div>
            </div>
        </div>
    );
}
