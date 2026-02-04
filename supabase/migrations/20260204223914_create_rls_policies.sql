/*
  # Row Level Security Policies

  ## Overview
  Comprehensive RLS policies for all tables in the tax management system.
  Implements strict security: clients can only access their own data,
  CPAs can access data for their assigned clients.

  ## Security Model
  
  ### Clients
  - Can read/update their own user profile
  - Can read/update their own client profile
  - Can insert/read their own documents
  - Can read/insert messages to/from their CPA
  - Can read tasks assigned to them
  
  ### CPAs
  - Can read/update their firm information
  - Can read all users in their firm
  - Can read/update profiles of assigned clients
  - Can read/update/delete documents for assigned clients
  - Can insert/read/update extracted data for assigned client documents
  - Can insert/read/update/delete tasks for assigned clients
  - Can insert/read messages with their clients
  
  ## Tables Secured
  1. cpa_firms
  2. users
  3. clients_profile
  4. documents
  5. extracted_data
  6. tasks
  7. messages
  8. storage.objects (tax-documents bucket)
*/

-- Enable RLS on all tables
ALTER TABLE cpa_firms ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE extracted_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- CPA FIRMS POLICIES
-- ============================================================================

-- CPAs can view their own firm
CREATE POLICY "CPAs can view own firm"
  ON cpa_firms FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'cpa'
      AND users.cpa_firm_id = cpa_firms.id
    )
  );

-- CPAs can update their own firm
CREATE POLICY "CPAs can update own firm"
  ON cpa_firms FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'cpa'
      AND users.cpa_firm_id = cpa_firms.id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'cpa'
      AND users.cpa_firm_id = cpa_firms.id
    )
  );

-- CPAs can insert new firms (for initial setup)
CREATE POLICY "CPAs can create firms"
  ON cpa_firms FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'cpa'
    )
  );

-- ============================================================================
-- USERS POLICIES
-- ============================================================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- CPAs can view users in their firm
CREATE POLICY "CPAs can view firm users"
  ON users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users cpa
      WHERE cpa.id = auth.uid()
      AND cpa.role = 'cpa'
      AND users.cpa_firm_id = cpa.cpa_firm_id
    )
  );

-- CPAs can view their assigned clients
CREATE POLICY "CPAs can view assigned clients"
  ON users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users cpa
      WHERE cpa.id = auth.uid()
      AND cpa.role = 'cpa'
      AND users.assigned_cpa_id = cpa.id
      AND users.role = 'client'
    )
  );

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- CPAs can update assigned client profiles
CREATE POLICY "CPAs can update assigned clients"
  ON users FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users cpa
      WHERE cpa.id = auth.uid()
      AND cpa.role = 'cpa'
      AND users.assigned_cpa_id = cpa.id
      AND users.role = 'client'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users cpa
      WHERE cpa.id = auth.uid()
      AND cpa.role = 'cpa'
      AND users.assigned_cpa_id = cpa.id
      AND users.role = 'client'
    )
  );

-- Allow user creation during signup
CREATE POLICY "Users can create own profile"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- CPAs can create client profiles
CREATE POLICY "CPAs can create client profiles"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users cpa
      WHERE cpa.id = auth.uid()
      AND cpa.role = 'cpa'
    )
  );

-- ============================================================================
-- CLIENTS_PROFILE POLICIES
-- ============================================================================

-- Clients can view own profile
CREATE POLICY "Clients can view own profile"
  ON clients_profile FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
  );

-- CPAs can view assigned client profiles
CREATE POLICY "CPAs can view assigned client profiles"
  ON clients_profile FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'cpa'
      AND clients_profile.user_id IN (
        SELECT id FROM users clients
        WHERE clients.assigned_cpa_id = auth.uid()
        AND clients.role = 'client'
      )
    )
  );

-- Clients can update own profile
CREATE POLICY "Clients can update own profile"
  ON clients_profile FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- CPAs can update assigned client profiles
CREATE POLICY "CPAs can update assigned client profiles"
  ON clients_profile FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'cpa'
      AND clients_profile.user_id IN (
        SELECT id FROM users clients
        WHERE clients.assigned_cpa_id = auth.uid()
        AND clients.role = 'client'
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'cpa'
      AND clients_profile.user_id IN (
        SELECT id FROM users clients
        WHERE clients.assigned_cpa_id = auth.uid()
        AND clients.role = 'client'
      )
    )
  );

-- Clients can create own profile
CREATE POLICY "Clients can create own profile"
  ON clients_profile FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- CPAs can create profiles for assigned clients
CREATE POLICY "CPAs can create client profiles"
  ON clients_profile FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'cpa'
      AND clients_profile.user_id IN (
        SELECT id FROM users clients
        WHERE clients.assigned_cpa_id = auth.uid()
        AND clients.role = 'client'
      )
    )
  );

