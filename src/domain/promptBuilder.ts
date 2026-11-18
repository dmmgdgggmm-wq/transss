import {
  CharacterProfile,
  GlossaryEntry,
  PronounRelation,
  PromptPreset,
  TranslationUnit,
} from './types';

export const PROMPT_PRESETS: PromptPreset[] = [
  {
    id: 'fantasy',
    name: 'Fantasy / Giả tưởng Châu Âu',
    genreTag: 'JRPG / Royal Fantasy',
    description:
      'Văn phong tiểu thuyết giả tưởng phương Tây hoặc JRPG cổ điển: trang trọng nơi hoàng cung, tự nhiên khi phiêu lưu.',
    systemPrompt: `Bạn là chuyên gia bản địa hóa game JRPG / Fantasy sang tiếng Việt.
- Dịch tự nhiên, giàu cảm xúc, bám sát ngữ cảnh hội thoại và tính cách từng nhân vật.
- Giữ nguyên 100% các mã placeholder dạng [[CODE_0]], [[CODE_1]] đúng vị trí ngữ pháp.
- Không dịch nghĩa các tên riêng có đánh dấu 'keep' trong Glossary.
- Tuyệt đối tuân thủ Ma trận Xưng Hô (Pronoun Matrix) giữa các nhân vật.`,
  },
  {
    id: 'wuxia',
    name: 'Kiếm hiệp / Cổ trang Đông Phương',
    genreTag: 'Tu tiên / Cổ phong',
    description:
      'Sử dụng từ Hán-Việt chuẩn mực (Tại hạ, Các hạ, Bổn tọa, Huynh - Muội, Trẫm - Ái khanh), nhịp văn cổ điển.',
    systemPrompt: `Bạn là dịch giả chuyên dòng game Kiếm hiệp, Tu tiên và Cổ trang sang tiếng Việt.
- Sử dụng từ vựng Hán-Việt trau chuốt, hào sảng cho chiêu thức, cảnh giới và lời thoại.
- Giữ nguyên 100% các mã placeholder [[CODE_0]], [[CODE_1]] không thêm bớt khoảng trắng bên trong ngoặc.
- Tuân thủ nghiêm ngặt Ma trận Xưng Hô (Ta - Ngươi, Huynh - Đệ, Sư phụ - Đồ nhi, Bổn vương - Khanh).`,
  },
  {
    id: 'modern',
    name: 'Đời thường / Học đường Hiện đại',
    genreTag: 'Slice of Life / School',
    description:
      'Lời thoại trẻ trung, gần gũi (Tớ - Cậu, Anh - Em, Ông - Bà), tự nhiên như hội thoại đời thực.',
    systemPrompt: `Bạn là biên dịch viên game Visual Novel / RPG bối cảnh học đường và đô thị hiện đại.
- Dịch lời thoại trẻ trung, tự nhiên, đúng nhịp cảm xúc của nhân vật trẻ tuổi.
- Giữ nguyên toàn bộ ký hiệu [[CODE_0]], [[CODE_1]] trong câu.
- Áp dụng chính xác đại từ nhân xưng đã khai báo trong Ma trận Xưng Hô (Tớ - Cậu, Anh - Em, Tiền bối - Hậu bối).`,
  },
  {
    id: 'dark_fantasy',
    name: 'Dark Fantasy / Nghiêm túc & U ám',
    genreTag: 'Grimdark / Mystery',
    description:
      'Giọng văn cô đọng, sắc lạnh, giàu tính văn học và chiều sâu tâm lý cho dòng game sinh tồn, kinh dị hoặc sử thi bi tráng.',
    systemPrompt: `Bạn là dịch giả văn học chuyên dịch game Dark Fantasy và Mystery sang tiếng Việt.
- Giữ giọng văn trầm mặc, sắc sảo, từ ngữ chọn lọc, tránh dùng từ ngữ suồng sã hiện đại.
- Bảo toàn tuyệt đối mọi thẻ [[CODE_0]], [[CODE_1]] ở vị trí tương ứng.
- Tuân thủ tuyệt đối bảng Glossary và Ma trận Xưng Hô.`,
  },
];

