'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileText } from 'lucide-react';
import { signIn, signUp } from '@/lib/supabase/auth';
import { supabase } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast({
        title: 'Error',
        description: 'Please enter email and password',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      await signIn(email, password);

      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();

        console.log('Login - user data:', userData, 'error:', userError);

        if (!userData || !userData.role) {
          // User record doesn't exist or role is missing
          toast({
            title: 'Account Setup Incomplete',
            description: 'Please try signing in again or contact support.',
            variant: 'destructive',
          });
          await supabase.auth.signOut();
          return;
        }

        if (userData.role === 'cpa') {
          router.push('/cpa/dashboard');
        } else {
          router.push('/client/dashboard');
        }
      }
    } catch (error: any) {
      toast({
        title: 'Login Failed',
        description: error.message || 'Invalid email or password',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (role: 'cpa' | 'client') => {
    setLoading(true);

    const demoCredentials = {
      cpa: {
        email: 'cpa@demo.com',
        password: 'demo123456',
        fullName: 'Michael Chen',
        firmName: 'Demo Tax Advisors LLC'
      },
      client: {
        email: 'client@demo.com',
        password: 'demo123456',
        fullName: 'Sarah Johnson'
      }
    };

    const creds = demoCredentials[role];

    try {
      try {
        await signIn(creds.email, creds.password);

        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          if (role === 'cpa') {
            router.push('/cpa/dashboard');
          } else {
            router.push('/client/dashboard');
          }
        }
      } catch (loginError: any) {
        if (loginError.message?.includes('Invalid login credentials')) {
          toast({
            title: 'Creating Demo Account',
            description: 'Setting up your demo account...',
          });

          if (role === 'cpa') {
            await signUp(creds.email, creds.password, creds.fullName, 'cpa', 'firmName' in creds ? creds.firmName : undefined);
          } else {
            await signUp(creds.email, creds.password, creds.fullName, 'client');
          }

          await signIn(creds.email, creds.password);

          toast({
            title: 'Demo Account Ready',
            description: 'Welcome to TaxDocs demo!',
          });

          if (role === 'cpa') {
            router.push('/cpa/dashboard');
          } else {
            router.push('/client/dashboard');
          }
        } else {
          throw loginError;
        }
      }
    } catch (error: any) {
      toast({
        title: 'Demo Login Failed',
        description: error.message || 'Failed to access demo account',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <FileText className="h-12 w-12 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">TaxDocs</h1>
          <p className="text-gray-600 mt-2">Professional Tax Document Management</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Login</CardTitle>
            <CardDescription>Enter your credentials to access your account</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Logging in...' : 'Login'}
              </Button>
            </form>

            <div className="mt-4 text-center text-sm">
              <p className="text-gray-600">
                Don't have an account?{' '}
                <Link href="/signup" className="text-blue-600 hover:underline">
                  Sign up
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-lg">Try Demo</CardTitle>
            <CardDescription>Explore TaxDocs with pre-configured demo accounts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={() => handleDemoLogin('cpa')}
              disabled={loading}
              variant="outline"
              className="w-full bg-white hover:bg-blue-50"
            >
              Demo as CPA
            </Button>
            <Button
              onClick={() => handleDemoLogin('client')}
              disabled={loading}
              variant="outline"
              className="w-full bg-white hover:bg-blue-50"
            >
              Demo as Client
            </Button>
            <p className="text-xs text-blue-700 text-center mt-2">
              Demo accounts are automatically created on first use
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
