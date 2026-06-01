import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Bricolage_Grotesque, Inter_Tight } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getTranslations } from 'next-intl/server';
import { cn } from '@/lib/utils';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { BottomNav } from '@/components/layout/BottomNav';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { RealtimeProvider } from '@/components/providers/RealtimeProvider';

const display = Bricolage_Grotesque({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-display',
  display: 'swap',
});

const body = Inter_Tight({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-body',
  display: 'swap',
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('common');
  return {
    title: t('metaTitle'),
    description: t('tagline'),
  };
}

export const viewport: Viewport = {
  viewportFit: 'cover',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const tNav = await getTranslations('nav');

  return (
    <html
      lang={locale}
      className={cn('dark', display.variable, body.variable)}
    >
      <body className="min-h-screen flex flex-col relative">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-100 focus:rounded-lg focus:bg-neon focus:px-4 focus:py-2 focus:font-display focus:font-bold focus:text-primary-foreground"
        >
          {tNav('skipToContent')}
        </a>
        <NextIntlClientProvider>
          <AuthProvider>
            <RealtimeProvider>
              <Navbar />
              <div id="main-content" tabIndex={-1} className="flex-1 relative z-10 pb-nav md:pb-0 outline-none">
                {children}
              </div>
              <Footer />
              <BottomNav />
            </RealtimeProvider>
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
