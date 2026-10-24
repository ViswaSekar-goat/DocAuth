import { Check, Loader2, Circle, Shield, ScanLine, FileText, ShieldCheck, Search, Cpu, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type PipelineStage =
    | "idle"
    | "preprocessing"
    | "classification"
    | "ocr_extraction"
    | "rule_validation"
    | "forensic_analysis"
    | "fraud_detection"
    | "verdict"
    // Finance specific aliases
    | "bank_discovery"
    | "ledger_parsing"
    | "arithmetic_check"
    | "narration_intel"
    | "embedded_forensics";

interface PipelineStatusProps {
    currentStage: PipelineStage;
    isProcessing?: boolean;
    mode?: "identity" | "finance" | "vehicle";
}

const identityStages: { id: PipelineStage; label: string; description: string; Icon: any }[] = [
    { id: "preprocessing", label: "Pre Processing", description: "Noise removal, rotation correction", Icon: ScanLine },
    { id: "classification", label: "Document Classification", description: "PAN card identity detection", Icon: Shield },
    { id: "ocr_extraction", label: "OCR & QR Extraction", description: "Text, PAN number, QR decoding", Icon: FileText },
    { id: "rule_validation", label: "Rule Validation", description: "PAN format, holder type, DOB checks", Icon: ShieldCheck },
    { id: "forensic_analysis", label: "Forensic Analysis", description: "ELA, tampering, pixel anomalies", Icon: Search },
    { id: "fraud_detection", label: "Fraud Detection", description: "Layout, photo, signature, QR match", Icon: Cpu },
    { id: "verdict", label: "Verdict Engine", description: "Trust score and status decision", Icon: CheckCircle2 },
];

const financeStages: { id: PipelineStage; label: string; description: string; Icon: any }[] = [
    { id: "preprocessing", label: "Pre-Processing", description: "Noise removal, cleaning", Icon: ScanLine },
    { id: "classification", label: "Bank Discovery", description: "IFSC and branch identification", Icon: Shield },
    { id: "ocr_extraction", label: "Statement Parsing", description: "Transaction table mapping", Icon: FileText },
    { id: "rule_validation", label: "Ledger Validation", description: "Arithmetic balance re-computation", Icon: ShieldCheck },
    { id: "forensic_analysis", label: "Narration Intelligence", description: "Syntax and behavioral rules", Icon: Search },
    { id: "fraud_detection", label: "Embedded Forensics", description: "Fonts, metadata & vector checks", Icon: Cpu },
    { id: "verdict", label: "Decision Engine", description: "Final bank-specific verdict", Icon: CheckCircle2 },
];

const vehicleStages: { id: PipelineStage; label: string; description: string; Icon: any }[] = [
    { id: "preprocessing", label: "Registry Check", description: "Standard document cleanup", Icon: ScanLine },
    { id: "classification", label: "Document Identification", description: "RC, Insurance, PUC detection", Icon: Shield },
    { id: "ocr_extraction", label: "Data Extraction", description: "Engine #, Chassis #, Owner details", Icon: FileText },
    { id: "rule_validation", label: "RTO Compliance", description: "State-specific registration rules", Icon: ShieldCheck },
    { id: "forensic_analysis", label: "Forensic Analysis", description: "Stamp and signature verification", Icon: Search },
    { id: "fraud_detection", label: "Tamper Detection", description: "Pixel-level document audit", Icon: Cpu },
    { id: "verdict", label: "Validation Verdict", description: "Final authenticity decision", Icon: CheckCircle2 },
];

export function PipelineStatus({ currentStage, isProcessing = false, mode = "identity" }: PipelineStatusProps) {
    const stages = mode === "finance" ? financeStages : mode === "vehicle" ? vehicleStages : identityStages;

    const getStageIndex = (stage: PipelineStage) => {
        if (stage === "idle") return -1;
        const index = stages.findIndex(s => s.id === stage);
        if (index !== -1) return index;
        const fallbackMap: Record<string, number> = {
            preprocessing: 0, classification: 1, ocr_extraction: 2,
            rule_validation: 3, forensic_analysis: 4, fraud_detection: 5, verdict: 6
        };
        return fallbackMap[stage] ?? -1;
    };

    const currentIndex = getStageIndex(currentStage);
    const allDone = !isProcessing && currentIndex === stages.length - 1;

    return (
        <div className="glass-panel p-5">
            {/* Header */}
            <div className="flex items-center gap-2 mb-5">
                <span className={cn(
                    "w-2 h-2 rounded-full",
                    isProcessing ? "bg-primary animate-pulse" : allDone ? "bg-success" : "bg-muted-foreground/30"
                )} />
                <h2 className="text-xs font-black uppercase tracking-widest text-foreground/80">
                    {mode === "finance" ? "Financial Audit Pipeline" : mode === "vehicle" ? "Vehicle Verification Pipeline" : "Identity Verification Pipeline"}
                </h2>
            </div>

            <div className="relative">
                {/* Vertical connector line */}
                <div className="absolute left-[19px] top-4 bottom-4 w-[2px] bg-border/30 rounded-full" />

                <div className="space-y-2">
                    {stages.map((stage, index) => {
                        const isCompleted = index < currentIndex || (index <= currentIndex && !isProcessing);
                        const isCurrent = index === currentIndex && isProcessing;
                        const isPending = index > currentIndex || (index === currentIndex && !isProcessing && currentIndex !== stages.length - 1);
                        const StageIcon = stage.Icon;

                        return (
                            <div
                                key={stage.id}
                                className={cn(
                                    "relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-500",
                                    isCurrent && "bg-primary/10 border border-primary/20 shadow-[0_0_20px_rgba(59,130,246,0.12)]",
                                    isCompleted && !isCurrent && "opacity-80"
                                )}
                            >
                                {/* Stage indicator */}
                                <div className={cn(
                                    "relative z-10 w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-500",
                                    isCompleted && "bg-success/20 text-success shadow-[0_0_12px_rgba(34,197,94,0.25)]",
                                    isCurrent && "bg-primary/20 text-primary shadow-[0_0_16px_rgba(59,130,246,0.35)] scale-110",
                                    isPending && "bg-secondary/50 text-muted-foreground/40"
                                )}>
                                    {isCurrent ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : isCompleted ? (
                                        <Check className="w-4 h-4" />
                                    ) : (
                                        <StageIcon className="w-3.5 h-3.5" />
                                    )}
                                </div>

                                {/* Label */}
                                <div className="flex-1 min-w-0">
                                    <p className={cn(
                                        "text-xs font-bold truncate transition-colors",
                                        isCompleted ? "text-foreground/90" : isCurrent ? "text-primary" : "text-muted-foreground/40"
                                    )}>
                                        {stage.label}
                                    </p>
                                    <p className={cn(
                                        "text-[9px] truncate transition-colors",
                                        isCurrent ? "text-primary/60" : "text-muted-foreground/30"
                                    )}>
                                        {stage.description}
                                    </p>
                                </div>

                                {/* Status badge */}
                                {isCurrent && (
                                    <div className="flex items-center gap-1.5 flex-shrink-0">
                                        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                                        <span className="text-[9px] font-black text-primary tracking-tighter">ACTIVE</span>
                                    </div>
                                )}
                                {isCompleted && !isCurrent && (
                                    <span className="text-[9px] font-bold text-success/60 tracking-tighter flex-shrink-0">DONE</span>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
