// PAN Card Configuration & Validation Rules

import { DocumentConfig, DocumentField, ValidationRule } from './types';
import { validatePanFormat } from './validators/pan-validator';

export const PAN_FIELDS: DocumentField[] = [
    { name: 'full_name', label: 'Full Name', required: true },
    { name: 'father_name', label: "Father's Name", required: true },
    { name: 'date_of_birth', label: 'Date of Birth', required: true, format: /^\d{2}\/\d{2}\/\d{4}$/ },
    { name: 'pan_number', label: 'PAN Number', required: true, format: /^[A-Z]{5}[0-9]{4}[A-Z]$/ },
    { name: 'signature_present', label: 'Signature Present', required: false },
    { name: 'photo_present', label: 'Photo Present', required: false },
];

export const PAN_VALIDATION_RULES: ValidationRule[] = [
    {
        id: 'pan_format',
        name: 'PAN Format',
        severity: 'critical',
        description: 'PAN must follow AAAAA9999A format (5 letters, 4 digits, 1 letter)',
        check: (data) => validatePanFormat(String(data.pan_number || '')),
    },
    {
        id: 'pan_holder_type',
        name: 'Holder Type Character',
        severity: 'critical',
        description: '4th character must be valid holder type (P, C, H, A, B, G, J, L, F, T)',
        check: (data) => {
            const pan = String(data.pan_number || '').toUpperCase();
            if (pan.length < 4) return false;
            const validTypes = ['A', 'B', 'C', 'F', 'G', 'H', 'J', 'L', 'P', 'T'];
            return validTypes.includes(pan[3]);
        },
    },
    {
        id: 'pan_signature',
        name: 'Signature Check',
        severity: 'warning',
        description: 'Authentic PAN cards have signatures',
        check: (data) => data.signature_present === true || data.signature_present === 'true',
    },
    {
        id: 'pan_photo',
        name: 'Photo Check',
        severity: 'warning',
        description: 'Authentic PAN cards have photos',
        check: (data) => data.photo_present === true || data.photo_present === 'true',
    },
];

export const PAN_HOLDER_TYPES: Record<string, string> = {
    A: 'Association of Persons (AOP)',
    B: 'Body of Individuals (BOI)',
    C: 'Company',
    F: 'Firm',
    G: 'Government',
    H: 'Hindu Undivided Family (HUF)',
    J: 'Artificial Juridical Person',
    L: 'Local Authority',
    P: 'Individual/Person',
    T: 'Trust',
};

export const PAN_VISUAL_MARKERS = [
    'Income Tax Department logo',
    '"INCOME TAX DEPARTMENT" header',
    '"GOVT. OF INDIA" text',
    '10-character alphanumeric PAN',
    'Signature panel',
    'Passport-size photo',
    'Embossed "IT" hologram',
];

export const PAN_SECURITY_FEATURES = [
    'Holographic strip with "IT" pattern',
    'Micro-printing around borders',
    'UV-visible printing',
    'Guilloche pattern background',
    'Embossed numbering',
];

export const PAN_CONFIG: DocumentConfig = {
    type: 'PAN',
    displayName: 'PAN Card',
    variants: ['STANDARD', 'INSTANT_PAN'],
    fields: PAN_FIELDS,
    validationRules: PAN_VALIDATION_RULES,
    visualMarkers: PAN_VISUAL_MARKERS,
    securityFeatures: PAN_SECURITY_FEATURES,
};
