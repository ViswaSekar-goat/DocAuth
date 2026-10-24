"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ZoomIn, ZoomOut, Maximize2, Layers, Download } from "lucide-react";

interface ForensicViewerProps {
    imageSrc: string;
    heatmapSrc?: string;
    overlays?: any[];
}

export function ForensicViewer({ imageSrc, heatmapSrc, overlays = [] }: ForensicViewerProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [zoom, setZoom] = useState(1);
    const [showHeatmap, setShowHeatmap] = useState(true);
    const [showOverlays, setShowOverlays] = useState(true);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const img = new Image();
        const heatmap = new Image();

        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            draw();
        };
        img.src = imageSrc;

        if (heatmapSrc) {
            heatmap.src = heatmapSrc;
            heatmap.onload = draw;
        }

        function draw() {
            if (!ctx || !canvas || !img.complete) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Draw Base Image
            ctx.drawImage(img, 0, 0);

            // Draw Heatmap Overlay
            if (showHeatmap && heatmap.complete) {
                ctx.globalAlpha = 0.5;
                ctx.globalCompositeOperation = "multiply";
                ctx.drawImage(heatmap, 0, 0);
                ctx.globalAlpha = 1.0;
                ctx.globalCompositeOperation = "source-over";
            }

            // Draw AI Bounding Boxes
            if (showOverlays) {
                overlays.forEach(box => {
                    const isError = box.label.includes("ERROR") || box.severity === "HIGH" || box.severity === "CRITICAL";
                    ctx.strokeStyle = isError ? "#ef4444" : "#3b82f6";
                    ctx.lineWidth = 4;
                    ctx.font = "bold 24px Inter";

                    ctx.strokeRect(box.x, box.y, box.w, box.h);
                    ctx.fillStyle = isError ? "#ef4444" : "#3b82f6";
                    ctx.fillRect(box.x, box.y - 40, ctx.measureText(box.label).width + 20, 40);
                    ctx.fillStyle = "white";
                    ctx.fillText(box.label, box.x + 10, box.y - 10);
                });
            }
        }
    }, [imageSrc, heatmapSrc, showHeatmap, showOverlays, overlays]);

    return (
        <div className="flex flex-col h-full gap-4">
            {/* Viewer Header */}
            <div className="flex items-center justify-between px-6 py-3 glass rounded-xl border border-white/5">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowHeatmap(!showHeatmap)}
                            className={`p-2 rounded-lg transition-all ${showHeatmap ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-400'}`}
                        >
                            <Layers className="w-4 h-4" />
                        </button>
                        <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Heatmap Mode</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowOverlays(!showOverlays)}
                            className={`p-2 rounded-lg transition-all ${showOverlays ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-400'}`}
                        >
                            <Maximize2 className="w-4 h-4" />
                        </button>
                        <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500">AI Overlays</span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button onClick={() => setZoom(z => Math.max(0.5, z - 0.1))} className="p-2 hover:bg-white/5 rounded-lg text-slate-400">
                        <ZoomOut className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-bold text-slate-300 w-12 text-center">{Math.round(zoom * 100)}%</span>
                    <button onClick={() => setZoom(z => Math.min(3, z + 0.1))} className="p-2 hover:bg-white/5 rounded-lg text-slate-400">
                        <ZoomIn className="w-4 h-4" />
                    </button>
                    <div className="w-[1px] h-4 bg-white/10 mx-2" />
                    <button className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-bold text-white transition-all">
                        <Download className="w-4 h-4" /> Export Report
                    </button>
                </div>
            </div>

            {/* Canvas Container */}
            <div
                ref={containerRef}
                className="flex-1 bg-slate-900 rounded-2xl border border-white/5 overflow-auto relative p-8 flex items-center justify-center"
            >
                <div
                    style={{ transform: `scale(${zoom})`, transformOrigin: "center" }}
                    className="transition-transform duration-200 shadow-2xl"
                >
                    <canvas ref={canvasRef} className="max-w-full rounded-lg" />
                </div>
            </div>
        </div>
    );
}
