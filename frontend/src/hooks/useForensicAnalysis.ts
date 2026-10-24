import { useState, useCallback } from "react";
import { PipelineStage } from "@/components/forensics/PipelineStatus";
import { AnalysisResult, BoundingBox, FraudIndicator, BoxFinding } from "@/data/documents/types";
import { toast } from "sonner";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const fetchWithRetry = async (url: string, options: any, retries = 7, backoff = 1500): Promise<Response> => {
    try {
        const response = await fetch(url, options);
        // Also retry on 5xx errors which indicate temporary server struggle
        if (!response.ok && response.status >= 500) {
            throw new Error(`Server Error: ${response.status}`);
        }
        return response;
    } catch (err: any) {
        if (retries > 0) {
            const skipRetry = err.message?.includes("401") || err.message?.includes("403");
            if (!skipRetry) {
                console.log(`Fetch attempt failed: ${err.message}. Retrying in ${backoff}ms... (${retries} left)`);
                await sleep(backoff);
                return fetchWithRetry(url, options, retries - 1, backoff * 2);
            }
        }
        throw err;
    }
};

export interface BatchItem {
    id: string;
    file: File;
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'invalid';
    progress: number;
    result: AnalysisResult | null;
    error?: string;
}

export interface BatchSummary {
    total: number;
    processed: number;
    genuine: number;
    suspicious: number;
    fraudulent: number;
    invalid: number;
    avgScore: number;
}

