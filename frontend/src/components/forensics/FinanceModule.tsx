"use client";

import React, { useState } from "react";
import { useForensicAnalysis } from "@/hooks/useForensicAnalysis";
import { DocumentUpload } from "./DocumentUpload";
import { PipelineStatus } from "./PipelineStatus";
import { AnalysisSidebar } from "./AnalysisSidebar";
import { DocumentPreview } from "./DocumentPreview";
import { motion, AnimatePresence } from "framer-motion";
import { Landmark, RefreshCw, ChevronDown, CheckCircle2, Database, Zap, BarChart2 } from "lucide-react";
import { cn } from "@/lib/utils";

const SUPPORTED_BANKS = ["AUTO", "SBI", "HDFC", "ICICI", "AXIS", "KOTAK", "IOB"];
const BANK_LIST = SUPPORTED_BANKS;

const BANK_ACCENTS: Record<string, { color: string; glow: string; label: string }> = {
    AUTO:  { color: '#00c2cb', glow: 'rgba(0,194,203,0.15)',  label: 'Auto-Detect Institution' },
    SBI:   { color: '#22409a', glow: 'rgba(34,64,154,0.15)',  label: 'State Bank of India' },
    HDFC:  { color: '#004c97', glow: 'rgba(0,76,151,0.15)',   label: 'HDFC Bank Ltd.' },
    ICICI: { color: '#0e7490', glow: 'rgba(14,116,144,0.15)', label: 'ICICI Bank Ltd.' },
    AXIS:  { color: '#800020', glow: 'rgba(128,0,32,0.15)',   label: 'Axis Bank Ltd.' },
    KOTAK: { color: '#d0272d', glow: 'rgba(208,39,45,0.15)',  label: 'Kotak Mahindra Bank' },
    IOB:   { color: '#1a6b3c', glow: 'rgba(26,107,60,0.15)',  label: 'Indian Overseas Bank' },
};

// ── Bank Logos ──────────────────────────────────────────────────────────────
const BANK_LOGOS: Record<string, React.ReactNode> = {
    AUTO: (
        <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
            <circle cx="20" cy="20" r="18" fill="#00c2cb" opacity="0.15"/>
            <path d="M20 10 L28 30 H24 L20 20 L16 30 H12 Z" fill="#00c2cb"/>
            <text x="20" y="34" textAnchor="middle" fontSize="5" fontWeight="900" fill="#00c2cb">AUTO</text>
        </svg>
    ),
    SBI: (
        <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
            <circle cx="15" cy="20" r="12" fill="#22b5ea"/>
            <circle cx="15" cy="18" r="4" fill="white"/>
            <rect x="13.5" y="20" width="3" height="8" rx="1" fill="white"/>
            <text x="32" y="21" textAnchor="middle" dominantBaseline="middle"
                fontFamily="Arial Black, sans-serif" fontWeight="900" fontSize="10" fill="#22409a">SBI</text>
        </svg>
    ),
    HDFC: (
        <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
            <rect x="15" y="12" width="22" height="16" rx="2" fill="#004c97"/>
            <text x="26" y="21" textAnchor="middle" dominantBaseline="middle"
                fontFamily="Arial Black, sans-serif" fontWeight="900" fontSize="7" fill="white">HDFC</text>
            <rect x="3" y="12" width="10" height="16" rx="2" fill="white" stroke="#e8ecf4" strokeWidth="0.5"/>
            <path d="M4 14 H6 V16" stroke="#e0302b" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
            <path d="M12 14 H10 V16" stroke="#e0302b" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
            <rect x="6" y="17" width="4" height="6" rx="1" fill="#004c97"/>
        </svg>
    ),
    ICICI: (
        <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
            <ellipse cx="10" cy="22" rx="8" ry="10" fill="#f5a623" transform="rotate(-15 10 22)"/>
            <ellipse cx="11" cy="21" rx="6" ry="8" fill="#c0392b" transform="rotate(-15 11 21)"/>
            <circle cx="12" cy="17" r="1.5" fill="white"/>
            <rect x="10.5" y="20" width="3" height="6" rx="1.5" fill="white"/>
            <text x="28" y="21" textAnchor="middle" dominantBaseline="middle"
                fontFamily="Arial Black, sans-serif" fontWeight="900" fontSize="7.5" fill="#0e7490">ICICI</text>
        </svg>
    ),
    AXIS: (
        <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
            <path d="M4 30 L10 12 L16 30" stroke="#800020" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            <path d="M13 26 L18 26 L16 30 L11 30 Z" fill="#800020"/>
            <line x1="7" y1="24" x2="13" y2="24" stroke="#800020" strokeWidth="2.5" strokeLinecap="round"/>
            <text x="28" y="21" textAnchor="middle" dominantBaseline="middle"
                fontFamily="Arial Black, sans-serif" fontWeight="900" fontSize="8" fill="#800020">AXIS</text>
        </svg>
    ),
    KOTAK: (
        <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
            <circle cx="12" cy="18" r="11" fill="#003087"/>
            <path d="M8 18 C8 16 10 15 11 16 C12 17 12 19 14 19 C16 19 17 18 17 18" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none"/>
            <path d="M7 21 C9 24 15 24 17 21" stroke="#d0272d" strokeWidth="2" strokeLinecap="round" fill="none"/>
            <text x="30" y="21" textAnchor="middle" dominantBaseline="middle"
                fontFamily="Arial Black, sans-serif" fontWeight="900" fontSize="7" fill="#d0272d">KOTAK</text>
        </svg>
    ),
    IOB: (
        <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
            <rect width="40" height="40" rx="6" fill="#1a6b3c" opacity="0.1"/>
            <circle cx="20" cy="18" r="10" stroke="#1a6b3c" strokeWidth="2" fill="none"/>
            <ellipse cx="20" cy="18" rx="4" ry="10" stroke="#1a6b3c" strokeWidth="1.5" fill="none"/>
            <line x1="10" y1="18" x2="30" y2="18" stroke="#1a6b3c" strokeWidth="1.5"/>
            <text x="20" y="34" textAnchor="middle" fontSize="6.5" fontWeight="900" fill="#1a6b3c">IOB</text>
        </svg>
    ),
};


