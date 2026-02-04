/*
  # Fix CPA Signup Flow

  ## Problem
  During CPA signup, there's a circular dependency:
  - Firm creation requires user to exist with role 'cpa'
  - But we're trying to create the firm BEFORE creating the user record

  ## Solution
  Allow any authenticated user to create a firm during signup.
  The signup flow will be: auth user → firm → user record with firm_id

  ## Changes
  - Drop the restrictive firm creation policy
  - Add a more permissive policy that allows any authenticated user to create a firm
*/

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "CPAs can create firms" ON cpa_firms;

-- Create a more permissive policy for signup
-- Any authenticated user can create a firm (they become the CPA for that firm)
CREATE POLICY "Authenticated users can create firms"
  ON cpa_firms FOR INSERT
  TO authenticated
  WITH CHECK (true);
