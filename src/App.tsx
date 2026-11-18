import React, { useCallback, useEffect, useMemo, useState } from 'react';
import JSZip from 'jszip';
import {
  BookText,
  Download,
  FileEdit,
  FileText,
  FolderArchive,
  Settings2,
} from 'lucide-react';
import { EditorScreen } from './components/EditorScreen';
import { ProjectScreen } from './components/ProjectScreen';
import { PromptStyleScreen } from './components/PromptStyleScreen';
import { SettingsAndAndroidScreen } from './components/SettingsAndAndroidScreen';
import { TranslateScreen } from './components/TranslateScreen';
import { generateAndroidStudioProjectZipBlob } from './domain/androidSourceGenerator';
import { applyCsvImportToUnits, exportUnitsToCsv } from './domain/csvExchange';
import { triggerBlobDownload } from './domain/fileDownload';
import { PROMPT_PRESETS } from './domain/promptBuilder';
import {
  buildDryRunEstimate,
  extractFromRpgmJson,
  injectTranslationsIntoJson,
  validateArchiveEntries,
} from './domain/rpgmParser';
import {
  DEFAULT_CHARACTER_PROFILES,
  DEFAULT_GLOSSARY_ENTRIES,
  DEFAULT_PRONOUN_RELATIONS,
  SAMPLE_RPGM_FILES,
  extractActorsIntoProfiles,
  generateSampleDataZipBlob,
} from './domain/sampleProjectData';
import {
  restoreControlCodes,
  validateGlossaryCompliance,
  validateSyntaxTokens,
} from './domain/syntaxGuard';
import {
  TextImportReport,
  applyTranslatedTextToUnits,
  buildDemoTranslatedText,
  exportUnitsToText,
} from './domain/textExchange';
import {
  CharacterProfile,
  GlossaryEntry,
  PronounRelation,
  RunConfig,
  TranslationUnit,
} from './domain/types';

type ActiveTab = 'project' | 'prompt' | 'translate' | 'editor' | 'settings';

const STORAGE_KEY = 'rpgm_gemini_translator_checkpoint_v1';

const DEFAULT_RUN_CONFIG: RunConfig = {
  primaryModel: 'offline-txt-mode',
  fallbackModel: 'offline-txt-mode',
  maxConcurrentRequests: 1,
  rpmLimit: 30,
  batchDelayMs: 0,
  maxBatchTokens: 2800,
  maxItemsPerBatch: 25,
  maxRetries: 0,
  testRunCount: 10,
  wordWrapWidth: 48,
  enableAutoWordWrap: true,
  translateSpeakerNames: false,
  translateScrollingText: true,
  translatePluginCommands: false,
  disableThinkingForBatch: true,
  wifiOnlyConstraint: false,
  autoFallbackOnQuota: false,
};

