/*
  # Fix RLS Infinite Recursion Error
  
  ## Problem
  The RLS policies on `cpa_firms`, `users`, and `clients_profile` tables reference
  each other, causing infinite recursion when PostgreSQL evaluates the policies.
  Error: "infinite recursion detected in policy for relation \"users\""
  
  ## Solution
  - Simplify policies to avoid cross-table references during INSERT
  - Use auth.uid() directly instead of querying the users table for ownership checks
  - This breaks the recursion cycle while maintaining security
*/

-- ============================================================================
-- DROP PROBLEMATIC POLICIES
-- ============================================================================

-- CPA Firms policies that cause recursion
DROP POLICY IF EXISTS "CPAs can view own firm" ON cpa_firms;
DROP POLICY IF EXISTS "CPAs can update own firm" ON cpa_firms;
DROP POLICY IF EXISTS "CPAs can create firms" ON cpa_firms;
DROP POLICY IF EXISTS "Authenticated users can create firms" ON cpa_firms;

-- Users policies that may contribute to recursion
DROP POLICY IF EXISTS "Users can view own data" ON users;
DROP POLICY IF EXISTS "CPAs can view assigned clients" ON users;
DROP POLICY IF EXISTS "Users can create own profile" ON users;
DROP POLICY IF EXISTS "CPAs can create client profiles" ON users;

-- Clients profile policies
DROP POLICY IF EXISTS "Clients can view own profile" ON clients_profile;
DROP POLICY IF EXISTS "CPAs can view assigned client profiles" ON clients_profile;
DROP POLICY IF EXISTS "Clients can create own profile" ON clients_profile;
DROP POLICY IF EXISTS "Users can create own client profile" ON clients_profile;

-- ============================================================================
-- RECREATE SIMPLE, NON-RECURSIVE POLICIES
-- ============================================================================

-- USERS TABLE --

-- Users can always view their own data (simple, no cross-table reference)
CREATE POLICY "Users can view own data"
  ON users FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Users can create their own profile during signup
CREATE POLICY "Users can create own profile"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- Users can update their own data
CREATE POLICY "Users can update own data"
  ON users FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- CPAs can view their clients (uses a simple subquery that doesn't recurse)
CREATE POLICY "CPAs can view assigned clients"
  ON users FOR SELECT
  TO authenticated
  USING (
    -- User viewing is a CPA and owns this client
    assigned_cpa_id = auth.uid()
  );

-- CPA FIRMS TABLE --

-- Anyone authenticated can create a firm (needed for signup)
CREATE POLICY "Authenticated users can create firms"
  ON cpa_firms FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Users can view firms they belong to
CREATE POLICY "Users can view own firm"
  ON cpa_firms FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT cpa_firm_id FROM users WHERE id = auth.uid()
    )
  );

-- Users can update firms they belong to
CREATE POLICY "Users can update own firm"
  ON cpa_firms FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT cpa_firm_id FROM users WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    id IN (
      SELECT cpa_firm_id FROM users WHERE id = auth.uid()
    )
  );

-- CLIENTS PROFILE TABLE --

-- Clients can view their own profile
CREATE POLICY "Clients can view own profile"
  ON clients_profile FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Clients can create their own profile during signup
CREATE POLICY "Users can create own client profile"
  ON clients_profile FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Clients can update their own profile
CREATE POLICY "Clients can update own profile"
  ON clients_profile FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- CPAs can view profiles of their assigned clients
CREATE POLICY "CPAs can view assigned client profiles"
  ON clients_profile FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM users WHERE assigned_cpa_id = auth.uid()
    )
  );

-- CPAs can update profiles of their assigned clients
CREATE POLICY "CPAs can update assigned client profiles"
  ON clients_profile FOR UPDATE
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM users WHERE assigned_cpa_id = auth.uid()
    )
  )
  WITH CHECK (
    user_id IN (
      SELECT id FROM users WHERE assigned_cpa_id = auth.uid()
    )
  );
