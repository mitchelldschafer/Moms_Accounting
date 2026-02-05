/*
  # Client Invitations System
  
  Creates a system for CPAs to invite clients by email.
  
  ## New Table: client_invitations
  - Tracks pending and accepted invitations
  - Token-based acceptance for security
  - Links invited clients to their CPA automatically on signup
  
  ## Invitation Flow:
  1. CPA enters client email and clicks "Invite"
  2. Invitation record created with unique token
  3. Client signs up with that email
  4. On signup, system checks for pending invitation
  5. If found, auto-assigns client to CPA
*/

-- Create invitation status enum
CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'expired', 'cancelled');

-- Table: client_invitations
CREATE TABLE IF NOT EXISTS client_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cpa_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  firm_id uuid NOT NULL REFERENCES cpa_firms(id) ON DELETE CASCADE,
  email text NOT NULL,
  token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  status invitation_status DEFAULT 'pending',
  invited_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '30 days'),
  accepted_at timestamptz,
  accepted_by uuid REFERENCES users(id) ON DELETE SET NULL,
  client_name text, -- Optional: pre-fill client name
  notes text -- Optional: CPA notes about this client
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_invitations_email ON client_invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON client_invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_cpa ON client_invitations(cpa_id);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON client_invitations(status);

-- Enable RLS
ALTER TABLE client_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for client_invitations

-- CPAs can view invitations they created
CREATE POLICY "CPAs can view their own invitations"
  ON client_invitations FOR SELECT
  TO authenticated
  USING (
    cpa_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'cpa' AND cpa_firm_id = client_invitations.firm_id
    )
  );

-- CPAs can create invitations
CREATE POLICY "CPAs can create invitations"
  ON client_invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'cpa'
    )
  );

-- CPAs can update their invitations (cancel, etc.)
CREATE POLICY "CPAs can update their invitations"
  ON client_invitations FOR UPDATE
  TO authenticated
  USING (
    cpa_id = auth.uid()
  )
  WITH CHECK (
    cpa_id = auth.uid()
  );

-- Anyone can check if invitation exists by token (for signup flow)
CREATE POLICY "Anyone can check invitation by token"
  ON client_invitations FOR SELECT
  TO authenticated
  USING (
    status = 'pending' AND expires_at > now()
  );

-- Function to accept an invitation during signup
CREATE OR REPLACE FUNCTION accept_invitation(
  invitation_token text,
  new_user_id uuid
)
RETURNS void AS $$
DECLARE
  inv record;
BEGIN
  -- Find the pending invitation
  SELECT * INTO inv
  FROM client_invitations
  WHERE token = invitation_token
    AND status = 'pending'
    AND expires_at > now();
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invitation';
  END IF;
  
  -- Update the invitation
  UPDATE client_invitations
  SET status = 'accepted',
      accepted_at = now(),
      accepted_by = new_user_id
  WHERE id = inv.id;
  
  -- Assign the client to this CPA
  UPDATE users
  SET assigned_cpa_id = inv.cpa_id,
      cpa_firm_id = inv.firm_id
  WHERE id = new_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check for pending invitation by email (called during signup)
CREATE OR REPLACE FUNCTION check_pending_invitation(client_email text)
RETURNS TABLE (
  invitation_id uuid,
  cpa_id uuid,
  firm_id uuid,
  cpa_name text,
  firm_name text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ci.id as invitation_id,
    ci.cpa_id,
    ci.firm_id,
    u.full_name as cpa_name,
    f.firm_name
  FROM client_invitations ci
  JOIN users u ON ci.cpa_id = u.id
  JOIN cpa_firms f ON ci.firm_id = f.id
  WHERE ci.email = client_email
    AND ci.status = 'pending'
    AND ci.expires_at > now()
  ORDER BY ci.invited_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
