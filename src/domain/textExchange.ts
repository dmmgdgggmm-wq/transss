import {
  restoreControlCodes,
  validateGlossaryCompliance,
  validateSyntaxTokens,
} from './syntaxGuard';
import { GlossaryEntry, TranslationUnit } from './types';

export type TextExportFormat = 'TAGGED_BLOCK' | 'INDEXED_LINE' | 'SIMPLE_NUMBERED';

export interface TextExportOptions {
  format: TextExportFormat;
  deduplicateByHash: boolean;
  useMaskedTokens: boolean;
  onlyPending: boolean;
  fileFilter: string;
  includeContextComments: boolean;
}

export interface TextImportReport {
  id: string;
  timestamp: string;
  fileName: string;
  detectedFormat: string;
  entriesParsed: number;
  unitsUpdated: number;
  warningsCount: number;
  summary: string;
}

function getExportTargetUnits(
  units: TranslationUnit[],
  options: Pick<TextExportOptions, 'deduplicateByHash' | 'onlyPending' | 'fileFilter'>
): TranslationUnit[] {
  const seenHashes = new Set<string>();
  const result: TranslationUnit[] = [];

  for (const u of units) {
    if (options.fileFilter !== 'ALL' && u.filePath !== options.fileFilter) {
      continue;
    }
    if (options.onlyPending && u.status === 'TRANSLATED') {
      continue;
    }
    if (options.deduplicateByHash && !u.isUnlinkedFromTM) {
      if (seenHashes.has(u.hash)) continue;
      seenHashes.add(u.hash);
    }
    result.push(u);
  }

  return result;
}

/**
 * Exports extracted RPG Maker strings into a structured .txt file
 * that can be translated externally and re-uploaded for automatic recognition.
 */
export function exportUnitsToText(
  units: TranslationUnit[],
  options: TextExportOptions
): { content: string; exportedCount: number } {
  const targetUnits = getExportTargetUnits(units, options);

  if (targetUnits.length === 0) {
    return { content: '', exportedCount: 0 };
  }

  const lines: string[] = [];

  if (options.includeContextComments) {
    lines.push(
      `# ====================================================================`,
      `# TỆP VĂN BẢN TRÍCH XUẤT RPG MAKER MV/MZ (${targetUnits.length} mục)`,
      `# Định dạng: ${options.format} | Khử trùng lặp Hash: ${options.deduplicateByHash ? 'Bật' : 'Tắt'}`,
      `# Hướng dẫn: Dịch nội dung văn bản sang tiếng Việt. Giữ nguyên thẻ đánh dấu [0001...] và các mã điều khiển \\C[n], \\N[n], \\V[n] hoặc [[CODE_n]].`,
      `# Sau khi dịch xong, tải tệp .txt này lên ứng dụng để tự động nhận dạng và ghép vào khung đã dịch.`,
      `# ====================================================================`,
      ``
    );
  }

  targetUnits.forEach((u, idx) => {
    const seq = String(idx + 1).padStart(4, '0');
    const shortHash = u.hash.slice(0, 10);
    const rawOrMasked = options.useMaskedTokens ? u.maskedText : u.sourceText;
    const speakerTag = u.speaker ? ` · Người nói: ${u.speaker}` : '';

    if (options.format === 'TAGGED_BLOCK') {
      lines.push(
        `@@@ [${seq} | HASH:${shortHash} | ID:${u.id} | ${u.contextLabel}${speakerTag}]`
      );
      lines.push(rawOrMasked);
      lines.push('');
    } else if (options.format === 'INDEXED_LINE') {
      const escapedSingleLine = rawOrMasked
        .replace(/\r\n/g, '\n')
        .replace(/\n/g, '\\n');
      lines.push(`[${seq}|${shortHash}] ${escapedSingleLine}`);
    } else {
      // SIMPLE_NUMBERED
      lines.push(`=== [${seq}] ===`);
      lines.push(rawOrMasked);
      lines.push('');
    }
  });

  return {
    content: lines.join('\n').trimEnd() + '\n',
    exportedCount: targetUnits.length,
  };
}

interface ParsedTextEntry {
  seqIndex?: number; // 1-based index
  shortHash?: string;
  unitId?: string;
  text: string;
}

