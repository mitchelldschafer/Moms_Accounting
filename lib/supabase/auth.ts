import { supabase } from './client';
import { UserRole } from './types';

export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  const { data: userData } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  return userData;
}

export async function signUp(
  email: string,
  password: string,
  fullName: string,
  role: UserRole,
  firmName?: string,
  assignedCpaId?: string
) {
  console.log('Starting signup with role:', role);

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (authError || !authData.user) {
    throw authError;
  }

  console.log('Auth user created:', authData.user.id);

  let firmId: string | null = null;

  if (role === 'cpa' && firmName) {
    console.log('Creating CPA firm:', firmName);
    const { data: firmData, error: firmError } = await (supabase as any)
      .from('cpa_firms')
      .insert({ firm_name: firmName })
      .select()
      .single();

    if (firmError) {
      console.error('Failed to create firm:', firmError);
      throw new Error(`Failed to create firm: ${firmError.message}`);
    }

    firmId = firmData.id;
    console.log('Firm created with id:', firmId);
  }

  console.log('Creating user profile with role:', role);
  const { error: userError } = await (supabase as any)
    .from('users')
    .insert({
      id: authData.user.id,
      email,
      full_name: fullName,
      role, // This is the role passed in - 'cpa' or 'client'
      cpa_firm_id: firmId,
      assigned_cpa_id: assignedCpaId || null,
    });

  if (userError) {
    console.error('Failed to create user profile:', userError);
    if (firmId) {
      await (supabase as any).from('cpa_firms').delete().eq('id', firmId);
    }
    throw new Error(`Failed to create user profile: ${userError.message}`);
  }

  console.log('User profile created successfully with role:', role);

  // Create clients_profile only for client role
  // This is optional - the profile can be created lazily if this fails
  if (role === 'client') {
    console.log('Creating client profile...');
    const { error: profileError } = await (supabase as any)
      .from('clients_profile')
      .insert({
        user_id: authData.user.id,
      });

    if (profileError) {
      // Log but don't throw - clients_profile can be created later
      console.warn('Note: clients_profile creation deferred:', profileError.message);
    } else {
      console.log('Client profile created successfully');
    }
  }

  return { ...authData, userId: authData.user.id };
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }
}

export function maskSSN(ssn: string): string {
  if (!ssn || ssn.length < 4) return '***-**-****';
  return `***-**-${ssn.slice(-4)}`;
}
