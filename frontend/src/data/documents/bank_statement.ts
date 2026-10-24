import { DocumentConfig } from './types';

export const BANK_STATEMENT_CONFIG: DocumentConfig = {
    type: 'BANK_STATEMENT',
    displayName: 'Bank Statement',
    variants: [
        'Standard Statement',
        'Consolidated Ledger',
        'Export Summary'
    ],
    fields: [
        { name: 'account_number', label: 'Account Number', required: true, description: '17 digits for SBI, 14-16 for HDFC' },
        { name: 'cif', label: 'CIF Number', required: true, description: '11 digits for SBI' },
        { name: 'ifsc', label: 'IFSC Code', required: true, description: 'Bank-Specific Branch Identity' }
    ],
    validationRules: [
        {
            id: 'arithmetic_consistency',
            name: 'Arithmetic Audit',
            severity: 'critical',
            description: 'Verifies starting balance + sum(credits) - sum(debits) = end balance.',
            check: () => true // Logic handled by backend
        },
        {
            id: 'sbi_format_check',
            name: 'SBI Identifier Verification',
            severity: 'critical',
            description: 'Enforces strict 17-digit account and 11-digit CIF formats for SBI.',
            check: () => true // Logic handled by backend
        }
    ],
    visualMarkers: [
        'Corporate Logo (Upper Header)',
        'Branch Address & SOL ID',
        'IFSC & MICR Codes',
        'Account Holder Details',
        'Transaction Ledger (Date, Particulars, Debit, Credit, Balance)',
        'Digital Signatures / System Generated Stamp'
    ],
    securityFeatures: [
        'Geometric Logo Integrity',
        'Color Signature Alignment',
        'Arithmetic Balance Consistency',
        'Strict Account Number Format (e.g., SBI 17-digits)',
        'Strict CIF Number Format (e.g., SBI 11-digits)',
        'Chronological Order Audit'
    ]
};
