'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CPALayout } from '@/components/layouts/cpa-layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Eye, Mail, Clock, XCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/components/auth-provider';
import { format } from 'date-fns';
import { InviteClientModal } from '@/components/invite-client-modal';
import { toast } from 'sonner';

interface Invitation {
  id: string;
  email: string;
  client_name: string | null;
  status: string;
  invited_at: string;
  expires_at: string;
}

export default function CPAClients() {
  const { user, loading: authLoading } = useAuth();
  const [clients, setClients] = useState<any[]>([]);
  const [filteredClients, setFilteredClients] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [firmId, setFirmId] = useState<string | null>(null);
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) return;

    if (user) {
      loadUserAndClients();
    } else {
      setLoading(false);
    }
  }, [user, authLoading]);

  useEffect(() => {
    filterClients();
  }, [clients, searchQuery]);

  const loadUserAndClients = async () => {
    if (!user) return;

    setLoading(true);

    // Get the CPA's firm ID
    const result = await supabase
      .from('users')
      .select('cpa_firm_id')
      .eq('id', user.id)
      .maybeSingle();

    const userData = result.data as { cpa_firm_id: string | null } | null;

    if (userData?.cpa_firm_id) {
      setFirmId(userData.cpa_firm_id);
    }

    await Promise.all([loadClients(), loadInvitations()]);
    setLoading(false);
  };

  const loadClients = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('users')
      .select('*, documents!documents_client_id_fkey(id, status, tax_year, uploaded_at)')
      .eq('assigned_cpa_id', user.id)
      .eq('role', 'client')
      .order('full_name', { ascending: true });

    if (!error && data) {
      const clientsWithProgress = data.map((client: any) => {
        const currentYearDocs = client.documents?.filter((d: any) => d.tax_year === currentYear) || [];
        const reviewedDocs = currentYearDocs.filter(
          (d: any) => d.status === 'reviewed' || d.status === 'complete'
        ).length;
        const lastActivity = currentYearDocs.length > 0
          ? Math.max(...currentYearDocs.map((d: any) => new Date(d.uploaded_at).getTime()))
          : null;

        return {
          ...client,
          totalDocs: currentYearDocs.length,
          reviewedDocs,
          progress: currentYearDocs.length > 0 ? Math.round((reviewedDocs / currentYearDocs.length) * 100) : 0,
          lastActivity,
        };
      });

      setClients(clientsWithProgress);
    }
  };

  const loadInvitations = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('client_invitations')
      .select('*')
      .eq('cpa_id', user.id)
      .eq('status', 'pending')
      .order('invited_at', { ascending: false });

    if (!error && data) {
      setInvitations(data);
    }
  };

  const cancelInvitation = async (invitationId: string) => {
    const { error } = await (supabase as any)
      .from('client_invitations')
      .update({ status: 'cancelled' })
      .eq('id', invitationId);

    if (!error) {
      toast.success('Invitation cancelled');
      loadInvitations();
    } else {
      toast.error('Failed to cancel invitation');
    }
  };

  const filterClients = () => {
    if (!searchQuery) {
      setFilteredClients(clients);
      return;
    }

    const filtered = clients.filter((client) =>
      client.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    setFilteredClients(filtered);
  };

  const getClientStatus = (client: any) => {
    if (client.totalDocs === 0) return { label: 'No Documents', color: 'bg-gray-500' };
    if (client.progress === 100) return { label: 'Complete', color: 'bg-green-600' };
    if (client.reviewedDocs > 0) return { label: 'In Progress', color: 'bg-blue-600' };
    return { label: 'Pending', color: 'bg-yellow-600' };
  };

  const isExpired = (expiresAt: string) => new Date(expiresAt) < new Date();

  return (
    <CPALayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-gray-600">Manage all your clients in one place</p>
          </div>
          <InviteClientModal
            cpaId={user?.id || ''}
            firmId={firmId || undefined}
            onInviteSent={loadInvitations}
          />
        </div>

        <Tabs defaultValue="clients" className="space-y-4">
          <TabsList>
            <TabsTrigger value="clients">
              Active Clients ({clients.length})
            </TabsTrigger>
            <TabsTrigger value="invitations">
              Pending Invitations ({invitations.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="clients" className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search clients by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                {loading ? (
                  <div className="text-center py-12 text-gray-500">Loading clients...</div>
                ) : filteredClients.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-600">
                      {clients.length === 0 ? 'No clients assigned yet. Click "Invite Client" to get started!' : 'No clients match your search'}
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Client Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Progress</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Last Activity</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredClients.map((client) => {
                        const status = getClientStatus(client);
                        return (
                          <TableRow key={client.id}>
                            <TableCell className="font-medium">{client.full_name}</TableCell>
                            <TableCell>{client.email}</TableCell>
                            <TableCell>{client.phone || '-'}</TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <div className="w-24 bg-gray-200 rounded-full h-2">
                                  <div
                                    className={`h-2 rounded-full ${status.color}`}
                                    style={{ width: `${client.progress}%` }}
                                  />
                                </div>
                                <span className="text-sm text-gray-600">
                                  {client.reviewedDocs}/{client.totalDocs}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={status.color}>{status.label}</Badge>
                            </TableCell>
                            <TableCell>
                              {client.lastActivity
                                ? format(new Date(client.lastActivity), 'MMM d, yyyy')
                                : '-'}
                            </TableCell>
                            <TableCell className="text-right">
                              <Link href={`/cpa/clients/${client.id}`}>
                                <Button variant="ghost" size="sm">
                                  <Eye className="h-4 w-4 mr-2" />
                                  View
                                </Button>
                              </Link>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invitations" className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                {invitations.length === 0 ? (
                  <div className="text-center py-12">
                    <Mail className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-4 text-gray-600">No pending invitations</p>
                    <p className="text-sm text-gray-500">
                      Invite a client to get started
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Client Name</TableHead>
                        <TableHead>Invited</TableHead>
                        <TableHead>Expires</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invitations.map((invitation) => (
                        <TableRow key={invitation.id}>
                          <TableCell className="font-medium">{invitation.email}</TableCell>
                          <TableCell>{invitation.client_name || '-'}</TableCell>
                          <TableCell>
                            {format(new Date(invitation.invited_at), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-1">
                              <Clock className="h-3 w-3 text-gray-400" />
                              <span className={isExpired(invitation.expires_at) ? 'text-red-600' : ''}>
                                {format(new Date(invitation.expires_at), 'MMM d, yyyy')}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {isExpired(invitation.expires_at) ? (
                              <Badge variant="destructive">Expired</Badge>
                            ) : (
                              <Badge variant="secondary">Pending</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => cancelInvitation(invitation.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Cancel
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </CPALayout>
  );
}