/**
 * Automatically detects the format of an uploaded/pasted translated .txt file
 * and extracts translated entries. Supports IDs/context labels containing brackets like [0].
 */
export function parseTranslatedTextContent(rawInput: string): {
  entries: ParsedTextEntry[];
  detectedFormat: string;
} {
  const normalized = rawInput.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  const trimmed = normalized.trim();
  if (!trimmed) {
    return { entries: [], detectedFormat: 'Trống' };
  }

  // 1. Check for TAGGED_BLOCK format: @@@ [0001 | HASH:xxxx | ID:xxxx | ...]
  // Note: ID and contextLabel may contain brackets like terms.commands[0], so we match up to the final `]` on the line.
  const taggedHeaderRegex =
    /^@@@\s*\[\s*(\d+)\s*(?:\|\s*HASH:([a-zA-Z0-9_-]+))?\s*(?:\|\s*ID:([^|\n]+?))?(?:\s*\|[^\n]*)?\]\s*$/gm;
  const taggedMatches = Array.from(normalized.matchAll(taggedHeaderRegex));

  if (taggedMatches.length > 0) {
    const entries: ParsedTextEntry[] = [];
    for (let i = 0; i < taggedMatches.length; i++) {
      const match = taggedMatches[i];
      const seqIndex = parseInt(match[1], 10);
      const shortHash = match[2]?.trim();
      const unitId = match[3]?.trim();
      const bodyStart = (match.index ?? 0) + match[0].length;
      const bodyEnd =
        i + 1 < taggedMatches.length
          ? taggedMatches[i + 1].index ?? normalized.length
          : normalized.length;

      const body = normalized
        .slice(bodyStart, bodyEnd)
        .replace(/^\n+/, '')
        .replace(/\n+$/, '');

      if (body.trim()) {
        entries.push({
          seqIndex,
          shortHash,
          unitId,
          text: body,
        });
      }
    }
    return {
      entries,
      detectedFormat: 'Khối định danh @@@ [Số thứ tự | HASH | ID]',
    };
  }

  // 2. Check for SIMPLE_NUMBERED block format: === [0001] === or === [0001 | ...] ===
  const simpleBlockRegex =
    /^===\s*\[\s*(\d+)(?:\s*\|\s*(?:HASH:)?([a-zA-Z0-9_-]+))?(?:[^\n]*)\]\s*===\s*$/gm;
  const simpleMatches = Array.from(normalized.matchAll(simpleBlockRegex));

  if (simpleMatches.length > 0) {
    const entries: ParsedTextEntry[] = [];
    for (let i = 0; i < simpleMatches.length; i++) {
      const match = simpleMatches[i];
      const seqIndex = parseInt(match[1], 10);
      const shortHash = match[2]?.trim();
      const bodyStart = (match.index ?? 0) + match[0].length;
      const bodyEnd =
        i + 1 < simpleMatches.length
          ? simpleMatches[i + 1].index ?? normalized.length
          : normalized.length;

      const body = normalized
        .slice(bodyStart, bodyEnd)
        .replace(/^\n+/, '')
        .replace(/\n+$/, '');

      if (body.trim()) {
        entries.push({
          seqIndex,
          shortHash,
          text: body,
        });
      }
    }
    return {
      entries,
      detectedFormat: 'Khối đánh số === [0001] ===',
    };
  }

  // Filter out comment lines starting with #
  const nonCommentLines = normalized
    .split('\n')
    .filter((line) => !line.trim().startsWith('#'));

  // 3. Check for INDEXED_LINE format: [0001|a1b2c3d4] text or [0001] text
  const indexedLineRegex =
    /^\[\s*(\d+)\s*(?:\|\s*(?:HASH:)?([a-zA-Z0-9_-]+))?\s*\]\s*(.+)$/;
  const indexedEntries: ParsedTextEntry[] = [];
  let indexedMatchCount = 0;

  for (const rawLine of nonCommentLines) {
    const line = rawLine.trim();
    if (!line) continue;
    const m = line.match(indexedLineRegex);
    if (m) {
      indexedMatchCount++;
      indexedEntries.push({
        seqIndex: parseInt(m[1], 10),
        shortHash: m[2]?.trim(),
        text: m[3].replace(/\\n/g, '\n'),
      });
    }
  }

  if (indexedMatchCount > 0) {
    return {
      entries: indexedEntries,
      detectedFormat: 'Dòng đánh chỉ mục [0001|HASH]',
    };
  }

  // 4. Plain line-by-line fallback (each non-empty line corresponds to 1 sequential item)
  const plainLines = nonCommentLines
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  return {
    entries: plainLines.map((line, idx) => ({
      seqIndex: idx + 1,
      text: line.replace(/\\n/g, '\n'),
    })),
    detectedFormat: 'Dòng tuần tự (Plain Text)',
  };
}

