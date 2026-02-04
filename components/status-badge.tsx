import { Badge } from '@/components/ui/badge';
import { DocumentStatus, TaskStatus } from '@/lib/supabase/types';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: DocumentStatus | TaskStatus;
  className?: string;
}

const documentStatusConfig: Record<DocumentStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; className: string }> = {
  uploaded: { label: 'Uploaded', variant: 'secondary', className: 'bg-blue-100 text-blue-800' },
  processing: { label: 'Processing', variant: 'secondary', className: 'bg-yellow-100 text-yellow-800 animate-pulse' },
  extracted: { label: 'Extracted', variant: 'secondary', className: 'bg-purple-100 text-purple-800' },
  reviewed: { label: 'Reviewed', variant: 'secondary', className: 'bg-green-100 text-green-800' },
  complete: { label: 'Complete', variant: 'secondary', className: 'bg-green-600 text-white' },
};

const taskStatusConfig: Record<TaskStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; className: string }> = {
  pending: { label: 'Pending', variant: 'secondary', className: 'bg-gray-100 text-gray-800' },
  in_progress: { label: 'In Progress', variant: 'secondary', className: 'bg-blue-100 text-blue-800' },
  completed: { label: 'Completed', variant: 'secondary', className: 'bg-green-100 text-green-800' },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = status in documentStatusConfig
    ? documentStatusConfig[status as DocumentStatus]
    : taskStatusConfig[status as TaskStatus];

  return (
    <Badge
      variant={config.variant}
      className={cn(config.className, className)}
    >
      {config.label}
    </Badge>
  );
}
