'use client';

import React from 'react';
import AppShell from '@/components/layout/AppShell';
import { useCapabilities } from '@/lib/hooks/use-capabilities';

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useCapabilities();
  const userName = user?.fullName || 'Student';

  return (
    <AppShell role="student" userName={userName}>
      {children}
    </AppShell>
  );
}
