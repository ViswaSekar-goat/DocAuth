import { Shield, Eye, Lock } from "lucide-react";
import { getDocumentConfig, DocumentType } from "@/data/documents";
import { cn } from "@/lib/utils";

interface DocumentStandardsProps {
    documentType: string | null;
}

export function DocumentStandards({ documentType }: DocumentStandardsProps) {
    if (!documentType || documentType === "UNKNOWN") return null;

    // Normalize type string
    const typeKey = documentType.toUpperCase().replace(/\s+/g, '_') as DocumentType;
    const config = getDocumentConfig(typeKey);

    if (!config) return null;

    return (
        <div className="glass-panel p-6">
            <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 border border-primary/20">
                    <Shield className="w-5 h-5 text-primary" />
                </div>
                <div>
                    <h2 className="font-semibold">Document Standards</h2>
                    <p className="text-xs text-muted-foreground">Expected security features for {config.displayName}</p>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Visual Markers */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground/80">
                        <Eye className="w-4 h-4 text-primary" />
                        <h3>Visual Markers</h3>
                    </div>
                    <ul className="space-y-2">
                        {config.visualMarkers.map((marker: string, idx: number) => (
                            <li key={idx} className="flex items-start gap-2 text-xs text-muted-foreground">
                                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary/40 shrink-0" />
                                {marker}
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Security Features */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground/80">
                        <Lock className="w-4 h-4 text-primary" />
                        <h3>Security Features</h3>
                    </div>
                    <ul className="space-y-2">
                        {config.securityFeatures.map((feature: string, idx: number) => (
                            <li key={idx} className="flex items-start gap-2 text-xs text-muted-foreground">
                                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary/40 shrink-0" />
                                {feature}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            <div className="mt-6 pt-4 border-t border-border/50">
                <p className="text-xs text-muted-foreground italic">
                    * Automated analysis checks for presence of these features where possible.
                </p>
            </div>
        </div>
    );
}
