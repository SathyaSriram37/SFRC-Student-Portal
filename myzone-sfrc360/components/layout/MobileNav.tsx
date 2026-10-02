'use client';

import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import Sidebar from './Sidebar';
import type { UserRole } from '@/lib/types';

interface MobileNavProps {
  role: UserRole;
  userName: string;
}

export default function MobileNav({ role, userName }: MobileNavProps) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        className="lg:hidden p-2 rounded-lg text-sfrc-700 hover:bg-sfrc-100 transition-colors"
        aria-label="Open navigation menu"
      >
        {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </SheetTrigger>
      <SheetContent side="left" className="p-0 w-64 border-sfrc-200">
        <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
        <Sidebar role={role} userName={userName} onClose={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