/**
 * Matches parsed text entries back to TranslationUnits (by ID, Hash prefix, or sequential order),
 * restores SyntaxGuard tokens, validates Glossary, and updates all units.
 */
export function applyTranslatedTextToUnits(
  units: TranslationUnit[],
  rawText: string,
  glossary: GlossaryEntry[],
  options: {
    fileFilter?: string;
    deduplicateByHash?: boolean;
    onlyPending?: boolean;
    fileName?: string;
  } = {}
): {
  updatedUnits: TranslationUnit[];
  report: TextImportReport;
} {
  const { entries, detectedFormat } = parseTranslatedTextContent(rawText);

  const referenceList = getExportTargetUnits(units, {
    deduplicateByHash: options.deduplicateByHash ?? true,
    onlyPending: options.onlyPending ?? false,
    fileFilter: options.fileFilter ?? 'ALL',
  });

  // Lookup maps populated from parsed entries
  const byUnitId = new Map<string, string>();
  const byFullHash = new Map<string, string>();
  const byShortHash = new Map<string, string>();

  for (const entry of entries) {
    const cleanedText = entry.text.trim();
    if (!cleanedText) continue;

    if (entry.unitId) {
      byUnitId.set(entry.unitId, cleanedText);
    }
    if (entry.shortHash) {
      byShortHash.set(entry.shortHash, cleanedText);
    }
    if (
      typeof entry.seqIndex === 'number' &&
      entry.seqIndex >= 1 &&
      entry.seqIndex <= referenceList.length
    ) {
      const refUnit = referenceList[entry.seqIndex - 1];
      if (refUnit) {
        if (!byUnitId.has(refUnit.id)) {
          byUnitId.set(refUnit.id, cleanedText);
        }
        if (!byFullHash.has(refUnit.hash)) {
          byFullHash.set(refUnit.hash, cleanedText);
        }
      }
    }
  }

  // Also propagate any unitId match to its hash so identical strings get translated automatically
  for (const u of units) {
    const direct = byUnitId.get(u.id) ?? byShortHash.get(u.hash.slice(0, 10));
    if (direct && !u.isUnlinkedFromTM && !byFullHash.has(u.hash)) {
      byFullHash.set(u.hash, direct);
    }
  }

  let unitsUpdated = 0;
  let warningsCount = 0;

  const updatedUnits = units.map((u) => {
    const matchedRaw =
      byUnitId.get(u.id) ??
      (!u.isUnlinkedFromTM
        ? byFullHash.get(u.hash) ?? byShortHash.get(u.hash.slice(0, 10))
        : undefined);

    if (!matchedRaw) {
      return u;
    }

    unitsUpdated++;
    const restoredText = restoreControlCodes(matchedRaw, u.tokens);
    const tokenValidation = validateSyntaxTokens(u.tokens, restoredText);
    const glossaryValidation = validateGlossaryCompliance(
      u.sourceText,
      restoredText,
      glossary
    );

    if (!tokenValidation.valid) {
      warningsCount++;
      return {
        ...u,
        translatedText: restoredText,
        status: 'VALIDATION_ERROR' as const,
        errorDetail: `Thiếu mã điều khiển: ${tokenValidation.missing.join(', ')}`,
      };
    }

    if (!glossaryValidation.valid) {
      warningsCount++;
      return {
        ...u,
        translatedText: restoredText,
        status: 'GLOSSARY_VIOLATION' as const,
        errorDetail: glossaryValidation.violations.join(' '),
      };
    }

    return {
      ...u,
      translatedText: restoredText,
      status: 'TRANSLATED' as const,
      errorDetail: undefined,
    };
  });

  const report: TextImportReport = {
    id: `txt-import-${Date.now()}`,
    timestamp: new Date().toLocaleTimeString('vi-VN'),
    fileName: options.fileName || 'Dán trực tiếp (Clipboard)',
    detectedFormat,
    entriesParsed: entries.length,
    unitsUpdated,
    warningsCount,
    summary: `Đã tự nhận diện định dạng "${detectedFormat}" (${entries.length} mục đầu vào) và tự động điền bản dịch vào ${unitsUpdated} khung chuỗi trong dự án${warningsCount > 0 ? ` (${warningsCount} dòng cần kiểm tra mã điều khiển/thuật ngữ)` : ''}.`,
  };

  return { updatedUnits, report };
}

