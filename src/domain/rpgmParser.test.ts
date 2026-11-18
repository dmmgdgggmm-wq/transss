import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isSkippableGarbageString,
  protectControlCodes,
  restoreControlCodes,
  validateGlossaryCompliance,
  validateSyntaxTokens,
} from './syntaxGuard';
import { splitLinesIntoPages, wrapDialogueText } from './autoWordWrapper';
import {
  detectCommonRootPrefix,
  extractFromRpgmJson,
  injectTranslationsIntoJson,
  validateArchiveEntries,
} from './rpgmParser';
import { DEFAULT_GLOSSARY_ENTRIES, SAMPLE_RPGM_FILES } from './sampleProjectData';
import {
  applyTranslatedTextToUnits,
  buildDemoTranslatedText,
  exportUnitsToText,
} from './textExchange';

test('SyntaxGuard masks and restores RPG Maker control codes accurately', () => {
  const raw =
    '\\N[1], take these \\C[17]500\\G\\C[0] and meet Princess \\C[2]Aria\\C[0]\\.';
  const { maskedText, tokens } = protectControlCodes(raw);

  assert.equal(tokens.length, 7);
  assert.ok(maskedText.includes('[[CODE_0]]'));
  assert.ok(!maskedText.includes('\\N[1]'));

  const translatedMasked =
    '[[CODE_0]], hãy nhận lấy [[CODE_1]]500[[CODE_2]][[CODE_3]] và gặp Công chúa [[CODE_4]]Aria[[CODE_5]][[CODE_6]]';
  const validation = validateSyntaxTokens(tokens, translatedMasked);
  assert.equal(validation.valid, true);

  const restored = restoreControlCodes(translatedMasked, tokens);
  assert.equal(
    restored,
    '\\N[1], hãy nhận lấy \\C[17]500\\G\\C[0] và gặp Công chúa \\C[2]Aria\\C[0]\\.'
  );
});

test('SyntaxGuard detects missing control codes and filters garbage strings', () => {
  const { tokens } = protectControlCodes('Hello \\N[1] and \\C[2]Aria\\C[0]!');
  const brokenTranslation = 'Xin chào [[CODE_0]] và Aria!';
  const validation = validateSyntaxTokens(tokens, brokenTranslation);
  assert.equal(validation.valid, false);
  assert.equal(validation.missing.length, 2);

  assert.equal(isSkippableGarbageString('   '), true);
  assert.equal(isSkippableGarbageString('12345 --- ???'), true);
  assert.equal(isSkippableGarbageString('\\C[2]\\N[1]\\C[0]'), true);
  assert.equal(isSkippableGarbageString('\\C[2]Hello\\C[0]'), false);
});

test('validateGlossaryCompliance catches violated keep/custom glossary terms', () => {
  const source = 'We must recover the Astral Shards in Aethelgard.';
  const validTrans = 'Chúng ta phải thu hồi Mảnh Tinh Quang tại Aethelgard.';
  const badTrans = 'Chúng ta phải thu hồi Ngọc Sao tại Vùng Đất Cổ.';

  assert.equal(
    validateGlossaryCompliance(source, validTrans, DEFAULT_GLOSSARY_ENTRIES).valid,
    true
  );
  const checkBad = validateGlossaryCompliance(
    source,
    badTrans,
    DEFAULT_GLOSSARY_ENTRIES
  );
  assert.equal(checkBad.valid, false);
  assert.equal(checkBad.violations.length, 2);
});

test('validateArchiveEntries rejects RPG Maker XP/VX/Ace binary files and detects root prefix', () => {
  const vxAceCheck = validateArchiveEntries([
    'Data/Actors.rvdata2',
    'Data/System.rvdata2',
  ]);
  assert.equal(vxAceCheck.valid, false);
  assert.equal(vxAceCheck.engineType, 'XP_VX_ACE');

  const mvCheck = validateArchiveEntries([
    'www/data/System.json',
    'www/data/Actors.json',
    'www/data/Map001.json',
  ]);
  assert.equal(mvCheck.valid, true);
  assert.equal(mvCheck.rootPrefix, 'www/data/');
  assert.equal(detectCommonRootPrefix(['data/Map001.json', 'data/System.json']), 'data/');
});

