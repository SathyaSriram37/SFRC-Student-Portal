'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { MapPin, Navigation, Building2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { apiGet } from '@/lib/api-client';
import { cn } from '@/lib/utils';

interface FacilityMapProps {
  facilityId?: string;
  mapUrl?: string | null;
  building?: string;
  floor?: string;
  room?: string;
  locationText?: string;
  className?: string;
}

export default function FacilityMap({
  facilityId,
  mapUrl: initialMapUrl,
  building = 'Main Administrative Block',
  floor = 'Ground Floor',
  room,
  locationText,
  className,
}: FacilityMapProps) {
  const [fetchedMapUrl, setFetchedMapUrl] = useState<string | null>(null);
  const [locText, setLocText] = useState<string>(
    locationText || `Building: ${building}${floor ? `, Floor: ${floor}` : ''}${room ? `, Room: ${room}` : ''}`
  );

  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    if (initialMapUrl !== undefined || !facilityId) {
      return;
    }

    let ignore = false;
    (async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const token = session?.access_token;

        const res = await apiGet<{
          map_url: string | null;
          location_text: string;
          building: string;
        }>(`/api/v1/facilities/${facilityId}/map`, token);

        if (!ignore && res) {
          setFetchedMapUrl(res.map_url);
          if (res.location_text) {
            setLocText(res.location_text);
          }
        }
      } catch {
        // Fallback to text card
      }
    })();

    return () => {
      ignore = true;
    };
  }, [facilityId, initialMapUrl, supabase]);

  const activeMapUrl = initialMapUrl !== undefined ? initialMapUrl : fetchedMapUrl;

  if (activeMapUrl) {
    return (
      <div className={cn('relative rounded-xl overflow-hidden border border-border shadow-xs', className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={activeMapUrl}
          alt="Campus Map"
          className="rounded-lg w-full h-48 object-cover"
        />
        <div className="absolute bottom-2 left-2 right-2 bg-black/60 backdrop-blur-xs text-white p-2 rounded-lg text-[11px] flex items-center gap-1.5">
          <Navigation className="w-3 h-3 text-sfrc-gold shrink-0" />
          <span className="truncate font-medium">{locText}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'bg-sfrc-100 dark:bg-muted/70 rounded-xl p-5 text-center border border-sfrc-200 dark:border-border flex flex-col items-center justify-center gap-2',
        className
      )}
    >
      <div className="w-10 h-10 rounded-full bg-sfrc-maroon/10 dark:bg-primary/20 text-sfrc-maroon dark:text-primary flex items-center justify-center">
        <MapPin className="w-5 h-5" />
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">{locText}</p>
        <p className="text-xs text-muted-foreground mt-0.5 flex items-center justify-center gap-1">
          <Building2 className="w-3 h-3" />
          <span>Standard SFRC Campus Venue</span>
        </p>
      </div>
    </div>
  );
}
