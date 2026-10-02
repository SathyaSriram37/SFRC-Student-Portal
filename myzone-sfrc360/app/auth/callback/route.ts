import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data?.user) {
      const user = data.user;
      const userMeta = user.user_metadata || {};
      const appMeta = user.app_metadata || {};
      const role = userMeta.role || appMeta.role || 'student';

      // If user had a specific intended destination, redirect there; otherwise route to their dashboard
      if (next && next !== '/') {
        return NextResponse.redirect(`${origin}${next}`);
      }

      const rolePath = `/${role}/dashboard`;
      return NextResponse.redirect(`${origin}${rolePath}`);
    }
  }

  // Return the user to login with an error if something failed
  return NextResponse.redirect(`${origin}/login?error=oauth_failed`);
}