test('extractFromRpgmJson and injectTranslationsIntoJson sync 102/402 choices and split >4 line 401 dialogues', () => {
  const commonEvents = SAMPLE_RPGM_FILES['www/data/CommonEvents.json'];
  const units = extractFromRpgmJson(
    'CommonEvents.json',
    'www/data/CommonEvents.json',
    commonEvents
  );

  // Should have extracted the grouped 401 dialogue, the two 102 choices, and the two branch replies
  assert.equal(units.length, 5);
  assert.equal(units[0].locator.kind, 'event401Group');
  assert.equal(units[1].locator.kind, 'choice102Item');

  // Give units[0] a long translation that will wrap into > 4 lines (> 4 * 40 chars)
  const translatedUnits = units.map((u, idx) => {
    if (idx === 0) {
      return {
        ...u,
        translatedText:
          '\\N[1], ngọn gió đêm thổi về từ Phế Tích Phương Bắc đang ngày một lạnh buốt thấu xương. Chúng ta hãy dừng chân nghỉ ngơi bên đống lửa trại ấm áp này trước khi tiếp tục hành trình gian nan vào sáng sớm ngày mai.\nNgoài ra chúng ta vẫn còn \\V[2] \\C[14]Mảnh Tinh Quang\\C[0] cần phải thu hồi kịp lúc trước khi Quốc vương \\C[2]Aldric\\C[0] chính thức phong tỏa cánh cổng đại thánh đường.',
        status: 'TRANSLATED' as const,
      };
    }
    if (idx === 1) {
      return {
        ...u,
        translatedText: 'Dựng trại nghỉ qua đêm',
        status: 'TRANSLATED' as const,
      };
    }
    return u;
  });

  const { modifiedJson, pagesAdded, linesInjected } = injectTranslationsIntoJson(
    commonEvents,
    translatedUnits,
    { enableAutoWordWrap: true, wordWrapWidth: 46 }
  );

  assert.ok(pagesAdded >= 1, 'Expected at least 1 continuation 101+401 page to be added');
  assert.equal(linesInjected, 5);

  const modifiedArr = modifiedJson as Record<string, unknown>[];
  const eventList = (modifiedArr[1] as { list: { code: number; parameters: unknown[] }[] }).list;

  // Verify 102 choice 0 AND its matching 402 branch were both updated to 'Dựng trại nghỉ qua đêm'
  const cmd102 = eventList.find((c) => c.code === 102);
  const cmd402 = eventList.find((c) => c.code === 402 && c.parameters[0] === 0);
  assert.equal((cmd102?.parameters[0] as string[])[0], 'Dựng trại nghỉ qua đêm');
  assert.equal(cmd402?.parameters[1], 'Dựng trại nghỉ qua đêm');

  // Verify no 401 block has more than 4 consecutive 401 commands without a 101 header
  let consecutive401 = 0;
  for (const cmd of eventList) {
    if (cmd.code === 401) {
      consecutive401++;
      assert.ok(consecutive401 <= 4, 'Consecutive 401 commands must never exceed 4');
    } else {
      consecutive401 = 0;
    }
  }
});

test('wrapDialogueText and splitLinesIntoPages respect visible character limits', () => {
  const lines = wrapDialogueText(
    'Đây là một câu thoại tiếng Việt khá dài có chứa mã màu \\C[14]Tinh Quang\\C[0] để kiểm tra thuật toán tự động ngắt dòng.',
    42
  );
  assert.ok(lines.length >= 2);
  const pages = splitLinesIntoPages(['Dòng 1', 'Dòng 2', 'Dòng 3', 'Dòng 4', 'Dòng 5'], 4);
  assert.equal(pages.length, 2);
  assert.equal(pages[0].length, 4);
  assert.equal(pages[1].length, 1);
});

test('exportUnitsToText and applyTranslatedTextToUnits auto-recognize TAGGED_BLOCK and INDEXED_LINE formats', () => {
  const commonEvents = SAMPLE_RPGM_FILES['www/data/CommonEvents.json'];
  const units = extractFromRpgmJson(
    'CommonEvents.json',
    'www/data/CommonEvents.json',
    commonEvents
  );

  const exportedTagged = exportUnitsToText(units, {
    format: 'TAGGED_BLOCK',
    deduplicateByHash: true,
    useMaskedTokens: false,
    onlyPending: false,
    fileFilter: 'ALL',
    includeContextComments: true,
  });

  assert.equal(exportedTagged.exportedCount, units.length);
  assert.ok(exportedTagged.content.includes('@@@ [0001 | HASH:'));

  // Simulate translating the first two entries in INDEXED_LINE format (preserving all tokens of units[0])
  const allTokens0 = units[0].tokens.map((t) => t.raw).join(' ');
  const indexedTranslated = [
    `[0001|${units[0].hash.slice(0, 10)}] ${allTokens0} Đêm nay lạnh quá.\\nHãy nghỉ ngơi tại trại.`,
    `[0002|${units[1].hash.slice(0, 10)}] Nghỉ ngơi tại lửa trại`,
  ].join('\n');

  const { updatedUnits, report } = applyTranslatedTextToUnits(
    units,
    indexedTranslated,
    []
  );

  assert.equal(report.entriesParsed, 2);
  assert.equal(updatedUnits[0].status, 'TRANSLATED');
  assert.equal(updatedUnits[1].status, 'TRANSLATED');
  assert.equal(updatedUnits[1].translatedText, 'Nghỉ ngơi tại lửa trại');

  // Verify TAGGED_BLOCK round-trip on System.json (whose IDs contain brackets like terms.commands[0])
  const sysUnits = extractFromRpgmJson(
    'System.json',
    'www/data/System.json',
    SAMPLE_RPGM_FILES['www/data/System.json']
  );
  const demoTxt = buildDemoTranslatedText(sysUnits);
  const sysResult = applyTranslatedTextToUnits(
    sysUnits,
    demoTxt,
    DEFAULT_GLOSSARY_ENTRIES
  );
  assert.equal(sysResult.report.unitsUpdated, sysUnits.length);
  assert.equal(
    sysResult.updatedUnits.every((u) => u.status === 'TRANSLATED'),
    true
  );
});

