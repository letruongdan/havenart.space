import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import '@/styles/globals.css';
import { parseLocale } from '@/lib/i18n/locale';
import { getDictionary } from '@/lib/i18n/dictionary';
import { buildPageMetadata } from '@/lib/seo/metadata';
import { SITE_CONFIG } from '@/config/site';

export const dynamicParams = false;

export function generateStaticParams() {
  return [{ locale: 'vi' }, { locale: 'en' }];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = parseLocale(rawLocale);
  if (!locale) {
    return {};
  }

  const copy = await getDictionary(locale);

  const metadata = buildPageMetadata({
    locale,
    copy,
    siteConfig: SITE_CONFIG,
    ogImageVerified: true,
  });

  // Ensure OpenGraph images reference the verified static image asset /images/og-havenart.jpg (W25, W28-AC3)
  const isProduction = SITE_CONFIG.environment === 'production';
  const cleanOrigin =
    isProduction && SITE_CONFIG.publicOrigin
      ? SITE_CONFIG.publicOrigin.replace(/\/+$/, '')
      : '';

  if (metadata.openGraph) {
    metadata.openGraph.images = [
      {
        url: cleanOrigin ? `${cleanOrigin}/images/og-havenart.jpg` : '/images/og-havenart.jpg',
        width: 1200,
        height: 630,
        alt: copy.metadata.ogAlt,
      },
    ];
  }

  return metadata;
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = parseLocale(rawLocale);
  if (!locale) {
    notFound();
  }

  const copy = await getDictionary(locale);

  return (
    <html lang={locale}>
      <body className="bg-stone-50 text-stone-900 antialiased min-h-screen">
        {/* Skip Navigation Links for Accessibility */}
        <div className="sr-only focus-within:not-sr-only">
          <a
            href="#main-content"
            className="fixed top-4 left-4 z-50 px-4 py-2 bg-stone-900 text-stone-50 text-sm font-medium rounded shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-stone-900"
          >
            {copy.navigation.skipContent}
          </a>
          <a
            href="#contact"
            className="fixed top-16 left-4 z-50 px-4 py-2 bg-stone-900 text-stone-50 text-sm font-medium rounded shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-stone-900"
          >
            {copy.navigation.skipContact}
          </a>
        </div>
        {children}
      </body>
    </html>
  );
}
