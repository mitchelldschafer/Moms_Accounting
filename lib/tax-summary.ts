'use client';

import { fieldLabels } from './field-extractor';

export interface TaxLineItem {
  label: string;
  amount: number;
  source: string;
  verified: boolean;
  documentId?: string;
  fieldId?: string;
}

export interface TaxSummary {
  // Income
  wagesIncome: TaxLineItem[];
  interestIncome: TaxLineItem[];
  dividendIncome: TaxLineItem[];
  businessIncome: TaxLineItem[];
  capitalGains: TaxLineItem[];
  otherIncome: TaxLineItem[];
  totalIncome: number;

  // Withholdings
  federalWithheld: TaxLineItem[];
  stateWithheld: TaxLineItem[];
  socialSecurityTax: TaxLineItem[];
  medicareTax: TaxLineItem[];
  totalFederalWithheld: number;
  totalStateWithheld: number;

  // Client-reported deductions
  clientDeductions: TaxLineItem[];
  totalClientDeductions: number;

  // Dependents
  dependents: Array<{ name: string; relationship: string; dob: string }>;
}

// Maps extracted_data field_name to income/withholding category
const INCOME_FIELD_MAP: Record<string, keyof Pick<TaxSummary, 'wagesIncome' | 'interestIncome' | 'dividendIncome' | 'businessIncome' | 'capitalGains' | 'otherIncome'>> = {
  wages_tips_compensation: 'wagesIncome',
  interest_income: 'interestIncome',
  ordinary_dividends: 'dividendIncome',
  qualified_dividends: 'dividendIncome',
  nonemployee_compensation: 'otherIncome',
  gross_receipts: 'businessIncome',
  net_profit_loss: 'businessIncome',
  gain_loss: 'capitalGains',
  proceeds: 'capitalGains',
  rents: 'otherIncome',
  royalties: 'otherIncome',
  other_income: 'otherIncome',
  amount: 'otherIncome',
};

const WITHHOLDING_FIELDS: Record<string, 'federalWithheld' | 'stateWithheld' | 'socialSecurityTax' | 'medicareTax'> = {
  federal_tax_withheld: 'federalWithheld',
  state_tax_withheld: 'stateWithheld',
  social_security_tax: 'socialSecurityTax',
  medicare_tax: 'medicareTax',
};

// Client-reported income type to summary category
const CLIENT_INCOME_MAP: Record<string, keyof Pick<TaxSummary, 'wagesIncome' | 'interestIncome' | 'dividendIncome' | 'businessIncome' | 'capitalGains' | 'otherIncome'>> = {
  w2_wages: 'wagesIncome',
  '1099_int': 'interestIncome',
  '1099_div': 'dividendIncome',
  '1099_nec': 'otherIncome',
  '1099_misc': 'otherIncome',
  '1099_b': 'capitalGains',
  business: 'businessIncome',
  rental: 'otherIncome',
  retirement: 'otherIncome',
  social_security: 'otherIncome',
  other: 'otherIncome',
};

