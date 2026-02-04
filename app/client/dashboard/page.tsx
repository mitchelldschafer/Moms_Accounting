'use client';

import { useEffect, useState } from 'react';
import { ClientLayout } from '@/components/layouts/client-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Upload, MessageSquare, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/components/auth-provider';
import { StatusBadge } from '@/components/status-badge';
import { DocumentTypeLabel } from '@/components/document-type-label';
import { format } from 'date-fns';
import Link from 'next/link';

export default function ClientDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalDocuments: 0,
    reviewedDocuments: 0,
    unreadMessages: 0,
    pendingTasks: 0,
  });
  const [recentDocuments, setRecentDocuments] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    if (!user) return;

    const [documentsRes, messagesRes, tasksRes] = await Promise.all([
      supabase
        .from('documents')
        .select('*')
        .eq('client_id', user.id)
        .eq('tax_year', currentYear)
        .order('uploaded_at', { ascending: false }),
      supabase
        .from('messages')
        .select('*')
        .eq('to_user_id', user.id)
        .eq('read', false),
      supabase
        .from('tasks')
        .select('*')
        .eq('client_id', user.id)
        .neq('status', 'completed')
        .order('due_date', { ascending: true }),
    ]);

    if (documentsRes.data) {
      const reviewed = documentsRes.data.filter(
        (d: any) => d.status === 'reviewed' || d.status === 'complete'
      ).length;

      setStats({
        totalDocuments: documentsRes.data.length,
        reviewedDocuments: reviewed,
        unreadMessages: messagesRes.data?.length || 0,
        pendingTasks: tasksRes.data?.length || 0,
      });

      setRecentDocuments(documentsRes.data.slice(0, 5));
    }

    if (tasksRes.data) {
      setTasks(tasksRes.data.slice(0, 5));
    }

    setLoading(false);
  };

  const getProgressStatus = () => {
    if (stats.totalDocuments === 0) return 'Not Started';
    if (stats.reviewedDocuments === stats.totalDocuments) return 'Complete';
    return 'In Progress';
  };

  const getProgressColor = () => {
    const status = getProgressStatus();
    if (status === 'Complete') return 'bg-green-600';
    if (status === 'In Progress') return 'bg-blue-600';
    return 'bg-gray-400';
  };

  if (loading) {
    return (
      <ClientLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-gray-500">Loading...</div>
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Welcome back, {user?.full_name}!</h1>
          <p className="mt-2 text-gray-600">Here's an overview of your tax documents for {currentYear}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Documents Uploaded</CardTitle>
              <FileText className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalDocuments}</div>
              <p className="text-xs text-gray-500 mt-1">For tax year {currentYear}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Reviewed</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.reviewedDocuments}</div>
              <p className="text-xs text-gray-500 mt-1">
                {stats.totalDocuments > 0
                  ? `${Math.round((stats.reviewedDocuments / stats.totalDocuments) * 100)}% complete`
                  : 'No documents yet'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unread Messages</CardTitle>
              <MessageSquare className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.unreadMessages}</div>
              <p className="text-xs text-gray-500 mt-1">From your CPA</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
              <Upload className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingTasks}</div>
              <p className="text-xs text-gray-500 mt-1">Action required</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Tax Year {currentYear} Status</CardTitle>
            <CardDescription>Your document collection progress</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Status</p>
                  <p className="text-2xl font-bold">{getProgressStatus()}</p>
                </div>
                <Badge className={getProgressColor()}>
                  {stats.reviewedDocuments}/{stats.totalDocuments} Reviewed
                </Badge>
              </div>

              {stats.totalDocuments > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span>{Math.round((stats.reviewedDocuments / stats.totalDocuments) * 100)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${getProgressColor()}`}
                      style={{ width: `${(stats.reviewedDocuments / stats.totalDocuments) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {stats.totalDocuments === 0 && (
                <div className="text-center py-8">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-600">No documents uploaded yet</p>
                  <Link href="/client/upload">
                    <Button className="mt-4">Upload Your First Document</Button>
                  </Link>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {tasks.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Outstanding Tasks</CardTitle>
              <CardDescription>Tasks from your CPA requiring attention</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {tasks.map((task) => (
                  <div key={task.id} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">{task.title}</p>
                      {task.description && (
                        <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                      )}
                      {task.due_date && (
                        <p className="text-xs text-gray-500 mt-1">
                          Due: {format(new Date(task.due_date), 'MMM d, yyyy')}
                        </p>
                      )}
                    </div>
                    <Badge
                      variant={task.priority === 'high' ? 'destructive' : 'secondary'}
                    >
                      {task.priority}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {recentDocuments.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Recent Uploads</CardTitle>
              <CardDescription>Your most recently uploaded documents</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentDocuments.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <FileText className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="font-medium">{doc.file_name}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <DocumentTypeLabel type={doc.document_type} />
                          <span className="text-gray-300">•</span>
                          <span className="text-xs text-gray-500">
                            {format(new Date(doc.uploaded_at), 'MMM d, yyyy')}
                          </span>
                        </div>
                      </div>
                    </div>
                    <StatusBadge status={doc.status} />
                  </div>
                ))}
              </div>
              <Link href="/client/documents">
                <Button variant="outline" className="w-full mt-4">
                  View All Documents
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </ClientLayout>
  );
}
