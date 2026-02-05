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
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (authError || !authData.user) {
    throw authError;
  }

  let firmId: string | null = null;

  if (role === 'cpa' && firmName) {
    const { data: firmData, error: firmError } = await (supabase as any)
      .from('cpa_firms')
      .insert({ firm_name: firmName })
      .select()
      .single();

    if (firmError) {
      await supabase.auth.admin.deleteUser(authData.user.id);
      throw new Error(`Failed to create firm: ${firmError.message}`);
    }

    firmId = firmData.id;
  }

  const { error: userError } = await (supabase as any)
    .from('users')
    .insert({
      id: authData.user.id,
      email,
      full_name: fullName,
      role,
      cpa_firm_id: firmId,
      assigned_cpa_id: assignedCpaId || null,
    });

  if (userError) {
    if (firmId) {
      await (supabase as any).from('cpa_firms').delete().eq('id', firmId);
    }
    await supabase.auth.admin.deleteUser(authData.user.id);
    throw new Error(`Failed to create user profile: ${userError.message}`);
  }

  if (role === 'client') {
    const { error: profileError } = await (supabase as any)
      .from('clients_profile')
      .insert({
        user_id: authData.user.id,
      });

    if (profileError) {
      throw profileError;
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
