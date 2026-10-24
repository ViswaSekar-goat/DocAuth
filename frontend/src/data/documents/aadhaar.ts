// Aadhaar Card Configuration & Validation Rules

import { DocumentConfig, DocumentField, ValidationRule } from './types';
import { verhoeffChecksum } from './validators/verhoeff';

export const AADHAAR_FIELDS: DocumentField[] = [
    { name: 'full_name', label: 'Full Name', required: true },
    { name: 'name_hindi', label: 'Name (Hindi)', required: false },
    { name: 'date_of_birth', label: 'Date of Birth', required: true, format: /^\d{2}\/\d{2}\/\d{4}$/ },
    { name: 'gender', label: 'Gender', required: true },
    { name: 'aadhaar_number', label: 'Aadhaar Number', required: true, format: /^\d{4}\s?\d{4}\s?\d{4}$/ },
    { name: 'address', label: 'Address', required: true },
    { name: 'vid', label: 'Virtual ID', required: false, format: /^\d{16}$/ },
    { name: 'issue_date', label: 'Issue Date', required: false },
    { name: 'qr_data_present', label: 'QR Code Present', required: false },
];

export const AADHAAR_VALIDATION_RULES: ValidationRule[] = [
    {
        id: 'aadhaar_checksum',
        name: 'Verhoeff Checksum',
        severity: 'critical',
        description: 'Validates the 12-digit Aadhaar number using Verhoeff algorithm',
        check: (data) => {
            const number = String(data.aadhaar_number || '').replace(/\s/g, '');
            if (number.length !== 12) return false;
            return verhoeffChecksum(number);
        },
    },
    {
        id: 'aadhaar_first_digit',
        name: 'First Digit Check',
        severity: 'critical',
        description: 'First digit of Aadhaar cannot be 0 or 1',
        check: (data) => {
            const number = String(data.aadhaar_number || '').replace(/\s/g, '');
            if (number.length < 1) return false;
            const firstDigit = parseInt(number[0], 10);
            return firstDigit >= 2 && firstDigit <= 9;
        },
    },
    {
        id: 'aadhaar_format',
        name: 'Format Validation',
        severity: 'critical',
        description: 'Aadhaar must be exactly 12 digits',
        check: (data) => {
            const number = String(data.aadhaar_number || '').replace(/\s/g, '');
            return /^\d{12}$/.test(number);
        },
    },
    {
        id: 'aadhaar_qr_present',
        name: 'QR Code Present',
        severity: 'warning',
        description: 'Authentic Aadhaar cards have QR codes',
        check: (data) => data.qr_data_present === true || data.qr_data_present === 'true',
    },
];

export const AADHAAR_VISUAL_MARKERS = [
    'UIDAI logo (top-left corner)',
    '"आधार" text in Hindi',
    '12-digit number in XXXX XXXX XXXX format',
    'QR code',
    'Government of India emblem',
    'Photo with embossed UIDAI hologram',
    'Rainbow color gradient (PVC cards)',
];

export const AADHAAR_SECURITY_FEATURES = [
    'Embossed hologram on photo',
    'Micro-printing around edges',
    'Guilloche patterns',
    'UV-visible security features',
    'QR code with encrypted data',
    'Holographic overlay (PVC cards)',
];

export const AADHAAR_CONFIG: DocumentConfig = {
    type: 'AADHAAR',
    displayName: 'Aadhaar Card (UID)',
    variants: ['OLD_LAMINATED', 'PVC_CARD', 'E_AADHAAR', 'M_AADHAAR'],
    fields: AADHAAR_FIELDS,
    validationRules: AADHAAR_VALIDATION_RULES,
    visualMarkers: AADHAAR_VISUAL_MARKERS,
    securityFeatures: AADHAAR_SECURITY_FEATURES,
};
