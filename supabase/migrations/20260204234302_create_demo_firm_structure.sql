/*
  # Create Demo Firm Structure

  ## Overview
  Creates the demo CPA firm that demo accounts will join.
  This allows demo CPA accounts to have a realistic firm setup.

  ## What This Creates
  - Demo Tax Advisors LLC firm entry
  - This firm will be used by demo CPA accounts

  ## Note
  Demo user accounts are created through the signup flow.
  This migration just creates the firm structure they'll join.
*/

-- Create demo CPA firm
INSERT INTO cpa_firms (id, firm_name, address, phone, tax_software_used)
VALUES (
  '00000001-0000-0000-0000-000000000000',
  'Demo Tax Advisors LLC',
  '456 Business Ave, Suite 200, San Francisco, CA 94102',
  '(555) 987-6543',
  'Lacerte'
) ON CONFLICT (id) DO UPDATE SET
  firm_name = EXCLUDED.firm_name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  tax_software_used = EXCLUDED.tax_software_used;
