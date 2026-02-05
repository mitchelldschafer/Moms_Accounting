'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, CheckCircle } from 'lucide-react';
import { signUp } from '@/lib/supabase/auth';
import { supabase } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { UserRole } from '@/lib/supabase/types';

interface InvitationInfo {
  invitation_id: string;
  cpa_id: string;
  firm_id: string;
  cpa_name: string;
  firm_name: string;
}

export default function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('cpa');
  const [firmName, setFirmName] = useState('');
  const [loading, setLoading] = useState(false);
  const [invitationToken, setInvitationToken] = useState<string | null>(null);
  const [invitationInfo, setInvitationInfo] = useState<InvitationInfo | null>(null);
  const [checkingInvitation, setCheckingInvitation] = useState(false);

  // Check for invitation token in URL on mount
  useEffect(() => {
    const token = searchParams.get('invitation');
    if (token) {
      setInvitationToken(token);
      checkInvitationToken(token);
    }
  }, [searchParams]);

  const checkInvitationToken = async (token: string) => {
    setCheckingInvitation(true);
    try {
      const { data, error } = await supabase
        .from('client_invitations')
        .select(`
          id,
          cpa_id,
          firm_id,
          email,
          client_name,
          users!client_invitations_cpa_id_fkey(full_name),
          cpa_firms!client_invitations_firm_id_fkey(firm_name)
        `)
        .eq('token', token)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .single();

      if (data && !error) {
        setInvitationInfo({
          invitation_id: data.id,
          cpa_id: data.cpa_id,
          firm_id: data.firm_id,
          cpa_name: (data.users as any)?.full_name || 'Your CPA',
          firm_name: (data.cpa_firms as any)?.firm_name || 'CPA Firm',
        });
        // Pre-fill email from invitation if available
        if (data.email) {
          setEmail(data.email);
        }
        // Pre-fill name if provided
        if (data.client_name) {
          setFullName(data.client_name);
        }
        // Lock role to client for invited users
        setRole('client');
      } else {
        toast({
          title: 'Invalid Invitation',
          description: 'This invitation link is invalid or has expired.',
          variant: 'destructive',
        });
        setInvitationToken(null);
      }
    } catch (error) {
      console.error('Error checking invitation:', error);
    } finally {
      setCheckingInvitation(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName || !email || !password) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: 'Error',
        description: 'Password must be at least 6 characters',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      if (role === 'cpa' && !firmName) {
        toast({
          title: 'Error',
          description: 'Firm name is required for CPA accounts',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      // Sign up the user
      const { userId } = await signUp(email, password, fullName, role, firmName);

      // If there's an invitation, accept it to link the client to the CPA
      if (invitationInfo && invitationToken && userId) {
        try {
          // Update the invitation status
          await supabase
            .from('client_invitations')
            .update({
              status: 'accepted',
              accepted_at: new Date().toISOString(),
              accepted_by: userId,
            })
            .eq('id', invitationInfo.invitation_id);

          // Assign the client to the CPA
          await supabase
            .from('users')
            .update({
              assigned_cpa_id: invitationInfo.cpa_id,
              cpa_firm_id: invitationInfo.firm_id,
            })
            .eq('id', userId);

          toast({
            title: 'Account Created',
            description: `You've been connected to ${invitationInfo.firm_name}`,
          });
        } catch (invError) {
          console.error('Error accepting invitation:', invError);
          // Continue anyway - account is created
        }
      } else {
        toast({
          title: 'Account Created',
          description: 'Your account has been created successfully',
        });
      }

      router.push('/login');
    } catch (error: any) {
      toast({
        title: 'Signup Failed',
        description: error.message || 'Failed to create account',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (checkingInvitation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verifying invitation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <FileText className="h-12 w-12 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">TaxDocs</h1>
          <p className="text-gray-600 mt-2">Create your account</p>
        </div>

        {invitationInfo && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-6">
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium text-green-800">You've been invited!</p>
                  <p className="text-sm text-green-700 mt-1">
                    {invitationInfo.cpa_name} from <strong>{invitationInfo.firm_name}</strong> has invited you to join TaxDocs. Complete your signup to get started.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Sign Up</CardTitle>
            <CardDescription>
              {invitationInfo
                ? 'Complete your account to connect with your CPA'
                : 'Create your CPA account to start managing clients'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignup} className="space-y-4">
              {/* No role selector - direct signups are CPA-only */}
              {/* Clients can only sign up via invitation link */}

              {!invitationInfo && (
                <div className="space-y-2">
                  <Label htmlFor="firmName">Firm Name *</Label>
                  <Input
                    id="firmName"
                    placeholder="Your CPA Firm"
                    value={firmName}
                    onChange={(e) => setFirmName(e.target.value)}
                    required
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name *</Label>
                <Input
                  id="fullName"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={!!invitationInfo} // Lock email if from invitation
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <p className="text-xs text-gray-500">At least 6 characters</p>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Creating Account...' : 'Sign Up'}
              </Button>
            </form>

            <div className="mt-4 text-center text-sm">
              <p className="text-gray-600">
                Already have an account?{' '}
                <Link href="/login" className="text-blue-600 hover:underline">
                  Login
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

