'use client';

import { useEffect, useState } from 'react';
import { CPALayout } from '@/components/layouts/cpa-layout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckSquare } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/components/auth-provider';
import { StatusBadge } from '@/components/status-badge';
import { format } from 'date-fns';

export default function CPATasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  useEffect(() => {
    if (user) {
      loadTasks();
    }
  }, [user]);

  useEffect(() => {
    filterTasks();
  }, [tasks, statusFilter, priorityFilter]);

  const loadTasks = async () => {
    if (!user) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('tasks')
      .select('*, client:users!tasks_client_id_fkey(full_name)')
      .eq('cpa_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setTasks(data);
    }

    setLoading(false);
  };

  const filterTasks = () => {
    let filtered = [...tasks];

    if (statusFilter !== 'all') {
      filtered = filtered.filter((task) => task.status === statusFilter);
    }

    if (priorityFilter !== 'all') {
      filtered = filtered.filter((task) => task.priority === priorityFilter);
    }

    setFilteredTasks(filtered);
  };

  const groupTasksByStatus = () => {
    return {
      pending: filteredTasks.filter((t) => t.status === 'pending'),
      in_progress: filteredTasks.filter((t) => t.status === 'in_progress'),
      completed: filteredTasks.filter((t) => t.status === 'completed'),
    };
  };

  const grouped = groupTasksByStatus();

  return (
    <CPALayout>
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>

              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading tasks...</div>
        ) : filteredTasks.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <CheckSquare className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-gray-600">No tasks found</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-4">Pending ({grouped.pending.length})</h3>
                <div className="space-y-3">
                  {grouped.pending.map((task) => (
                    <div key={task.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="font-medium text-sm">{task.title}</p>
                      <p className="text-xs text-gray-600 mt-1">{task.client?.full_name}</p>
                      {task.due_date && (
                        <p className="text-xs text-gray-500 mt-1">
                          Due: {format(new Date(task.due_date), 'MMM d')}
                        </p>
                      )}
                      <div className="flex items-center space-x-2 mt-2">
                        <Badge variant={task.priority === 'high' ? 'destructive' : 'secondary'} className="text-xs">
                          {task.priority}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-4">In Progress ({grouped.in_progress.length})</h3>
                <div className="space-y-3">
                  {grouped.in_progress.map((task) => (
                    <div key={task.id} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="font-medium text-sm">{task.title}</p>
                      <p className="text-xs text-gray-600 mt-1">{task.client?.full_name}</p>
                      {task.due_date && (
                        <p className="text-xs text-gray-500 mt-1">
                          Due: {format(new Date(task.due_date), 'MMM d')}
                        </p>
                      )}
                      <div className="flex items-center space-x-2 mt-2">
                        <Badge variant={task.priority === 'high' ? 'destructive' : 'secondary'} className="text-xs">
                          {task.priority}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-4">Completed ({grouped.completed.length})</h3>
                <div className="space-y-3">
                  {grouped.completed.map((task) => (
                    <div key={task.id} className="p-3 bg-green-50 rounded-lg border border-green-200">
                      <p className="font-medium text-sm">{task.title}</p>
                      <p className="text-xs text-gray-600 mt-1">{task.client?.full_name}</p>
                      {task.completed_at && (
                        <p className="text-xs text-gray-500 mt-1">
                          Completed: {format(new Date(task.completed_at), 'MMM d')}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </CPALayout>
  );
}
