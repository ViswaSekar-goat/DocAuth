// Marksheet Configuration & Validation Rules

import { DocumentConfig, DocumentField, ValidationRule } from './types';

export const MARKSHEET_FIELDS: DocumentField[] = [
    { name: 'student_name', label: 'Student Name', required: true },
    { name: 'roll_number', label: 'Roll Number', required: true },
    { name: 'registration_number', label: 'Registration Number', required: true },
    { name: 'exam_name', label: 'Examination Name', required: true },
    { name: 'exam_month_year', label: 'Exam Month/Year', required: true },
    { name: 'subjects', label: 'Subjects & Marks', required: true },
    { name: 'total_marks', label: 'Total Marks Obtained', required: true },
    { name: 'max_total', label: 'Maximum Total', required: true },
    { name: 'percentage', label: 'Percentage', required: false },
    { name: 'cgpa_sgpa', label: 'CGPA/SGPA', required: false },
    { name: 'result', label: 'Result', required: true },
];

export const MARKSHEET_VALIDATION_RULES: ValidationRule[] = [
    {
        id: 'marks_total',
        name: 'Marks Total Verification',
        severity: 'critical',
        description: 'Sum of individual subject marks must equal total marks',
        check: (data) => {
            if (!data.subjects || !Array.isArray(data.subjects)) return true;
            const subjects = data.subjects as Array<{ marks_obtained?: number }>;
            const calculatedTotal = subjects.reduce((sum, s) => sum + (s.marks_obtained || 0), 0);
            const statedTotal = Number(data.total_marks) || 0;
            return Math.abs(calculatedTotal - statedTotal) < 1; // Allow small rounding differences
        },
    },
    {
        id: 'marks_percentage',
        name: 'Percentage Calculation',
        severity: 'warning',
        description: 'Percentage should match (total/max)*100',
        check: (data) => {
            const total = Number(data.total_marks) || 0;
            const max = Number(data.max_total) || 1;
            const statedPercentage = Number(data.percentage) || 0;
            const calculatedPercentage = (total / max) * 100;
            return Math.abs(calculatedPercentage - statedPercentage) < 1;
        },
    },
    {
        id: 'marks_within_bounds',
        name: 'Marks Within Maximum',
        severity: 'critical',
        description: 'Obtained marks cannot exceed maximum marks',
        check: (data) => {
            if (!data.subjects || !Array.isArray(data.subjects)) return true;
            const subjects = data.subjects as Array<{ marks_obtained?: number; max_marks?: number }>;
            return subjects.every((s) => (s.marks_obtained || 0) <= (s.max_marks || 100));
        },
    },
    {
        id: 'result_consistency',
        name: 'Result Consistency',
        severity: 'critical',
        description: 'Result should match percentage (Pass typically >= 35%)',
        check: (data) => {
            const percentage = Number(data.percentage) || 0;
            const result = String(data.result || '').toLowerCase();
            if (result.includes('pass') && percentage < 30) return false;
            if (result.includes('fail') && percentage > 50) return false;
            return true;
        },
    },
];

export const MARKSHEET_VISUAL_MARKERS = [
    'University/Board header with logo',
    'Student photo (usually top-right)',
    'Subject-wise marks table',
    'Total/Percentage/CGPA display',
    'Exam month/year',
    'Hologram stickers',
    'Micro-printing on borders',
];

export const MARKSHEET_SECURITY_FEATURES = [
    'Security watermark paper',
    'Hologram seal',
    'Micro-text printing',
    'Serial number',
    'Controller of Examinations signature',
    'Embossed stamp',
];

export const MARKSHEET_CONFIG: DocumentConfig = {
    type: 'MARKSHEET',
    displayName: 'Academic Marksheet',
    variants: ['SEMESTER', 'ANNUAL', 'CONSOLIDATED', 'SUPPLEMENTARY'],
    fields: MARKSHEET_FIELDS,
    validationRules: MARKSHEET_VALIDATION_RULES,
    visualMarkers: MARKSHEET_VISUAL_MARKERS,
    securityFeatures: MARKSHEET_SECURITY_FEATURES,
};
