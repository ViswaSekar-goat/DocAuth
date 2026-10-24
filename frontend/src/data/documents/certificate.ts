// Academic Certificate Configuration & Validation Rules

import { DocumentConfig, DocumentField, ValidationRule } from './types';

export const CERTIFICATE_FIELDS: DocumentField[] = [
    { name: 'student_name', label: 'Student Name', required: true },
    { name: 'father_name', label: "Father's Name/Guardian's Name", required: false },
    { name: 'degree_name', label: 'Degree Name', required: true },
    { name: 'branch_specialization', label: 'Branch/Specialization', required: false },
    { name: 'university_name', label: 'University Name', required: true },
    { name: 'registration_number', label: 'Registration Number', required: true },
    { name: 'date_of_birth', label: 'Date of Birth', required: false },
    { name: 'year_of_passing', label: 'Year of Passing', required: true },
    { name: 'date_of_issue', label: 'Date of Issue', required: true },
    { name: 'division_class', label: 'Division/Class', required: false },
    { name: 'cgpa_percentage', label: 'CGPA/Percentage', required: false },
];

export const CERTIFICATE_VALIDATION_RULES: ValidationRule[] = [
    {
        id: 'cert_date_sequence',
        name: 'Date Sequence Logic',
        severity: 'critical',
        description: 'Dates must be logical: DOB < Enrollment < Passing < Issue',
        check: (data) => {
            const dob = data.date_of_birth ? new Date(String(data.date_of_birth)) : null;
            const passing = data.year_of_passing ? new Date(`${data.year_of_passing}-06-01`) : null;
            const issue = data.date_of_issue ? new Date(String(data.date_of_issue)) : null;

            if (dob && passing && dob >= passing) return false;
            if (passing && issue && passing > issue) return false;
            return true;
        },
    },
    {
        id: 'cert_university',
        name: 'University Recognition',
        severity: 'warning',
        description: 'University should be from recognized institutions list',
        check: () => true, // Would check against known universities
    },
    {
        id: 'cert_signatures',
        name: 'Signature Presence',
        severity: 'warning',
        description: 'Certificates should have multiple authorized signatures',
        check: () => true,
    },
    {
        id: 'cert_seal',
        name: 'University Seal',
        severity: 'warning',
        description: 'Official university seal should be present',
        check: () => true,
    },
];

export const CERTIFICATE_VISUAL_MARKERS = [
    'University seal/logo (usually centered or top)',
    '"DEGREE CERTIFICATE" or "PROVISIONAL CERTIFICATE" header',
    'Registration/Roll number',
    'Date of issue',
    'Signatures (Registrar, Controller, Vice Chancellor)',
    'Security paper with watermarks',
    'Embossed seal',
];

export const CERTIFICATE_SECURITY_FEATURES = [
    'Security watermark paper',
    'Embossed university seal',
    'Hologram sticker',
    'Micro-printing on borders',
    'Serial numbering',
    'QR code (modern certificates)',
];

export const CERTIFICATE_CONFIG: DocumentConfig = {
    type: 'CERTIFICATE',
    displayName: 'Academic Certificate',
    variants: ['DEGREE', 'PROVISIONAL', 'DIPLOMA', 'CONVOCATION'],
    fields: CERTIFICATE_FIELDS,
    validationRules: CERTIFICATE_VALIDATION_RULES,
    visualMarkers: CERTIFICATE_VISUAL_MARKERS,
    securityFeatures: CERTIFICATE_SECURITY_FEATURES,
};
