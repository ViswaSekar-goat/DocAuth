import { Database, Copy, Check, ShieldCheck, ShieldAlert, AlertTriangle, Table as TableIcon, Landmark } from "lucide-react";
import { useState, useMemo } from "react";
import { getDocumentConfig, DocumentType } from "@/data/documents";
import { cn } from "@/lib/utils";

interface ExtractedDataProps {
    data: Record<string, string> | null;
    documentType: string | null;
}

export function ExtractedData({ data, documentType }: ExtractedDataProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        if (data) {
            navigator.clipboard.writeText(JSON.stringify(data, null, 2));
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    // Run validations
    const validationResults = useMemo(() => {
        if (!data || !documentType) return null;

        // Normalize document type string to enum key if possible
        const typeKey = documentType.toUpperCase().replace(/\s+/g, '_') as DocumentType;
        const config = getDocumentConfig(typeKey);

        if (!config) return null;

        // Field-level validation (regex formats)
        const fieldStatus: Record<string, boolean> = {};
        config.fields.forEach(field => {
            if (field.format && data[field.name]) {
                fieldStatus[field.name] = field.format.test(data[field.name]);
            }
        });

        // Rule-level validation
        const ruleResults = config.validationRules.map(rule => ({
            ...rule,
            passed: rule.check(data)
        }));

        return { fieldStatus, ruleResults };
    }, [data, documentType]);

    return (
        <div className="space-y-6">
            <div className="glass-panel p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 border border-primary/20">
                            <Database className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h2 className="font-semibold">Extracted Data</h2>
                            <p className="text-xs text-muted-foreground">OCR parsed structured output</p>
                        </div>
                    </div>

                    {data && (
                        <button
                            onClick={handleCopy}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-xs font-medium hover:bg-secondary/80 transition-colors"
                        >
                            {copied ? (
                                <>
                                    <Check className="w-3.5 h-3.5 text-success" />
                                    <span className="text-success">Copied</span>
                                </>
                            ) : (
                                <>
                                    <Copy className="w-3.5 h-3.5" />
                                    <span>Copy JSON</span>
                                </>
                            )}
                        </button>
                    )}
                </div>

                {documentType && (
                    <div className="mb-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Document Type:</span>
                            <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-semibold uppercase">
                                {documentType}
                            </span>
                        </div>

                        {data?.bank_brand && data.bank_brand !== "UNKNOWN" && (
                            <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-secondary/50 border border-border">
                                <Landmark className="w-4 h-4 text-primary" />
                                <span className="text-xs font-bold text-foreground tracking-tight">{data.bank_brand}</span>
                            </div>
                        )}
                    </div>
                )}

                {data ? (
                    <div className="space-y-6">
                        {/* Statement Overview Grid - Only for Bank Statements */}
                        {documentType === "BANK_STATEMENT" && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-6 p-4 bg-secondary/30 rounded-xl border border-border/50">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Account Holder</p>
                                    <p className="text-sm font-bold truncate">{data.account_name || "Not detected"}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Account Number</p>
                                    <p className="text-sm font-mono font-bold">{data.account_number || "Not detected"}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">IFSC Code</p>
                                    <p className="text-sm font-mono font-bold">{data.ifsc || "Not detected"}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Statement Period</p>
                                    <p className="text-xs font-medium text-primary bg-primary/5 px-2 py-0.5 rounded border border-primary/10 inline-block">
                                        {data.period || "Current Cycle"}
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="rounded-xl border border-border bg-background/50 overflow-hidden">
                            <div className="max-h-[400px] overflow-auto">
                                {documentType === "BANK_STATEMENT" && data.transactions ? (
                                    <table className="w-full text-xs text-left border-collapse">
                                        <thead className="bg-secondary/80 sticky top-0 z-10 backdrop-blur-md">
                                            <tr>
                                                <th className="px-4 py-3 font-black uppercase tracking-tight text-muted-foreground border-b border-border">Date</th>
                                                <th className="px-4 py-3 font-black uppercase tracking-tight text-muted-foreground border-b border-border">Description</th>
                                                <th className="px-4 py-3 font-black uppercase tracking-tight text-muted-foreground border-b border-border text-right">Debit</th>
                                                <th className="px-4 py-3 font-black uppercase tracking-tight text-muted-foreground border-b border-border text-right">Credit</th>
                                                <th className="px-4 py-3 font-black uppercase tracking-tight text-muted-foreground border-b border-border text-right">Balance</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border/30">
                                            {(data.transactions as any).map((tx: any, i: number) => (
                                                <tr key={i} className="hover:bg-primary/5 transition-colors group">
                                                    <td className="px-4 py-2.5 font-bold text-muted-foreground whitespace-nowrap">{tx.date}</td>
                                                    <td className="px-4 py-2.5 max-w-[200px] truncate group-hover:whitespace-normal group-hover:overflow-visible transition-all text-[11px] leading-tight font-medium">
                                                        {tx.narration || tx.description}
                                                    </td>
                                                    <td className="px-4 py-2.5 text-right font-mono text-destructive/80 font-semibold">
                                                        {tx.debit > 0 ? tx.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : "-"}
                                                    </td>
                                                    <td className="px-4 py-2.5 text-right font-mono text-success font-semibold">
                                                        {tx.credit > 0 ? tx.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : "-"}
                                                    </td>
                                                    <td className="px-4 py-2.5 text-right font-mono text-primary font-black bg-primary/5">
                                                        {(Number(tx.balance) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <table className="w-full text-sm">
                                        <tbody>
                                            {Object.entries(data)
                                                .filter(([k]) => ![
                                                    'transactions', 'Document Type', 'account_name',
                                                    'account_number', 'ifsc', 'period', 'bank_brand',
                                                    'text', 'extracted_data', 'arithmetic_score'
                                                ].includes(k))
                                                .map(([key, value]) => {
                                                    const isValid = validationResults?.fieldStatus[key];
                                                    return (
                                                        <tr key={key} className={cn(
                                                            "border-b border-border/50 last:border-0 hover:bg-secondary/20 transition-colors",
                                                            isValid === false && "bg-destructive/5 border-l-2 border-l-destructive"
                                                        )}>
                                                            <td className="px-4 py-2.5 text-muted-foreground font-medium bg-secondary/30 w-1/3 text-xs uppercase tracking-wider flex items-center gap-2">
                                                                {isValid === false && <span className="text-destructive">🚩</span>}
                                                                {key.replace(/_/g, ' ')}
                                                            </td>
                                                            <td className="px-4 py-4 font-mono text-xs text-foreground flex items-start justify-between group">
                                                                <span className={cn(
                                                                    "break-words whitespace-pre-wrap pr-4 font-bold",
                                                                    isValid === false && "text-destructive"
                                                                )}>
                                                                    {String(value) || <span className="text-muted-foreground/50">—</span>}
                                                                </span>
                                                                {isValid !== undefined && (
                                                                    <span className={cn(
                                                                        "transition-opacity duration-300",
                                                                        isValid === false ? "opacity-100 text-destructive" : "opacity-0 group-hover:opacity-100 text-success"
                                                                    )}>
                                                                        {isValid ? <ShieldCheck className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4 animate-pulse" />}
                                                                    </span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="rounded-xl border border-border bg-secondary/20 p-8 text-center">
                        <Database className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">No data extracted yet</p>
                    </div>
                )}
            </div>

            {/* Validation Rules Section */}
            {validationResults && validationResults.ruleResults.length > 0 && (
                <div className="glass-panel p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 border border-primary/20">
                            <ShieldCheck className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h2 className="font-semibold">Validation Rules</h2>
                            <p className="text-xs text-muted-foreground">Automated integrity checks</p>
                        </div>
                    </div>

                    <div className="grid gap-3">
                        {validationResults.ruleResults.map((rule) => (
                            <div
                                key={rule.id}
                                className={cn(
                                    "flex items-start gap-3 p-3 rounded-lg border",
                                    rule.passed
                                        ? "bg-success/5 border-success/20"
                                        : rule.severity === 'critical'
                                            ? "bg-destructive/5 border-destructive/20"
                                            : "bg-warning/5 border-warning/20"
                                )}
                            >
                                <div className={cn(
                                    "mt-0.5 p-1 rounded-full",
                                    rule.passed
                                        ? "bg-success/20 text-success"
                                        : rule.severity === 'critical'
                                            ? "bg-destructive/20 text-destructive"
                                            : "bg-warning/20 text-warning"
                                )}>
                                    {rule.passed ? (
                                        <Check className="w-3 h-3" />
                                    ) : rule.severity === 'critical' ? (
                                        <ShieldAlert className="w-3 h-3" />
                                    ) : (
                                        <AlertTriangle className="w-3 h-3" />
                                    )}
                                </div>
                                <div>
                                    <p className={cn(
                                        "text-sm font-medium",
                                        rule.passed ? "text-foreground" : "text-foreground"
                                    )}>
                                        {rule.name}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        {rule.description}
                                    </p>
                                </div>
                                <div className="ml-auto">
                                    <span className={cn(
                                        "text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-md",
                                        rule.passed
                                            ? "bg-success/10 text-success"
                                            : rule.severity === 'critical'
                                                ? "bg-destructive/10 text-destructive"
                                                : "bg-warning/10 text-warning"
                                    )}>
                                        {rule.passed ? "Passed" : "Failed"}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
