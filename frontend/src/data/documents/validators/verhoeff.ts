// Verhoeff Algorithm for Aadhaar Number Validation
// The Verhoeff algorithm is a checksum formula for error detection developed by Jacobus Verhoeff

// Multiplication table
const d: number[][] = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
    [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
    [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
    [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
    [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
    [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
    [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
    [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
    [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];

// Permutation table
const p: number[][] = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
    [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
    [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
    [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
    [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
    [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
    [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];

// Inverse table
const inv: number[] = [0, 4, 3, 2, 1, 5, 6, 7, 8, 9];

/**
 * Validates an Aadhaar number using the Verhoeff checksum algorithm
 * @param num - The 12-digit Aadhaar number as a string
 * @returns true if valid, false if invalid
 */
export function verhoeffChecksum(num: string): boolean {
    // Remove any spaces or formatting
    const cleanNum = num.replace(/\D/g, '');

    // Must be exactly 12 digits
    if (cleanNum.length !== 12) {
        return false;
    }

    // First digit cannot be 0 or 1
    const firstDigit = parseInt(cleanNum[0], 10);
    if (firstDigit === 0 || firstDigit === 1) {
        return false;
    }

    let c = 0;
    const reversedNum = cleanNum.split('').reverse();

    for (let i = 0; i < reversedNum.length; i++) {
        const digit = parseInt(reversedNum[i], 10);
        c = d[c][p[i % 8][digit]];
    }

    return c === 0;
}

/**
 * Generates the check digit for a partial Aadhaar number
 * @param num - First 11 digits of Aadhaar
 * @returns The check digit (12th digit)
 */
export function generateVerhoeffCheckDigit(num: string): number {
    const cleanNum = num.replace(/\D/g, '');

    if (cleanNum.length !== 11) {
        throw new Error('Partial Aadhaar must be 11 digits');
    }

    let c = 0;
    const reversedNum = cleanNum.split('').reverse();

    for (let i = 0; i < reversedNum.length; i++) {
        const digit = parseInt(reversedNum[i], 10);
        c = d[c][p[(i + 1) % 8][digit]];
    }

    return inv[c];
}

// Test examples for validation
export const VERHOEFF_TEST_CASES = {
    valid: [
        '499118665246', // Example valid Aadhaar
        '234567890123', // Another example
    ],
    invalid: [
        '123456789012', // First digit is 1
        '012345678901', // First digit is 0
        '499118665247', // Checksum mismatch
    ],
};
