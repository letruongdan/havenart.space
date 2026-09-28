import { notFound } from 'next/navigation';
import { parseLocale } from '@/lib/i18n/locale';
import { getDictionary } from '@/lib/i18n/dictionary';
import { CHAPTERS } from '@/config/story';
import { HOTSPOTS } from '@/config/hotspots';
import { CONTACTS } from '@/config/contacts';
import { ExperienceHost } from '@/components/story/ExperienceHost';

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

  return (
    <ExperienceHost
      locale={locale}
      copy={copy}
      chapters={CHAPTERS}
      hotspots={HOTSPOTS}
      contacts={CONTACTS}
    />
  );
}

