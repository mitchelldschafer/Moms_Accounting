'use client';

import { useEffect, useState } from 'react';
import { CPALayout } from '@/components/layouts/cpa-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/components/auth-provider';
import { useToast } from '@/hooks/use-toast';

export default function CPASettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [firm, setFirm] = useState({
    firm_name: '',
    address: '',
    phone: '',
    tax_software_used: '',
  });

  useEffect(() => {
    if (user && user.cpa_firm_id) {
      loadFirmData();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadFirmData = async () => {
    if (!user?.cpa_firm_id) return;

    const { data, error } = await supabase
      .from('cpa_firms')
      .select('*')
      .eq('id', user.cpa_firm_id)
      .maybeSingle();

    if (!error && data) {
      setFirm({
        firm_name: (data as any).firm_name || '',
        address: (data as any).address || '',
        phone: (data as any).phone || '',
        tax_software_used: (data as any).tax_software_used || '',
      });
    }

    setLoading(false);
  };

  const handleSave = async () => {
    if (!user?.cpa_firm_id) return;

    setSaving(true);

    const { error } = await (supabase as any)
      .from('cpa_firms')
      .update({
        firm_name: firm.firm_name,
        address: firm.address,
        phone: firm.phone,
        tax_software_used: firm.tax_software_used,
      })
      .eq('id', user.cpa_firm_id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update firm settings',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Settings Saved',
        description: 'Your firm settings have been updated',
      });
    }

    setSaving(false);
  };

  if (loading) {
    return (
      <CPALayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-gray-500">Loading...</div>
        </div>
      </CPALayout>
    );
  }

  return (
    <CPALayout>
      <div className="max-w-3xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Firm Profile</CardTitle>
            <CardDescription>Manage your firm's information and preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="firm_name">Firm Name *</Label>
              <Input
                id="firm_name"
                value={firm.firm_name}
                onChange={(e) => setFirm({ ...firm, firm_name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={firm.address}
                onChange={(e) => setFirm({ ...firm, address: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={firm.phone}
                onChange={(e) => setFirm({ ...firm, phone: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tax_software">Tax Software Used</Label>
              <Input
                id="tax_software"
                placeholder="e.g., ProSeries, Drake, Lacerte"
                value={firm.tax_software_used}
                onChange={(e) => setFirm({ ...firm, tax_software_used: e.target.value })}
              />
              <p className="text-xs text-gray-500">
                This will be used for export formatting in future updates
              </p>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>Configure email and in-app notifications</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Notification settings will be available in a future update
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>API & Integrations</CardTitle>
            <CardDescription>Connect with third-party services</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Integration features will be available in future updates
            </p>
          </CardContent>
        </Card>
      </div>
    </CPALayout>
  );
}
