// PAN Card Validation Utilities

/**
 * PAN Holder Types Mapping
 */
export const PAN_HOLDER_TYPES: Record<string, string> = {
    A: 'Association of Persons (AOP)',
    B: 'Body of Individuals (BOI)',
    C: 'Company',
    F: 'Firm/Limited Liability Partnership',
    G: 'Government',
    H: 'Hindu Undivided Family (HUF)',
    J: 'Artificial Juridical Person',
    L: 'Local Authority',
    P: 'Individual/Person',
    T: 'Trust',
};

/**
 * Validates PAN format (AAAAA9999A)
 * @param pan - PAN number to validate
 * @returns true if format is valid
 */
export function validatePanFormat(pan: string): boolean {
    if (!pan || typeof pan !== 'string') {
        return false;
    }

    const cleanPan = pan.toUpperCase().trim();

    // Check length
    if (cleanPan.length !== 10) {
        return false;
    }

    // Check format: 5 letters + 4 digits + 1 letter
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
    if (!panRegex.test(cleanPan)) {
        return false;
    }

    // Check 4th character is valid holder type
    const holderType = cleanPan[3];
    if (!PAN_HOLDER_TYPES[holderType]) {
        return false;
    }

    return true;
}

/**
 * Gets the holder type description from a PAN number
 * @param pan - PAN number
 * @returns Holder type description or null
 */
export function getPanHolderType(pan: string): string | null {
    if (!pan || pan.length < 4) {
        return null;
    }

    const typeChar = pan.toUpperCase()[3];
    return PAN_HOLDER_TYPES[typeChar] || null;
}

/**
 * Extracts components from a PAN number
 * @param pan - PAN number
 * @returns Object with PAN components
 */
export function parsePanNumber(pan: string) {
    if (!validatePanFormat(pan)) {
        return null;
    }

    const cleanPan = pan.toUpperCase();

    return {
        valid: true,
        series: cleanPan.substring(0, 3),
        holderType: cleanPan[3],
        holderTypeDescription: PAN_HOLDER_TYPES[cleanPan[3]] || null,
        nameInitial: cleanPan[4],
        sequence: cleanPan.substring(5, 9),
        checkDigit: cleanPan[9],
    };
}
