'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CPALayout } from '@/components/layouts/cpa-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, FileText, CheckSquare, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/components/auth-provider';
import { StatusBadge } from '@/components/status-badge';
import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function CPADashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalClients: 0,
    documentsToReview: 0,
    completedClients: 0,
    tasksDueThisWeek: 0,
  });
  const [clients, setClients] = useState<any[]>([]);
  const [documentsToReview, setDocumentsToReview] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    if (!user) return;

    const [clientsRes, documentsRes, tasksRes] = await Promise.all([
      supabase
        .from('users')
        .select('*, documents!documents_client_id_fkey(id, status, tax_year)')
        .eq('assigned_cpa_id', user.id)
        .eq('role', 'client'),
      supabase
        .from('documents')
        .select('*, client:users!documents_client_id_fkey(full_name)')
        .eq('cpa_id', user.id)
        .in('status', ['uploaded', 'processing', 'extracted'])
        .eq('tax_year', currentYear)
        .order('uploaded_at', { ascending: false })
        .limit(10),
      supabase
        .from('tasks')
        .select('*')
        .eq('cpa_id', user.id)
        .neq('status', 'completed')
        .gte('due_date', new Date().toISOString().split('T')[0])
        .lte('due_date', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]),
    ]);

    if (clientsRes.data) {
      const clientsWithProgress = clientsRes.data.map((client: any) => {
        const currentYearDocs = client.documents?.filter((d: any) => d.tax_year === currentYear) || [];
        const reviewedDocs = currentYearDocs.filter(
          (d: any) => d.status === 'reviewed' || d.status === 'complete'
        ).length;
        return {
          ...client,
          totalDocs: currentYearDocs.length,
          reviewedDocs,
          progress: currentYearDocs.length > 0 ? Math.round((reviewedDocs / currentYearDocs.length) * 100) : 0,
        };
      });

      const completed = clientsWithProgress.filter((c) => c.progress === 100).length;

      setStats({
        totalClients: clientsRes.data.length,
        documentsToReview: documentsRes.data?.length || 0,
        completedClients: completed,
        tasksDueThisWeek: tasksRes.data?.length || 0,
      });

      setClients(clientsWithProgress);
    }

    if (documentsRes.data) {
      setDocumentsToReview(documentsRes.data);
    }

    setLoading(false);
  };

  const getClientStatus = (client: any) => {
    if (client.totalDocs === 0) return { label: 'No Documents', color: 'bg-gray-500' };
    if (client.progress === 100) return { label: 'Complete', color: 'bg-green-600' };
    if (client.reviewedDocs > 0) return { label: 'In Progress', color: 'bg-blue-600' };
    return { label: 'Pending Review', color: 'bg-yellow-600' };
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
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Overview</h2>
          <p className="mt-1 text-gray-600">Welcome back, {user?.full_name}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
              <Users className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalClients}</div>
              <p className="text-xs text-gray-500 mt-1">Active clients</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
              <AlertCircle className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.documentsToReview}</div>
              <p className="text-xs text-gray-500 mt-1">Documents need attention</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckSquare className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completedClients}</div>
              <p className="text-xs text-gray-500 mt-1">Clients ready to file</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tasks This Week</CardTitle>
              <FileText className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.tasksDueThisWeek}</div>
              <p className="text-xs text-gray-500 mt-1">Due in next 7 days</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Client Status Overview</CardTitle>
            <CardDescription>Tax year {currentYear} progress for all clients</CardDescription>
          </CardHeader>
          <CardContent>
            {clients.length === 0 ? (
              <div className="text-center py-12">
                <Users className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-gray-600">No clients assigned yet</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client Name</TableHead>
                    <TableHead>Documents</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.slice(0, 10).map((client) => {
                    const status = getClientStatus(client);
                    return (
                      <TableRow key={client.id}>
                        <TableCell className="font-medium">{client.full_name}</TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {client.reviewedDocs}/{client.totalDocs}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <div className="w-32 bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${status.color}`}
                                style={{ width: `${client.progress}%` }}
                              />
                            </div>
                            <span className="text-sm text-gray-600">{client.progress}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={status.color}>{status.label}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Link href={`/cpa/clients/${client.id}`}>
                            <Button variant="ghost" size="sm">View</Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}

            {clients.length > 10 && (
              <Link href="/cpa/clients">
                <Button variant="outline" className="w-full mt-4">
                  View All Clients
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>

        {documentsToReview.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Documents Requiring Review</CardTitle>
              <CardDescription>Recently uploaded documents that need your attention</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {documentsToReview.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <FileText className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="font-medium">{doc.file_name}</p>
                        <p className="text-sm text-gray-600">{doc.client?.full_name}</p>
                        <p className="text-xs text-gray-500">
                          Uploaded {format(new Date(doc.uploaded_at), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <StatusBadge status={doc.status} />
                      <Link href={`/cpa/clients/${doc.client_id}`}>
                        <Button variant="outline" size="sm">Review</Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </CPALayout>
  );
}
