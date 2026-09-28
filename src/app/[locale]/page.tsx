import Link from 'next/link';
import { notFound } from 'next/navigation';
import { parseLocale } from '@/lib/i18n/locale';
import { getDictionary } from '@/lib/i18n/dictionary';
import { CHAPTERS } from '@/config/story';
import { CONTACTS } from '@/config/contacts';
import { StorySections } from '@/components/story/StorySections';

export const dynamicParams = false;

export function generateStaticParams() {
  return [{ locale: 'vi' }, { locale: 'en' }];
}

export default async function LocalePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = parseLocale(rawLocale);
  if (!locale) {
    notFound();
  }

  const copy = await getDictionary(locale);
  const altLocale = locale === 'vi' ? 'en' : 'vi';
  const altLocaleLabel = locale === 'vi' ? 'English' : 'Tiếng Việt';

  return (
    <div className="min-h-screen flex flex-col justify-between">
      {/* Top Utility Navigation & Locale Switcher */}
      <nav
        aria-label={copy.navigation.languageLabel}
        className="w-full border-b border-stone-200/80 bg-stone-50/90 backdrop-blur-xs sticky top-0 z-40"
      >
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link
            href={`/${locale}`}
            className="font-serif font-bold text-lg text-stone-900 tracking-tight hover:opacity-80 transition-opacity"
          >
            {copy.brand.name}
          </Link>

          <div className="flex items-center space-x-6 text-sm">
            <a
              href="#contact"
              className="text-stone-600 hover:text-stone-900 font-medium transition-colors"
            >
              {copy.contact.title}
            </a>
            <span className="text-stone-300 select-none">|</span>
            <Link
              href={`/${altLocale}`}
              hrefLang={altLocale}
              className="font-medium text-stone-800 hover:text-stone-950 underline underline-offset-4 transition-colors"
            >
              {altLocaleLabel}
            </Link>
          </div>
        </div>
      </nav>

      {/* Primary Semantic Story Document */}
      <main id="main-content" tabIndex={-1} className="focus:outline-none flex-1">
        <StorySections chapters={CHAPTERS} copy={copy} contacts={CONTACTS} />
      </main>

      {/* Document Footer */}
      <footer className="py-12 px-6 border-t border-stone-200 bg-stone-100 text-center text-xs text-stone-500">
        <div className="max-w-4xl mx-auto space-y-2">
          <p>© 2026 {copy.brand.name}. {copy.brand.tagline}</p>
          <p className="font-light">{copy.brand.conceptLabel}</p>
        </div>
      </footer>
    </div>
  );
}
