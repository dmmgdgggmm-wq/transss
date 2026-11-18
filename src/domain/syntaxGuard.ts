import { GlossaryEntry, SyntaxToken } from './types';

/**
 * Matches RPG Maker MV/MZ control codes, formatting escapes, variables, and plugin tags:
 * - \V[n], \N[n], \P[n], \G, \C[n], \I[n], \FS[n], \px[n], \py[n], \af[n], \ac[n]
 * - \{, \}, \., \|, \!, \>, \<, \^, \\
 * - %1, %2, %3, %4
 * - Ruby text \rb[kanji,furigana]
 * - Plugin/HTML tags <WordWrap>, <br>, <\C[2]>, etc.
 */
const CONTROL_CODE_REGEX =
  /(\\(?:V|N|P|C|I|FS|px|py|af|ac|nc|nw)\[\d+\]|\\rb\[[^\]]+\]|\\G|\\\{|\\\}|\\\.|\\\||\\\!|\\>|\\<|\\\^|\\\\|%[1-9]|<[^>]+>)/gi;

export function computeStringHash(text: string): string {
  // Fast deterministic FNV-1a 64-bit style hex hash for Translation Memory deduplication
  let h1 = 0xdeadbeef ^ text.length;
  let h2 = 0x41c6ce57 ^ text.length;
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0');
}

export function protectControlCodes(text: string): {
  maskedText: string;
  tokens: SyntaxToken[];
} {
  const tokens: SyntaxToken[] = [];
  const maskedText = text.replace(CONTROL_CODE_REGEX, (match) => {
    const index = tokens.length;
    const placeholder = `[[CODE_${index}]]`;
    tokens.push({ placeholder, raw: match });
    return placeholder;
  });

  return { maskedText, tokens };
}

export function restoreControlCodes(
  translatedMasked: string,
  tokens: SyntaxToken[]
): string {
  let result = translatedMasked;
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    // Also tolerate minor whitespace variations inside [[ CODE_0 ]] that an LLM might introduce
    const flexiblePattern = new RegExp(`\\[\\[\\s*CODE_${i}\\s*\\]\\]`, 'g');
    result = result.replace(flexiblePattern, () => token.raw);
  }
  return result;
}

export function validateSyntaxTokens(
  originalTokens: SyntaxToken[],
  translatedText: string
): {
  valid: boolean;
  missing: string[];
  extra: string[];
} {
  const missing: string[] = [];
  for (const token of originalTokens) {
    // Check either exact raw code or the [[CODE_i]] placeholder if validating before restoration
    const indexMatch = token.placeholder.match(/CODE_(\d+)/);
    const idx = indexMatch ? indexMatch[1] : '';
    const hasPlaceholder =
      idx !== '' && new RegExp(`\\[\\[\\s*CODE_${idx}\\s*\\]\\]`).test(translatedText);
    const hasRaw = translatedText.includes(token.raw);

    if (!hasPlaceholder && !hasRaw) {
      missing.push(`${token.placeholder} (${token.raw})`);
    }
  }

  // Check for hallucinated [[CODE_n]] tokens that didn't exist in originalTokens
  const extra: string[] = [];
  const foundPlaceholders = translatedText.match(/\[\[\s*CODE_(\d+)\s*\]\]/g) || [];
  for (const found of foundPlaceholders) {
    const numMatch = found.match(/(\d+)/);
    if (numMatch) {
      const idx = parseInt(numMatch[1], 10);
      if (idx >= originalTokens.length) {
        extra.push(found);
      }
    }
  }

  return {
    valid: missing.length === 0 && extra.length === 0,
    missing,
    extra,
  };
}

/**
 * Pre-filtering (Section 5.2 #1):
 * Skip empty strings, strings with only numbers/symbols, or strings that have no
 * letters/CJK/words left after SyntaxGuard masks control codes.
 */
export function isSkippableGarbageString(text: string): boolean {
  if (!text || !text.trim()) return true;
  const { maskedText } = protectControlCodes(text);
  const withoutPlaceholders = maskedText.replace(/\[\[\s*CODE_\d+\s*\]\]/g, '').trim();
  if (!withoutPlaceholders) return true;
  // Check if there is at least one Unicode letter (Latin, Japanese Kana/Kanji, Vietnamese, etc.)
  const hasLetter = /[\p{L}]/u.test(withoutPlaceholders);
  return !hasLetter;
}

/**
 * Post-translation Glossary & Pronoun Consistency Check (Section 2.3):
 * Verifies that mandatory glossary terms ('keep' or 'custom') present in sourceText
 * appear properly in translatedText.
 */
export function validateGlossaryCompliance(
  sourceText: string,
  translatedText: string,
  glossary: GlossaryEntry[]
): {
  valid: boolean;
  violations: string[];
} {
  const violations: string[] = [];
  if (!translatedText.trim()) return { valid: true, violations };

  const lowerTrans = translatedText.toLowerCase();
  for (const entry of glossary) {
    if (!entry.sourceTerm.trim()) continue;
    if (!sourceText.includes(entry.sourceTerm)) continue;

    if (entry.mode === 'keep') {
      if (!lowerTrans.includes(entry.sourceTerm.toLowerCase())) {
        violations.push(
          `Từ khóa "${entry.sourceTerm}" (chế độ Keep) bị mất trong bản dịch.`
        );
      }
    } else if (entry.mode === 'custom' && entry.targetTerm.trim()) {
      if (!lowerTrans.includes(entry.targetTerm.toLowerCase())) {
        violations.push(
          `Thuật ngữ "${entry.sourceTerm}" phải dịch là "${entry.targetTerm}".`
        );
      }
    }
  }

  return {
    valid: violations.length === 0,
    violations,
  };
}