export function FinanceModule() {
    const [selectedBank, setSelectedBank] = useState("AUTO");
    const [showBankDropdown, setShowBankDropdown] = useState(false);

    const {
        isProcessing,
        currentStage,
        result,
        imageUrl,
        processDocument,
        reset,
        setMasterTemplate,
        deleteMasterTemplate,
        getMasterStatus
    } = useForensicAnalysis();

    const handleUpload = (file: File) => {
        processDocument(file, selectedBank, "finance");
    };

    const hasResult = !!result.verdict;
    const accent = BANK_ACCENTS[selectedBank] || BANK_ACCENTS.AUTO;

    return (
        <div className="space-y-6">
            <AnimatePresence mode="wait">
                {/* ── UPLOAD STATE ── */}
                {!hasResult && !isProcessing && (
                    <motion.div
                        key="upload"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="max-w-4xl mx-auto py-8"
                    >
                        {/* Hero Header */}
                        <div className="text-center mb-12">
                            <div className="relative inline-flex mb-8">
                                <div className="w-24 h-24 rounded-3xl flex items-center justify-center border shadow-[0_0_40px_rgba(0,0,0,0.3)] transition-all duration-500"
                                    style={{
                                        backgroundColor: accent.color + '15',
                                        borderColor: accent.color + '40',
                                        boxShadow: `0 0 40px ${accent.glow}`
                                    }}>
                                    <Landmark className="w-12 h-12 transition-colors" style={{ color: accent.color }} />
                                </div>
                                <div className="absolute inset-0 rounded-3xl border animate-ping" style={{ borderColor: accent.color + '20', animationDuration: '3s' }} />
                            </div>
                            <h1 className="text-4xl font-black uppercase tracking-tighter text-white mb-3">
                                Financial Audit
                            </h1>
                            <p className="text-[#4a5568] max-w-lg mx-auto font-medium leading-relaxed">
                                Upload bank statements for automated forensic integrity verification, transaction cross-referencing, and structural pattern analysis.
                            </p>
                        </div>

                        {/* Bank Selection */}
                        <div className="max-w-md mx-auto mb-8 relative">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#4a5568] mb-3 block text-center">
                                Target Institution Profile
                            </label>
                            <button
                                onClick={() => setShowBankDropdown(!showBankDropdown)}
                                className="w-full flex items-center justify-between px-6 py-4 bg-[#10131c] rounded-2xl hover:opacity-80 transition-all group shadow-xl"
                                style={{
                                    borderWidth: '1px',
                                    borderStyle: 'solid',
                                    borderColor: accent.color + '40'
                                }}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 p-1"
                                        style={{ backgroundColor: accent.color + '15', borderWidth: '1px', borderStyle: 'solid', borderColor: accent.color + '40' }}>
                                        {BANK_LOGOS[selectedBank]}
                                    </div>
                                    <div className="text-left">
                                        <p className="text-sm font-black text-white">{selectedBank === 'AUTO' ? 'Auto Detect' : selectedBank}</p>
                                        <p className="text-[9px] text-[#4a5568] font-medium uppercase tracking-widest">{accent.label}</p>
                                    </div>
                                </div>
                                <ChevronDown className={cn("w-5 h-5 text-[#4a5568] transition-transform duration-300", showBankDropdown && "rotate-180")} />
                            </button>

                            <AnimatePresence>
                                {showBankDropdown && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.96 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.96 }}
                                        className="absolute top-full left-0 right-0 mt-3 bg-[#10131c] border border-[#1e2535] rounded-2xl shadow-2xl z-50 overflow-hidden"
                                    >
                                        {/* 4-col grid — 7 institutions, uniform card height, optimized spacing */}
                                        <div className="p-5 grid grid-cols-4 gap-4">
                                            {BANK_LIST.map(bank => {
                                                const b = BANK_ACCENTS[bank];
                                                const isSelected = selectedBank === bank;
                                                return (
                                                    <button
                                                        key={bank}
                                                        onClick={() => { setSelectedBank(bank); setShowBankDropdown(false); }}
                                                        className="relative flex flex-col items-center justify-center gap-3 rounded-2xl transition-all duration-300 overflow-hidden group"
                                                        style={{
                                                            height: 100,
                                                            borderWidth: '1.5px',
                                                            borderStyle: 'solid',
                                                            borderColor: isSelected ? b.color + '80' : '#1e2535',
                                                            backgroundColor: isSelected ? b.color + '12' : '#0d1117',
                                                            padding: '12px 6px',
                                                        }}
                                                    >
                                                        {/* Dynamic background glow */}
                                                        <div
                                                            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                                            style={{ background: `radial-gradient(circle at center, ${b.color}08 0%, transparent 70%)` }}
                                                        />
                                                        
                                                        {/* Checkmark badge */}
                                                        {isSelected && (
                                                            <div
                                                                className="absolute top-2 right-2 w-4 h-4 rounded-full flex items-center justify-center z-10 shadow-lg"
                                                                style={{ backgroundColor: b.color }}
                                                            >
                                                                <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                                                                    <path d="M1.5 4L3 5.5L6.5 2" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                                </svg>
                                                            </div>
                                                        )}

                                                        {/* Professional Logo Container */}
                                                        <div className="w-12 h-12 flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110">
                                                            {BANK_LOGOS[bank]}
                                                        </div>

                                                        {/* Institution Label */}
                                                        <p
                                                            className="text-[10px] font-black uppercase tracking-[0.15em] leading-none text-center w-full truncate px-1"
                                                            style={{ color: isSelected ? b.color : '#64748b' }}
                                                        >
                                                            {bank === 'AUTO' ? 'Auto-Detect' : bank}
                                                        </p>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>


                        {/* Upload Zone */}
                        <div className="relative">
                            <div className="absolute inset-0 rounded-3xl pointer-events-none" style={{ background: `radial-gradient(ellipse at center, ${accent.glow} 0%, transparent 70%)` }} />
                            <DocumentUpload
                                onFileSelect={handleUpload}
                                isProcessing={isProcessing}
                                activeBank={selectedBank}
                                onSetMaster={(file) => setMasterTemplate(file, selectedBank)}
                                onDeleteMaster={(bank) => deleteMasterTemplate(bank)}
                                getMasterStatus={(bank) => getMasterStatus(bank)}
                            />
                        </div>

                        {/* Capability Strips */}
                        <div className="grid grid-cols-3 gap-4 mt-8">
                            {[
                                { icon: <Database className="w-4 h-4" />, label: 'Transaction Check', desc: 'Line-item validation & crossref', color: accent.color },
                                { icon: <Zap className="w-4 h-4" />,      label: 'Structure Analysis', desc: 'Institutional template matching', color: '#0088ff' },
                                { icon: <BarChart2 className="w-4 h-4" />,label: 'Integrity Score', desc: 'Multi-factor confidence rating', color: '#00c853' },
                            ].map(item => (
                                <div key={item.label} className="flex items-center gap-3 p-4 bg-[#10131c]/50 border border-[#1e2535] rounded-2xl">
                                    <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: item.color + '15', color: item.color, border: `1px solid ${item.color}30` }}>
                                        {item.icon}
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-[#e8ecf4]">{item.label}</p>
                                        <p className="text-[9px] text-[#4a5568] font-medium">{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* ── PROCESSING STATE ── */}
                {isProcessing && (
                    <motion.div
                        key="processing"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="max-w-2xl mx-auto py-16 space-y-10"
                    >
                        {/* Animated Pipeline Visual */}
                        <div className="flex flex-col items-center gap-6">
                            <div className="relative w-32 h-32">
                                <div className="absolute inset-0 rounded-full border-2 animate-spin" style={{ borderColor: accent.color + '20', animationDuration: '8s' }} />
                                <div className="absolute inset-4 rounded-full border animate-spin" style={{ borderColor: accent.color + '40', animationDuration: '4s', animationDirection: 'reverse' }} />
                                <div className="absolute inset-8 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(0,0,0,0.5)]"
                                    style={{ backgroundColor: accent.color + '10', borderColor: accent.color + '60', border: '1px solid', boxShadow: `0 0 30px ${accent.glow}` }}>
                                    <Landmark className="w-8 h-8 animate-pulse" style={{ color: accent.color }} />
                                </div>
                            </div>
                            <div className="text-center space-y-1">
                                <h3 className="text-xl font-black uppercase tracking-tight text-white">Financial Audit Engine</h3>
                                <p className="text-[10px] text-[#4a5568] uppercase tracking-[0.3em] font-black">Reconciling transaction logic</p>
                            </div>
                        </div>

                        <PipelineStatus currentStage={currentStage} />

                        {/* Live Detail Steps */}
                        <div className="space-y-3">
                            {['Document Structure Scan', 'OCR Field Extraction', 'Institution Template Match', 'Integrity Score Calculation'].map((step, i) => (
                                <div key={step} className="flex items-center gap-3 p-3 bg-[#10131c]/50 border border-[#1e2535] rounded-xl">
                                    <div className="w-5 h-5 rounded-full border flex items-center justify-center shrink-0" style={{ borderColor: accent.color + '30' }}>
                                        <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: accent.color, animationDelay: `${i * 0.3}s` }} />
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-[#4a5568]">{step}</span>
                                    <RefreshCw className="w-3 h-3 ml-auto animate-spin" style={{ color: accent.color, animationDuration: `${2 + i}s` }} />
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* ── RESULT STATE ── */}
                {hasResult && !isProcessing && (
                    <motion.div
                        key="result"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="grid grid-cols-1 xl:grid-cols-12 gap-8"
                    >
                        {/* Left: Document Viewer */}
                        <div className="xl:col-span-8 space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: accent.color }} />
                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-[#4a5568]">Original Financial Instrument</h3>
                                </div>
                                <button
                                    onClick={reset}
                                    className="flex items-center gap-2 px-4 py-2 bg-[#1e2535] hover:bg-[#2d3748] border border-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest text-[#c8d0e0] transition-all"
                                >
                                    <RefreshCw className="w-3 h-3" />
                                    New Analysis
                                </button>
                            </div>

                            {/* Verdict banner with bank accent */}
                            <div className="flex items-center gap-3 px-6 py-3 rounded-2xl border" style={{
                                backgroundColor: accent.color + '10',
                                borderColor: accent.color + '30',
                                color: accent.color
                            }}>
                                <CheckCircle2 className="w-5 h-5" />
                                <span className="text-xs font-black uppercase tracking-widest">
                                    {selectedBank} Statement — Forensic Verdict: {result.verdict}
                                </span>
                            </div>

                            <div className="sticky top-24">
                                <DocumentPreview
                                    imageUrl={imageUrl || ""}
                                    isScanning={isProcessing}
                                    isPdf={result.isPdf}
                                    pageUrls={result.viewUrls}
                                    verdict={result.verdict}
                                    scores={result.scores}
                                />
                            </div>
                        </div>

                        {/* Right: Forensic Intelligence */}
                        <div className="xl:col-span-4">
                            <AnalysisSidebar
                                result={result}
                                isProcessing={isProcessing}
                                documentType={result.documentType || "BANK_STATEMENT"}
                                selectedBank={selectedBank}
                                analysisMode="finance"
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
