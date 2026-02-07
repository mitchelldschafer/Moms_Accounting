-- Add tax_info JSONB column to clients_profile for storing client-entered tax data
-- This stores income sources, deductions, and dependent information
ALTER TABLE clients_profile
ADD COLUMN IF NOT EXISTS tax_info jsonb DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN clients_profile.tax_info IS 'Client-entered tax information: income_sources, deductions, dependents';
