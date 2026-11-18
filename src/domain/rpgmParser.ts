import { splitLinesIntoPages, wrapDialogueText } from './autoWordWrapper';
import {
  computeStringHash,
  isSkippableGarbageString,
  protectControlCodes,
} from './syntaxGuard';
import { DryRunEstimate, LineLocator, TranslationUnit } from './types';

const DATABASE_FILES = new Set([
  'actors.json',
  'classes.json',
  'skills.json',
  'items.json',
  'weapons.json',
  'armors.json',
  'enemies.json',
  'states.json',
]);

const DATABASE_TRANSLATABLE_FIELDS = [
  'name',
  'description',
  'nickname',
  'profile',
  'message1',
  'message2',
  'message3',
  'message4',
];

const SYSTEM_ARRAY_FIELDS = [
  'equipTypes',
  'skillTypes',
  'weaponTypes',
  'armorTypes',
  'elements',
];

const SYSTEM_TERMS_ARRAY_FIELDS = ['basic', 'commands', 'params'];

/**
 * Detects common root folder prefix inside a zip archive (e.g. "data/", "www/data/", "MyGame/www/data/").
 */
export function detectCommonRootPrefix(paths: string[]): string {
  const jsonPaths = paths.filter(
    (p) => p.toLowerCase().endsWith('.json') && !p.startsWith('__MACOSX')
  );
  if (jsonPaths.length === 0) return '';

  // Look for standard RPG Maker marker files like System.json or Actors.json or Map001.json
  const marker = jsonPaths.find((p) => {
    const base = p.split('/').pop()?.toLowerCase() || '';
    return (
      base === 'system.json' ||
      base === 'actors.json' ||
      base === 'commonevents.json' ||
      /^map\d+\.json$/.test(base)
    );
  });

  const target = marker || jsonPaths[0];
  const lastSlash = target.lastIndexOf('/');
  return lastSlash >= 0 ? target.slice(0, lastSlash + 1) : '';
}

/**
 * Validates zip archive entries (Section 2.4 #1):
 * Checks for RPG Maker MV/MZ .json files and explicitly rejects RPG Maker XP/VX/VX Ace binary formats.
 */
export function validateArchiveEntries(paths: string[]): {
  valid: boolean;
  engineType: 'MV_MZ' | 'XP_VX_ACE' | 'INVALID';
  rootPrefix: string;
  jsonFiles: string[];
  error?: string;
} {
  const cleanPaths = paths.filter((p) => !p.startsWith('__MACOSX') && !p.endsWith('/'));
  const hasLegacyBinary = cleanPaths.some((p) =>
    /\.(rxdata|rvdata|rvdata2)$/i.test(p)
  );

  if (hasLegacyBinary) {
    return {
      valid: false,
      engineType: 'XP_VX_ACE',
      rootPrefix: '',
      jsonFiles: [],
      error:
        'Phát hiện tệp nhị phân của RPG Maker XP/VX/VX Ace (.rxdata, .rvdata, .rvdata2). Ứng dụng chỉ hỗ trợ định dạng JSON của RPG Maker MV/MZ.',
    };
  }

  const jsonFiles = cleanPaths.filter((p) => p.toLowerCase().endsWith('.json'));
  if (jsonFiles.length === 0) {
    return {
      valid: false,
      engineType: 'INVALID',
      rootPrefix: '',
      jsonFiles: [],
      error:
        'Không tìm thấy tệp .json nào của RPG Maker MV/MZ trong gói nén. Vui lòng nén thư mục data/ hoặc www/data/.',
    };
  }

  const rootPrefix = detectCommonRootPrefix(cleanPaths);
  return {
    valid: true,
    engineType: 'MV_MZ',
    rootPrefix,
    jsonFiles,
  };
}

export interface ExtractorOptions {
  translateSpeakerNames: boolean;
  translateScrollingText: boolean;
  translatePluginCommands: boolean;
}

interface RpgmEventCommand {
  code: number;
  indent: number;
  parameters: unknown[];
}

