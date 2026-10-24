import { useState, useMemo } from "react";
import { Eye, ZoomIn, ZoomOut, Maximize2, Shield, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface DocumentPreviewProps {
    imageUrl: string | null;
    isScanning: boolean;
    documentType?: string | null;
    verdict?: string | null;
    scores?: {
        mathematical_integrity: number;
        pdf_authenticity: number;
        layout_anomaly: number;
        authenticity_score: number;
        forgery_probability: number;
    };
    isPdf?: boolean;
    pageUrls?: string[];
    onPageChange?: (index: number) => void;
    currentPageIndex?: number;
}

export function DocumentPreview({
    imageUrl,
    isScanning,
    documentType,
    verdict,
    scores,
    isPdf: isPdfProp,
    pageUrls = [],
    onPageChange,
    currentPageIndex = 0
}: DocumentPreviewProps) {
    const [zoom, setZoom] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [imageError, setImageError] = useState(false);

    const isPdf = isPdfProp ?? false;

    // Reset error and offset when URL changes
    useMemo(() => {
        setImageError(false);
        setOffset({ x: 0, y: 0 });
        setZoom(1);
    }, [imageUrl]);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (zoom <= 1) return;
        setIsDragging(true);
        setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return;
        setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    };

    const handleMouseUp = () => setIsDragging(false);

    return (
        <div className="glass-panel p-6 h-full flex flex-col select-none">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 border border-primary/20">
                        <Eye className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h2 className="font-semibold">Document Preview</h2>
                        <p className="text-xs text-muted-foreground">Forensic visualization panel</p>
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}
                        className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                    >
                        <ZoomOut className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-mono text-muted-foreground px-2">{Math.round(zoom * 100)}%</span>
                    <button
                        onClick={() => setZoom(z => Math.min(2, z + 0.25))}
                        className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                    >
                        <ZoomIn className="w-4 h-4" />
                    </button>
                    <button className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground ml-2">
                        <Maximize2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="flex-1 rounded-xl border border-border bg-slate-900/50 overflow-hidden relative shadow-inner group">
                {(imageUrl && !imageError) ? (
                    <div
                        className={cn(
                            "relative w-full h-full flex items-center justify-center overflow-hidden p-8 bg-grid-mesh",
                            zoom > 1 ? "cursor-grab active:cursor-grabbing" : "cursor-default"
                        )}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                    >
                        <div
                            className="relative transition-transform duration-75 ease-out shadow-[0_0_50px_rgba(0,0,0,0.3)] rounded-lg bg-white"
                            style={{
                                transform: `scale(${zoom}) translate(${offset.x / zoom}px, ${offset.y / zoom}px)`,
                                transformOrigin: "center"
                            }}
                        >
                            {/* Unified Image Rendering for ALL file types (via backend conversion) */}
                            <img
                                src={imageUrl}
                                alt="Document preview"
                                className="max-w-full max-h-[80vh] object-contain rounded-lg"
                                onError={() => setImageError(true)}
                                draggable={false}
                            />

                            {isScanning && (
                                <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-lg">
                                    <div className="scanning-line" />
                                    <div className="absolute inset-0 bg-primary/5 animate-pulse" />
                                </div>
                            )}

                            {/* Page Navigation Overlay */}
                            {pageUrls.length > 1 && (
                                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 px-4 py-2 bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl z-40 pointer-events-auto transition-transform group-hover:scale-105">
                                    <button
                                        disabled={currentPageIndex === 0}
                                        onClick={(e) => { e.stopPropagation(); onPageChange?.(currentPageIndex - 1); }}
                                        className="p-1 hover:bg-white/10 rounded-lg disabled:opacity-30 transition-colors"
                                    >
                                        <ChevronLeft className="w-5 h-5 text-white" />
                                    </button>
                                    <span className="text-[10px] font-black text-white/90 tracking-widest uppercase">
                                        PAGE {currentPageIndex + 1} / {pageUrls.length}
                                    </span>
                                    <button
                                        disabled={currentPageIndex === pageUrls.length - 1}
                                        onClick={(e) => { e.stopPropagation(); onPageChange?.(currentPageIndex + 1); }}
                                        className="p-1 hover:bg-white/10 rounded-lg disabled:opacity-30 transition-colors"
                                    >
                                        <ChevronRight className="w-5 h-5 text-white" />
                                    </button>
                                </div>
                            )}

                        </div>

                        {/* Phase 7: Forensic Audit Dashboard Overlay */}
                        {scores && !isScanning && (
                            <div className="absolute top-6 left-6 right-6 z-20 pointer-events-none">
                                <div className="grid grid-cols-4 gap-4 pointer-events-auto">
                                    {[
                                        { label: "Math Integrity", value: scores.mathematical_integrity, icon: "∑" },
                                        { label: "PDF Authenticity", value: scores.pdf_authenticity, icon: "📄" },
                                        { label: "Layout Anomaly", value: scores.layout_anomaly, icon: "📐" },
                                        { label: "Authenticity", value: scores.authenticity_score, icon: "🛡️" }
                                    ].map((score, i) => (
                                        <div key={i} className="glass-panel p-3 border-white/10 shadow-2xl backdrop-blur-xl">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{score.label}</span>
                                                <span className="text-[10px]">{score.icon}</span>
                                            </div>
                                            <div className="flex items-end gap-1">
                                                <span className={cn(
                                                    "text-xl font-black leading-none",
                                                    (score.value || 0) > 80 ? "text-success" : (score.value || 0) > 50 ? "text-warning" : "text-destructive"
                                                )}>
                                                    {score.value ?? 0}
                                                </span>
                                                <span className="text-[10px] font-bold text-slate-500 mb-0.5">%</span>
                                            </div>
                                            <div className="mt-2 h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                                                <div
                                                    className={cn(
                                                        "h-full transition-all duration-1000",
                                                        (score.value || 0) > 80 ? "bg-success" : (score.value || 0) > 50 ? "bg-warning" : "bg-destructive"
                                                    )}
                                                    style={{ width: `${score.value ?? 0}%` }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {verdict && (
                                    <div className={cn(
                                        "mt-4 glass-panel p-4 flex items-center justify-between pointer-events-auto shadow-2xl",
                                        verdict === "GENUINE" ? "border-success/30 bg-success/5" :
                                            verdict === "SUSPICIOUS" ? "border-warning/30 bg-warning/5" : "border-destructive/30 bg-destructive/5"
                                    )}>
                                        <div className="flex items-center gap-4">
                                            <div className={cn(
                                                "w-12 h-12 rounded-xl flex items-center justify-center border shadow-inner",
                                                verdict === "GENUINE" ? "bg-success/20 border-success/30 text-success" :
                                                    verdict === "SUSPICIOUS" ? "bg-warning/20 border-warning/30 text-warning" : "bg-destructive/20 border-destructive/30 text-destructive"
                                            )}>
                                                <Shield className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-0.5">Forensic Verdict</h4>
                                                <p className={cn(
                                                    "text-lg font-black tracking-tight leading-none uppercase italic",
                                                    verdict === "GENUINE" ? "text-success" :
                                                        verdict === "SUSPICIOUS" ? "text-warning" : "text-destructive"
                                                )}>
                                                    {verdict}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[9px] font-bold text-slate-500 uppercase mb-1">Forgery Probability</p>
                                            <p className="text-xl font-black font-mono tracking-tighter text-slate-300">
                                                {(scores.forgery_probability ?? 0).toFixed(1)}%
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground bg-slate-900/10">
                        <div className="relative mb-6">
                            <div className="w-24 h-24 rounded-3xl bg-slate-800 flex items-center justify-center border border-white/5 shadow-2xl overflow-hidden group-hover:bg-slate-700 transition-colors">
                                <Maximize2 className="w-10 h-10 text-primary opacity-40 group-hover:scale-110 transition-transform" />
                                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-primary/10 to-transparent animate-shimmer" />
                            </div>
                            <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center shadow-xl">
                                <Shield className="w-4 h-4 text-primary/60" />
                            </div>
                        </div>
                        <h3 className="text-sm font-black tracking-[0.2em] text-slate-300 uppercase mb-2">
                            {imageError ? "Processing Failure" : "Forensically Isolated"}
                        </h3>
                        <p className="text-[11px] text-slate-500 max-w-[280px] text-center leading-relaxed font-medium">
                            {imageError
                                ? "The secondary analysis is concluding, but the primary visual asset failed to render in this secure context."
                                : "Upload a legitimate government or bank instrument to initialize the multi-spectral validation sequence."}
                        </p>
                    </div>
                )}
            </div>

        </div>
    );
}
