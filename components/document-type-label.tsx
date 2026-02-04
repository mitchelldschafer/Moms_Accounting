import { DocumentType } from '@/lib/supabase/types';

const documentTypeLabels: Record<DocumentType, string> = {
  w2: 'W-2',
  '1099_misc': '1099-MISC',
  '1099_int': '1099-INT',
  '1099_div': '1099-DIV',
  '1099_b': '1099-B',
  '1099_nec': '1099-NEC',
  schedule_c: 'Schedule C',
  receipt: 'Receipt',
  bank_statement: 'Bank Statement',
  other: 'Other',
};

interface DocumentTypeLabelProps {
  type: DocumentType | null;
}

export function DocumentTypeLabel({ type }: DocumentTypeLabelProps) {
  if (!type) return <span className="text-gray-500">-</span>;
  return <span>{documentTypeLabels[type]}</span>;
}

export function getDocumentTypeOptions(): { value: DocumentType; label: string }[] {
  return Object.entries(documentTypeLabels).map(([value, label]) => ({
    value: value as DocumentType,
    label,
  }));
}
