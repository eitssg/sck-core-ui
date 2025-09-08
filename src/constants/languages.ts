export type Language = {
  code: string;
  name: string;
  nativeName?: string;
};

// Only en-US for now, structured to expand later
export const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'en-US', name: 'English (US)', nativeName: 'English (US)' },
  // { code: 'en-GB', name: 'English (UK)', nativeName: 'English (UK)' },
];
