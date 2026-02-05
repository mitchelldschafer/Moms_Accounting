'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { CPALayout } from '@/components/layouts/cpa-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { FileText, Eye, CheckCircle, MessageSquare, Plus, Check, Pencil, X, Save } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/components/auth-provider';
import { StatusBadge } from '@/components/status-badge';
import { DocumentTypeLabel, getDocumentTypeOptions } from '@/components/document-type-label';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { FilingStatus } from '@/lib/supabase/types';
import { maskSSN } from '@/lib/supabase/auth';
import { getFieldLabel } from '@/lib/field-extractor';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ExtractedDataRow {
  id: string;
  document_id: string;
  field_name: string;
  field_value: string | null;
  confidence_score: number | null;
  manually_verified: boolean;
  extraction_method: string;
  document?: {
    file_name: string;
    document_type: string;
  };
}

export default function CPAClientDetail() {
  const params = useParams();
  const clientId = params.id as string;
  const { user } = useAuth();
  const { toast } = useToast();
  const [client, setClient] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [extractedData, setExtractedData] = useState<ExtractedDataRow[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', description: '', priority: 'medium', due_date: '' });
  const [newMessage, setNewMessage] = useState({ subject: '', body: '' });
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');

  useEffect(() => {
    if (user && clientId) {
      loadClientData();
    }
  }, [user, clientId]);

  const loadClientData = async () => {
    setLoading(true);

    const [clientRes, profileRes, documentsRes, tasksRes, messagesRes] = await Promise.all([
      supabase.from('users').select('*').eq('id', clientId).maybeSingle(),
      supabase.from('clients_profile').select('*').eq('user_id', clientId).maybeSingle(),
      supabase.from('documents').select('*').eq('client_id', clientId).order('uploaded_at', { ascending: false }),
      supabase.from('tasks').select('*').eq('client_id', clientId).order('created_at', { ascending: false }),
      supabase
        .from('messages')
        .select('*')
        .or(`from_user_id.eq.${clientId},to_user_id.eq.${clientId}`)
        .order('created_at', { ascending: false }),
    ]);

    setClient(clientRes.data);
    setProfile(profileRes.data);
    setDocuments(documentsRes.data || []);
    setTasks(tasksRes.data || []);
    setMessages(messagesRes.data || []);

    // Load extracted data for all documents
    if (documentsRes.data && documentsRes.data.length > 0) {
      const docIds = documentsRes.data.map((d: any) => d.id);
      const { data: extractedRes } = await supabase
        .from('extracted_data')
        .select('*, document:documents(file_name, document_type)')
        .in('document_id', docIds);
      setExtractedData((extractedRes as ExtractedDataRow[]) || []);
    }

    setLoading(false);
  };

  const handleUpdateDocument = async (documentId: string, updates: any) => {
    const { error } = await (supabase as any).from('documents').update(updates).eq('id', documentId);

    if (error) {
      toast({ title: 'Error', description: 'Failed to update document', variant: 'destructive' });
    } else {
      toast({ title: 'Updated', description: 'Document updated successfully' });
      loadClientData();
    }
  };

  const handleSaveField = async (fieldId: string, value: string) => {
    if (!user) return;

    const { error } = await (supabase as any)
      .from('extracted_data')
      .update({
        field_value: value,
        manually_verified: true,
        verified_by: user.id,
        verified_at: new Date().toISOString(),
        confidence_score: 100,
      })
      .eq('id', fieldId);

    if (error) {
      toast({ title: 'Error', description: 'Failed to save field', variant: 'destructive' });
    } else {
      toast({ title: 'Saved', description: 'Field value saved and verified' });
      setEditingField(null);
      setEditingValue('');
      loadClientData();
    }
  };

  const handleCreateTask = async () => {
    if (!user || !newTask.title) return;

    const { error } = await (supabase as any).from('tasks').insert({
      client_id: clientId,
      cpa_id: user.id,
      title: newTask.title,
      description: newTask.description,
      priority: newTask.priority,
      due_date: newTask.due_date || null,
    });

    if (error) {
      toast({ title: 'Error', description: 'Failed to create task', variant: 'destructive' });
    } else {
      toast({ title: 'Task Created', description: 'Task has been assigned to client' });
      setTaskDialogOpen(false);
      setNewTask({ title: '', description: '', priority: 'medium', due_date: '' });
      loadClientData();
    }
  };

  const handleSendMessage = async () => {
    if (!user || !newMessage.body) return;

    const { error } = await (supabase as any).from('messages').insert({
      from_user_id: user.id,
      to_user_id: clientId,
      subject: newMessage.subject,
      body: newMessage.body,
    });

    if (error) {
      toast({ title: 'Error', description: 'Failed to send message', variant: 'destructive' });
    } else {
      toast({ title: 'Message Sent', description: 'Your message has been sent' });
      setMessageDialogOpen(false);
      setNewMessage({ subject: '', body: '' });
      loadClientData();
    }
  };

  if (loading || !client) {
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
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl">{client.full_name}</CardTitle>
                <CardDescription>{client.email}</CardDescription>
              </div>
              <Badge>Tax Year 2024</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-500">Phone</p>
                <p className="font-medium">{client.phone || 'Not provided'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">SSN</p>
                <p className="font-medium">{profile?.ssn_encrypted ? maskSSN(profile.ssn_encrypted) : 'Not provided'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Filing Status</p>
                <p className="font-medium">{profile?.filing_status || 'Not specified'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="documents" className="space-y-4">
          <TabsList>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="extracted">Extracted Data</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="messages">Messages</TabsTrigger>
          </TabsList>

          <TabsContent value="documents" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Client Documents</CardTitle>
                <CardDescription>Review and manage uploaded documents</CardDescription>
              </CardHeader>
              <CardContent>
                {documents.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">No documents uploaded yet</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>File Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Uploaded</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {documents.map((doc) => (
                        <TableRow key={doc.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center space-x-2">
                              <FileText className="h-4 w-4 text-gray-400" />
                              <span>{doc.file_name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <DocumentTypeLabel type={doc.document_type} />
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={doc.status} />
                          </TableCell>
                          <TableCell>{format(new Date(doc.uploaded_at), 'MMM d, yyyy')}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-2">
                              <Button variant="ghost" size="sm" onClick={() => window.open(doc.file_url, '_blank')}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              {doc.status !== 'reviewed' && doc.status !== 'complete' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleUpdateDocument(doc.id, { status: 'reviewed', reviewed_at: new Date().toISOString() })}
                                >
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="extracted" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Extracted Data</CardTitle>
                <CardDescription>Field-level data extracted from documents - click to edit values</CardDescription>
              </CardHeader>
              <CardContent>
                {extractedData.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    No extracted data yet. Upload documents with recognizable names (e.g., W2_CompanyName_2024.pdf) to auto-extract fields.
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Group by document */}
                    {documents.filter((d: any) => extractedData.some(e => e.document_id === d.id)).map((doc: any) => (
                      <div key={doc.id} className="border rounded-lg p-4">
                        <div className="flex items-center space-x-2 mb-4">
                          <FileText className="h-4 w-4 text-gray-500" />
                          <span className="font-medium">{doc.file_name}</span>
                          <DocumentTypeLabel type={doc.document_type} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {extractedData
                            .filter(field => field.document_id === doc.id)
                            .map(field => (
                              <div key={field.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex-1">
                                  <p className="text-sm text-gray-500">{getFieldLabel(field.field_name)}</p>
                                  {editingField === field.id ? (
                                    <div className="flex items-center space-x-2 mt-1">
                                      <Input
                                        value={editingValue}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditingValue(e.target.value)}
                                        className="h-8"
                                        autoFocus
                                      />
                                      <Button size="sm" onClick={() => handleSaveField(field.id, editingValue)}>
                                        <Save className="h-3 w-3" />
                                      </Button>
                                      <Button size="sm" variant="ghost" onClick={() => { setEditingField(null); setEditingValue(''); }}>
                                        <X className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  ) : (
                                    <p className="font-medium">
                                      {field.field_value || <span className="text-gray-400 italic">Not set</span>}
                                    </p>
                                  )}
                                </div>
                                <div className="flex items-center space-x-2 ml-4">
                                  {field.manually_verified ? (
                                    <Badge className="bg-green-100 text-green-800">
                                      <Check className="h-3 w-3 mr-1" />
                                      Verified
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-yellow-100 text-yellow-800">
                                      {Math.round(field.confidence_score || 0)}%
                                    </Badge>
                                  )}
                                  {editingField !== field.id && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => {
                                        setEditingField(field.id);
                                        setEditingValue(field.field_value || '');
                                      }}
                                    >
                                      <Pencil className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tasks" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Tasks</CardTitle>
                    <CardDescription>Manage tasks and requests for this client</CardDescription>
                  </div>
                  <Button onClick={() => setTaskDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Task
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {tasks.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">No tasks yet</div>
                ) : (
                  <div className="space-y-3">
                    {tasks.map((task) => (
                      <div key={task.id} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">{task.title}</p>
                          {task.description && <p className="text-sm text-gray-600 mt-1">{task.description}</p>}
                          {task.due_date && (
                            <p className="text-xs text-gray-500 mt-1">Due: {format(new Date(task.due_date), 'MMM d, yyyy')}</p>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={task.priority === 'high' ? 'destructive' : 'secondary'}>{task.priority}</Badge>
                          <StatusBadge status={task.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="messages" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Messages</CardTitle>
                    <CardDescription>Communication history with client</CardDescription>
                  </div>
                  <Button onClick={() => setMessageDialogOpen(true)}>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    New Message
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {messages.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">No messages yet</div>
                ) : (
                  <div className="space-y-3">
                    {messages.map((message) => (
                      <div key={message.id} className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <p className="font-medium">{message.subject || 'No subject'}</p>
                          <p className="text-xs text-gray-500">{format(new Date(message.created_at), 'MMM d, h:mm a')}</p>
                        </div>
                        <p className="text-sm text-gray-600">{message.body}</p>
                        <p className="text-xs text-gray-500 mt-2">
                          {message.from_user_id === user?.id ? 'You' : client.full_name}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
            <DialogDescription>Assign a task to {client.full_name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input value={newTask.title} onChange={(e) => setNewTask({ ...newTask, title: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={newTask.description} onChange={(e) => setNewTask({ ...newTask, description: e.target.value })} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={newTask.priority} onValueChange={(value) => setNewTask({ ...newTask, priority: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input type="date" value={newTask.due_date} onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTaskDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateTask} disabled={!newTask.title}>Create Task</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={messageDialogOpen} onOpenChange={setMessageDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Message</DialogTitle>
            <DialogDescription>Send a message to {client.full_name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input value={newMessage.subject} onChange={(e) => setNewMessage({ ...newMessage, subject: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Message *</Label>
              <Textarea value={newMessage.body} onChange={(e) => setNewMessage({ ...newMessage, body: e.target.value })} rows={6} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMessageDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSendMessage} disabled={!newMessage.body}>Send Message</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CPALayout>
  );
}
