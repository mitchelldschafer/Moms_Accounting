'use client';

import { useEffect, useState } from 'react';
import { CPALayout } from '@/components/layouts/cpa-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageSquare } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/components/auth-provider';
import { format } from 'date-fns';

export default function CPAMessages() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
      .select('*, from_user:users!from_user_id(full_name), to_user:users!to_user_id(full_name)')
      .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setMessages(data);
    }

    setLoading(false);
  };

  const markAsRead = async (messageId: string) => {
    await (supabase as any).from('messages').update({ read: true }).eq('id', messageId).eq('to_user_id', user?.id);
    loadMessages();
  };

  const handleMessageClick = (message: any) => {
    setSelectedMessage(message);
    if (!message.read && message.to_user_id === user?.id) {
      markAsRead(message.id);
    }
  };

  return (
    <CPALayout>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">All Messages</CardTitle>
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
                            {message.from_user_id === user?.id
                              ? `To: ${message.to_user?.full_name}`
                              : message.from_user?.full_name}
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
              <div className="text-center py-12 text-gray-500">Select a message to view</div>
            ) : (
              <div className="space-y-4">
                <div className="border-b pb-4">
                  <h3 className="text-lg font-semibold">{selectedMessage.subject || 'No subject'}</h3>
                  <div className="flex items-center justify-between mt-2">
                    <div>
                      <p className="text-sm text-gray-600">
                        From: {selectedMessage.from_user_id === user?.id ? 'You' : selectedMessage.from_user?.full_name}
                      </p>
                      <p className="text-sm text-gray-600">
                        To: {selectedMessage.to_user_id === user?.id ? 'You' : selectedMessage.to_user?.full_name}
                      </p>
                    </div>
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
    </CPALayout>
  );
}
