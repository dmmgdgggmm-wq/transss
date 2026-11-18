/**
 * AutoWordWrapper (Section 4.3 & Section 7 #4)
 * Calculates visible display length (ignoring invisible RPG Maker control codes like \C[n], \{, \., etc.,
 * while counting \N[n] / \V[n] as ~6 visible characters) and wraps Vietnamese text cleanly so it never
 * overflows the RPG Maker dialogue window.
 */

export function measureVisibleLength(text: string): number {
  // Replace name/variable codes with a 6-character approximation
  const withExpandedVars = text.replace(/\\(?:N|V|P)\[\d+\]/gi, 'XXXXXX');
  // Strip invisible formatting codes (\C[n], \I[n], \{, \}, \., \|, \!, \>, \<, \^, <...>)
  const stripped = withExpandedVars.replace(
    /\\(?:C|I|FS|px|py)\[\d+\]|\\\{|\\\}|\\\.|\\\||\\\!|\\>|\\<|\\\^|<[^>]+>/gi,
    ''
  );
  return stripped.length;
}

export function wrapDialogueText(text: string, maxLineWidth = 48): string[] {
  if (!text) return [''];
  const normalized = text.replace(/\r\n/g, '\n');
  const rawParagraphs = normalized.split('\n');
  const wrappedLines: string[] = [];

  for (const paragraph of rawParagraphs) {
    const trimmed = paragraph.trim();
    if (!trimmed) {
      wrappedLines.push('');
      continue;
    }

    if (measureVisibleLength(trimmed) <= maxLineWidth) {
      wrappedLines.push(trimmed);
      continue;
    }

    const words = trimmed.split(/\s+/);
    let currentLine = '';

    for (const word of words) {
      if (!currentLine) {
        currentLine = word;
      } else {
        const candidate = `${currentLine} ${word}`;
        if (measureVisibleLength(candidate) <= maxLineWidth) {
          currentLine = candidate;
        } else {
          wrappedLines.push(currentLine);
          currentLine = word;
        }
      }
    }

    if (currentLine) {
      wrappedLines.push(currentLine);
    }
  }

  return wrappedLines.length > 0 ? wrappedLines : [''];
}

/**
 * Splits wrapped lines into pages of at most `maxLinesPerPage` (4 in RPG Maker MV/MZ)
 * so RpgmJsonInjector can automatically insert continuation 101 + 401 commands.
 */
export function splitLinesIntoPages(lines: string[], maxLinesPerPage = 4): string[][] {
  if (lines.length === 0) return [['']];
  const pages: string[][] = [];
  for (let i = 0; i < lines.length; i += maxLinesPerPage) {
    pages.push(lines.slice(i, i + maxLinesPerPage));
  }
  return pages;
}
