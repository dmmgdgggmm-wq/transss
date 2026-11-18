import { validateSyntaxTokens } from './syntaxGuard';
import { TranslationUnit } from './types';

function escapeCsvCell(value: string): string {
  const normalized = value.replace(/\r\n/g, '\n');
  if (/[",\n]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }
  return normalized;
}

export function exportUnitsToCsv(units: TranslationUnit[]): string {
  const header = ['id', 'filePath', 'speaker', 'contextLabel', 'sourceText', 'translatedText', 'status'];
  const rows = [header.join(',')];

  for (const u of units) {
    rows.push(
      [
        escapeCsvCell(u.id),
        escapeCsvCell(u.filePath),
        escapeCsvCell(u.speaker || ''),
        escapeCsvCell(u.contextLabel),
        escapeCsvCell(u.sourceText),
        escapeCsvCell(u.translatedText),
        escapeCsvCell(u.status),
      ].join(',')
    );
  }

  return rows.join('\n');
}

function parseCsvRows(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const ch = csvText[i];
    const next = csvText[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        currentCell += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        currentCell += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        currentRow.push(currentCell);
        currentCell = '';
      } else if (ch === '\n' || (ch === '\r' && next === '\n')) {
        if (ch === '\r') i++;
        currentRow.push(currentCell);
        rows.push(currentRow);
        currentRow = [];
        currentCell = '';
      } else {
        currentCell += ch;
      }
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell);
    rows.push(currentRow);
  }

  return rows;
}

export function applyCsvImportToUnits(
  units: TranslationUnit[],
  csvText: string
): {
  updatedUnits: TranslationUnit[];
  importedCount: number;
} {
  const rows = parseCsvRows(csvText.trim());
  if (rows.length <= 1) {
    return { updatedUnits: units, importedCount: 0 };
  }

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const idIdx = header.indexOf('id');
  const transIdx = header.indexOf('translatedtext');
  const sourceIdx = header.indexOf('sourcetext');

  const byId = new Map<string, string>();
  const bySource = new Map<string, string>();

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const transVal = transIdx >= 0 && row[transIdx] ? row[transIdx].trim() : '';
    if (!transVal) continue;

    if (idIdx >= 0 && row[idIdx]) {
      byId.set(row[idIdx].trim(), transVal);
    }
    if (sourceIdx >= 0 && row[sourceIdx]) {
      bySource.set(row[sourceIdx], transVal);
    }
  }

  let importedCount = 0;
  const updatedUnits = units.map((u) => {
    const imported = byId.get(u.id) ?? bySource.get(u.sourceText);
    if (imported !== undefined && imported !== u.translatedText) {
      importedCount++;
      const tokenCheck = validateSyntaxTokens(u.tokens, imported);
      return {
        ...u,
        translatedText: imported,
        status: tokenCheck.valid ? ('TRANSLATED' as const) : ('VALIDATION_ERROR' as const),
        errorDetail: tokenCheck.valid
          ? undefined
          : `Thiếu mã điều khiển: ${tokenCheck.missing.join(', ')}`,
      };
    }
    return u;
  });

  return { updatedUnits, importedCount };
}
