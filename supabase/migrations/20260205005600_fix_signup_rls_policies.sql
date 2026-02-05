/*
  # Fix Signup Flow RLS Policies
  
  ## Problem
  The signup flow was broken because:
  1. CPA firm insert policy required the users record to exist first
  2. Clients_profile insert needed a more permissive policy during signup
  
  ## Solution
  - Allow any authenticated user to create a CPA firm (they'll be linked immediately after)
  - Allow authenticated users to create their clients_profile during signup
*/

-- Drop the existing restrictive policies
DROP POLICY IF EXISTS "CPAs can create firms" ON cpa_firms;
DROP POLICY IF EXISTS "Clients can create own profile" ON clients_profile;

-- Allow any authenticated user to create a firm during signup
-- The firm will be linked to their account immediately after
CREATE POLICY "Authenticated users can create firms"
  ON cpa_firms FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow any authenticated user to create their own client profile during signup
CREATE POLICY "Users can create own client profile"
  ON clients_profile FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Also need to allow clients to insert extracted_data during document upload
-- The document policy already allows clients to upload, but extracted_data was CPA-only
DROP POLICY IF EXISTS "CPAs can insert extracted data" ON extracted_data;

-- Allow document uploader (client or CPA) to create extracted data
CREATE POLICY "Document uploaders can insert extracted data"
  ON extracted_data FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = extracted_data.document_id
      AND (
        -- Client owns the document
        documents.client_id = auth.uid()
        OR
        -- CPA manages the document
        documents.cpa_id = auth.uid()
        OR
        -- CPA is in same firm
        EXISTS (
          SELECT 1 FROM users
          WHERE users.id = auth.uid()
          AND users.role = 'cpa'
          AND documents.cpa_id IN (
            SELECT id FROM users cpas
            WHERE cpas.cpa_firm_id = users.cpa_firm_id
            AND cpas.role = 'cpa'
          )
        )
      )
    )
  );
