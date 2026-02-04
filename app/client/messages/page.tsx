'use client';

import { useEffect, useState } from 'react';
import { ClientLayout } from '@/components/layouts/client-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Send } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/components/auth-provider';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export default function ClientMessages() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<any[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyBody, setReplyBody] = useState('');
  const [replySubject, setReplySubject] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (user) {
      loadMessages();
    }
  }, [user]);

  const loadMessages = async () => {
    if (!user) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('messages')
      .select('*, from_user:users!from_user_id(full_name)')
      .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to load messages',
        variant: 'destructive',
      });
    } else {
      setMessages(data || []);
    }

    setLoading(false);
  };

  const markAsRead = async (messageId: string) => {
    await (supabase as any).from('messages').update({ read: true }).eq('id', messageId).eq('to_user_id', user?.id);
    loadMessages();
  };

  const handleReply = async () => {
    if (!user || !user.assigned_cpa_id || !replyBody) return;

    setSending(true);

    const { error } = await (supabase as any).from('messages').insert({
      from_user_id: user.id,
      to_user_id: user.assigned_cpa_id,
      subject: replySubject || 'Re: Your message',
      body: replyBody,
    });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Message Sent',
        description: 'Your message has been sent to your CPA',
      });
      setReplyOpen(false);
      setReplyBody('');
      setReplySubject('');
      loadMessages();
    }

    setSending(false);
  };

  const handleMessageClick = (message: any) => {
    setSelectedMessage(message);
    if (!message.read && message.to_user_id === user?.id) {
      markAsRead(message.id);
    }
  };

  return (
    <ClientLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Messages</h1>
            <p className="mt-2 text-gray-600">Communicate with your CPA</p>
          </div>
          <Dialog open={replyOpen} onOpenChange={setReplyOpen}>
            <DialogTrigger asChild>
              <Button>
                <Send className="h-4 w-4 mr-2" />
                New Message
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Send Message to CPA</DialogTitle>
                <DialogDescription>
                  Send a message to your assigned CPA
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject (Optional)</Label>
                  <Input
                    id="subject"
                    placeholder="Message subject..."
                    value={replySubject}
                    onChange={(e) => setReplySubject(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="body">Message *</Label>
                  <Textarea
                    id="body"
                    placeholder="Type your message..."
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                    rows={6}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setReplyOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleReply} disabled={!replyBody || sending}>
                  {sending ? 'Sending...' : 'Send Message'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg">Inbox</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-gray-500">Loading...</div>
              ) : messages.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-600">No messages yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      onClick={() => handleMessageClick(message)}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedMessage?.id === message.id
                          ? 'bg-blue-50 border-2 border-blue-200'
                          : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <p className="font-medium text-sm truncate">
                              {message.from_user_id === user?.id ? 'You' : message.from_user?.full_name}
                            </p>
                            {!message.read && message.to_user_id === user?.id && (
                              <Badge className="bg-blue-600">New</Badge>
                            )}
                          </div>
                          <p className="text-xs text-gray-600 mt-1 truncate">
                            {message.subject || 'No subject'}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {format(new Date(message.created_at), 'MMM d, h:mm a')}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">Message Details</CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedMessage ? (
                <div className="text-center py-12 text-gray-500">
                  Select a message to view
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="border-b pb-4">
                    <h3 className="text-lg font-semibold">
                      {selectedMessage.subject || 'No subject'}
                    </h3>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-sm text-gray-600">
                        From: {selectedMessage.from_user_id === user?.id ? 'You' : selectedMessage.from_user?.full_name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {format(new Date(selectedMessage.created_at), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                  </div>

                  <div className="prose prose-sm max-w-none">
                    <p className="whitespace-pre-wrap">{selectedMessage.body}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </ClientLayout>
  );
}
