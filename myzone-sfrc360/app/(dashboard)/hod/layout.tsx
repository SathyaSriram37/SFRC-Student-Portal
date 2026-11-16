'use client';

import React from 'react';
import AppShell from '@/components/layout/AppShell';
import { useCapabilities } from '@/lib/hooks/use-capabilities';

export default function HodLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useCapabilities();
  const userName = user?.fullName || 'Dr. R. Meenakshi (HOD)';

  return (
    <AppShell role="hod" userName={userName}>
      {children}
    </AppShell>
  );
}
