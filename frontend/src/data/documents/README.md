# Document Dataset & Validation Rules

This folder contains the document-specific configurations, validation rules, and reference data for the forensic document verification system.

## Folder Structure

```
src/data/documents/
├── index.ts              # Main exports
├── types.ts              # TypeScript type definitions
├── aadhaar.ts            # Aadhaar card configuration
├── pan.ts                # PAN card configuration
├── certificate.ts        # Academic certificate configuration
├── marksheet.ts          # Marksheet configuration
├── validators/
│   ├── verhoeff.ts       # Verhoeff checksum algorithm for Aadhaar
│   └── pan-validator.ts  # PAN format validation utilities
└── README.md             # This file
```

## Supported Document Types

### 1. Aadhaar Card (UID)
- **Variants**: Old Laminated, PVC Card, e-Aadhaar, m-Aadhaar
- **Key Validations**:
  - Verhoeff checksum (12th digit)
  - First digit cannot be 0 or 1
  - 12-digit format
  - QR code presence

### 2. PAN Card
- **Variants**: Standard, Instant PAN
- **Key Validations**:
  - AAAAA9999A format
  - 4th character holder type (P=Person, C=Company, etc.)
  - Photo and signature presence

### 3. Academic Certificates
- **Variants**: Degree, Provisional, Diploma, Convocation
- **Key Validations**:
  - Date sequence logic (DOB < Enrollment < Passing < Issue)
  - University recognition
  - Seal and signature presence

### 4. Marksheets
- **Variants**: Semester, Annual, Consolidated, Supplementary
- **Key Validations**:
  - Marks total verification
  - Percentage calculation
  - Result consistency

## Validation Rules

Each document type has validation rules categorized by severity:

| Severity | Description | Action |
|----------|-------------|--------|
| `critical` | Immediate FAKE verdict | Fails verification |
| `warning` | Suspicious but not definitive | Flagged for review |
| `info` | Notable observation | Informational |
| `passed` | Verification passed | Contributes to REAL verdict |

## Usage

```typescript
import { 
  AADHAAR_CONFIG, 
  verhoeffChecksum, 
  validatePanFormat 
} from '@/data/documents';

// Validate Aadhaar number
const isValidAadhaar = verhoeffChecksum('499118665246');

// Validate PAN format
const isValidPan = validatePanFormat('ABCPD1234E');

// Access document configuration
console.log(AADHAAR_CONFIG.validationRules);
```

## Adding New Document Types

1. Create a new file (e.g., `driving-license.ts`)
2. Define fields, validation rules, visual markers, and security features
3. Export the configuration
4. Add exports to `index.ts`
5. Update the edge function prompt if needed

## Forensic Analysis Checklist

The AI model checks for:

### Image Forensics
- Compression uniformity
- Noise pattern consistency
- Edge sharpness
- Color bleeding
- Resolution uniformity
- Shadow consistency

### Text Forensics
- Font consistency
- Kerning/spacing
- Baseline alignment
- Character artifacts

### Security Features
- Hologram presence
- Microprinting
- Watermarks
- UV features
- Embossing patterns
