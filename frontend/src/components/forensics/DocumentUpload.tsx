import { useState, useCallback, useEffect } from "react";
import { Upload, FileText, X, Scan, Landmark } from "lucide-react";
import { cn } from "@/lib/utils";

interface DocumentUploadProps {
    onFileSelect: (file: File) => void;
    onFolderSelect?: (files: File[]) => void;
    onSetMaster?: (file: File) => void;
    onDeleteMaster?: (bankName: string) => void;
    getMasterStatus?: (bankName: string) => Promise<any>;
    isProcessing: boolean;
    activeBank: string;
}

export function DocumentUpload({
    onFileSelect,
    onFolderSelect,
    onSetMaster,
    onDeleteMaster,
    getMasterStatus,
    isProcessing,
    activeBank
}: DocumentUploadProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isFolderUpload, setIsFolderUpload] = useState(false);
    const [mode, setMode] = useState<"standard" | "master" | "manage" | "confirm_master">("standard");
    const [pendingMasterFile, setPendingMasterFile] = useState<File | null>(null);
    const [masterInfo, setMasterInfo] = useState<{ exists: boolean, filename?: string } | null>(null);
    const [isLoadingMaster, setIsLoadingMaster] = useState(false);

    // A bank is "specific" if it's selected and not the AUTO selection
    const isSpecificBank = activeBank && activeBank !== "AUTO";

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const files = Array.from(e.dataTransfer.files);

        if (mode === "master") {
            if (files[0]) {
                setPendingMasterFile(files[0]);
                setMode("confirm_master");
            }
            return;
        }

        if (files.length > 1) {
            setIsFolderUpload(true);
            onFolderSelect?.(files);
        } else if (files[0]) {
            const file = files[0];
            if (file.type.startsWith("image/") || file.type === "application/pdf") {
                setSelectedFile(file);
                onFileSelect(file);
            }
        }
    }, [onFileSelect, onFolderSelect, onSetMaster, mode]);

    const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (mode === "master") {
                setPendingMasterFile(file);
                setMode("confirm_master");
                return;
            }
            setSelectedFile(file);
            onFileSelect(file);
        }
    }, [onFileSelect, onSetMaster, mode]);

    const handleFolderInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []).filter(f =>
            f.type.startsWith("image/") || f.type === "application/pdf"
        );
        if (files.length > 0) {
            setIsFolderUpload(true);
            setSelectedFile(null);
            onFolderSelect?.(files);
        }
        // Reset so the same folder can be re-selected
        e.target.value = "";
    }, [onFolderSelect]);

    const clearFile = useCallback(() => {
        setSelectedFile(null);
        setIsFolderUpload(false);
    }, []);

    const fetchMasterStatus = useCallback(async () => {
        if (isSpecificBank && getMasterStatus) {
            setIsLoadingMaster(true);
            const status = await getMasterStatus(activeBank);
            setMasterInfo(status);
            setIsLoadingMaster(false);
        }
    }, [isSpecificBank, activeBank, getMasterStatus]);

    useEffect(() => {
        setMode("standard");
        setMasterInfo(null);
        if (isSpecificBank) {
            fetchMasterStatus();
        }
    }, [activeBank, isSpecificBank, fetchMasterStatus]);

    const handleMasterDelete = async () => {
        if (window.confirm(`Are you sure you want to delete the ${activeBank} Master Template? Verifications will return to standard logic.`)) {
            await onDeleteMaster?.(activeBank);
            fetchMasterStatus();
            setMode("standard");
        }
    };

    const handleMasterSet = async (file: File) => {
        await onSetMaster?.(file);
        fetchMasterStatus();
        setMode("manage");
    };

    const isBankSelected = activeBank && activeBank !== "AUTO";

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
                <button
                    onClick={() => setMode("standard")}
                    className={cn(
                        "px-3 py-1 text-[10px] font-bold rounded-md transition-all uppercase tracking-widest",
                        mode === "standard" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
                    )}
                >
                    Verify Document
                </button>
                {isSpecificBank && (
                    <button
                        onClick={() => setMode(masterInfo?.exists ? "manage" : "master")}
                        className={cn(
                            "px-3 py-1 text-[10px] font-bold rounded-md transition-all uppercase tracking-widest flex items-center gap-1.5",
                            (mode === "master" || mode === "manage") ? "bg-amber-500 text-white shadow-lg shadow-amber-500/20" : "bg-secondary text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <Landmark className="w-3 h-3" />
                        Master Reference {masterInfo?.exists ? "(Active)" : ""}
                    </button>
                )}
            </div>

            {mode === "manage" && masterInfo?.exists && (
                <div className="border border-amber-500/30 rounded-xl p-4 bg-amber-500/5 animate-in zoom-in-95">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
                                <Landmark className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-foreground">{activeBank} Master Reference</h3>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Permanent Standard Active</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setMode("master")}
                                className="p-2 rounded-lg hover:bg-amber-500/20 text-amber-500 transition-colors"
                                title="Replace Master"
                            >
                                <Scan className="w-4 h-4" />
                            </button>
                            <button
                                onClick={handleMasterDelete}
                                className="p-2 rounded-lg hover:bg-destructive/20 text-destructive transition-colors"
                                title="Delete Master"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <div className="bg-secondary/40 rounded-lg p-3 border border-border/50">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-muted-foreground" />
                                <span className="text-xs font-medium text-foreground truncate max-w-[200px]">{masterInfo.filename}</span>
                            </div>
                            <a
                                href={`http://127.0.0.1:8000/api/v1/documents/master/${activeBank}/download?t=${Date.now()}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] font-bold text-primary hover:underline"
                            >
                                VIEW MASTER
                            </a>
                        </div>
                    </div>

                    <p className="text-[9px] text-muted-foreground mt-3 leading-tight">
                        Every {activeBank} statement uploaded will be automatically verified against this master template structure.
                    </p>
                </div>
            )}

            {mode === "confirm_master" && pendingMasterFile && (
                <div className="border-2 border-amber-500 rounded-xl p-5 bg-amber-500/10 animate-in zoom-in-95 shadow-2xl shadow-amber-500/20">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 rounded-xl bg-amber-500 text-white shadow-lg">
                            <Landmark className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-foreground uppercase tracking-tight">Confirm Reference Document</h3>
                            <p className="text-[10px] text-amber-600 font-bold uppercase tracking-widest">Master Template for {activeBank}</p>
                        </div>
                    </div>

                    <div className="bg-background/60 rounded-lg p-3 border border-amber-500/30 mb-5">
                        <div className="flex items-center gap-3">
                            <FileText className="w-5 h-5 text-amber-500" />
                            <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold truncate text-foreground">{pendingMasterFile.name}</p>
                                <p className="text-[9px] text-muted-foreground uppercase">{(pendingMasterFile.size / 1024).toFixed(1)} KB • Reference Standard</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={() => handleMasterSet(pendingMasterFile)}
                            className="flex-1 bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-black py-2.5 rounded-lg transition-all uppercase tracking-widest shadow-lg shadow-amber-500/30"
                        >
                            Confirm as Master
                        </button>
                        <button
                            onClick={() => {
                                setPendingMasterFile(null);
                                setMode("master");
                            }}
                            className="px-4 bg-secondary text-muted-foreground hover:text-foreground text-[10px] font-bold py-2.5 rounded-lg transition-all uppercase tracking-widest"
                        >
                            Cancel
                        </button>
                    </div>

                    <p className="text-[9px] text-muted-foreground mt-4 text-center leading-tight">
                        By confirming, this document will become the structural gold standard for all future {activeBank} statement verifications.
                    </p>
                </div>
            )}

            {mode !== "manage" && mode !== "confirm_master" && !selectedFile && !isFolderUpload ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Single Upload */}
                    <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={cn(
                            "relative border-2 border-dashed rounded-xl p-6 transition-all duration-300 cursor-pointer group shadow-inner",
                            isDragging
                                ? "border-primary bg-primary/10 ring-4 ring-primary/5"
                                : mode === "master"
                                    ? "border-amber-500/40 bg-amber-500/5 hover:border-amber-500 hover:bg-amber-500/10"
                                    : "border-primary/20 bg-secondary/40 hover:border-primary/50 hover:bg-secondary/60 hover:shadow-primary/5"
                        )}
                    >
                        <input
                            type="file"
                            accept="image/*,.pdf"
                            onChange={handleFileInput}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <div className="flex flex-col items-center gap-2 text-center">
                            <div className={cn(
                                "w-12 h-12 rounded-xl flex items-center justify-center bg-secondary group-hover:bg-primary/10 transition-colors",
                                mode === "master" && "bg-amber-500/10 group-hover:bg-amber-500/20"
                            )}>
                                {mode === "master" ? (
                                    <Landmark className="w-6 h-6 text-amber-500" />
                                ) : (
                                    <FileText className="w-6 h-6 text-muted-foreground group-hover:text-primary" />
                                )}
                            </div>
                            <div>
                                <p className="font-bold text-sm text-foreground">
                                    {mode === "master" ? `Upload ${activeBank} Master` : "Single Document"}
                                </p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                    {mode === "master" ? "This will be the reference standard" : "Drag & drop or click"}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Folder Upload */}
                    <div
                        className={cn(
                            "relative border-2 border-dashed rounded-xl p-6 transition-all duration-300 cursor-pointer group shadow-inner",
                            !isBankSelected || mode === "master"
                                ? "opacity-50 cursor-not-allowed border-muted-foreground/20 bg-muted/20"
                                : "border-primary/20 bg-secondary/40 hover:border-primary/50 hover:bg-secondary/60"
                        )}
                    >
                        {isBankSelected && mode !== "master" && (
                            <input
                                type="file"
                                multiple
                                {...({ webkitdirectory: "true", directory: "true" } as any)}
                                onChange={handleFolderInput}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                accept=".pdf,image/*"
                            />
                        )}
                        <div className="flex flex-col items-center gap-2 text-center">
                            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-secondary group-hover:bg-primary/10">
                                <Upload className="w-6 h-6 text-muted-foreground group-hover:text-primary" />
                            </div>
                            <div>
                                <p className="font-bold text-sm text-foreground">Upload Folder</p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                    {mode === "master"
                                        ? "Folder upload disabled for Master"
                                        : isBankSelected ? "Select folder with many files" : "Select a bank template first"}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (selectedFile && !isFolderUpload) ? (
                /* Single File View */
                <div className="border border-border border-l-4 border-l-primary rounded-xl p-4 bg-secondary/20 animate-in slide-in-from-right-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={cn(
                                "w-12 h-12 rounded-lg flex items-center justify-center",
                                isProcessing ? "bg-primary/20 animate-pulse" : "bg-secondary"
                            )}>
                                {isProcessing ? (
                                    <Scan className="w-6 h-6 text-primary" />
                                ) : (
                                    <FileText className="w-6 h-6 text-muted-foreground" />
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-sm break-all leading-tight text-foreground">{selectedFile?.name}</p>
                                <p className="text-[10px] font-medium text-muted-foreground mt-0.5 uppercase tracking-wider">
                                    {(selectedFile!.size / 1024).toFixed(1)} KB • PROCESSING SINGLE
                                </p>
                            </div>
                        </div>
                        {!isProcessing && (
                            <button onClick={clearFile} className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground">
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
                <div className="px-2.5 py-1 text-[10px] font-bold rounded-md bg-primary/10 text-primary border border-primary/20 uppercase tracking-widest flex items-center gap-1.5">
                    <Landmark className="w-3 h-3" />
                    Active: {activeBank}
                </div>
            </div>
        </div>
    );
}