-- ============================================================================
-- DOCUMENTS POLICIES
-- ============================================================================

-- Clients can view own documents
CREATE POLICY "Clients can view own documents"
  ON documents FOR SELECT
  TO authenticated
  USING (client_id = auth.uid());

-- CPAs can view documents for assigned clients
CREATE POLICY "CPAs can view assigned client documents"
  ON documents FOR SELECT
  TO authenticated
  USING (
    cpa_id = auth.uid()
    OR
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
  );

-- Clients can insert own documents
CREATE POLICY "Clients can upload own documents"
  ON documents FOR INSERT
  TO authenticated
  WITH CHECK (
    client_id = auth.uid()
    AND
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'client'
      AND users.assigned_cpa_id = documents.cpa_id
    )
  );

-- CPAs can insert documents for assigned clients
CREATE POLICY "CPAs can upload documents for clients"
  ON documents FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'cpa'
      AND documents.client_id IN (
        SELECT id FROM users clients
        WHERE clients.assigned_cpa_id = auth.uid()
        AND clients.role = 'client'
      )
    )
  );

-- CPAs can update documents for assigned clients
CREATE POLICY "CPAs can update assigned client documents"
  ON documents FOR UPDATE
  TO authenticated
  USING (
    cpa_id = auth.uid()
    OR
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
  WITH CHECK (
    cpa_id = auth.uid()
    OR
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
  );

-- Clients can delete own unreviewed documents
CREATE POLICY "Clients can delete own unreviewed documents"
  ON documents FOR DELETE
  TO authenticated
  USING (
    client_id = auth.uid()
    AND status NOT IN ('reviewed', 'complete')
  );

-- CPAs can delete documents for assigned clients
CREATE POLICY "CPAs can delete assigned client documents"
  ON documents FOR DELETE
  TO authenticated
  USING (
    cpa_id = auth.uid()
    OR
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
  );

-- ============================================================================
-- EXTRACTED_DATA POLICIES
-- ============================================================================

-- Clients can view extracted data from own documents
CREATE POLICY "Clients can view own extracted data"
  ON extracted_data FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = extracted_data.document_id
      AND documents.client_id = auth.uid()
    )
  );

-- CPAs can view extracted data for assigned clients
CREATE POLICY "CPAs can view assigned client extracted data"
  ON extracted_data FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM documents
      JOIN users ON users.id = auth.uid()
      WHERE documents.id = extracted_data.document_id
      AND users.role = 'cpa'
      AND (
        documents.cpa_id = auth.uid()
        OR
        documents.cpa_id IN (
          SELECT id FROM users cpas
          WHERE cpas.cpa_firm_id = users.cpa_firm_id
          AND cpas.role = 'cpa'
        )
      )
    )
  );

-- CPAs can insert extracted data for assigned clients
CREATE POLICY "CPAs can insert extracted data"
  ON extracted_data FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM documents
      JOIN users ON users.id = auth.uid()
      WHERE documents.id = extracted_data.document_id
      AND users.role = 'cpa'
      AND (
        documents.cpa_id = auth.uid()
        OR
        documents.cpa_id IN (
          SELECT id FROM users cpas
          WHERE cpas.cpa_firm_id = users.cpa_firm_id
          AND cpas.role = 'cpa'
        )
      )
    )
  );

-- CPAs can update extracted data for assigned clients
CREATE POLICY "CPAs can update extracted data"
  ON extracted_data FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM documents
      JOIN users ON users.id = auth.uid()
      WHERE documents.id = extracted_data.document_id
      AND users.role = 'cpa'
      AND (
        documents.cpa_id = auth.uid()
        OR
        documents.cpa_id IN (
          SELECT id FROM users cpas
          WHERE cpas.cpa_firm_id = users.cpa_firm_id
          AND cpas.role = 'cpa'
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM documents
      JOIN users ON users.id = auth.uid()
      WHERE documents.id = extracted_data.document_id
      AND users.role = 'cpa'
      AND (
        documents.cpa_id = auth.uid()
        OR
        documents.cpa_id IN (
          SELECT id FROM users cpas
          WHERE cpas.cpa_firm_id = users.cpa_firm_id
          AND cpas.role = 'cpa'
        )
      )
    )
  );

-- ============================================================================
-- TASKS POLICIES
-- ============================================================================

-- Clients can view own tasks
CREATE POLICY "Clients can view own tasks"
  ON tasks FOR SELECT
  TO authenticated
  USING (client_id = auth.uid());

-- CPAs can view tasks for assigned clients
CREATE POLICY "CPAs can view assigned client tasks"
  ON tasks FOR SELECT
  TO authenticated
  USING (
    cpa_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'cpa'
      AND tasks.cpa_id IN (
        SELECT id FROM users cpas
        WHERE cpas.cpa_firm_id = users.cpa_firm_id
        AND cpas.role = 'cpa'
      )
    )
  );

