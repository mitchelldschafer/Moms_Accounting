'use client';

import { DocumentType } from '@/lib/supabase/types';

interface ClassificationResult {
    documentType: DocumentType;
    confidence: number;
}

// Patterns for document type detection from filename
const documentPatterns: { pattern: RegExp; type: DocumentType; confidence: number }[] = [
    // W-2 patterns
    { pattern: /w[-_\s]?2/i, type: 'w2', confidence: 0.95 },
    { pattern: /wage.*statement/i, type: 'w2', confidence: 0.85 },
    { pattern: /employer.*tax/i, type: 'w2', confidence: 0.75 },

    // 1099-INT patterns
    { pattern: /1099[-_\s]?int/i, type: '1099_int', confidence: 0.95 },
    { pattern: /interest.*income/i, type: '1099_int', confidence: 0.85 },
    { pattern: /interest.*statement/i, type: '1099_int', confidence: 0.80 },

    // 1099-DIV patterns
    { pattern: /1099[-_\s]?div/i, type: '1099_div', confidence: 0.95 },
    { pattern: /dividend.*statement/i, type: '1099_div', confidence: 0.85 },

    // 1099-MISC patterns
    { pattern: /1099[-_\s]?misc/i, type: '1099_misc', confidence: 0.95 },
    { pattern: /miscellaneous.*income/i, type: '1099_misc', confidence: 0.80 },

    // 1099-NEC patterns
    { pattern: /1099[-_\s]?nec/i, type: '1099_nec', confidence: 0.95 },
    { pattern: /nonemployee.*compensation/i, type: '1099_nec', confidence: 0.85 },
    { pattern: /contractor.*payment/i, type: '1099_nec', confidence: 0.75 },

    // 1099-B patterns
    { pattern: /1099[-_\s]?b\b/i, type: '1099_b', confidence: 0.95 },
    { pattern: /broker.*statement/i, type: '1099_b', confidence: 0.80 },
    { pattern: /stock.*sale/i, type: '1099_b', confidence: 0.75 },

    // Schedule C patterns
    { pattern: /schedule[-_\s]?c/i, type: 'schedule_c', confidence: 0.95 },
    { pattern: /self[-_\s]?employ/i, type: 'schedule_c', confidence: 0.80 },
    { pattern: /business.*income/i, type: 'schedule_c', confidence: 0.75 },

    // Receipt patterns
    { pattern: /receipt/i, type: 'receipt', confidence: 0.90 },
    { pattern: /expense/i, type: 'receipt', confidence: 0.75 },
    { pattern: /invoice/i, type: 'receipt', confidence: 0.70 },

    // Bank statement patterns
    { pattern: /bank[-_\s]?statement/i, type: 'bank_statement', confidence: 0.90 },
    { pattern: /account[-_\s]?statement/i, type: 'bank_statement', confidence: 0.85 },
    { pattern: /checking|savings/i, type: 'bank_statement', confidence: 0.75 },
];

/**
 * Classify a document based on its filename
 * @param filename The name of the file being uploaded
 * @returns The detected document type and confidence score
 */
export function classifyDocument(filename: string): ClassificationResult {
    // Normalize filename for matching
    const normalizedName = filename.toLowerCase();

    // Find the best matching pattern
    let bestMatch: ClassificationResult = { documentType: 'other', confidence: 0 };

    for (const { pattern, type, confidence } of documentPatterns) {
        if (pattern.test(normalizedName)) {
            if (confidence > bestMatch.confidence) {
                bestMatch = { documentType: type, confidence };
            }
        }
    }

    // If no match found, return 'other' with 0 confidence
    if (bestMatch.confidence === 0) {
        return { documentType: 'other', confidence: 0.5 };
    }

    return bestMatch;
}

/**
 * Extract potential employer/payer name from filename
 * Looks for patterns like "W2_CompanyName_2024.pdf"
 */
export function extractNameFromFilename(filename: string, documentType: DocumentType): string | null {
    // Remove file extension
    const baseName = filename.replace(/\.[^/.]+$/, '');

    // Remove common prefixes based on document type
    let cleaned = baseName;

    // Remove document type indicators
    cleaned = cleaned.replace(/w[-_\s]?2/gi, '');
    cleaned = cleaned.replace(/1099[-_\s]?(int|div|misc|nec|b)/gi, '');
    cleaned = cleaned.replace(/schedule[-_\s]?c/gi, '');

    // Remove years (2020-2030)
    cleaned = cleaned.replace(/20[2-3][0-9]/g, '');

    // Remove common suffixes
    cleaned = cleaned.replace(/[-_\s]*(copy|final|scan|signed|v\d+)/gi, '');

    // Clean up separators and get potential name
    cleaned = cleaned.replace(/[-_]+/g, ' ').trim();

    // If we have something meaningful (at least 2 chars), return it
    if (cleaned.length >= 2) {
        // Capitalize words
        return cleaned
            .split(' ')
            .filter(word => word.length > 0)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    }

    return null;
}

/**
 * Get human-readable description for classification result
 */
export function getClassificationDescription(result: ClassificationResult): string {
    const typeLabels: Record<DocumentType, string> = {
        w2: 'W-2 Wage Statement',
        '1099_int': '1099-INT Interest Income',
        '1099_div': '1099-DIV Dividend Income',
        '1099_misc': '1099-MISC Miscellaneous Income',
        '1099_nec': '1099-NEC Nonemployee Compensation',
        '1099_b': '1099-B Broker Transactions',
        schedule_c: 'Schedule C Business Income',
        receipt: 'Receipt/Expense',
        bank_statement: 'Bank Statement',
        other: 'Other Document',
    };

    const confidenceLevel =
        result.confidence >= 0.9 ? 'High confidence' :
            result.confidence >= 0.75 ? 'Medium confidence' :
                'Low confidence';

    return `${typeLabels[result.documentType]} (${confidenceLevel})`;
}
