'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AttendanceRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/student/academics?tab=attendance');
  }, [router]);

  return (
    <div className="p-8 text-center text-xs text-muted-foreground">
      Redirecting to Attendance overview...
    </div>
  );
}
