'use client';

import { DocumentType } from '@/lib/supabase/types';
import { extractNameFromFilename } from './document-classifier';

export interface ExtractedField {
    field_name: string;
    field_value: string | null;
    confidence_score: number;
    extraction_method: 'deterministic' | 'ocr' | 'ai' | 'manual';
}

// Define expected fields for each document type
const documentFieldDefinitions: Record<DocumentType, string[]> = {
    w2: [
        'employer_name',
        'employer_ein',
        'wages_tips_compensation',
        'federal_tax_withheld',
        'social_security_wages',
        'social_security_tax',
        'medicare_wages',
        'medicare_tax',
        'state',
        'state_wages',
        'state_tax_withheld',
    ],
    '1099_int': [
        'payer_name',
        'payer_tin',
        'interest_income',
        'early_withdrawal_penalty',
        'federal_tax_withheld',
    ],
    '1099_div': [
        'payer_name',
        'payer_tin',
        'ordinary_dividends',
        'qualified_dividends',
        'capital_gain_distributions',
        'federal_tax_withheld',
    ],
    '1099_misc': [
        'payer_name',
        'payer_tin',
        'rents',
        'royalties',
        'other_income',
        'federal_tax_withheld',
    ],
    '1099_nec': [
        'payer_name',
        'payer_tin',
        'nonemployee_compensation',
        'federal_tax_withheld',
    ],
    '1099_b': [
        'broker_name',
        'broker_tin',
        'proceeds',
        'cost_basis',
        'gain_loss',
        'wash_sale_loss',
    ],
    schedule_c: [
        'business_name',
        'business_ein',
        'gross_receipts',
        'total_expenses',
        'net_profit_loss',
    ],
    receipt: [
        'vendor_name',
        'expense_category',
        'amount',
        'date',
    ],
    bank_statement: [
        'bank_name',
        'account_type',
        'statement_period',
        'ending_balance',
    ],
    other: [],
};

// Human-readable labels for fields
export const fieldLabels: Record<string, string> = {
    employer_name: 'Employer Name',
    employer_ein: 'Employer EIN',
    wages_tips_compensation: 'Wages (Box 1)',
    federal_tax_withheld: 'Federal Tax Withheld',
    social_security_wages: 'Social Security Wages',
    social_security_tax: 'Social Security Tax',
    medicare_wages: 'Medicare Wages',
    medicare_tax: 'Medicare Tax',
    state: 'State',
    state_wages: 'State Wages',
    state_tax_withheld: 'State Tax Withheld',
    payer_name: 'Payer Name',
    payer_tin: 'Payer TIN',
    interest_income: 'Interest Income (Box 1)',
    early_withdrawal_penalty: 'Early Withdrawal Penalty',
    ordinary_dividends: 'Ordinary Dividends (Box 1a)',
    qualified_dividends: 'Qualified Dividends (Box 1b)',
    capital_gain_distributions: 'Capital Gain Distributions',
    rents: 'Rents',
    royalties: 'Royalties',
    other_income: 'Other Income',
    nonemployee_compensation: 'Nonemployee Compensation (Box 1)',
    broker_name: 'Broker Name',
    broker_tin: 'Broker TIN',
    proceeds: 'Proceeds',
    cost_basis: 'Cost Basis',
    gain_loss: 'Gain/Loss',
    wash_sale_loss: 'Wash Sale Loss',
    business_name: 'Business Name',
    business_ein: 'Business EIN',
    gross_receipts: 'Gross Receipts',
    total_expenses: 'Total Expenses',
    net_profit_loss: 'Net Profit/Loss',
    vendor_name: 'Vendor Name',
    expense_category: 'Category',
    amount: 'Amount',
    date: 'Date',
    bank_name: 'Bank Name',
    account_type: 'Account Type',
    statement_period: 'Statement Period',
    ending_balance: 'Ending Balance',
};

/**
 * Create initial extracted field records for a document
 * Uses filename to pre-populate what we can deterministically
 */
export function createInitialExtractedFields(
    filename: string,
    documentType: DocumentType
): ExtractedField[] {
    const fields = documentFieldDefinitions[documentType] || [];

    if (fields.length === 0) {
        return [];
    }

    // Try to extract name from filename
    const extractedName = extractNameFromFilename(filename, documentType);

    return fields.map(fieldName => {
        // Check if we can pre-populate this field from the filename
        let value: string | null = null;
        let confidence = 0;

        // Pre-populate name fields if we extracted one
        if (extractedName && ['employer_name', 'payer_name', 'broker_name', 'vendor_name', 'bank_name', 'business_name'].includes(fieldName)) {
            value = extractedName;
            confidence = 0.6; // Lower confidence since it's from filename
        }

        return {
            field_name: fieldName,
            field_value: value,
            confidence_score: confidence,
            extraction_method: 'deterministic' as const,
        };
    });
}

/**
 * Get the list of expected fields for a document type
 */
export function getExpectedFields(documentType: DocumentType): string[] {
    return documentFieldDefinitions[documentType] || [];
}

/**
 * Get human-readable label for a field
 */
export function getFieldLabel(fieldName: string): string {
    return fieldLabels[fieldName] || fieldName.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Check if a document type requires CPA review (has expected fields that need to be filled)
 */
export function requiresDataEntry(documentType: DocumentType): boolean {
    const fields = documentFieldDefinitions[documentType] || [];
    return fields.length > 0;
}
