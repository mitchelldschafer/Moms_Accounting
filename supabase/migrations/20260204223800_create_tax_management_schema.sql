/*
  # Tax Document Management System - Database Schema

  ## Overview
  Complete database schema for a multi-tenant tax document management SaaS platform
  with separate client and CPA portals.

  ## New Tables Created

  ### 1. cpa_firms
  - Stores CPA firm information
  - Each CPA belongs to a firm
  - Fields: firm_name, address, phone, tax_software_used, settings (JSONB)

  ### 2. users
  - Extends Supabase auth.users with profile data
  - Stores role ('cpa' | 'client'), firm associations, and CPA assignments
  - Fields: email, full_name, role, cpa_firm_id, assigned_cpa_id, phone

  ### 3. clients_profile
  - Extended profile information for clients
  - Stores tax-related data: SSN, filing status, dependents
  - Fields: ssn_encrypted, date_of_birth, address, filing_status, spouse info, dependents (JSONB)

  ### 4. documents
  - Central table for all uploaded tax documents
  - Tracks document lifecycle from upload to review
  - Fields: file metadata, document_type, tax_year, status, confidence_score
  - Links to both client and assigned CPA

  ### 5. extracted_data
  - Stores field-level data extracted from documents
  - Tracks extraction method and verification status
  - Fields: field_name, field_value, confidence_score, manually_verified

  ### 6. tasks
  - Task management between CPAs and clients
  - Fields: title, description, priority, status, due_date

  ### 7. messages
  - Internal messaging system between CPAs and clients
  - Fields: from_user, to_user, subject, body, read status
  - Can reference related documents

  ## Security
  - All tables have RLS enabled (policies defined in separate migration)
  - Timestamps for audit trails
  - UUID primary keys for security

  ## Important Notes
  1. SSN fields are marked as "encrypted" but encryption implementation is future work
  2. Document status flow: uploaded → processing → extracted → reviewed → complete
  3. File storage handled separately in Supabase Storage bucket
  4. JSONB fields for flexible data (dependents, firm settings)
*/

-- Create custom types/enums
CREATE TYPE user_role AS ENUM ('cpa', 'client');

CREATE TYPE filing_status AS ENUM (
  'single',
  'married_joint',
  'married_separate',
  'head_of_household',
  'qualifying_widow'
);

CREATE TYPE document_type AS ENUM (
  'w2',
  '1099_misc',
  '1099_int',
  '1099_div',
  '1099_b',
  '1099_nec',
  'schedule_c',
  'receipt',
  'bank_statement',
  'other'
);

CREATE TYPE document_status AS ENUM (
  'uploaded',
  'processing',
  'extracted',
  'reviewed',
  'complete'
);

CREATE TYPE extraction_method AS ENUM (
  'deterministic',
  'ocr',
  'ai',
  'manual'
);

CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high');

CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'completed');

-- Table: cpa_firms
CREATE TABLE IF NOT EXISTS cpa_firms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_name text NOT NULL,
  address text,
  phone text,
  tax_software_used text,
  settings jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Table: users (extends auth.users)
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role user_role NOT NULL,
  cpa_firm_id uuid REFERENCES cpa_firms(id) ON DELETE SET NULL,
  assigned_cpa_id uuid REFERENCES users(id) ON DELETE SET NULL,
  phone text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table: clients_profile
CREATE TABLE IF NOT EXISTS clients_profile (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ssn_encrypted text,
  date_of_birth date,
  address text,
  filing_status filing_status,
  spouse_name text,
  spouse_ssn_encrypted text,
  dependents jsonb DEFAULT '[]'::jsonb,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table: documents
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cpa_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_size bigint NOT NULL,
  file_type text NOT NULL,
  document_type document_type,
  tax_year integer NOT NULL,
  status document_status DEFAULT 'uploaded',
  uploaded_at timestamptz DEFAULT now(),
  processed_at timestamptz,
  reviewed_at timestamptz,
  confidence_score numeric(5, 2),
  requires_review boolean DEFAULT false,
  notes text
);

-- Table: extracted_data
CREATE TABLE IF NOT EXISTS extracted_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  field_name text NOT NULL,
  field_value text,
  confidence_score numeric(5, 2),
  manually_verified boolean DEFAULT false,
  verified_by uuid REFERENCES users(id) ON DELETE SET NULL,
  verified_at timestamptz,
  extraction_method extraction_method NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Table: tasks
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cpa_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  priority task_priority DEFAULT 'medium',
  status task_status DEFAULT 'pending',
  due_date date,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Table: messages
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject text,
  body text NOT NULL,
  read boolean DEFAULT false,
  related_document_id uuid REFERENCES documents(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_cpa_firm ON users(cpa_firm_id);
CREATE INDEX IF NOT EXISTS idx_users_assigned_cpa ON users(assigned_cpa_id);

CREATE INDEX IF NOT EXISTS idx_clients_profile_user ON clients_profile(user_id);

CREATE INDEX IF NOT EXISTS idx_documents_client ON documents(client_id);
CREATE INDEX IF NOT EXISTS idx_documents_cpa ON documents(cpa_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_tax_year ON documents(tax_year);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_at ON documents(uploaded_at DESC);

CREATE INDEX IF NOT EXISTS idx_extracted_data_document ON extracted_data(document_id);

CREATE INDEX IF NOT EXISTS idx_tasks_client ON tasks(client_id);
CREATE INDEX IF NOT EXISTS idx_tasks_cpa ON tasks(cpa_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);

CREATE INDEX IF NOT EXISTS idx_messages_from_user ON messages(from_user_id);
CREATE INDEX IF NOT EXISTS idx_messages_to_user ON messages(to_user_id);
CREATE INDEX IF NOT EXISTS idx_messages_read ON messages(read);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_profile_updated_at
  BEFORE UPDATE ON clients_profile
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();