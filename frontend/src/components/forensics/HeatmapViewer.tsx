import { useState } from "react";
import { Layers, Thermometer } from "lucide-react";
import { cn } from "@/lib/utils";

export type HeatmapMode = "original" | "ela" | "noise" | "edges" | "forgery";

interface HeatmapViewerProps {
    imageUrl: string | null;
    isAnalyzing: boolean;
}

const modes: { id: HeatmapMode; label: string; description: string }[] = [
    { id: "original", label: "Original", description: "Unprocessed document" },
    { id: "ela", label: "ELA", description: "Error Level Analysis" },
    { id: "noise", label: "Noise", description: "Noise inconsistency map" },
    { id: "edges", label: "Edges", description: "Edge discontinuity" },
    { id: "forgery", label: "Forgery", description: "Combined forgery map" },
];

export function HeatmapViewer({ imageUrl, isAnalyzing }: HeatmapViewerProps) {
    const [activeMode, setActiveMode] = useState<HeatmapMode>("original");

    const getFilterStyle = (mode: HeatmapMode) => {
        switch (mode) {
            case "ela":
                return "contrast(2) saturate(3) hue-rotate(180deg)";
            case "noise":
                return "grayscale(1) contrast(3) brightness(1.5)";
            case "edges":
                return "invert(1) grayscale(1) contrast(5)";
            case "forgery":
                return "sepia(1) saturate(5) hue-rotate(-30deg) contrast(1.5)";
            default:
                return "none";
        }
    };

    return (
        <div className="glass-panel p-6">
            <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 border border-primary/20">
                    <Layers className="w-5 h-5 text-primary" />
                </div>
                <div>
                    <h2 className="font-semibold">Forensic Heatmaps</h2>
                    <p className="text-xs text-muted-foreground">Multi-spectral analysis visualization</p>
                </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
                {modes.map((mode) => (
                    <button
                        key={mode.id}
                        onClick={() => setActiveMode(mode.id)}
                        className={cn(
                            "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                            activeMode === mode.id
                                ? "bg-primary text-primary-foreground"
                                : "bg-secondary text-muted-foreground hover:text-foreground"
                        )}
                    >
                        {mode.label}
                    </button>
                ))}
            </div>

            <div className="rounded-xl border border-border bg-slate-900/50 overflow-hidden aspect-video relative group border-dashed">
                {imageUrl ? (
                    <div className="relative w-full h-full flex items-center justify-center p-4">
                        <img
                            src={imageUrl}
                            alt={`${activeMode} view`}
                            className="max-w-full max-h-full object-contain transition-all duration-700 ease-in-out shadow-2xl rounded-sm"
                            style={{ filter: getFilterStyle(activeMode) }}
                            onError={(e) => {
                                (e.target as HTMLImageElement).src = "https://placehold.co/600x400/0f172a/359EFF?text=Forensic+Data+Not+Found";
                            }}
                        />

                        {isAnalyzing && (
                            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-50">
                                <div className="text-center">
                                    <div className="relative mb-4">
                                        <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
                                        <Thermometer className="w-10 h-10 text-primary mx-auto relative animate-bounce" />
                                    </div>
                                    <p className="text-sm font-bold text-slate-200 tracking-widest uppercase mb-1">Processing Spectral Data</p>
                                    <p className="text-[10px] text-primary/70 font-mono animate-pulse">Running {activeMode.toUpperCase()} algorithms...</p>
                                </div>
                            </div>
                        )}

                        <div className="absolute top-4 left-4">
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 backdrop-blur-md border border-primary/30 shadow-lg">
                                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                                <span className="text-[10px] font-bold text-primary uppercase tracking-tighter">{activeMode} CHANNEL</span>
                            </div>
                        </div>

                        <div className="absolute bottom-4 left-4 right-4 flex items-center gap-4 px-4 py-3 rounded-xl bg-slate-900/90 backdrop-blur-md border border-white/10 shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <div className="flex-1">
                                <p className="text-xs font-bold text-slate-100">{modes.find(m => m.id === activeMode)?.label}</p>
                                <p className="text-[10px] text-slate-400 mt-0.5">{modes.find(m => m.id === activeMode)?.description}</p>
                            </div>
                            {activeMode !== "original" && (
                                <div className="flex flex-col items-end gap-1">
                                    <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest leading-none">Anomalies Detected</span>
                                    <div className="w-24 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-success via-warning to-destructive animate-shimmer" style={{ width: '100%' }} />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground bg-slate-900/20">
                        <div className="relative mb-4 opacity-20">
                            <Layers className="w-16 h-16" />
                            <div className="absolute inset-0 border border-primary/50 animate-ping rounded-full opacity-20" />
                        </div>
                        <p className="text-xs font-bold tracking-widest uppercase opacity-40">Forensic Terminal Idle</p>
                        <p className="text-[10px] mt-1 opacity-20">Awaiting multi-spectral document upload</p>
                    </div>
                )}
            </div>
        </div>
    );
}
