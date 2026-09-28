/**
 * HavenArt — Dictionary Loader
 * Contract Version: havenart-contracts-1.1
 */

import type { Dictionary, Locale } from '@/types/story';
import { viMessages } from '@/content/vi/messages';
import { enMessages } from '@/content/en/messages';

const dictionaries: Record<Locale, Dictionary> = {
  vi: viMessages,
  en: enMessages,
};

export async function getDictionary(locale: Locale): Promise<Dictionary> {
  const dictionary = dictionaries[locale];
  if (!dictionary) {
    throw new Error(`Unsupported locale dictionary requested: "${locale}"`);
  }
  return dictionary;
}

export function getDictionarySync(locale: Locale): Dictionary {
  const dictionary = dictionaries[locale];
  if (!dictionary) {
    throw new Error(`Unsupported locale dictionary requested: "${locale}"`);
  }
  return dictionary;
}
