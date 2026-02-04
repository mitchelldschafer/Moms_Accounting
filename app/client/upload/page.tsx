'use client';

import { useState } from 'react';
import { ClientLayout } from '@/components/layouts/client-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/components/auth-provider';
import { getDocumentTypeOptions } from '@/components/document-type-label';
import { FileUpload } from '@/components/file-upload';
import { DocumentType } from '@/lib/supabase/types';

export default function ClientUpload() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [taxYear, setTaxYear] = useState(new Date().getFullYear().toString());
  const [documentType, setDocumentType] = useState<DocumentType | ''>('');
  const [notes, setNotes] = useState('');
  const [uploading, setUploading] = useState(false);

  const currentYear = new Date().getFullYear();
  const taxYears = Array.from({ length: 4 }, (_, i) => currentYear - i);

  const handleFileUpload = async (file: File) => {
    if (!user || !user.assigned_cpa_id) {
      throw new Error('No CPA assigned. Please contact support.');
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${user.cpa_firm_id || 'default'}/${user.id}/${taxYear}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('tax-documents')
      .upload(filePath, file);

    if (uploadError) {
      throw uploadError;
    }

    const { data: urlData } = supabase.storage
      .from('tax-documents')
      .getPublicUrl(filePath);

    const { error: dbError } = await (supabase as any).from('documents').insert({
      client_id: user.id,
      cpa_id: user.assigned_cpa_id,
      file_name: file.name,
      file_url: urlData.publicUrl,
      file_size: file.size,
      file_type: file.type,
      document_type: documentType || null,
      tax_year: parseInt(taxYear),
      notes: notes || null,
      status: 'uploaded',
    });

    if (dbError) {
      await supabase.storage.from('tax-documents').remove([filePath]);
      throw dbError;
    }
  };

  const handleUploadComplete = () => {
    toast({
      title: 'Upload Complete',
      description: 'Your documents have been uploaded successfully',
    });

    setDocumentType('');
    setNotes('');
  };

  return (
    <ClientLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Upload Documents</h1>
          <p className="mt-2 text-gray-600">
            Upload your tax documents securely. Your CPA will be notified.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Document Details</CardTitle>
            <CardDescription>
              Provide information about the documents you're uploading
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="tax-year">Tax Year *</Label>
                <Select value={taxYear} onValueChange={setTaxYear}>
                  <SelectTrigger id="tax-year">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {taxYears.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="document-type">Document Type (Optional)</Label>
                <Select
                  value={documentType}
                  onValueChange={(value) => setDocumentType(value as DocumentType)}
                >
                  <SelectTrigger id="document-type">
                    <SelectValue placeholder="Select type..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Not specified</SelectItem>
                    {getDocumentTypeOptions().map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add any additional information about these documents..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Upload Files</Label>
              <FileUpload onUpload={handleFileUpload} multiple />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Tip:</strong> You can upload multiple files at once. Supported formats: PDF, JPG, PNG, HEIC (max 50MB per file).
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </ClientLayout>
  );
}
