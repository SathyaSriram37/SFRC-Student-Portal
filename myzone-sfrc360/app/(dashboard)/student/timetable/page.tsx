'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function TimetableRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/student/academics?tab=timetable');
  }, [router]);

  return (
    <div className="p-8 text-center text-xs text-muted-foreground">
      Redirecting to Timetable schedule...
    </div>
  );
}