export function buildTaxSummary(
  extractedData: Array<{
    id: string;
    document_id: string;
    field_name: string;
    field_value: string | null;
    confidence_score: number | null;
    manually_verified: boolean;
    document?: { file_name: string; document_type: string } | null;
  }>,
  clientTaxInfo?: {
    income_sources?: Array<{ type: string; source_name: string; amount: string }>;
    deductions?: Array<{ category: string; description: string; amount: string }>;
    dependents?: Array<{ name: string; relationship: string; date_of_birth: string }>;
  } | null
): TaxSummary {
  const summary: TaxSummary = {
    wagesIncome: [],
    interestIncome: [],
    dividendIncome: [],
    businessIncome: [],
    capitalGains: [],
    otherIncome: [],
    totalIncome: 0,
    federalWithheld: [],
    stateWithheld: [],
    socialSecurityTax: [],
    medicareTax: [],
    totalFederalWithheld: 0,
    totalStateWithheld: 0,
    clientDeductions: [],
    totalClientDeductions: 0,
    dependents: [],
  };

  // Group extracted data by document for source labeling
  const docNameMap = new Map<string, string>();
  for (const field of extractedData) {
    if (field.document?.file_name) {
      // Build a label from employer/payer name or filename
      const nameField = extractedData.find(
        f => f.document_id === field.document_id &&
        ['employer_name', 'payer_name', 'broker_name', 'business_name', 'vendor_name', 'bank_name'].includes(f.field_name) &&
        f.field_value
      );
      docNameMap.set(field.document_id, nameField?.field_value || field.document.file_name);
    }
  }

  // Process extracted document data
  for (const field of extractedData) {
    const amount = parseFloat(field.field_value || '');
    if (isNaN(amount) || amount === 0) continue;

    const sourceName = docNameMap.get(field.document_id) || 'Document';
    const verified = field.manually_verified;

    // Check if this is an income field
    const incomeCategory = INCOME_FIELD_MAP[field.field_name];
    if (incomeCategory) {
      // Avoid double-counting: skip proceeds if gain_loss exists for same doc
      if (field.field_name === 'proceeds') {
        const hasGainLoss = extractedData.some(
          f => f.document_id === field.document_id && f.field_name === 'gain_loss' && f.field_value
        );
        if (hasGainLoss) continue;
      }
      // Skip gross_receipts if net_profit_loss exists
      if (field.field_name === 'gross_receipts') {
        const hasNetProfit = extractedData.some(
          f => f.document_id === field.document_id && f.field_name === 'net_profit_loss' && f.field_value
        );
        if (hasNetProfit) continue;
      }

      summary[incomeCategory].push({
        label: fieldLabels[field.field_name] || field.field_name,
        amount,
        source: sourceName,
        verified,
        documentId: field.document_id,
        fieldId: field.id,
      });
    }

    // Check if this is a withholding field
    const withholdingCategory = WITHHOLDING_FIELDS[field.field_name];
    if (withholdingCategory) {
      summary[withholdingCategory].push({
        label: fieldLabels[field.field_name] || field.field_name,
        amount,
        source: sourceName,
        verified,
        documentId: field.document_id,
        fieldId: field.id,
      });
    }
  }

  // Add client-reported income
  if (clientTaxInfo?.income_sources) {
    for (const src of clientTaxInfo.income_sources) {
      const amount = parseFloat(src.amount);
      if (isNaN(amount) || amount === 0) continue;

      const category = CLIENT_INCOME_MAP[src.type] || 'otherIncome';
      summary[category].push({
        label: src.source_name || src.type,
        amount,
        source: 'Client-reported',
        verified: false,
      });
    }
  }

  // Add client-reported deductions
  if (clientTaxInfo?.deductions) {
    for (const ded of clientTaxInfo.deductions) {
      const amount = parseFloat(ded.amount);
      if (isNaN(amount) || amount === 0) continue;

      summary.clientDeductions.push({
        label: ded.description || ded.category,
        amount,
        source: 'Client-reported',
        verified: false,
      });
    }
  }

  // Dependents
  if (clientTaxInfo?.dependents) {
    summary.dependents = clientTaxInfo.dependents.map(d => ({
      name: d.name,
      relationship: d.relationship,
      dob: d.date_of_birth,
    }));
  }

  // Calculate totals
  const sumItems = (items: TaxLineItem[]) => items.reduce((s, i) => s + i.amount, 0);

  summary.totalIncome =
    sumItems(summary.wagesIncome) +
    sumItems(summary.interestIncome) +
    sumItems(summary.dividendIncome) +
    sumItems(summary.businessIncome) +
    sumItems(summary.capitalGains) +
    sumItems(summary.otherIncome);

  summary.totalFederalWithheld = sumItems(summary.federalWithheld);
  summary.totalStateWithheld = sumItems(summary.stateWithheld);
  summary.totalClientDeductions = sumItems(summary.clientDeductions);

  return summary;
}

export function formatCurrency(amount: number): string {
  return amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}
