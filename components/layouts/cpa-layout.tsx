'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  FileText,
  CheckSquare,
  MessageSquare,
  Settings,
  LogOut,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/auth-provider';
import { cn } from '@/lib/utils';

const sidebarItems = [
  { href: '/cpa/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/cpa/clients', label: 'Clients', icon: Users },
  { href: '/cpa/documents', label: 'Documents', icon: FileText },
  { href: '/cpa/tasks', label: 'Tasks', icon: CheckSquare },
  { href: '/cpa/messages', label: 'Messages', icon: MessageSquare },
  { href: '/cpa/settings', label: 'Settings', icon: Settings },
];

export function CPALayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <aside className="w-64 bg-white border-r border-gray-200 min-h-screen">
          <div className="p-6">
            <Link href="/cpa/dashboard" className="flex items-center">
              <FileText className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-xl font-semibold text-gray-900">TaxDocs Pro</span>
            </Link>
          </div>

          <nav className="px-3 space-y-1">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-700 hover:bg-gray-100'
                  )}
                >
                  <Icon className="h-5 w-5 mr-3" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className="flex-1 flex flex-col">
          <header className="bg-white border-b border-gray-200">
            <div className="px-8 h-16 flex items-center justify-between">
              <h1 className="text-2xl font-semibold text-gray-900">
                {sidebarItems.find((item) => pathname === item.href || pathname.startsWith(item.href + '/'))?.label || 'CPA Portal'}
              </h1>

              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-700">{user?.full_name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={signOut}
                  className="flex items-center"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </div>
            </div>
          </header>

          <main className="flex-1 p-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