export function extractFromRpgmJson(
  filePath: string,
  fullZipPath: string,
  jsonContent: unknown,
  options: ExtractorOptions = {
    translateSpeakerNames: false,
    translateScrollingText: true,
    translatePluginCommands: false,
  }
): TranslationUnit[] {
  const units: TranslationUnit[] = [];
  const fileName = (filePath.split('/').pop() || filePath).toLowerCase();
  let unitCounter = 0;

  const pushUnit = (
    sourceText: string,
    locator: LineLocator,
    contextLabel: string,
    speaker?: string
  ) => {
    if (isSkippableGarbageString(sourceText)) return;
    const { maskedText, tokens } = protectControlCodes(sourceText);
    unitCounter++;
    units.push({
      id: `${filePath}::${unitCounter}`,
      filePath,
      fullZipPath,
      sourceText,
      maskedText,
      tokens,
      hash: computeStringHash(sourceText),
      speaker,
      contextLabel,
      locator,
      translatedText: '',
      status: 'PENDING',
    });
  };

  const extractEventCommandList = (
    list: RpgmEventCommand[],
    pathToList: (string | number)[],
    baseContext: string
  ) => {
    let i = 0;
    let currentSpeaker: string | undefined;
    let last101Index = -1;

    while (i < list.length) {
      const cmd = list[i];
      if (!cmd || typeof cmd.code !== 'number') {
        i++;
        continue;
      }

      // Code 101: Show Text Header (MV/MZ)
      if (cmd.code === 101) {
        last101Index = i;
        const rawSpeaker =
          Array.isArray(cmd.parameters) && typeof cmd.parameters[4] === 'string'
            ? cmd.parameters[4].trim()
            : '';
        currentSpeaker = rawSpeaker || undefined;

        if (options.translateSpeakerNames && rawSpeaker) {
          pushUnit(
            rawSpeaker,
            {
              kind: 'eventParamString',
              pathToList,
              commandIndex: i,
              paramIndex: 4,
            },
            `${baseContext} · Speaker [101]`,
            rawSpeaker
          );
        }
        i++;
        continue;
      }

      // Code 401: Show Text Body (Group consecutive 401 commands)
      if (cmd.code === 401) {
        const groupIndices: number[] = [];
        const groupLines: string[] = [];
        const headerIndex = last101Index >= 0 ? last101Index : i - 1;

        while (i < list.length && list[i] && list[i].code === 401) {
          const lineText =
            Array.isArray(list[i].parameters) && typeof list[i].parameters[0] === 'string'
              ? (list[i].parameters[0] as string)
              : '';
          groupIndices.push(i);
          groupLines.push(lineText);
          i++;
        }

        const joinedText = groupLines.join('\n');
        pushUnit(
          joinedText,
          {
            kind: 'event401Group',
            pathToList,
            command101Index: headerIndex,
            indices: groupIndices,
          },
          `${baseContext} · Thoại [${groupIndices[0]}]`,
          currentSpeaker
        );
        continue;
      }

      // Code 102: Show Choices (plus syncing matching 402 When [Choice] branches)
      if (cmd.code === 102 && Array.isArray(cmd.parameters) && Array.isArray(cmd.parameters[0])) {
        const choices = cmd.parameters[0] as unknown[];
        const choiceIndent = cmd.indent;

        for (let cIdx = 0; cIdx < choices.length; cIdx++) {
          const choiceText = choices[cIdx];
          if (typeof choiceText !== 'string') continue;

          // Scan ahead for matching 402 branches at the same indent
          const branch402Indices: number[] = [];
          for (let scan = i + 1; scan < list.length; scan++) {
            const scanCmd = list[scan];
            if (!scanCmd) continue;
            if (
              scanCmd.code === 402 &&
              scanCmd.indent === choiceIndent &&
              Array.isArray(scanCmd.parameters) &&
              scanCmd.parameters[0] === cIdx
            ) {
              branch402Indices.push(scan);
            }
            // Stop scanning if we leave the choice block (404 = Branch End at same indent)
            if (scanCmd.code === 404 && scanCmd.indent === choiceIndent) {
              break;
            }
          }

          pushUnit(
            choiceText,
            {
              kind: 'choice102Item',
              pathToList,
              commandIndex: i,
              choiceIndex: cIdx,
              branch402Indices,
            },
            `${baseContext} · Lựa chọn #${cIdx + 1}`,
            currentSpeaker
          );
        }
        i++;
        continue;
      }

      // Code 405: Show Scrolling Text (Group consecutive 405 commands)
      if (options.translateScrollingText && cmd.code === 405) {
        const groupIndices: number[] = [];
        const groupLines: string[] = [];
        const header105Index = i > 0 && list[i - 1]?.code === 105 ? i - 1 : i;

        while (i < list.length && list[i] && list[i].code === 405) {
          const lineText =
            Array.isArray(list[i].parameters) && typeof list[i].parameters[0] === 'string'
              ? (list[i].parameters[0] as string)
              : '';
          groupIndices.push(i);
          groupLines.push(lineText);
          i++;
        }

        pushUnit(
          groupLines.join('\n'),
          {
            kind: 'event401Group',
            pathToList,
            command101Index: header105Index,
            indices: groupIndices,
          },
          `${baseContext} · Cuộn chữ [${groupIndices[0]}]`
        );
        continue;
      }

      // Code 356 / 357: Plugin Commands (Only if opted in and safe text fields exist)
      if (options.translatePluginCommands && (cmd.code === 356 || cmd.code === 357)) {
        if (cmd.code === 357 && Array.isArray(cmd.parameters) && cmd.parameters[3] && typeof cmd.parameters[3] === 'object') {
          const argsObj = cmd.parameters[3] as Record<string, unknown>;
          for (const key of ['text', 'messageText', 'label', 'description']) {
            if (typeof argsObj[key] === 'string' && (argsObj[key] as string).trim()) {
              pushUnit(
                argsObj[key] as string,
                {
                  kind: 'objectField',
                  path: [...pathToList, i, 'parameters', 3, key],
                },
                `${baseContext} · Plugin [${key}]`
              );
            }
          }
        }
      }

      i++;
    }
  };

  // 1. MapXXX.json
  if (/^map\d+\.json$/.test(fileName) && jsonContent && typeof jsonContent === 'object') {
    const mapObj = jsonContent as Record<string, unknown>;
    if (typeof mapObj.displayName === 'string' && mapObj.displayName.trim()) {
      pushUnit(
        mapObj.displayName,
        { kind: 'objectField', path: ['displayName'] },
        `${filePath} · Tên hiển thị Map`
      );
    }

    if (Array.isArray(mapObj.events)) {
      mapObj.events.forEach((ev, evIdx) => {
        if (!ev || typeof ev !== 'object') return;
        const evObj = ev as Record<string, unknown>;
        const evName = typeof evObj.name === 'string' ? evObj.name : `EV${evIdx}`;
        if (Array.isArray(evObj.pages)) {
          evObj.pages.forEach((page, pageIdx) => {
            if (!page || typeof page !== 'object') return;
            const pageObj = page as Record<string, unknown>;
            if (Array.isArray(pageObj.list)) {
              extractEventCommandList(
                pageObj.list as RpgmEventCommand[],
                ['events', evIdx, 'pages', pageIdx, 'list'],
                `${filePath} · ${evName} · Trang ${pageIdx + 1}`
              );
            }
          });
        }
      });
    }
    return units;
  }

  // 2. CommonEvents.json
  if (fileName === 'commonevents.json' && Array.isArray(jsonContent)) {
    jsonContent.forEach((ce, ceIdx) => {
      if (!ce || typeof ce !== 'object') return;
      const ceObj = ce as Record<string, unknown>;
      const ceName = typeof ceObj.name === 'string' && ceObj.name ? ceObj.name : `CE#${ceIdx}`;
      if (Array.isArray(ceObj.list)) {
        extractEventCommandList(
          ceObj.list as RpgmEventCommand[],
          [ceIdx, 'list'],
          `CommonEvents · ${ceName}`
        );
      }
    });
    return units;
  }

  // 3. Troops.json
  if (fileName === 'troops.json' && Array.isArray(jsonContent)) {
    jsonContent.forEach((troop, tIdx) => {
      if (!troop || typeof troop !== 'object') return;
      const troopObj = troop as Record<string, unknown>;
      if (Array.isArray(troopObj.pages)) {
        troopObj.pages.forEach((page, pIdx) => {
          if (!page || typeof page !== 'object') return;
          const pageObj = page as Record<string, unknown>;
          if (Array.isArray(pageObj.list)) {
            extractEventCommandList(
              pageObj.list as RpgmEventCommand[],
              [tIdx, 'pages', pIdx, 'list'],
              `Troops #${tIdx} · Trang ${pIdx + 1}`
            );
          }
        });
      }
    });
    return units;
  }

  // 4. Database files (Actors.json, Items.json, Skills.json, etc.)
  if (DATABASE_FILES.has(fileName) && Array.isArray(jsonContent)) {
    jsonContent.forEach((entry, idx) => {
      // Skip null at index 0
      if (!entry || typeof entry !== 'object') return;
      const record = entry as Record<string, unknown>;
      const entryLabel =
        typeof record.name === 'string' && record.name ? record.name : `#${idx}`;

      for (const field of DATABASE_TRANSLATABLE_FIELDS) {
        if (typeof record[field] === 'string' && (record[field] as string).trim()) {
          pushUnit(
            record[field] as string,
            { kind: 'objectField', path: [idx, field] },
            `${filePath} [${idx} · ${entryLabel}] · ${field}`
          );
        }
      }
    });
    return units;
  }

  // 5. System.json
  if (fileName === 'system.json' && jsonContent && typeof jsonContent === 'object') {
    const sys = jsonContent as Record<string, unknown>;
    if (typeof sys.gameTitle === 'string' && sys.gameTitle.trim()) {
      pushUnit(
        sys.gameTitle,
        { kind: 'objectField', path: ['gameTitle'] },
        'System.json · Tiêu đề Game'
      );
    }
    if (typeof sys.currencyUnit === 'string' && sys.currencyUnit.trim()) {
      pushUnit(
        sys.currencyUnit,
        { kind: 'objectField', path: ['currencyUnit'] },
        'System.json · Đơn vị tiền tệ'
      );
    }

    for (const arrField of SYSTEM_ARRAY_FIELDS) {
      if (Array.isArray(sys[arrField])) {
        (sys[arrField] as unknown[]).forEach((item, idx) => {
          if (typeof item === 'string' && item.trim()) {
            pushUnit(
              item,
              { kind: 'arrayItem', path: [arrField], index: idx },
              `System.json · ${arrField}[${idx}]`
            );
          }
        });
      }
    }

    if (sys.terms && typeof sys.terms === 'object') {
      const terms = sys.terms as Record<string, unknown>;
      for (const tArr of SYSTEM_TERMS_ARRAY_FIELDS) {
        if (Array.isArray(terms[tArr])) {
          (terms[tArr] as unknown[]).forEach((item, idx) => {
            if (typeof item === 'string' && item.trim()) {
              pushUnit(
                item,
                { kind: 'arrayItem', path: ['terms', tArr], index: idx },
                `System.json · terms.${tArr}[${idx}]`
              );
            }
          });
        }
      }

      if (terms.messages && typeof terms.messages === 'object') {
        const msgs = terms.messages as Record<string, unknown>;
        for (const [msgKey, msgVal] of Object.entries(msgs)) {
          if (typeof msgVal === 'string' && msgVal.trim()) {
            pushUnit(
              msgVal,
              { kind: 'objectField', path: ['terms', 'messages', msgKey] },
              `System.json · terms.messages.${msgKey}`
            );
          }
        }
      }
    }
    return units;
  }

  return units;
}

