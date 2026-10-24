// Document Type Definitions

export type DocumentType = 'AADHAAR' | 'PAN' | 'CERTIFICATE' | 'MARKSHEET' | 'BANK_STATEMENT' | 'UNKNOWN';
export type FraudSeverity = 'critical' | 'warning' | 'info' | 'passed' | 'success';
export type VerificationStatus = 'valid' | 'suspicious' | 'fraud';

export interface ForensicScores {
    mathematical_integrity: number;
    pdf_authenticity: number;
    layout_anomaly: number;
    authenticity_score: number;
    forgery_probability: number;
}

export interface DocumentField {
    name: string;
    label: string;
    required: boolean;
    format?: RegExp;
    description?: string;
}

export interface ValidationRule {
    id: string;
    name: string;
    severity: FraudSeverity;
    description: string;
    check: (data: Record<string, unknown>) => boolean;
}

export interface DocumentConfig {
    type: DocumentType;
    displayName: string;
    variants: string[];
    fields: DocumentField[];
    validationRules: ValidationRule[];
    visualMarkers: string[];
    securityFeatures: string[];
}

export interface FraudIndicator {
    id: string;
    type: FraudSeverity;
    label: string;
    description: string;
    region?: string;
    category?: string;
}

export interface BoundingBox {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    label: string;
    status: VerificationStatus;
    category?: string;
    reason?: string;
    type?: 'HIGHLIGHT' | 'BOX' | 'MARK';
}

export interface BoxFinding {
    id: string;
    region: string;
    issue: string;
    status: VerificationStatus;
    coordinates: { x: number; y: number; w: number; h: number };
}

export interface Checkpoint {
    name: string;
    weight: number;
    result: number;
    contribution: number;
    status: "PASSED" | "FAILED" | "WARNING";
    reason?: string;
    bbox?: number[];
    page?: number;
}

export interface PanCheckpoint {
    id: number;
    name: string;
    detail?: string;
    signal: "PASS" | "FAIL";
    present?: boolean;
}

export interface AnalysisResult {
    verdict: 'GENUINE' | 'SUSPICIOUS' | 'LIKELY FORGED' | 'REAL' | 'FAKE' | 'VERIFIED' | 'VALID' | 'SECURE' | 'VIOLATION' | 'VALID DOCUMENT' | 'PARTIAL DOCUMENT' | 'IRRELEVANT DOCUMENT' | 'PARTIAL' | null;
    reasons: string[];
    documentType: string | null;
    extractedData: Record<string, any> | null;
    boundingBoxes: BoundingBox[];
    fraudIndicators: FraudIndicator[];
    boxFindings: BoxFinding[];
    checkpoints?: Checkpoint[];
    scores?: ForensicScores;
    isPdf?: boolean;
    viewUrls: string[];
    ocrText?: string;
    is_checkpoint_based?: boolean;
    master_template_used?: boolean;
    panCheckpoints?: PanCheckpoint[];  // v5.0 raw 7-checkpoint array for signal LEDs
    remarks?: string;
    qrLocation?: { x: number; y: number; w: number; h: number } | null;
    qrDetected?: boolean;
    holderType?: string | null;
}


export const DOCUMENT_TYPES: Record<DocumentType, string> = {
    AADHAAR: 'Aadhaar Card (UID)',
    PAN: 'PAN Card',
    CERTIFICATE: 'Academic Certificate',
    MARKSHEET: 'Marksheet',
    BANK_STATEMENT: 'Bank Statement',
    UNKNOWN: 'Unknown Document',
};

// Removed getDocumentConfig from here to avoid circular dependencies with the specific config files.
// It will be re-exported in index.ts if needed, or implemented there.
