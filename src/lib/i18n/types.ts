export type SupportedLanguage = 'en' | 'vi' | 'ja' | 'fr' | 'ko' | 'zh' | 'de' | 'es';

export interface LanguageInfo {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: LanguageInfo[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
  { code: 'zh', name: 'Chinese', nativeName: '简体中文', flag: '🇨🇳' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
];

export const DEFAULT_LANGUAGE: SupportedLanguage = 'en';

export interface TranslationSchema {
  brand: {
    title: string;
    subtitle: string;
    adminPortal: string;
    language: string;
  };
  gate: {
    greeting: string;
    title: string;
    subtitle: string;
    enterButton: string;
    hint: string;
  };
  dock: {
    play: string;
    pause: string;
    nextTrack: string;
    nextArtwork: string;
    soundCategoryAll: string;
    soundCategoryPiano: string;
    soundCategoryAmbient: string;
    toggleSoundCategory: string;
    toggleVisualMode: string;
    writeJournal: string;
    journalList: string;
    zenMode: string;
    exitZenMode: string;
    volume: string;
    adaptedTo: string;
  };
  write: {
    title: string;
    editTitle: string;
    titlePlaceholder: string;
    bodyPlaceholder: string;
    saveButton: string;
    updateButton: string;
    cancelButton: string;
    draftSaved: string;
    saving: string;
  };
  journal: {
    title: string;
    searchPlaceholder: string;
    searchFound: string;
    timeline: string;
    list: string;
    filterAll: string;
    today: string;
    yesterday: string;
    thisWeek: string;
    earlier: string;
    emptyTitle: string;
    emptySubtitle: string;
    viewButton: string;
    editButton: string;
    deleteButton: string;
    undoButton: string;
    wordsCount: string;
    minRead: string;
    exportJson: string;
    importJson: string;
    readingViewTitle: string;
    close: string;
    untitled: string;
    confirmDelete: string;
  };
  moods: {
    calm: string;
    grateful: string;
    reflective: string;
    peaceful: string;
    hopeful: string;
  };
  weather: {
    clear: string;
    clouds: string;
    rain: string;
    fog: string;
    snow: string;
    dawn: string;
    dusk: string;
    night: string;
  };
}
