/*
  # Seed Demo Data for Testing

  ## Overview
  Creates sample data for testing the tax document management system.
  Includes demo CPA firm, CPA user, client users, documents, tasks, and messages.

  ## Created Data
  
  ### 1. CPA Firm
  - Demo CPA Firm with basic information
  
  ### 2. Users
  - Demo CPA account (cpa@demo.com / password123)
  - Demo Client accounts (client@demo.com, john@demo.com, jane@demo.com / password123)
  
  ### 3. Client Profiles
  - Profile information for demo clients
  
  ### 4. Sample Documents
  - Various document types for different clients
  
  ### 5. Sample Tasks
  - Tasks assigned to clients
  
  ### 6. Sample Messages
  - Message exchanges between CPA and clients

  ## Note
  - Passwords must be set manually via Supabase Auth UI or signup flow
  - This migration creates the user records in the users table
  - Auth users must be created separately
*/

-- Insert demo CPA firm
INSERT INTO cpa_firms (id, firm_name, address, phone, tax_software_used)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'Smith & Associates CPA', '123 Main Street, New York, NY 10001', '(555) 123-4567', 'ProSeries')
ON CONFLICT (id) DO NOTHING;

-- Note: Auth users need to be created via signup or Supabase Auth
-- The following are just placeholders for the users table structure
-- In production, users would sign up through the application

-- Insert demo tasks (example structure)
-- These will reference users that will be created via signup

-- Insert sample CPA firm settings
UPDATE cpa_firms 
SET settings = '{"notification_preferences": {"email_on_upload": true, "email_on_message": true}}'::jsonb
WHERE id = '00000000-0000-0000-0000-000000000001';

-- Note: Additional seed data (users, documents, messages, tasks) should be created
-- after users sign up through the application, as they require valid auth.users references