export function useForensicAnalysis() {
    const [isProcessing, setIsProcessing] = useState(false);
    const [currentStage, setCurrentStage] = useState<PipelineStage>("idle");
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [result, setResult] = useState<AnalysisResult>({
        verdict: null,
        reasons: [],
        documentType: null,
        extractedData: null,
        boundingBoxes: [],
        fraudIndicators: [],
        boxFindings: [],
        isPdf: false,
        viewUrls: [],
        checkpoints: [],
    });

    const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
    const [isBatchMode, setIsBatchMode] = useState(false);

    const processSingleFile = async (file: File, bankName?: string, batchId?: string, mode: "identity" | "finance" | "vehicle" = "identity"): Promise<AnalysisResult> => {
        // Create preview URL (only for non-batch or first item)
        if (!batchId) {
            const url = URL.createObjectURL(file);
            setImageUrl(url);
        }

        const formData = new FormData();
        formData.append("file", file);
        if (bankName && bankName !== "AUTO") {
            formData.append("bank_name", bankName);
        }

        const token = localStorage.getItem("token");
        const headers: Record<string, string> = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const uploadRes = await fetchWithRetry("http://127.0.0.1:8000/api/v1/documents/upload", {
            method: "POST",
            body: formData,
            headers: headers
        });

        if (!uploadRes.ok) {
            const errorData = await uploadRes.json().catch(() => ({}));
            throw new Error(errorData.detail || "Upload failed");
        }

        const uploadData = await uploadRes.json();
        const documentId = uploadData.id;

        // VEHICLE MODE: Independent Immediate Pipeline
        if (mode === "vehicle") {
            const vFormData = new FormData();
            vFormData.append("file", file);

            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error("Processing timeout")), 15000);
            });

            let vData: any;
            try {
                const vRes = await Promise.race([
                    fetchWithRetry("http://127.0.0.1:8000/api/v1/vehicle/upload", {
                        method: "POST",
                        body: vFormData,
                        headers: headers
                    }),
                    timeoutPromise
                ]) as Response;

                if (!vRes.ok) throw new Error("Vehicle analysis failed");
                vData = await vRes.json();
            } catch (err: any) {
                console.error("VEHICLE_FAILSAFE:", err);
                vData = {
                    final_result: "IRRELEVANT DOCUMENT",
                    result: err.message === "Processing timeout" ? "Processing timeout" : "Analysis failed unexpectedly",
                    chassis_number: null,
                    registration_number: null,
                    checkpoints: { "failsafe": "TRIGGERED" },
                    text_source: "FAILSAFE",
                    ocr_text_length: 0,
                    ocr_text_preview: err.message,
                    ocr_lines_preview: [],
                    detected_labels: [],
                    candidates: []
                };
            }

            const vResult: AnalysisResult = {
                verdict: (vData.final_result || vData.result) as any,
                reasons: [vData.result],
                documentType: "VEHICLE_DOC" as any,
                extractedData: {
                    chassis_number: vData.chassis_number || "",
                    registration_number: vData.registration_number || "",
                    chassis_detected: vData.chassis_number ? "true" : "false",
                    registration_detected: vData.registration_number ? "true" : "false",
                    ocr_text_length: String(vData.ocr_text_length || 0),
                    ocr_text_preview: vData.ocr_text_preview || "",
                    ocr_preview: vData.ocr_preview || "",
                    image_generated: vData.image_generated ? "true" : "false",
                    image_resolution: vData.image_resolution || "N/A",
                    text_source: vData.text_source || "PDF",
                    checkpoints: vData.checkpoints || {},
                    ocr_lines: vData.ocr_lines_preview || [],
                    detected_labels: vData.detected_labels || [],
                    all_candidates: vData.candidates || []
                },
                scores: { authenticity_score: 100, mathematical_integrity: 100, pdf_authenticity: 100, layout_anomaly: 100, forgery_probability: 0 },
                boundingBoxes: [],
                fraudIndicators: [],
                boxFindings: [],
                viewUrls: [],
                checkpoints: [],
                isPdf: file.type === 'application/pdf',
                ocrText: ""
            };

            if (batchId) {
                setBatchItems(prev => prev.map(item =>
                    item.id === batchId ? { ...item, status: 'completed', progress: 100, result: vResult } : item
                ));
            }
            return vResult;
        }

        // Poll for results (Identity/Finance)
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 90;
            const API_BASE = "http://127.0.0.1:8000";

            const pollInterval = setInterval(async () => {
                try {
                    attempts++;
                    const pollRes = await fetchWithRetry(`${API_BASE}/api/v1/documents/${documentId}?t=${Date.now()}`, {
                        headers: headers
                    });

                    if (!pollRes.ok) throw new Error(`Server responded with ${pollRes.status}`);

                    const data = await pollRes.json();

                    if (data.status === 'COMPLETED') {
                        clearInterval(pollInterval);

                        const forensic = data.forensic_results?.final_decision || {};
                        const anomalies = data.forensic_results?.anomalies || [];
                        const symbolResults = data.symbol_results || [];
                        const sanitizeUrl = (url: string | null) => {
                            if (!url) return null;
                            if (url.startsWith("http")) return url;
                            return `${API_BASE}${url.startsWith("/") ? "" : "/"}${url}`;
                        };

                        const analysisResult: AnalysisResult = {
                            verdict: forensic.status as any || data.verdict as any || "VERIFIED",
                            reasons: forensic.reasons || [data.reason || "Analysis completed"],

                            // Fix 1 — Force correct documentType, auto-detect PAN from OCR
                            documentType: (() => {
                                const raw = (data.document_type || "").toUpperCase();
                                if (raw.includes("PAN")) return "PAN_CARD" as any;
                                if (raw.includes("AADHAAR")) return "AADHAAR" as any;
                                const ocrText = JSON.stringify(data.ocr_results || {}).toUpperCase();
                                if (ocrText.includes("INCOME TAX") || ocrText.includes("PERMANENT ACCOUNT"))
                                    return "PAN_CARD" as any;
                                return (data.document_type || "PAN_CARD") as any;
                            })(),

                            // v7.0 — PAN extracted fields with multiple fallbacks
                            extractedData: (() => {
                                const fd = forensic || {};
                                // v7.0: extracted_data is the canonical field
                                const ef = data.forensic_results?.final_decision?.extracted_fields ?? {};
                                const ed = data.forensic_results?.final_decision?.extracted_data ?? {};
                                const ex = fd.extracted_data ?? {};
                                const ocr = data.ocr_results?.extracted_data ?? {};
                                const raw = data.ocr_results?.text || "";
                                const panMatch = raw.match(/[A-Z]{5}[0-9]{4}[A-Z]{1}/);
                                const dobMatch = raw.match(/\d{2}\/\d{2}\/\d{4}/);
                                const isIdentity =
                                    (data.document_type || "").toUpperCase().includes("PAN") ||
                                    (data.document_type || "").toUpperCase().includes("AADHAAR") ||
                                    JSON.stringify(data.ocr_results || {}).toUpperCase().includes("INCOME TAX");
                                if (isIdentity) {
                                    return {
                                        document_type: "PAN Card",
                                        pan_number: ed.pan_number || ef.pan_number || ex.pan_number || ocr.pan_number || panMatch?.[0] || null,
                                        full_name: ed.full_name || ef.full_name || ex.name || fd.name || ocr.name || null,
                                        father_name: ed.father_name || ef.father_name || ex.father_name || ocr.father_name || null,
                                        date_of_birth: ed.date_of_birth || ef.date_of_birth || ex.dob || fd.dob || ocr.dob || dobMatch?.[0] || null,
                                        income_tax_header: ed.income_tax_header || ef.income_tax_header || null,
                                        photo_detected: ed.photo_detected || ef.photo_detected || null,
                                        signature_detected: ed.signature_detected || ef.signature_detected || null,
                                        emblem_detected: ed.emblem_detected || ef.emblem_detected || null,
                                        qr_detected: ed.qr_detected || ef.qr_detected || (data.forensic_results?.qr_detected ? "YES" : "NO"),
                                    };
                                }
                                return forensic["Extracted Text"] || data.ocr_results?.extracted_data || null;
                            })(),
                            scores: {
                                authenticity_score: data.forensic_results?.final_decision?.scores || data.confidence_score || 0,
                                mathematical_integrity: 100,
                                pdf_authenticity: 100,
                                layout_anomaly: 100,
                                forgery_probability: 0,
                            },
                            boundingBoxes: [],
                            // PAN v5.0 checkpoints — raw array for signal LED display
                            panCheckpoints: data.forensic_results?.final_decision?.checkpoints || [],

                            // Checkpoint mapping for fraudIndicators (legacy signal system)
                            fraudIndicators: (() => {
                                const checkpoints = data.forensic_results?.final_decision?.checkpoints || [];
                                const fraudFlags = data.forensic_results?.final_decision?.["Fraud Indicators"] || [];
                                // v6.0 category IDs (by position 1-7)
                                const indexToCategory: Record<number, string> = {
                                    0: "ITHEAD", 1: "PANFMT", 2: "IDFIELDS",
                                    3: "PHOTO", 4: "SIGNATURE", 5: "EMBLEM", 6: "QRCHK",
                                };
                                if (checkpoints.length > 0) {
                                    return checkpoints.map((cp: any, idx: number) => {
                                        // v7.0: result=PASS/FAIL, signal=GREEN/RED
                                        const isPassed = cp.result === "PASS" || cp.signal === "GREEN" ||
                                            cp.signal === "PASS" || cp.status === "pass" || cp.status === "VALID";
                                        const cpId = cp.id || (idx + 1);
                                        const mappedCategory = indexToCategory[idx] || "ITHEAD";
                                        return {
                                            id: String(cpId),
                                            type: (isPassed ? 'success' : 'critical') as any,
                                            label: cp.checkpoint || cp.name || `Checkpoint ${idx + 1}`,
                                            description: cp.detail || cp.finding || (isPassed ? "Check passed" : "Check failed"),
                                            category: mappedCategory,
                                            status: isPassed ? "PASSED" : "FAILED",
                                            signal: cp.signal || (isPassed ? "GREEN" : "RED"),
                                        };
                                    });
                                }
                                if (fraudFlags.length > 0) {
                                    return fraudFlags.map((fi: any) => ({
                                        id: fi.label,
                                        type: (fi.status === "FAILED" ? 'critical' : 'success') as any,
                                        label: fi.label,
                                        description: fi.message,
                                        category: fi.category_id,
                                        status: fi.status,
                                    }));
                                }
                                // Fallback — synthesise 7 defaults from verdict
                                const isVerified = ["VERIF", "GENUINE", "REAL"].some(k =>
                                    (forensic.status || data.verdict || "").toUpperCase().includes(k));
                                return ["ITHEAD", "PANFMT", "IDFIELDS", "PHOTO", "SIGNATURE", "EMBLEM", "QRCHK"].map(cat => ({
                                    id: cat, type: (isVerified ? 'success' : 'critical') as any,
                                    label: cat, description: isVerified ? "Check passed" : "Check failed",
                                    category: cat, status: isVerified ? "PASSED" : "FAILED",
                                }));
                            })(),
                            boxFindings: [],
                            isPdf: file.type === 'application/pdf',
                            viewUrls: (data.view_urls || []).map((url: string) => sanitizeUrl(url)).filter((u: any): u is string => u !== null),
                            checkpoints: data.forensic_results?.final_decision?.checkpoints || data.forensic_results?.checkpoints || [],
                            ocrText: data.forensic_results?.ocr_text || data.ocr_results?.text || '',
                            is_checkpoint_based: data.forensic_results?.final_decision?.is_checkpoint_based || false,
                            master_template_used: data.forensic_results?.final_decision?.master_template_used || false,
                            qrLocation: data.forensic_results?.final_decision?.qr_location || data.forensic_results?.qr_location || null,
                            qrDetected: data.forensic_results?.final_decision?.qr_detected ?? data.forensic_results?.qr_detected ?? false,
                            holderType: data.forensic_results?.final_decision?.holder_type || null,
                        };

                        if (batchId) {
                            setBatchItems(prev => prev.map(item =>
                                item.id === batchId
                                    ? { ...item, status: 'completed', progress: 100, result: analysisResult }
                                    : item
                            ));
                        }

                        // NEW: Explicit Toast Notification for Blank/Irrelevant Documents
                        const blankAnomaly = anomalies.find((a: any) => a.type === "BLANK_OR_IRRELEVANT");
                        if (blankAnomaly && !batchId) {
                            toast.error(blankAnomaly.message || "Blank or irrelevant document detected", {
                                duration: 15000,
                            });
                        }

                        resolve(analysisResult);

                    } else if (data.status === 'INVALID_DOCUMENT') {
                        clearInterval(pollInterval);
                        const errorMsg = data.forensic_results?.anomalies?.[0]?.message || "Invalid or irrelevant bank statement uploaded.";
                        if (!batchId) {
                            toast.error(errorMsg, {
                                duration: 15000,
                            });
                        }
                        if (batchId) {
                            setBatchItems(prev => prev.map(item =>
                                item.id === batchId ? { ...item, status: 'invalid', error: errorMsg } : item
                            ));
                            resolve({ verdict: 'INVALID', reasons: [errorMsg], checkpoints: [], scores: { authenticity_score: 0, mathematical_integrity: 0, pdf_authenticity: 0, layout_anomaly: 0, forgery_probability: 100 }, viewUrls: [], boxFindings: [], boundingBoxes: [], fraudIndicators: [], documentType: 'UNKNOWN', extractedData: null } as any);
                        }
                        else {
                            reject(new Error(errorMsg));
                        }
                    } else if (data.status === 'FAILED') {
                        clearInterval(pollInterval);
                        const errorMsg = data.forensic_results?.anomalies?.[0]?.message || "Analysis failed";
                        if (batchId) {
                            setBatchItems(prev => prev.map(item =>
                                item.id === batchId ? { ...item, status: 'failed', error: errorMsg } : item
                            ));
                            resolve({ verdict: 'FAILED', reasons: [errorMsg], checkpoints: [], scores: { authenticity_score: 0, mathematical_integrity: 0, pdf_authenticity: 0, layout_anomaly: 0, forgery_probability: 100 }, viewUrls: [], boxFindings: [], boundingBoxes: [], fraudIndicators: [], documentType: 'UNKNOWN', extractedData: null } as any);
                        } else {
                            reject(new Error(errorMsg));
                        }
                    }

                    if (attempts >= maxAttempts) {
                        clearInterval(pollInterval);
                        reject(new Error("Timeout during analysis"));
                    }
                } catch (err: any) {
                    clearInterval(pollInterval);
                    reject(err);
                }
            }, 2000);
        });
    };

    const processDocument = useCallback(async (file: File, bankName?: string, mode: "identity" | "finance" | "vehicle" = "identity") => {
        setIsProcessing(true);
        setIsBatchMode(false);
        setCurrentStage("preprocessing");

        try {
            const res = await processSingleFile(file, bankName, undefined, mode);
            setResult(res);
            setCurrentStage("verdict");
        } catch (err: any) {
            toast.error(err.message || "Failed to analyze document");
        } finally {
            setIsProcessing(false);
        }
    }, []);

    const processBatch = useCallback(async (files: File[], bankName?: string) => {
        setIsProcessing(true);
        setIsBatchMode(true);
        const newBatchItems: BatchItem[] = files.map(file => ({
            id: Math.random().toString(36).substr(2, 9),
            file,
            status: 'pending',
            progress: 0,
            result: null
        }));
        setBatchItems(newBatchItems);

        // Process sequentially for stability (Step 2 & 9)
        for (const item of newBatchItems) {
            setBatchItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'processing', progress: 10 } : i));
            try {
                await processSingleFile(item.file, bankName, item.id);
            } catch (err) {
                // Silenced to avoid loud dev errors; audit results are elegantly handled in the Batch UI table.
                console.warn(`Batch item ${item.id} validation result:`, err);
            }
        }
        setIsProcessing(false);
    }, []);

    const deleteMasterTemplate = useCallback(async (bankName: string) => {
        try {
            const token = localStorage.getItem("token");
            const headers: Record<string, string> = {};
            if (token) headers["Authorization"] = `Bearer ${token}`;

            const res = await fetch(`http://127.0.0.1:8000/api/v1/documents/master/${bankName}`, {
                method: "DELETE",
                headers: headers
            });

            if (!res.ok) throw new Error("Deletion failed");
            toast.success(`${bankName} Master Template deleted`);
        } catch (err: any) {
            toast.error(err.message || "Failed to delete master template");
        }
    }, []);

    const getMasterStatus = useCallback(async (bankName: string) => {
        try {
            const token = localStorage.getItem("token");
            const headers: Record<string, string> = {};
            if (token) headers["Authorization"] = `Bearer ${token}`;

            const res = await fetch(`http://127.0.0.1:8000/api/v1/documents/master/${bankName}`, {
                headers: headers
            });
            return await res.json();
        } catch (err) {
            return { exists: false };
        }
    }, []);

    const setMasterTemplate = useCallback(async (file: File, bankName: string) => {
        setIsProcessing(true);
        setCurrentStage("preprocessing");

        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("bank_name", bankName);

            const token = localStorage.getItem("token");
            const headers: Record<string, string> = {};
            if (token) headers["Authorization"] = `Bearer ${token}`;

            const res = await fetchWithRetry("http://127.0.0.1:8000/api/v1/documents/master/upload", {
                method: "POST",
                body: formData,
                headers: headers
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.detail || "Master template upload failed");
            }

            toast.success(`${bankName} Master Template updated successfully`);
        } catch (err: any) {
            toast.error(err.message || "Failed to set master template");
            throw err;
        } finally {
            setIsProcessing(false);
            setCurrentStage("idle");
        }
    }, []);

    const reset = useCallback(() => {
        setIsProcessing(false);
        setIsBatchMode(false);
        setCurrentStage("idle");
        setImageUrl(null);
        setBatchItems([]);
        setResult({
            verdict: null,
            reasons: [],
            documentType: null,
            extractedData: null,
            boundingBoxes: [],
            fraudIndicators: [],
            boxFindings: [],
            isPdf: false,
            viewUrls: [],
            checkpoints: [],
        });
    }, []);

    const getBatchSummary = (): BatchSummary => {
        const completed = batchItems.filter(i => i.status === 'completed' && i.result);
        const processedItems = batchItems.filter(i => i.status === 'completed' || i.status === 'failed' || i.status === 'invalid');
        const scores = completed.map(i => i.result?.scores?.authenticity_score || 0);

        return {
            total: batchItems.length,
            processed: processedItems.length,
            genuine: completed.filter(i => i.result?.verdict === 'GENUINE' || i.result?.verdict === 'REAL' || i.result?.verdict === 'VERIFIED').length,
            suspicious: completed.filter(i => i.result?.verdict === 'SUSPICIOUS').length,
            fraudulent: completed.filter(i => i.result?.verdict === 'FAKE' || i.result?.verdict === 'LIKELY FORGED').length,
            invalid: batchItems.filter(i => i.status === 'invalid').length,
            avgScore: scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length) : 0
        };
    };

    return {
        isProcessing,
        currentStage,
        imageUrl,
        result,
        batchItems,
        isBatchMode,
        processDocument,
        processBatch,
        setMasterTemplate,
        deleteMasterTemplate,
        getMasterStatus,
        reset,
        getBatchSummary,
        setResult
    };
}