function getTargetContainer(root: unknown, path: (string | number)[]): unknown {
  let curr: unknown = root;
  for (const key of path) {
    if (curr === null || curr === undefined || typeof curr !== 'object') {
      return undefined;
    }
    curr = (curr as Record<string | number, unknown>)[key];
  }
  return curr;
}

/**
 * Re-injects translated strings into a deep clone of the original RPG Maker JSON AST.
 * Automatically wraps lines and splits >4-line dialogues into continuation 101 + 401 blocks.
 */
export function injectTranslationsIntoJson(
  originalJson: unknown,
  units: TranslationUnit[],
  options: { enableAutoWordWrap: boolean; wordWrapWidth: number } = {
    enableAutoWordWrap: true,
    wordWrapWidth: 48,
  }
): {
  modifiedJson: unknown;
  pagesAdded: number;
  linesInjected: number;
} {
  const cloned = JSON.parse(JSON.stringify(originalJson));
  let pagesAdded = 0;
  let linesInjected = 0;

  // Separate event401Group units from direct field/choice units so we can process
  // event401Group in descending command index order per list (preventing index shift!)
  const directUnits: TranslationUnit[] = [];
  const groupUnitsByList = new Map<string, TranslationUnit[]>();

  for (const unit of units) {
    const activeText = unit.translatedText.trim() ? unit.translatedText : unit.sourceText;
    if (!activeText) continue;

    if (unit.locator.kind === 'event401Group') {
      const listKey = JSON.stringify(unit.locator.pathToList);
      const listArr = groupUnitsByList.get(listKey) || [];
      listArr.push(unit);
      groupUnitsByList.set(listKey, listArr);
    } else {
      directUnits.push(unit);
    }
  }

  // 1. Apply non-structural direct locators first (while command indices match original 100%)
  for (const unit of directUnits) {
    const finalText = unit.translatedText.trim() ? unit.translatedText : unit.sourceText;
    const loc = unit.locator;

    if (loc.kind === 'objectField') {
      const parentPath = loc.path.slice(0, -1);
      const lastKey = loc.path[loc.path.length - 1];
      const parent = getTargetContainer(cloned, parentPath);
      if (parent && typeof parent === 'object') {
        // For database descriptions/profiles, wrap to 2 lines if auto word-wrap is enabled
        const lastKeyStr = String(lastKey);
        if (
          options.enableAutoWordWrap &&
          (lastKeyStr === 'description' || lastKeyStr === 'profile')
        ) {
          const wrapped = wrapDialogueText(finalText, options.wordWrapWidth);
          (parent as Record<string | number, unknown>)[lastKey] = wrapped.join('\n');
        } else {
          (parent as Record<string | number, unknown>)[lastKey] = finalText;
        }
        linesInjected++;
      }
    } else if (loc.kind === 'arrayItem') {
      const arr = getTargetContainer(cloned, loc.path);
      if (Array.isArray(arr) && loc.index >= 0 && loc.index < arr.length) {
        arr[loc.index] = finalText;
        linesInjected++;
      }
    } else if (loc.kind === 'choice102Item') {
      const list = getTargetContainer(cloned, loc.pathToList);
      if (Array.isArray(list)) {
        const cmd102 = list[loc.commandIndex] as RpgmEventCommand | undefined;
        if (cmd102 && Array.isArray(cmd102.parameters) && Array.isArray(cmd102.parameters[0])) {
          (cmd102.parameters[0] as unknown[])[loc.choiceIndex] = finalText;
          linesInjected++;
        }
        // Synchronize all matching 402 When [Choice] branches
        for (const branchIdx of loc.branch402Indices) {
          const cmd402 = list[branchIdx] as RpgmEventCommand | undefined;
          if (cmd402 && cmd402.code === 402 && Array.isArray(cmd402.parameters)) {
            cmd402.parameters[1] = finalText;
          }
        }
      }
    } else if (loc.kind === 'eventParamString') {
      const list = getTargetContainer(cloned, loc.pathToList);
      if (Array.isArray(list)) {
        const cmd = list[loc.commandIndex] as RpgmEventCommand | undefined;
        if (cmd && Array.isArray(cmd.parameters)) {
          cmd.parameters[loc.paramIndex] = finalText;
          linesInjected++;
        }
      }
    }
  }

  // 2. Apply event401Group units in descending order of indices[0] within each event list
  for (const [, groupUnits] of groupUnitsByList.entries()) {
    groupUnits.sort((a, b) => {
      const idxA = a.locator.kind === 'event401Group' ? a.locator.indices[0] : 0;
      const idxB = b.locator.kind === 'event401Group' ? b.locator.indices[0] : 0;
      return idxB - idxA;
    });

    for (const unit of groupUnits) {
      if (unit.locator.kind !== 'event401Group') continue;
      const loc = unit.locator;
      const list = getTargetContainer(cloned, loc.pathToList) as RpgmEventCommand[] | undefined;
      if (!Array.isArray(list) || loc.indices.length === 0) continue;

      const finalText = unit.translatedText.trim() ? unit.translatedText : unit.sourceText;
      const firstBodyIdx = loc.indices[0];
      const firstBodyCmd = list[firstBodyIdx];
      if (!firstBodyCmd) continue;

      const bodyCode = firstBodyCmd.code; // 401 (Show Text) or 405 (Scrolling Text)
      const indent = firstBodyCmd.indent;

      const wrappedLines = options.enableAutoWordWrap
        ? wrapDialogueText(finalText, options.wordWrapWidth)
        : finalText.replace(/\r\n/g, '\n').split('\n');

      if (bodyCode === 405) {
        // Scrolling text does not have a 4-line box limit
        const replacementCmds: RpgmEventCommand[] = wrappedLines.map((line) => ({
          code: 405,
          indent,
          parameters: [line],
        }));
        list.splice(firstBodyIdx, loc.indices.length, ...replacementCmds);
        linesInjected++;
        continue;
      }

      // Code 401: Split into pages of at most 4 lines
      const pages = splitLinesIntoPages(wrappedLines, 4);
      const header101 =
        loc.command101Index >= 0 && list[loc.command101Index]?.code === 101
          ? list[loc.command101Index]
          : {
              code: 101,
              indent,
              parameters: ['', 0, 0, 2, ''],
            };

      const replacementCmds: RpgmEventCommand[] = [];
      pages.forEach((pageLines, pageIndex) => {
        if (pageIndex > 0) {
          // Insert a cloned 101 header command for continuation page
          replacementCmds.push({
            code: 101,
            indent: header101.indent,
            parameters: JSON.parse(JSON.stringify(header101.parameters)),
          });
          pagesAdded++;
        }
        for (const line of pageLines) {
          replacementCmds.push({
            code: 401,
            indent,
            parameters: [line],
          });
        }
      });

      list.splice(firstBodyIdx, loc.indices.length, ...replacementCmds);
      linesInjected++;
    }
  }

  return { modifiedJson: cloned, pagesAdded, linesInjected };
}

