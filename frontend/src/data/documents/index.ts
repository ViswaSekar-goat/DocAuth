// Document Dataset Configuration & Validation Rules
import { AADHAAR_CONFIG } from './aadhaar';
import { PAN_CONFIG } from './pan';
import { CERTIFICATE_CONFIG } from './certificate';
import { MARKSHEET_CONFIG } from './marksheet';
import { BANK_STATEMENT_CONFIG } from './bank_statement';
import { DocumentType, DocumentConfig } from './types';

export { AADHAAR_CONFIG } from './aadhaar';
export { PAN_CONFIG } from './pan';
export { CERTIFICATE_CONFIG } from './certificate';
export { MARKSHEET_CONFIG } from './marksheet';
export { BANK_STATEMENT_CONFIG } from './bank_statement';
export * from './types';
export { verhoeffChecksum } from './validators/verhoeff';
export { validatePanFormat, getPanHolderType } from './validators/pan-validator';

/**
 * Gets the configuration for a specific document type
 * @param type - The document type enum or string
 * @returns The configuration object or null if not found
 */
export function getDocumentConfig(type: DocumentType | string): DocumentConfig | null {
    const normalizedType = String(type).toUpperCase().replace(/\s+/g, '_');

    switch (normalizedType) {
        case 'AADHAAR':
            return AADHAAR_CONFIG;
        case 'PAN':
        case 'PAN_CARD':
            return PAN_CONFIG;
        case 'CERTIFICATE':
        case 'ACADEMIC_CERTIFICATE':
            return CERTIFICATE_CONFIG;
        case 'MARKSHEET':
        case 'ACADEMIC_MARKSHEET':
            return MARKSHEET_CONFIG;
        case 'BANK_STATEMENT':
        case 'SBI':
        case 'HDFC':
        case 'ICICI':
        case 'AXIS':
        case 'PNB':
            return BANK_STATEMENT_CONFIG;
        default:
            return null;
    }
}
