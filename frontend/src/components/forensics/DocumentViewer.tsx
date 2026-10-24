"use client";

import { useState, useRef, useEffect } from "react";
import { Eye, FileText, ZoomIn, ZoomOut, Maximize2, Shield, ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface DocumentViewerProps {
    fileUrl: string | null; // Original PDF/Image URL
    viewUrls: string[];    // Converted Page Image URLs
    isScanning: boolean;
    verdict?: string | null;
}

export function DocumentViewer({ fileUrl, viewUrls, isScanning, verdict }: DocumentViewerProps) {
    const [viewMode, setViewMode] = useState<"forensic" | "original">("forensic");
    const [zoom, setZoom] = useState(1);
    const [currentPage, setCurrentPage] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const [forensicImageError, setForensicImageError] = useState(false);

    const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
    const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));
    const resetZoom = () => setZoom(1);

    // Reset page and errors if viewUrls changes
    useEffect(() => {
        setCurrentPage(0);
        setForensicImageError(false);
    }, [viewUrls]);

    return (
        <div className="glass-panel overflow-hidden flex flex-col h-full border-border/40 shadow-2xl relative">
            {/* Control Bar */}
            <div className="flex items-center justify-between p-4 border-b border-border/50 bg-secondary/20 backdrop-blur-md z-30">
                <div className="flex items-center gap-4">
                    <div className="flex bg-background/50 p-1 rounded-xl border border-border/50 shadow-inner">
                        <button
                            onClick={() => setViewMode("forensic")}
                            className={cn(
                                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                                viewMode === "forensic"
                                    ? "bg-primary text-primary-foreground shadow-lg scale-[1.02]"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <Shield className="w-3.5 h-3.5" />
                            Forensic
                        </button>
                        <button
                            onClick={() => setViewMode("original")}
                            className={cn(
                                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                                viewMode === "original"
                                    ? "bg-primary text-primary-foreground shadow-lg scale-[1.02]"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <FileText className="w-3.5 h-3.5" />
                            Original
                        </button>
                    </div>

                    {viewUrls.length > 1 && viewMode === "forensic" && (
                        <div className="flex items-center gap-2 bg-background/30 rounded-lg px-2 py-1 border border-border/30">
                            <button
                                disabled={currentPage === 0}
                                onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                                className="p-1 hover:bg-secondary rounded disabled:opacity-30"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="text-[10px] font-mono font-bold text-muted-foreground">
                                PAGE {currentPage + 1} / {viewUrls.length}
                            </span>
                            <button
                                disabled={currentPage === viewUrls.length - 1}
                                onClick={() => setCurrentPage(p => Math.min(viewUrls.length - 1, p + 1))}
                                className="p-1 hover:bg-secondary rounded disabled:opacity-30"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex items-center bg-background/30 rounded-lg border border-border/30 overflow-hidden">
                        <button onClick={handleZoomOut} className="p-2 hover:bg-secondary text-muted-foreground transition-colors">
                            <ZoomOut className="w-4 h-4" />
                        </button>
                        <span className="px-3 py-1 font-mono text-xs font-bold text-primary min-w-[50px] text-center border-x border-border/30">
                            {Math.round(zoom * 100)}%
                        </span>
                        <button onClick={handleZoomIn} className="p-2 hover:bg-secondary text-muted-foreground transition-colors">
                            <ZoomIn className="w-4 h-4" />
                        </button>
                    </div>
                    <button onClick={resetZoom} className="p-2 aspect-square rounded-lg hover:bg-secondary border border-border/30 text-muted-foreground">
                        <Maximize2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Main Viewer Area */}
            <div
                ref={containerRef}
                className="flex-1 bg-slate-950/90 overflow-auto relative scrolling-touch group/viewer min-h-[500px]"
            >
                {!fileUrl ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-12 space-y-4">
                        <div className="w-20 h-20 rounded-2xl bg-secondary/10 flex items-center justify-center border border-border/50 animate-pulse">
                            <Eye className="w-10 h-10 text-muted-foreground/30" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Awaiting Signal</h3>
                            <p className="text-xs text-slate-600 max-w-[200px]">Synchronize a document to begin the deep forensic scan.</p>
                        </div>
                    </div>
                ) : (
                    <div
                        className="min-h-full min-w-full flex items-center justify-center p-8 transition-all duration-300"
                        style={{ transform: `scale(${zoom})`, transformOrigin: "center top" }}
                    >
                        {viewMode === "original" ? (
                            <div className="w-full max-w-4xl h-[75vh] glass-panel border-white/5 shadow-2xl overflow-hidden bg-white relative">
                                {fileUrl.toLowerCase().includes(".pdf") || fileUrl.startsWith("blob:") ? (
                                    <iframe
                                        src={`${fileUrl}#toolbar=0`}
                                        className="w-full h-full border-none"
                                        title="Original Document PDF"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center p-4">
                                        <img src={fileUrl} alt="Original document" className="max-w-full max-h-full object-contain shadow-2xl" />
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="relative shadow-[0_0_100px_rgba(0,0,0,0.5)] rounded-lg bg-white overflow-hidden animate-in zoom-in-95 duration-500">
                                {/* Forensic View - The Converted Image */}
                                {isScanning && !viewUrls[currentPage] ? (
                                    <div className="w-[600px] h-[800px] bg-slate-900 flex flex-col items-center justify-center space-y-4">
                                        <Shield className="w-12 h-12 text-primary animate-pulse" />
                                        <p className="text-primary font-mono text-xs animate-pulse">EXTRACTING FORENSIC LAYERS...</p>
                                    </div>
                                ) : forensicImageError || !viewUrls[currentPage] ? (
                                    <div className="w-[800px] h-[75vh] bg-slate-100 flex flex-col items-center justify-center p-12 text-center space-y-4">
                                        <div className="p-4 bg-warning/10 rounded-full">
                                            <AlertTriangle className="w-12 h-12 text-warning" />
                                        </div>
                                        <div className="space-y-2">
                                            <h3 className="text-lg font-bold text-slate-800">Forensic Overlay Unavailable</h3>
                                            <p className="text-sm text-slate-500 max-w-md">
                                                We encountered an issue loading the processed forensic layers for this page.
                                                You can still view the <b>Original</b> document or try refreshing.
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => setViewMode("original")}
                                            className="px-6 py-2 bg-primary text-white rounded-xl font-bold hover:shadow-lg transition-all"
                                        >
                                            Switch to Original View
                                        </button>
                                    </div>
                                ) : (
                                    <div className="relative">
                                        <img
                                            src={viewUrls[currentPage]}
                                            alt={`Converted Page ${currentPage + 1}`}
                                            className="max-h-[80vh] w-auto block select-none"
                                            draggable={false}
                                            onError={(e) => {
                                                if (!forensicImageError) {
                                                    console.error("Forensic page load error:", e);
                                                    setForensicImageError(true);
                                                }
                                            }}
                                        />

                                        {/* Scanning Overlay */}
                                        {isScanning && (
                                            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                                                <div className="scanning-line" />
                                                <div className="absolute inset-0 bg-primary/5 animate-pulse" />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Footer / Status */}
            <div className="p-3 bg-secondary/10 border-t border-border/50 flex items-center justify-between text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                        <div className={cn("w-1.5 h-1.5 rounded-full", fileUrl ? "bg-success" : "bg-slate-600")} />
                        <span>Source: {fileUrl ? "Linked" : "Disconnected"}</span>
                    </div>
                    {isScanning && (
                        <div className="flex items-center gap-1.5">
                            <span className="text-primary animate-pulse italic">Spectral Processing Active...</span>
                        </div>
                    )}
                </div>
                {verdict && (
                    <div className={cn(
                        "px-3 py-1 rounded-full border flex items-center gap-2",
                        verdict === "GENUINE" ? "bg-success/5 border-success/30 text-success" :
                            "bg-destructive/5 border-destructive/30 text-destructive"
                    )}>
                        <Shield className="w-3 h-3" />
                        <span>System Verdict: {verdict}</span>
                    </div>
                )}
            </div>
        </div>
    );
}