/**
 * Estimates tokens and batch counts using Dynamic Token-Aware Batching (Section 5.2 #3 & #8)
 */
export function buildDryRunEstimate(
  units: TranslationUnit[],
  maxBatchTokens = 3000,
  maxItemsPerBatch = 25
): DryRunEstimate {
  const uniqueHashes = new Set<string>();
  let estimatedInputTokens = 0;

  const fileMap = new Map<
    string,
    { filePath: string; totalUnits: number; translatedUnits: number; errorUnits: number }
  >();

  for (const u of units) {
    if (!uniqueHashes.has(u.hash)) {
      uniqueHashes.add(u.hash);
      // Compact JSON item {"i":1,"s":"Aria","t":"..."} ~ 12 overhead tokens + ~1.2 tokens/char
      estimatedInputTokens += Math.ceil(u.maskedText.length * 1.15) + 12;
    }

    const entry = fileMap.get(u.filePath) || {
      filePath: u.filePath,
      totalUnits: 0,
      translatedUnits: 0,
      errorUnits: 0,
    };
    entry.totalUnits++;
    if (u.status === 'TRANSLATED') entry.translatedUnits++;
    if (u.status === 'VALIDATION_ERROR' || u.status === 'GLOSSARY_VIOLATION') {
      entry.errorUnits++;
    }
    fileMap.set(u.filePath, entry);
  }

  const safeBatchLimit = Math.max(200, maxBatchTokens);
  const safeItemLimit = Math.max(1, maxItemsPerBatch);
  const byTokens = Math.ceil(estimatedInputTokens / safeBatchLimit);
  const byItems = Math.ceil(uniqueHashes.size / safeItemLimit);
  const estimatedRequests =
    uniqueHashes.size === 0 ? 0 : Math.max(1, byTokens, byItems);
  // Add ~350 tokens per request for cached System Instruction + Pronoun Matrix + Context History
  const totalInputWithSystem = estimatedInputTokens + estimatedRequests * 350;
  const estimatedOutputTokens = Math.ceil(estimatedInputTokens * 1.25);

  return {
    totalStrings: units.length,
    uniqueStrings: uniqueHashes.size,
    duplicateStringsSaved: units.length - uniqueHashes.size,
    skippedGarbageStrings: 0,
    estimatedInputTokens: totalInputWithSystem,
    estimatedOutputTokens,
    estimatedRequests,
    fileBreakdown: Array.from(fileMap.values()),
  };
}
