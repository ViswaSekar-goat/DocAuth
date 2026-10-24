import { AlertTriangle, CheckCircle, Info, ShieldAlert, FileText, Database, Search, Flag, Landmark } from "lucide-react";
import { cn } from "@/lib/utils";
import { VerdictDisplay } from "./VerdictDisplay";
import { FraudIndicators } from "./FraudIndicators";
import { ExtractedData } from "./ExtractedData";
import { IdentityDataPanel } from "./IdentityDataPanel";
import { FraudSummary } from "./FraudSummary";
import { ScoreBreakdown } from "./ScoreBreakdown";

interface AnalysisSidebarProps {
    result: any;
    isProcessing: boolean;
    documentType: string;
    selectedBank?: string;
    analysisMode?: "identity" | "finance" | "vehicle";
    onSelectBox?: (box: any) => void;
}

export function AnalysisSidebar({ result, isProcessing, documentType, selectedBank, analysisMode, onSelectBox }: AnalysisSidebarProps) {
    const fraudBoxes = (result.boundingBoxes || []).filter((b: any) => b.status === "fraud");
    const suspiciousBoxes = (result.boundingBoxes || []).filter((b: any) => b.status === "suspicious");

    // Extract unique issue types from boxes and anomalies
    const issueTypes = Array.from(new Set([
        ...fraudBoxes.map((b: any) => b.category || "FRAUD"),
        ...suspiciousBoxes.map((b: any) => b.category || "ANOMALY")
    ])).filter(Boolean) as string[];

    const handleSelectCheckpoint = (cp: any) => {
        if (cp.bbox && onSelectBox) {
            // Create a temporary box-like object for the viewer
            onSelectBox({
                id: cp.name,
                bbox: cp.bbox,
                page: cp.page || 0,
                label: cp.name,
                status: "fraud"
            });
        }
    };

    return (
        <aside className="h-full flex flex-col gap-6 overflow-y-auto no-scrollbar pb-12 pr-1">
            {/* Active Model Indicator */}
            {selectedBank && selectedBank !== "AUTO" && (
                <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 flex items-center justify-between group overflow-hidden relative">
                    <div className="absolute -right-2 -bottom-2 opacity-5 group-hover:scale-110 transition-transform">
                        <Landmark className="w-12 h-12" />
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-primary/80">
                            {analysisMode === "vehicle" ? "Active Vehicle Model" : "Active Validation Model"}
                        </span>
                    </div>
                    <span className="text-xs font-black text-primary px-2 py-0.5 bg-primary/20 rounded-md">
                        {selectedBank}
                    </span>
                </div>
            )}

            {/* Master Reference Status (All Supported Banks) */}
            {selectedBank && result.master_template_used && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 animate-in fade-in zoom-in duration-300">
                    <div className="flex items-center gap-2 mb-1">
                        <CheckCircle className="w-3 h-3 text-amber-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">{selectedBank} Master Reference</span>
                    </div>
                    <p className="text-[10px] text-amber-500/80 leading-tight">
                        This document was verified against the {selectedBank} Master Template. Structural and formatting checks are active.
                    </p>
                </div>
            )}
            {/* 0. Focused Fraud Summary (New) */}
            <section className="animate-in slide-in-from-right-2 duration-300">
                <div className="flex items-center gap-2 mb-3">
                    <Flag className="w-4 h-4 text-destructive" />
                    <h2 className="text-xs font-black uppercase tracking-widest text-destructive/80">Fraud Audit Summary</h2>
                </div>
                <FraudSummary
                    fraudFlags={fraudBoxes.length}
                    suspiciousFlags={suspiciousBoxes.length}
                    issueTypes={issueTypes}
                    confidence={result.scores?.authenticity_score ?? 0}
                    isProcessing={isProcessing}
                    isCheckpointBased={result.is_checkpoint_based}
                    verdictLabel={result.final_decision?.confidence_label || result.confidence_label}
                />

                {/* Weighted Score Breakdown View */}
                {!isProcessing && result.checkpoints && (
                    <ScoreBreakdown
                        checkpoints={result.checkpoints}
                        finalScore={result.scores?.authenticity_score ?? 0}
                        isCheckpointBased={result.is_checkpoint_based}
                        verdictLabel={result.final_decision?.confidence_label || result.confidence_label}
                        onSelectCheckpoint={handleSelectCheckpoint}
                    />
                )}
            </section>

            {/* 1. Verdict & Core Confidence */}
            <section className="animate-in slide-in-from-right-4 duration-300">
                <div className="flex items-center gap-2 mb-3">
                    <ShieldAlert className="w-4 h-4 text-primary" />
                    <h2 className="text-xs font-black uppercase tracking-widest text-primary/80">System Verdict</h2>
                </div>
                <VerdictDisplay
                    verdict={result.verdict}
                    reasons={result.reasons}
                    isProcessing={isProcessing}
                />
            </section>

            {/* 2. Fraud Indicators (The 'Why') */}
            <section className="animate-in slide-in-from-right-6 duration-400 delay-75">
                <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-4 h-4 text-warning" />
                    <h2 className="text-xs font-black uppercase tracking-widest text-warning/80">Integrity Signals</h2>
                </div>
                <FraudIndicators
                    indicators={result.fraudIndicators}
                    documentType={documentType}
                    analysisMode={analysisMode}
                    checkpoints={result.panCheckpoints || result.checkpoints}
                />
            </section>

            {/* 3. Extracted Data — Identity panel for PAN/Aadhaar, generic for bank */}
            <section className="animate-in slide-in-from-right-8 duration-500 delay-150">
                <div className="flex items-center gap-2 mb-3">
                    <Database className="w-4 h-4 text-primary" />
                    <h2 className="text-xs font-black uppercase tracking-widest text-primary/80">Extracted Intel</h2>
                </div>
                {/* Identity document: any type matching PAN / AADHAAR / IDENTITY */}
                {(() => {
                    const dt = (documentType || "").toUpperCase();
                    const isIdentity = dt.includes("PAN") || dt.includes("AADHAAR") || dt.includes("IDENTITY");
                    if (isIdentity) {
                        return (
                            <IdentityDataPanel
                                data={{
                                    ...(result.extractedData || {}),
                                    document_type: result.extractedData?.document_type || documentType,
                                    qr_location: result.qrLocation,
                                    qr_detected: result.extractedData?.qr_detected ?? (result.qrDetected ? "Yes" : "No"),
                                    photo_detected: result.extractedData?.photo_detected,
                                    signature_detected: result.extractedData?.signature_detected,
                                    holder_type: result.holderType,
                                }}
                                documentType={documentType}
                            />
                        );
                    }
                    return (
                        <ExtractedData
                            data={result.extractedData}
                            documentType={documentType}
                        />
                    );
                })()}
            </section>

            {/* 5. OCR Text Preview (The 'Raw Data') */}
            {result.ocrText && (
                <section className="animate-in slide-in-from-right-10 duration-700 delay-300 mt-6 pt-6 border-t border-border/50">
                    <div className="flex items-center gap-2 mb-3">
                        <FileText className="w-4 h-4 text-primary" />
                        <h2 className="text-xs font-black uppercase tracking-widest text-primary/80">Text Extraction Preview</h2>
                    </div>
                    <div className="bg-secondary/30 border border-border/50 rounded-xl p-3 max-h-64 overflow-y-auto w-[200px]">
                        <pre className="text-[10px] font-mono whitespace-pre-wrap break-words text-muted-foreground leading-relaxed">
                            {result.ocrText}
                        </pre>
                    </div>
                </section>
            )}
        </aside>
    );
}
