export type LineLocator =
  | {
      kind: 'objectField';
      path: (string | number)[];
    }
  | {
      kind: 'arrayItem';
      path: (string | number)[];
      index: number;
    }
  | {
      kind: 'event401Group';
      pathToList: (string | number)[];
      command101Index: number;
      indices: number[];
    }
  | {
      kind: 'choice102Item';
      pathToList: (string | number)[];
      commandIndex: number;
      choiceIndex: number;
      branch402Indices: number[];
    }
  | {
      kind: 'eventParamString';
      pathToList: (string | number)[];
      commandIndex: number;
      paramIndex: number;
    };

export type TranslationStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'TRANSLATED'
  | 'VALIDATION_ERROR'
  | 'GLOSSARY_VIOLATION';

export interface SyntaxToken {
  placeholder: string;
  raw: string;
}

export interface TranslationUnit {
  id: string;
  filePath: string;
  fullZipPath: string;
  sourceText: string;
  maskedText: string;
  tokens: SyntaxToken[];
  hash: string;
  speaker?: string;
  contextLabel: string;
  locator: LineLocator;
  translatedText: string;
  status: TranslationStatus;
  errorDetail?: string;
  isUnlinkedFromTM?: boolean;
}

export interface PronounRelation {
  id: string;
  sourceCharacter: string;
  targetCharacter: string;
  selfPronoun: string;
  targetPronoun: string;
  note?: string;
}

export interface CharacterProfile {
  id: string;
  actorId?: number;
  originalName: string;
  translatedName: string;
  gender: 'Nam' | 'Nữ' | 'Không rõ' | 'Khác';
  speechStyle: string;
  defaultSelfPronoun: string;
  defaultAddressPronoun: string;
}

export type GlossaryMode = 'keep' | 'custom' | 'translate' | 'transliterate';

export interface GlossaryEntry {
  id: string;
  sourceTerm: string;
  targetTerm: string;
  mode: GlossaryMode;
  category: 'character' | 'location' | 'skill_item' | 'term';
}

export interface PromptPreset {
  id: string;
  name: string;
  genreTag: string;
  description: string;
  systemPrompt: string;
}

export interface GeminiModelInfo {
  name: string;
  displayName: string;
  baseModelId: string;
  inputTokenLimit: number;
  outputTokenLimit: number;
  thinking: boolean;
  description: string;
}

export interface RunConfig {
  primaryModel: string;
  fallbackModel: string;
  maxConcurrentRequests: number;
  rpmLimit: number;
  batchDelayMs: number;
  maxBatchTokens: number;
  maxItemsPerBatch: number;
  maxRetries: number;
  testRunCount: number;
  wordWrapWidth: number;
  enableAutoWordWrap: boolean;
  translateSpeakerNames: boolean;
  translateScrollingText: boolean;
  translatePluginCommands: boolean;
  disableThinkingForBatch: boolean;
  wifiOnlyConstraint: boolean;
  autoFallbackOnQuota: boolean;
}

export interface DryRunEstimate {
  totalStrings: number;
  uniqueStrings: number;
  duplicateStringsSaved: number;
  skippedGarbageStrings: number;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  estimatedRequests: number;
  fileBreakdown: {
    filePath: string;
    totalUnits: number;
    translatedUnits: number;
    errorUnits: number;
  }[];
}

export interface BatchLogEntry {
  id: string;
  timestamp: string;
  batchIndex: number;
  totalBatches: number;
  modelUsed: string;
  unitCount: number;
  estimatedTokens: number;
  durationMs: number;
  status: 'SUCCESS' | 'FALLBACK' | 'ERROR' | 'REPAIRED';
  message: string;
}
