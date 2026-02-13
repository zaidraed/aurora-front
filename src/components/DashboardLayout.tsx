import { useState } from 'react';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DashboardSidebar } from './dashboard-sidebar';
import { DashboardHeader } from './dashboard-header';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-background">
      <DashboardSidebar 
        open={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
      />
      <div className="flex-1 flex flex-col relative min-w-0">
        <DashboardHeader>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setSidebarOpen(true);
            }}
            className="lg:hidden relative z-50 touch-manipulation min-w-[44px] min-h-[44px]"
            type="button"
          >
            <Menu className="h-5 w-5 pointer-events-none" />
          </Button>
        </DashboardHeader>
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
