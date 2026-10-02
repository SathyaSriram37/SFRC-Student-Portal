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
      <body className="bg-sfrc-bg text-sfrc-950 antialiased min-h-full flex flex-col">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <CapabilitiesProvider>
            <ServiceWorkerRegister />
            <Header />
            <main className="flex-1">
              {children}
            </main>
            <PragyaDrawer />
            <Toaster
              position="top-right"
              toastOptions={{
                style: {
                  background: '#FBF5EB',
                  color: '#2A1506',
                  border: '1px solid #E8C88A',
                },
              }}
            />
          </CapabilitiesProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
