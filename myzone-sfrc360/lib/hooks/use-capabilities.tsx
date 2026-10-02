'use client';

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Capability, ROLE_CAPABILITIES, UserRole, AuthUser } from '@/lib/types';

interface CapabilitiesContextType {
  user: AuthUser | null;
  role: UserRole | null;
  capabilities: Capability[];
  can: (action: string) => boolean;
  isLoading: boolean;
  refreshUser: () => Promise<void>;
}

const CapabilitiesContext = createContext<CapabilitiesContextType>({
  user: null,
  role: null,
  capabilities: [],
  can: () => false,
  isLoading: true,
  refreshUser: async () => {},
});

export function CapabilitiesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const supabase = useMemo(() => createClient(), []);

  const fetchSessionUser = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session || !session.user) {
        setUser(null);
        return;
      }

      const rawUser = session.user;
      const userMeta = rawUser.user_metadata || {};
      const appMeta = rawUser.app_metadata || {};
      const role = (userMeta.role || appMeta.role || 'student') as UserRole;
      const grantedCapabilities = ROLE_CAPABILITIES[role] || [];

      const fullName =
        userMeta.full_name ||
        userMeta.name ||
        rawUser.email?.split('@')[0] ||
        'User';

      setUser({
        id: rawUser.id,
        email: rawUser.email || '',
        role,
        fullName,
        avatarUrl: userMeta.avatar_url,
        departmentId: userMeta.department_id,
        capabilities: grantedCapabilities,
      });
    } catch (err) {
      console.error('Error fetching auth user for capabilities:', err);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session || !session.user) {
          if (!ignore) setUser(null);
          return;
        }

        const rawUser = session.user;
        const userMeta = rawUser.user_metadata || {};
        const appMeta = rawUser.app_metadata || {};
        const role = (userMeta.role || appMeta.role || 'student') as UserRole;
        const grantedCapabilities = ROLE_CAPABILITIES[role] || [];

        const fullName =
          userMeta.full_name ||
          userMeta.name ||
          rawUser.email?.split('@')[0] ||
          'User';

        if (!ignore) {
          setUser({
            id: rawUser.id,
            email: rawUser.email || '',
            role,
            fullName,
            avatarUrl: userMeta.avatar_url,
            departmentId: userMeta.department_id,
            capabilities: grantedCapabilities,
          });
        }
      } catch (err) {
        console.error('Error fetching auth user for capabilities:', err);
        if (!ignore) setUser(null);
      } finally {
        if (!ignore) setIsLoading(false);
      }
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      fetchSessionUser();
    });

    return () => {
      ignore = true;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const capabilities: Capability[] = useMemo(() => {
    if (!user || !user.role) return [];
    return ROLE_CAPABILITIES[user.role] || [];
  }, [user]);

  const can = (action: string): boolean => {
    if (!user || !user.role) return false;
    if (capabilities.includes('*')) return true;
    return capabilities.includes(action as Capability);
  };

  const contextValue: CapabilitiesContextType = {
    user,
    role: user?.role ?? null,
    capabilities,
    can,
    isLoading,
    refreshUser: fetchSessionUser,
  };

  return (
    <CapabilitiesContext.Provider value={contextValue}>
      {children}
    </CapabilitiesContext.Provider>
  );
}

export function useCapabilities(): CapabilitiesContextType {
  const context = useContext(CapabilitiesContext);
  if (!context) {
    throw new Error(
      'useCapabilities must be used within a CapabilitiesProvider'
    );
  }
  return context;
}

interface CanProps {
  perform: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Conditional rendering guard component based on user capability.
 */
export function Can({ perform, children, fallback = null }: CanProps) {
  const { can, isLoading } = useCapabilities();

  if (isLoading) return null;
  if (!can(perform)) return <>{fallback}</>;

  return <>{children}</>;
}
