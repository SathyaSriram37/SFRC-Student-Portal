'use client';

import React from 'react';
import AppShell from '@/components/layout/AppShell';
import { useCapabilities } from '@/lib/hooks/use-capabilities';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useCapabilities();
  const userName = user?.fullName || 'Administrator';

  return (
    <AppShell role="admin" userName={userName}>
      {children}
    </AppShell>
  );
}
