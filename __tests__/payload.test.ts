import { describe, it, expect } from 'vitest';

// Utility helper for testing Judge0 payloads
const buildJudge0Payload = (code: string, language: string) => {
  const languageMap: Record<string, number> = {
    'python': 71,
    'javascript': 63,
    'typescript': 74,
  };
  
  const id = languageMap[language.toLowerCase()];
  if (!id) throw new Error(`Unsupported language: ${language}`);
  
  return {
    source_code: btoa(code),
    language_id: id,
    stdin: btoa(''),
  };
};

describe('CodeShield Engineering Suite: Judge0 Payloads', () => {
  it('correctly maps python to language ID 71', () => {
    const payload = buildJudge0Payload('print("hello")', 'python');
    expect(payload.language_id).toBe(71);
    expect(atob(payload.source_code)).toBe('print("hello")');
  });

  it('correctly maps javascript to language ID 63', () => {
    const payload = buildJudge0Payload('console.log("hi")', 'javascript');
    expect(payload.language_id).toBe(63);
  });

  it('throws a descriptive error on unsupported languages', () => {
    expect(() => buildJudge0Payload('dummy', 'cobol')).toThrow('Unsupported language: cobol');
  });
});