/**
 * Generates a ready-to-import Vietnamese translated .txt sample for all active units
 * while preserving every control code and glossary term so the user can test
 * 100% auto-recognition and ZIP packaging immediately.
 */
export function buildDemoTranslatedText(units: TranslationUnit[]): string {
  const uniqueUnits = getExportTargetUnits(units, {
    deduplicateByHash: true,
    onlyPending: false,
    fileFilter: 'ALL',
  });

  const lines: string[] = [
    '# BẢN DỊCH TIẾNG VIỆT MẪU (DÙNG ĐỂ KIỂM TRA TỰ NHẬN DẠNG .TXT)',
    '',
  ];

  uniqueUnits.forEach((u, idx) => {
    const seq = String(idx + 1).padStart(4, '0');
    const shortHash = u.hash.slice(0, 10);
    let vi = u.sourceText;

    // Preserve mandatory glossary replacements (e.g., Astral Shards -> Mảnh Tinh Quang, Order of the Silver Dawn -> Giáo Đoàn Bình Minh Bạc, Sunblade Strike -> Nhất Kiếm Thái Dương)
    vi = vi
      .replace(/Astral Shards/g, 'Mảnh Tinh Quang')
      .replace(/Astral Shard/g, 'Mảnh Tinh Quang')
      .replace(/Astral Crown/g, 'Vương Miện Tinh Tú')
      .replace(/Astral Severance/g, 'Tinh Quang Đoạn Không')
      .replace(/Order of the Silver Dawn/g, 'Giáo Đoàn Bình Minh Bạc')
      .replace(/Sunblade Strike/g, 'Nhất Kiếm Thái Dương')
      .replace(/Starlight Shard/g, 'Mảnh Tinh Quang')
      .replace(/Northern Ruins/g, 'Phế Tích Phương Bắc')
      .replace(/\bFight\b/g, 'Chiến đấu')
      .replace(/\bEscape\b/g, 'Bỏ chạy')
      .replace(/\bAttack\b/g, 'Tấn công')
      .replace(/\bGuard\b/g, 'Phòng thủ')
      .replace(/\bItem\b/g, 'Vật phẩm')
      .replace(/\bSkill\b/g, 'Kỹ năng')
      .replace(/\bEquip\b/g, 'Trang bị')
      .replace(/\bStatus\b/g, 'Trạng thái')
      .replace(/\bFormation\b/g, 'Đội hình')
      .replace(/\bSave\b/g, 'Lưu game')
      .replace(/\bGame End\b/g, 'Thoát game')
      .replace(/\bOptions\b/g, 'Tùy chọn')
      .replace(/\bWeapon\b/g, 'Vũ khí')
      .replace(/\bArmor\b/g, 'Giáp trụ')
      .replace(/\bKey Item\b/g, 'Vật phẩm cốt truyện')
      .replace(/\bNew Game\b/g, 'Trò chơi mới')
      .replace(/\bContinue\b/g, 'Tiếp tục')
      .replace(/\bTo Title\b/g, 'Về màn hình chính')
      .replace(/\bCancel\b/g, 'Hủy bỏ')
      .replace(/\bBuy\b/g, 'Mua')
      .replace(/\bSell\b/g, 'Bán');

    lines.push(
      `@@@ [${seq} | HASH:${shortHash} | ID:${u.id} | ${u.contextLabel}]`
    );
    lines.push(vi);
    lines.push('');
  });

  return lines.join('\n');
}