function extractUnitsFromFilesMap(
  filesMap: Record<string, unknown>,
  rootPrefix: string,
  runConfig: RunConfig
): TranslationUnit[] {
  const allUnits: TranslationUnit[] = [];
  for (const [fullZipPath, jsonContent] of Object.entries(filesMap)) {
    const relativePath =
      rootPrefix && fullZipPath.startsWith(rootPrefix)
        ? fullZipPath.slice(rootPrefix.length)
        : fullZipPath;

    const extracted = extractFromRpgmJson(
      relativePath,
      fullZipPath,
      jsonContent,
      {
        translateSpeakerNames: runConfig.translateSpeakerNames,
        translateScrollingText: runConfig.translateScrollingText,
        translatePluginCommands: runConfig.translatePluginCommands,
      }
    );
    allUnits.push(...extracted);
  }
  return allUnits;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('project');
  const [projectName, setProjectName] = useState<string>(
    'Chronicles_of_Aethelgard_data.zip'
  );
  const [rootPrefix, setRootPrefix] = useState<string>('www/data/');
  const [rawJsonFiles, setRawJsonFiles] =
    useState<Record<string, unknown>>(SAMPLE_RPGM_FILES);
  const [runConfig, setRunConfig] = useState<RunConfig>(DEFAULT_RUN_CONFIG);

  const [units, setUnits] = useState<TranslationUnit[]>(() =>
    extractUnitsFromFilesMap(SAMPLE_RPGM_FILES, 'www/data/', DEFAULT_RUN_CONFIG)
  );
  const [selectedPresetId, setSelectedPresetId] = useState<string>('fantasy');
  const [customSystemPrompt, setCustomSystemPrompt] = useState<string>(
    PROMPT_PRESETS[0].systemPrompt
  );
  const [characters, setCharacters] = useState<CharacterProfile[]>(
    DEFAULT_CHARACTER_PROFILES
  );
  const [relations, setRelations] = useState<PronounRelation[]>(
    DEFAULT_PRONOUN_RELATIONS
  );
  const [glossary, setGlossary] = useState<GlossaryEntry[]>(
    DEFAULT_GLOSSARY_ENTRIES
  );

  const [validationError, setValidationError] = useState<string | null>(null);
  const [importReports, setImportReports] = useState<TextImportReport[]>([]);
  const [lastExportSummary, setLastExportSummary] = useState<string | null>(null);
  const [selectedFileFilter, setSelectedFileFilter] = useState<string>('ALL');
  const [repairingUnitId, setRepairingUnitId] = useState<string | null>(null);

  // Load persisted state from localStorage on mount
  useEffect(() => {
    try {
      const savedRaw = localStorage.getItem(STORAGE_KEY);
      if (!savedRaw) return;
      const saved = JSON.parse(savedRaw);
      if (saved.projectName) setProjectName(saved.projectName);
      if (typeof saved.rootPrefix === 'string') setRootPrefix(saved.rootPrefix);
      if (saved.rawJsonFiles) setRawJsonFiles(saved.rawJsonFiles);
      if (saved.runConfig) {
        setRunConfig({ ...DEFAULT_RUN_CONFIG, ...saved.runConfig });
      }
      if (saved.selectedPresetId) setSelectedPresetId(saved.selectedPresetId);
      if (saved.customSystemPrompt) setCustomSystemPrompt(saved.customSystemPrompt);
      if (Array.isArray(saved.characters)) setCharacters(saved.characters);
      if (Array.isArray(saved.relations)) setRelations(saved.relations);
      if (Array.isArray(saved.glossary)) setGlossary(saved.glossary);
      if (Array.isArray(saved.units) && saved.units.length > 0) {
        const cleanedUnits = (saved.units as TranslationUnit[]).map((u) =>
          u.status === 'IN_PROGRESS' ? { ...u, status: 'PENDING' as const } : u
        );
        setUnits(cleanedUnits);
      }
    } catch {
      // Ignore corrupted local storage
    }
  }, []);

  // Save checkpoint with 400ms debounce so UI transitions and typing never block on JSON.stringify
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const payload = {
          projectName,
          rootPrefix,
          runConfig,
          selectedPresetId,
          customSystemPrompt,
          characters,
          relations,
          glossary,
          units,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      } catch {
        // Ignore quota errors
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [
    projectName,
    rootPrefix,
    runConfig,
    selectedPresetId,
    customSystemPrompt,
    characters,
    relations,
    glossary,
    units,
  ]);

  const dryRunEstimate = useMemo(
    () =>
      buildDryRunEstimate(
        units,
        runConfig.maxBatchTokens,
        runConfig.maxItemsPerBatch
      ),
    [units, runConfig.maxBatchTokens, runConfig.maxItemsPerBatch]
  );

  const handleUpdateRunConfig = useCallback((partial: Partial<RunConfig>) => {
    setRunConfig((prev) => ({ ...prev, ...partial }));
  }, []);

  // Load built-in sample project
  const handleLoadSampleProject = async () => {
    setValidationError(null);
    setProjectName('Chronicles_of_Aethelgard_data.zip');
    setRootPrefix('www/data/');
    setRawJsonFiles(SAMPLE_RPGM_FILES);
    const extracted = extractUnitsFromFilesMap(
      SAMPLE_RPGM_FILES,
      'www/data/',
      runConfig
    );
    setUnits(extracted);
    setCharacters(DEFAULT_CHARACTER_PROFILES);
    setRelations(DEFAULT_PRONOUN_RELATIONS);
    setGlossary(DEFAULT_GLOSSARY_ENTRIES);
    setLastExportSummary(null);
  };

  // Upload and parse a real .zip file
  const handleUploadZipFile = async (file: File) => {
    setValidationError(null);
    try {
      const zip = await JSZip.loadAsync(file);
      const entryPaths = Object.keys(zip.files);
      const validation = validateArchiveEntries(entryPaths);

      if (!validation.valid) {
        setValidationError(
          validation.error ||
            'Tệp nén không hợp lệ hoặc không chứa dữ liệu RPG Maker MV/MZ.'
        );
        return;
      }

      const parsedJsonMap: Record<string, unknown> = {};
      for (const jsonPath of validation.jsonFiles) {
        const zipObj = zip.file(jsonPath);
        if (!zipObj) continue;
        const rawText = await zipObj.async('string');
        try {
          parsedJsonMap[jsonPath] = JSON.parse(rawText);
        } catch {
          // Skip malformed JSON files
        }
      }

      const extracted = extractUnitsFromFilesMap(
        parsedJsonMap,
        validation.rootPrefix,
        runConfig
      );

      if (extracted.length === 0) {
        setValidationError(
          'Đã đọc các tệp .json nhưng không tìm thấy chuỗi văn bản nào cần dịch.'
        );
        return;
      }

      setProjectName(file.name);
      setRootPrefix(validation.rootPrefix);
      setRawJsonFiles(parsedJsonMap);
      setUnits(extracted);

      // Auto-populate Character Profiles from Actors.json if present
      const actorsEntryKey = Object.keys(parsedJsonMap).find((k) =>
        k.toLowerCase().endsWith('actors.json')
      );
      if (actorsEntryKey) {
        setCharacters((prev) =>
          extractActorsIntoProfiles(parsedJsonMap[actorsEntryKey], prev)
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setValidationError(`Không thể giải nén tệp ZIP: ${msg}`);
    }
  };

  // Demonstrate RPG Maker XP/VX/VX Ace (.rvdata2) rejection
  const handleTestLegacyArchiveRejection = () => {
    const check = validateArchiveEntries([
      'Data/Actors.rvdata2',
      'Data/Map001.rvdata2',
      'Data/System.rvdata2',
    ]);
    if (!check.valid && check.error) {
      setValidationError(check.error);
    }
  };

  const handleDownloadSampleRawZip = async () => {
    const blob = await generateSampleDataZipBlob();
    triggerBlobDownload(blob, 'data_sample_rpgm_mz.zip');
  };

  // Quick .txt Export from ProjectScreen
  const handleQuickExportTxt = () => {
    const { content } = exportUnitsToText(units, {
      format: 'TAGGED_BLOCK',
      deduplicateByHash: true,
      useMaskedTokens: false,
      onlyPending: false,
      fileFilter: 'ALL',
      includeContextComments: true,
    });
    if (!content) return;
    const blob = new Blob(['\uFEFF' + content], {
      type: 'text/plain;charset=utf-8;',
    });
    triggerBlobDownload(
      blob,
      `${projectName.replace(/\.zip$/i, '')}_to_translate.txt`
    );
  };

  // Import translated .txt (from file upload or paste) with Smart Auto-Recognition
  const handleImportTranslatedText = useCallback(
    (
      rawText: string,
      options: {
        fileFilter: string;
        deduplicateByHash: boolean;
        onlyPending: boolean;
        fileName: string;
      }
    ) => {
      setUnits((prev) => {
        const { updatedUnits, report } = applyTranslatedTextToUnits(
          prev,
          rawText,
          glossary,
          options
        );
        setImportReports((prevReports) => [report, ...prevReports]);
        return updatedUnits;
      });
    },
    [glossary]
  );

  const handleQuickImportTxtFile = async (file: File) => {
    const text = await file.text();
    handleImportTranslatedText(text, {
      fileFilter: 'ALL',
      deduplicateByHash: true,
      onlyPending: false,
      fileName: file.name,
    });
  };

  const handleLoadDemoTranslatedText = useCallback(() => {
    setUnits((prev) => {
      const demoTxt = buildDemoTranslatedText(prev);
      const { updatedUnits, report } = applyTranslatedTextToUnits(
        prev,
        demoTxt,
        glossary,
        {
          fileFilter: 'ALL',
          deduplicateByHash: true,
          onlyPending: false,
          fileName: 'ban_dich_mau_auto_detect.txt',
        }
      );
      setImportReports((prevReports) => [report, ...prevReports]);
      return updatedUnits;
    });
  }, [glossary]);

  // Export CSV
  const handleExportCsv = () => {
    const csvContent = exportUnitsToCsv(units);
    const blob = new Blob(['\uFEFF' + csvContent], {
      type: 'text/csv;charset=utf-8;',
    });
    triggerBlobDownload(
      blob,
      `${projectName.replace(/\.zip$/i, '')}_translations.csv`
    );
  };

  // Import CSV
  const handleImportCsvFile = async (file: File) => {
    const text = await file.text();
    const { updatedUnits } = applyCsvImportToUnits(units, text);
    setUnits(updatedUnits);
  };

  // Re-inject translations and export data_translated.zip (works at any completion %)
  const handleExportTranslatedZip = async () => {
    const zip = new JSZip();
    let totalPagesAdded = 0;
    let totalLinesInjected = 0;

    for (const [fullZipPath, originalJson] of Object.entries(rawJsonFiles)) {
      const fileUnits = units.filter((u) => u.fullZipPath === fullZipPath);
      if (fileUnits.length === 0) {
        zip.file(fullZipPath, JSON.stringify(originalJson, null, 2));
        continue;
      }

      const { modifiedJson, pagesAdded, linesInjected } =
        injectTranslationsIntoJson(originalJson, fileUnits, {
          enableAutoWordWrap: runConfig.enableAutoWordWrap,
          wordWrapWidth: runConfig.wordWrapWidth,
        });

      totalPagesAdded += pagesAdded;
      totalLinesInjected += linesInjected;
      zip.file(fullZipPath, JSON.stringify(modifiedJson, null, 2));
    }

    const blob = await zip.generateAsync({ type: 'blob' });
    const outName = projectName.replace(/\.zip$/i, '') + '_translated.zip';
    triggerBlobDownload(blob, outName);

    setLastExportSummary(
      `Đã đóng gói "${outName}" giữ nguyên tiền tố "${rootPrefix}" (${totalLinesInjected} mục đã chèn, tự động tách thêm ${totalPagesAdded} trang hộp thoại 101+401).`
    );
  };

  // Inline Editor Handlers (memoized with useCallback for React.memo row stability)
  const handleUpdateUnitTranslation = useCallback(
    (unitId: string, newText: string, propagateTM: boolean) => {
      setUnits((prev) => {
        const target = prev.find((u) => u.id === unitId);
        if (!target) return prev;

        return prev.map((u) => {
          const shouldUpdate =
            u.id === unitId ||
            (propagateTM && !u.isUnlinkedFromTM && u.hash === target.hash);
          if (!shouldUpdate) return u;

          if (!newText.trim()) {
            return {
              ...u,
              translatedText: '',
              status: 'PENDING',
              errorDetail: undefined,
            };
          }

          const restored = restoreControlCodes(newText, u.tokens);
          const tokenCheck = validateSyntaxTokens(u.tokens, restored);
          const glossaryCheck = validateGlossaryCompliance(
            u.sourceText,
            restored,
            glossary
          );

          if (!tokenCheck.valid) {
            return {
              ...u,
              translatedText: restored,
              status: 'VALIDATION_ERROR',
              errorDetail: `Thiếu mã điều khiển: ${tokenCheck.missing.join(', ')}`,
            };
          }
          if (!glossaryCheck.valid) {
            return {
              ...u,
              translatedText: restored,
              status: 'GLOSSARY_VIOLATION',
              errorDetail: glossaryCheck.violations.join(' '),
            };
          }

          return {
            ...u,
            translatedText: restored,
            status: 'TRANSLATED',
            errorDetail: undefined,
          };
        });
      });
    },
    [glossary]
  );

  const handleToggleUnlinkTM = useCallback((unitId: string) => {
    setUnits((prev) =>
      prev.map((u) =>
        u.id === unitId ? { ...u, isUnlinkedFromTM: !u.isUnlinkedFromTM } : u
      )
    );
  }, []);

  const handleResetSingleUnit = useCallback((unitId: string) => {
    setUnits((prev) =>
      prev.map((u) =>
        u.id === unitId
          ? {
              ...u,
              translatedText: '',
              status: 'PENDING',
              errorDetail: undefined,
            }
          : u
      )
    );
  }, []);

  const handleResetFileUnits = useCallback((filePath: string) => {
    setUnits((prev) =>
      prev.map((u) =>
        u.filePath === filePath
          ? {
              ...u,
              translatedText: '',
              status: 'PENDING',
              errorDetail: undefined,
            }
          : u
      )
    );
  }, []);

  // Local deterministic SyntaxGuard repair (restores any missing \C[n], \N[n], \V[n] without calling any API)
  const handleAutoRepairUnit = useCallback(
    async (unit: TranslationUnit) => {
      setRepairingUnitId(unit.id);
      try {
        const missingRaw = unit.tokens
          .filter((t) => !unit.translatedText.includes(t.raw))
          .map((t) => t.raw)
          .join(' ');
        const patched = `${unit.translatedText.trim()} ${missingRaw}`.trim();
        handleUpdateUnitTranslation(unit.id, patched, !unit.isUnlinkedFromTM);
      } finally {
        setRepairingUnitId(null);
      }
    },
    [handleUpdateUnitTranslation]
  );

  const handleDownloadAndroidStudioZip = async () => {
    const blob = await generateAndroidStudioProjectZipBlob();
    triggerBlobDownload(blob, 'RPGM_Translator_Android_Studio.zip');
  };

  const navItems: {
    id: ActiveTab;
    label: string;
    shortLabel: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: 'project',
      label: 'Dự Án & ZIP',
      shortLabel: 'Dự Án',
      icon: <FolderArchive className="w-5 h-5" />,
    },
    {
      id: 'translate',
      label: 'Xuất & Nhập Text (.txt)',
      shortLabel: 'Xuất/Nhập .txt',
      icon: <FileText className="w-5 h-5" />,
    },
    {
      id: 'editor',
      label: 'Khung Đã Dịch',
      shortLabel: 'Khung Dịch',
      icon: <FileEdit className="w-5 h-5" />,
    },
    {
      id: 'prompt',
      label: 'Từ Điển & Xưng Hô',
      shortLabel: 'Từ Điển',
      icon: <BookText className="w-5 h-5" />,
    },
    {
      id: 'settings',
      label: 'Cấu Hình & Android',
      shortLabel: 'Android',
      icon: <Settings2 className="w-5 h-5" />,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col pb-20 md:pb-10">
      {/* Top Navigation Bar — Strictly 3 Zones separated by gap-8 on desktop */}
      <header className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-8 h-14 flex items-center justify-between gap-3 md:gap-8">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('project');
          }}
          className="text-sm sm:text-lg font-bold tracking-tight text-slate-100 whitespace-nowrap shrink-0 font-display"
        >
          RPGM Text &amp; ZIP Translator
        </a>

        {/* Zone 2: 5 concise single-line text navigation links */}
        <nav
          aria-label="Điều hướng chính"
          className="hidden md:flex items-center gap-6 text-sm font-medium"
        >
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 cursor-pointer ${
                  isActive
                    ? 'border-amber-400 text-amber-300 font-semibold'
                    : 'border-transparent text-slate-400 hover:text-slate-100'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={handleExportTranslatedZip}
            className="min-h-[38px] px-3 sm:px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Xuất data_translated.zip</span>
            <span className="sm:hidden">Xuất ZIP</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-6 sm:py-8">
        {activeTab === 'project' && (
          <ProjectScreen
            projectName={projectName}
            rootPrefix={rootPrefix}
            rawFileCount={Object.keys(rawJsonFiles).length}
            estimate={dryRunEstimate}
            units={units}
            validationError={validationError}
            onUploadZipFile={handleUploadZipFile}
            onLoadSampleProject={handleLoadSampleProject}
            onTestLegacyArchiveRejection={handleTestLegacyArchiveRejection}
            onDownloadSampleRawZip={handleDownloadSampleRawZip}
            onQuickExportTxt={handleQuickExportTxt}
            onQuickImportTxtFile={handleQuickImportTxtFile}
            onExportCsv={handleExportCsv}
            onImportCsvFile={handleImportCsvFile}
            onSelectFileInEditor={(filePath) => {
              setSelectedFileFilter(filePath);
              setActiveTab('editor');
            }}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'prompt' && (
          <PromptStyleScreen
            selectedPresetId={selectedPresetId}
            customSystemPrompt={customSystemPrompt}
            characters={characters}
            relations={relations}
            glossary={glossary}
            onSelectPreset={(id, promptText) => {
              setSelectedPresetId(id);
              setCustomSystemPrompt(promptText);
            }}
            onChangeSystemPrompt={setCustomSystemPrompt}
            onAddCharacter={(char) =>
              setCharacters((prev) => [
                ...prev,
                { ...char, id: `char-${Date.now()}` },
              ])
            }
            onDeleteCharacter={(id) =>
              setCharacters((prev) => prev.filter((c) => c.id !== id))
            }
            onAddRelation={(rel) =>
              setRelations((prev) => [
                ...prev,
                { ...rel, id: `rel-${Date.now()}` },
              ])
            }
            onDeleteRelation={(id) =>
              setRelations((prev) => prev.filter((r) => r.id !== id))
            }
            onAddGlossary={(entry) =>
              setGlossary((prev) => [
                ...prev,
                { ...entry, id: `gl-${Date.now()}` },
              ])
            }
            onDeleteGlossary={(id) =>
              setGlossary((prev) => prev.filter((g) => g.id !== id))
            }
          />
        )}

        {activeTab === 'translate' && (
          <TranslateScreen
            projectName={projectName}
            units={units}
            runConfig={runConfig}
            importReports={importReports}
            lastExportSummary={lastExportSummary}
            onImportTranslatedText={handleImportTranslatedText}
            onLoadDemoTranslatedText={handleLoadDemoTranslatedText}
            onExportTranslatedZip={handleExportTranslatedZip}
            onResetAllTranslations={() =>
              setUnits((prev) =>
                prev.map((u) => ({
                  ...u,
                  translatedText: '',
                  status: 'PENDING',
                  errorDetail: undefined,
                }))
              )
            }
            onNavigateEditor={() => {
              setSelectedFileFilter('ALL');
              setActiveTab('editor');
            }}
          />
        )}

        {activeTab === 'editor' && (
          <EditorScreen
            units={units}
            selectedFileFilter={selectedFileFilter}
            repairingUnitId={repairingUnitId}
            onChangeFileFilter={setSelectedFileFilter}
            onUpdateUnitTranslation={handleUpdateUnitTranslation}
            onToggleUnlinkTM={handleToggleUnlinkTM}
            onResetSingleUnit={handleResetSingleUnit}
            onResetFileUnits={handleResetFileUnits}
            onAutoRepairUnit={handleAutoRepairUnit}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsAndAndroidScreen
            runConfig={runConfig}
            onUpdateRunConfig={handleUpdateRunConfig}
            onDownloadAndroidStudioZip={handleDownloadAndroidStudioZip}
          />
        )}
      </main>

      {/* Mobile Bottom Tab Bar (Thumb-Zone Ergonomics, <= 15% Viewport Height) */}
      <nav
        aria-label="Điều hướng di động"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-md border-t border-slate-800 grid grid-cols-5 items-center h-14 px-1"
      >
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`min-h-[44px] flex flex-col items-center justify-center transition-colors cursor-pointer ${
                isActive
                  ? 'text-amber-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {item.icon}
              <span className="text-[10px] tracking-tight mt-0.5 whitespace-nowrap">
                {item.shortLabel}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
