import { useEffect, useRef } from 'react';
import detectLang from 'lang-detector';

// This maps the language name from lang-detector to the ID used by Judge0
const REVERSE_LANGUAGE_MAP: { [key: string]: number } = {
  'Python': 71,
  'C++': 54,
  'C': 50,
  'Java': 62,
  'JavaScript': 63, // The dropdown doesn't have JS, but we can detect it.
};

export const useLanguageDetector = (
  code: string | undefined,
  setLanguageId: (id: number) => void,
  currentLanguageId: number
) => {
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      if (code && code.length > 20) { // Only run on reasonably long code
        try {
          const detectedLanguage = detectLang(code);
          const detectedId = REVERSE_LANGUAGE_MAP[detectedLanguage];

          // Check if a valid language was detected and it's different from the current one
          if (detectedId && detectedId !== currentLanguageId) {
            console.log(`Language detected: ${detectedLanguage}, setting ID to ${detectedId}`);
            setLanguageId(detectedId);
          }
        } catch (error) {
          // lang-detector might throw an error if the snippet is too small or unrecognizable
          // We can safely ignore these errors.
        }
      }
    }, 500); // 500ms debounce delay

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [code, setLanguageId, currentLanguageId]);
};
