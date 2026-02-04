/*
  # Storage Bucket Setup for Tax Documents

  ## Overview
  Creates a private storage bucket for tax documents with appropriate access policies.

  ## Bucket Configuration
  - Name: tax-documents
  - Type: Private (authentication required)
  - File size limit: 50MB
  - Allowed MIME types: PDF, images (JPG, PNG, HEIC)

  ## Folder Structure
  Files will be stored as: {cpa_firm_id}/{client_id}/{tax_year}/{document_id}-{filename}

  ## Security
  - Clients can upload to their own folders
  - CPAs can access all files for their assigned clients
  - Authenticated users only
*/

-- Create the tax-documents storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'tax-documents',
  'tax-documents',
  false,
  52428800, -- 50MB in bytes
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/heic',
    'image/heif'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies will be created in the RLS migration