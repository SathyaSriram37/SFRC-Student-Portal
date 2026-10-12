import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import Header from '@/components/layout/Header';
import { CapabilitiesProvider } from '@/lib/hooks/use-capabilities';
import ServiceWorkerRegister from '@/components/shared/ServiceWorkerRegister';
import PragyaDrawer from '@/components/ai/PragyaDrawer';
import './globals.css';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
});

export const viewport: Viewport = {
  themeColor: '#7B4019',
};

export const metadata: Metadata = {
  title: 'MyZone SFRC 360',
  description: 'One Campus. One Connected Experience. — The Standard Fireworks Rajaratnam College for Women, Sivakasi',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'MyZone SFRC 360',
  },
  icons: {
    icon: '/wel_img.jpg',
    apple: '/wel_img.jpg',
  },
  keywords: ['SFRC', 'Sivakasi', 'college portal', 'student portal', 'MyZone', 'PWA'],
  authors: [{ name: 'SFRC ICT Team' }],
  openGraph: {
    title: 'MyZone SFRC 360',
    description: 'One Campus. One Connected Experience.',
    siteName: 'MyZone SFRC 360',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} h-full`} suppressHydrationWarning>
      <body className="bg-background text-foreground antialiased min-h-full flex flex-col">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem={true} disableTransitionOnChange={false}>
          <CapabilitiesProvider>
            <ServiceWorkerRegister />
            <Header />
            <main className="flex-1">
              {children}
            </main>
            <PragyaDrawer />
            <Toaster
              position="top-right"
              theme="system"
              toastOptions={{
                classNames: {
                  toast: 'dark:bg-card dark:text-foreground dark:border-border',
                },
                style: {
                  background: 'var(--card)',
                  color: 'var(--card-foreground)',
                  border: '1px solid var(--border)',
                },
              }}
            />
          </CapabilitiesProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

