import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import '@/styles/globals.css';
import { parseLocale } from '@/lib/i18n/locale';
import { getDictionary } from '@/lib/i18n/dictionary';

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

  return {
    title: copy.metadata.title,
    description: copy.metadata.description,
    openGraph: {
      title: copy.metadata.ogTitle,
      description: copy.metadata.ogDescription,
      locale: locale === 'vi' ? 'vi_VN' : 'en_US',
    },
  };
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