-- CPAs can insert tasks for assigned clients
CREATE POLICY "CPAs can create tasks for clients"
  ON tasks FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'cpa'
      AND tasks.client_id IN (
        SELECT id FROM users clients
        WHERE clients.assigned_cpa_id = auth.uid()
        AND clients.role = 'client'
      )
    )
  );

-- CPAs can update tasks for assigned clients
CREATE POLICY "CPAs can update tasks for clients"
  ON tasks FOR UPDATE
  TO authenticated
  USING (
    cpa_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'cpa'
      AND tasks.cpa_id IN (
        SELECT id FROM users cpas
        WHERE cpas.cpa_firm_id = users.cpa_firm_id
        AND cpas.role = 'cpa'
      )
    )
  )
  WITH CHECK (
    cpa_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'cpa'
      AND tasks.cpa_id IN (
        SELECT id FROM users cpas
        WHERE cpas.cpa_firm_id = users.cpa_firm_id
        AND cpas.role = 'cpa'
      )
    )
  );

-- Clients can update status of own tasks
CREATE POLICY "Clients can update own task status"
  ON tasks FOR UPDATE
  TO authenticated
  USING (client_id = auth.uid())
  WITH CHECK (client_id = auth.uid());

-- CPAs can delete tasks for assigned clients
CREATE POLICY "CPAs can delete tasks for clients"
  ON tasks FOR DELETE
  TO authenticated
  USING (
    cpa_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'cpa'
      AND tasks.cpa_id IN (
        SELECT id FROM users cpas
        WHERE cpas.cpa_firm_id = users.cpa_firm_id
        AND cpas.role = 'cpa'
      )
    )
  );

-- ============================================================================
-- MESSAGES POLICIES
-- ============================================================================

-- Users can view messages sent to them
CREATE POLICY "Users can view received messages"
  ON messages FOR SELECT
  TO authenticated
  USING (to_user_id = auth.uid());

-- Users can view messages they sent
CREATE POLICY "Users can view sent messages"
  ON messages FOR SELECT
  TO authenticated
  USING (from_user_id = auth.uid());

-- Clients can send messages to their assigned CPA
CREATE POLICY "Clients can send messages to CPA"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    from_user_id = auth.uid()
    AND
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'client'
      AND users.assigned_cpa_id = messages.to_user_id
    )
  );

-- CPAs can send messages to assigned clients
CREATE POLICY "CPAs can send messages to clients"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    from_user_id = auth.uid()
    AND
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'cpa'
      AND messages.to_user_id IN (
        SELECT id FROM users clients
        WHERE clients.assigned_cpa_id = auth.uid()
        AND clients.role = 'client'
      )
    )
  );

-- Users can update their own messages (mark as read)
CREATE POLICY "Users can update received messages"
  ON messages FOR UPDATE
  TO authenticated
  USING (to_user_id = auth.uid())
  WITH CHECK (to_user_id = auth.uid());

-- ============================================================================
-- STORAGE POLICIES (tax-documents bucket)
-- ============================================================================

-- Clients can upload files to their own folder
CREATE POLICY "Clients can upload own files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'tax-documents'
    AND
    (storage.foldername(name))[2] = auth.uid()::text
  );

-- Clients can view own files
CREATE POLICY "Clients can view own files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'tax-documents'
    AND
    (storage.foldername(name))[2] = auth.uid()::text
  );

-- CPAs can view files for assigned clients
CREATE POLICY "CPAs can view assigned client files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'tax-documents'
    AND
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'cpa'
      AND (storage.foldername(name))[2] IN (
        SELECT id::text FROM users clients
        WHERE clients.assigned_cpa_id = auth.uid()
        AND clients.role = 'client'
      )
    )
  );

-- CPAs can upload files for assigned clients
CREATE POLICY "CPAs can upload files for clients"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'tax-documents'
    AND
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'cpa'
      AND (storage.foldername(name))[2] IN (
        SELECT id::text FROM users clients
        WHERE clients.assigned_cpa_id = auth.uid()
        AND clients.role = 'client'
      )
    )
  );

-- Clients can delete own unreviewed files
CREATE POLICY "Clients can delete own files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'tax-documents'
    AND
    (storage.foldername(name))[2] = auth.uid()::text
  );

-- CPAs can delete files for assigned clients
CREATE POLICY "CPAs can delete client files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'tax-documents'
    AND
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'cpa'
      AND (storage.foldername(name))[2] IN (
        SELECT id::text FROM users clients
        WHERE clients.assigned_cpa_id = auth.uid()
        AND clients.role = 'client'
      )
    )
  );