export function buildSystemInstruction(
  customSystemPrompt: string,
  characters: CharacterProfile[],
  relations: PronounRelation[],
  glossary: GlossaryEntry[]
): string {
  const sections: string[] = [customSystemPrompt.trim()];

  if (characters.length > 0) {
    const charLines = characters.map(
      (c) =>
        `- ${c.originalName} (${c.translatedName || c.originalName}) | Giới tính: ${c.gender} | Phong cách: ${c.speechStyle} | Tự xưng mặc định: "${c.defaultSelfPronoun}", Gọi người đối diện: "${c.defaultAddressPronoun}"`
    );
    sections.push(`### HỒ SƠ NHÂN VẬT (CHARACTER PROFILES)\n${charLines.join('\n')}`);
  }

  if (relations.length > 0) {
    const relLines = relations.map(
      (r) =>
        `- Khi "${r.sourceCharacter}" nói với "${r.targetCharacter}": tự xưng là "${r.selfPronoun}", gọi đối phương là "${r.targetPronoun}"${r.note ? ` (${r.note})` : ''}`
    );
    sections.push(
      `### MA TRẬN XƯNG HÔ CỐ ĐỊNH (PRONOUN MATRIX)\n${relLines.join('\n')}`
    );
  }

  if (glossary.length > 0) {
    const glLines = glossary.map((g) => {
      if (g.mode === 'keep') {
        return `- "${g.sourceTerm}" -> GIỮ NGUYÊN "${g.sourceTerm}" (mode: keep)`;
      }
      if (g.mode === 'custom') {
        return `- "${g.sourceTerm}" -> BẮT BUỘC DỊCH LÀ "${g.targetTerm}" (mode: custom)`;
      }
      if (g.mode === 'transliterate') {
        return `- "${g.sourceTerm}" -> Phiên âm là "${g.targetTerm || g.sourceTerm}" (mode: transliterate)`;
      }
      return `- "${g.sourceTerm}" -> Dịch nghĩa là "${g.targetTerm}" (mode: translate)`;
    });
    sections.push(`### TỪ ĐIỂN THUẬT NGỮ (GLOSSARY)\n${glLines.join('\n')}`);
  }

  sections.push(
    `### QUY TẮC ĐẦU RA (COMPACT JSON SCHEMA)
- Đầu vào là mảng JSON các phần tử: {"i": <số thứ tự>, "s": "<tên người nói nếu có>", "c": "<ngữ cảnh>", "t": "<văn bản chứa [[CODE_n]]>"}.
- Có thể kèm "context_history" chứa 2-3 câu liền trước để bạn giữ mạch xưng hô (KHÔNG dịch lại context_history).
- Trả về đúng mảng JSON: [{"i": <số thứ tự khớp đầu vào>, "r": "<bản dịch tiếng Việt hoàn chỉnh giữ nguyên mọi [[CODE_n]]>"}].`
  );

  return sections.join('\n\n');
}

export interface CompactBatchItem {
  i: number;
  unitId: string;
  hash: string;
  s?: string;
  c: string;
  t: string;
}

export interface TokenAwareBatch {
  batchIndex: number;
  items: CompactBatchItem[];
  contextHistory: { speaker?: string; source: string; translated: string }[];
  estimatedTokens: number;
}

/**
 * Dynamic Token-Aware Batcher (Section 5.2 #2 & #3):
 * Deduplicates by hash (unless a unit is explicitly unlinked from TM) and groups items
 * up to `maxBatchTokens` so each request packs maximum dialogue lines safely.
 */
export function createTokenAwareBatches(
  units: TranslationUnit[],
  maxBatchTokens = 3000,
  maxItemsPerBatch = 25
): TokenAwareBatch[] {
  const seenHashes = new Set<string>();
  const batches: TokenAwareBatch[] = [];
  let currentItems: CompactBatchItem[] = [];
  let currentTokens = 0;
  const safeMaxItems = Math.max(1, maxItemsPerBatch);
  const safeMaxTokens = Math.max(200, maxBatchTokens);

  // Gather recently translated units for initial sliding context window
  const recentTranslated: { speaker?: string; source: string; translated: string }[] = [];

  for (const unit of units) {
    if (unit.status === 'TRANSLATED' && unit.translatedText.trim()) {
      recentTranslated.push({
        speaker: unit.speaker,
        source: unit.sourceText,
        translated: unit.translatedText,
      });
      if (!unit.isUnlinkedFromTM) {
        seenHashes.add(unit.hash);
      }
      continue;
    }

    if (!unit.isUnlinkedFromTM && seenHashes.has(unit.hash)) {
      continue;
    }

    if (!unit.isUnlinkedFromTM) {
      seenHashes.add(unit.hash);
    }

    const itemTokens = Math.ceil(unit.maskedText.length * 1.15) + 18;
    if (
      currentItems.length > 0 &&
      (currentTokens + itemTokens > safeMaxTokens ||
        currentItems.length >= safeMaxItems)
    ) {
      batches.push({
        batchIndex: batches.length + 1,
        items: currentItems,
        contextHistory: recentTranslated.slice(-3),
        estimatedTokens: currentTokens,
      });
      currentItems = [];
      currentTokens = 0;
    }

    currentItems.push({
      i: currentItems.length + 1,
      unitId: unit.id,
      hash: unit.hash,
      s: unit.speaker,
      c: unit.contextLabel,
      t: unit.maskedText,
    });
    currentTokens += itemTokens;
  }

  if (currentItems.length > 0) {
    batches.push({
      batchIndex: batches.length + 1,
      items: currentItems,
      contextHistory: recentTranslated.slice(-3),
      estimatedTokens: currentTokens,
    });
  }

  return batches;
}
