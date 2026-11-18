import React, { useMemo, useRef, useState } from 'react';
import {
  Check,
  CheckCircle2,
  ClipboardPaste,
  Copy,
  Download,
  FileCheck2,
  FileDown,
  FileText,
  FileUp,
  RotateCcw,
  Sparkles,
  SplitSquareVertical,
} from 'lucide-react';
import { splitLinesIntoPages, wrapDialogueText } from '../domain/autoWordWrapper';
import { triggerBlobDownload } from '../domain/fileDownload';
import {
  TextExportFormat,
  TextExportOptions,
  TextImportReport,
  exportUnitsToText,
} from '../domain/textExchange';
import { RunConfig, TranslationUnit } from '../domain/types';

interface TranslateScreenProps {
  projectName: string;
  units: TranslationUnit[];
  runConfig: RunConfig;
  importReports: TextImportReport[];
  lastExportSummary: string | null;
  onImportTranslatedText: (
    rawText: string,
    options: {
      fileFilter: string;
      deduplicateByHash: boolean;
      onlyPending: boolean;
      fileName: string;
    }
  ) => void;
  onLoadDemoTranslatedText: () => void;
  onExportTranslatedZip: () => Promise<void>;
  onResetAllTranslations: () => void;
  onNavigateEditor: () => void;
}

export const TranslateScreen: React.FC<TranslateScreenProps> = ({
  projectName,
  units,
  runConfig,
  importReports,
  lastExportSummary,
  onImportTranslatedText,
  onLoadDemoTranslatedText,
  onExportTranslatedZip,
  onResetAllTranslations,
  onNavigateEditor,
}) => {
  const txtFileInputRef = useRef<HTMLInputElement>(null);

  const [exportOptions, setExportOptions] = useState<TextExportOptions>({
    format: 'TAGGED_BLOCK',
    deduplicateByHash: true,
    useMaskedTokens: false,
    onlyPending: false,
    fileFilter: 'ALL',
    includeContextComments: true,
  });

  const [pastedText, setPastedText] = useState('');
  const [copiedExport, setCopiedExport] = useState(false);
  const [isDraggingTxt, setIsDraggingTxt] = useState(false);

  const uniqueFiles = useMemo(
    () => Array.from(new Set(units.map((u) => u.filePath))),
    [units]
  );

  const totalCount = units.length;
  const translatedCount = units.filter((u) => u.status === 'TRANSLATED').length;
  const pendingCount = units.filter((u) => u.status === 'PENDING').length;
  const errorCount = units.filter(
    (u) => u.status === 'VALIDATION_ERROR' || u.status === 'GLOSSARY_VIOLATION'
  ).length;

  const progressPercent =
    totalCount > 0
      ? Math.round(((translatedCount + errorCount) / totalCount) * 100)
      : 0;

  const exportedPreview = useMemo(
    () => exportUnitsToText(units, exportOptions),
    [units, exportOptions]
  );

  // Interactive 101 + 401 Dialogue Page-Splitting Preview
  const dialogueUnits = units.filter((u) => u.locator.kind === 'event401Group');
  const [selectedPreviewId, setSelectedPreviewId] = useState<string>(
    dialogueUnits[0]?.id || ''
  );

  const activePreviewUnit =
    dialogueUnits.find((u) => u.id === selectedPreviewId) || dialogueUnits[0];

  const previewText = activePreviewUnit
    ? activePreviewUnit.translatedText.trim() ||
      '\\N[1], ngọn gió đêm thổi về từ Phế Tích Phương Bắc đang ngày một lạnh buốt thấu xương. Chúng ta hãy dừng chân nghỉ ngơi bên đống lửa trại ấm áp này trước khi tiếp tục hành trình gian nan vào sáng sớm ngày mai.\nNgoài ra chúng ta vẫn còn \\V[2] \\C[14]Mảnh Tinh Quang\\C[0] cần phải thu hồi kịp lúc trước khi Quốc vương \\C[2]Aldric\\C[0] chính thức phong tỏa cánh cổng đại thánh đường.'
    : '';

  const wrappedPreviewLines = runConfig.enableAutoWordWrap
    ? wrapDialogueText(previewText, runConfig.wordWrapWidth)
    : previewText.split('\n');
  const previewPages = splitLinesIntoPages(wrappedPreviewLines, 4);

  const handleDownloadSourceTxt = () => {
    if (!exportedPreview.content) return;
    const blob = new Blob(['\uFEFF' + exportedPreview.content], {
      type: 'text/plain;charset=utf-8;',
    });
    const baseName = projectName.replace(/\.zip$/i, '');
    const suffix =
      exportOptions.fileFilter === 'ALL'
        ? 'all_strings'
        : exportOptions.fileFilter.replace(/\.json$/i, '');
    triggerBlobDownload(blob, `${baseName}_${suffix}_to_translate.txt`);
  };

  const handleCopySourceTxt = async () => {
    if (!exportedPreview.content) return;
    try {
      await navigator.clipboard.writeText(exportedPreview.content);
      setCopiedExport(true);
      setTimeout(() => setCopiedExport(false), 1800);
    } catch {
      // Ignore clipboard failures
    }
  };

  const handleUploadTxtFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const text = await file.text();
      onImportTranslatedText(text, {
        fileFilter: exportOptions.fileFilter,
        deduplicateByHash: exportOptions.deduplicateByHash,
        onlyPending: exportOptions.onlyPending,
        fileName: file.name,
      });
    }
  };

  const handleApplyPastedText = () => {
    if (!pastedText.trim()) return;
    onImportTranslatedText(pastedText, {
      fileFilter: exportOptions.fileFilter,
      deduplicateByHash: exportOptions.deduplicateByHash,
      onlyPending: exportOptions.onlyPending,
      fileName: 'Văn bản dán trực tiếp',
    });
    setPastedText('');
  };

  const latestReport = importReports[0] || null;

  return (
    <div className="space-y-8">
      {/* Top Status & ZIP Export Bar */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs text-amber-400 font-medium">
              Quy trình Offline 100% · Không dùng API · Tự động nhận dạng thẻ ID / Hash / Dòng thứ tự
            </div>
            <h1 className="text-2xl font-bold text-slate-100">
              Bộ Xuất &amp; Nhập File Text (<code className="font-mono text-amber-300">.txt</code>) Tự Nhận Dạng
            </h1>
            <p className="text-xs text-slate-400 max-w-3xl">
              Sau khi phân tích gói <code className="font-mono text-slate-200">data.zip</code>, bạn chỉ cần <strong>tải file <code className="font-mono">.txt</code> cần dịch về máy</strong>, dịch bằng bất kỳ công cụ nào rồi <strong>tải file <code className="font-mono">.txt</code> đã dịch lên lại</strong>. Hệ thống sẽ tự động nhận dạng, khôi phục mã điều khiển <code className="font-mono text-slate-200">SyntaxGuard</code>, điền vào khung đã dịch và cho phép tải <code className="font-mono text-slate-200">data_translated.zip</code> ngay lập tức.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleDownloadSourceTxt}
              className="min-h-[44px] px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs sm:text-sm flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <FileDown className="w-4 h-4" />
              <span>
                1. Tải File Text Cần Dịch ({exportedPreview.exportedCount} câu)
              </span>
            </button>

            <button
              type="button"
              onClick={() => txtFileInputRef.current?.click()}
              className="min-h-[44px] px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs sm:text-sm flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <FileUp className="w-4 h-4" />
              <span>2. Tải Lên File .txt Đã Dịch</span>
            </button>

            <button
              type="button"
              onClick={onExportTranslatedZip}
              className="min-h-[44px] px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs sm:text-sm flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>3. Tải data_translated.zip ({progressPercent}%)</span>
            </button>

            <button
              type="button"
              disabled={translatedCount === 0 && errorCount === 0}
              onClick={onResetAllTranslations}
              className="min-h-[44px] px-3.5 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 disabled:opacity-40 text-slate-400 hover:text-slate-200 border border-slate-800 font-medium text-xs flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Xóa bản dịch</span>
            </button>
          </div>
        </div>

        {/* Progress Bar & Status Breakdown */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-medium">
              {progressPercent === 100
                ? 'Đã điền đầy đủ 100% câu dịch! Bạn có thể tải file data_translated.zip ngay.'
                : 'Tiến độ ghép câu dịch vào khung dự án'}
            </span>
            <span className="font-mono tabular-nums text-amber-300 font-semibold">
              {translatedCount + errorCount} / {totalCount} dòng ({progressPercent}%)
            </span>
          </div>

          <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
            <div
              className="h-full bg-amber-400 transition-transform duration-200 origin-left"
              style={{ transform: `scaleX(${Math.min(1, progressPercent / 100)})` }}
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80">
              <div className="text-xs text-slate-400">Chưa dịch (PENDING)</div>
              <div className="text-xl font-bold text-slate-200 font-mono tabular-nums mt-0.5">
                {pendingCount}
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80">
              <div className="text-xs text-slate-400">Số mục xuất ra File .txt</div>
              <div className="text-xl font-bold text-amber-400 font-mono tabular-nums mt-0.5">
                {exportedPreview.exportedCount}
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80">
              <div className="text-xs text-slate-400">Đã ghép vào khung (TRANSLATED)</div>
              <div className="text-xl font-bold text-emerald-400 font-mono tabular-nums mt-0.5">
                {translatedCount}
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-400">Cảnh báo Mã lệnh / Glossary</div>
                <div className="text-xl font-bold text-rose-400 font-mono tabular-nums mt-0.5">
                  {errorCount}
                </div>
              </div>
              <button
                type="button"
                onClick={onNavigateEditor}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-medium cursor-pointer"
              >
                Xem khung dịch
              </button>
            </div>
          </div>
        </div>

        {/* Auto-Recognition Feedback Banner */}
        {latestReport && (
          <div className="rounded-xl bg-sky-950/40 border border-sky-500/40 px-4 py-3.5 text-xs text-sky-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <FileCheck2 className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <div className="font-semibold text-sky-300">
                  Nhận dạng thành công từ: {latestReport.fileName} ({latestReport.timestamp})
                </div>
                <div>{latestReport.summary}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={onNavigateEditor}
                className="px-3 py-1.5 rounded-lg bg-sky-400 hover:bg-sky-300 text-slate-950 font-semibold text-xs cursor-pointer"
              >
                Kiểm tra trong Khung Đã Dịch &rarr;
              </button>
            </div>
          </div>
        )}

        {lastExportSummary && (
          <div className="rounded-xl bg-emerald-950/40 border border-emerald-500/30 px-4 py-3 text-xs text-emerald-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{lastExportSummary}</span>
          </div>
        )}
      </section>

      {/* Main 2-Column Workspace: Step 1 (Export .txt) & Step 2 (Import .txt) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Column 1: Export Text (.txt) Builder & Preview */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-400" />
                <h2 className="text-base font-semibold text-slate-100">
                  Bước 1: Xuất File Text (<code className="font-mono text-amber-300">.txt</code>) Sau Khi Phân Tích
                </h2>
              </div>
              <span className="text-xs font-mono text-amber-300">
                {exportedPreview.exportedCount} mục xuất
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label
                  htmlFor="txt-format-select"
                  className="block text-xs text-slate-400"
                >
                  Định dạng xuất file .txt
                </label>
                <select
                  id="txt-format-select"
                  value={exportOptions.format}
                  onChange={(e) =>
                    setExportOptions((prev) => ({
                      ...prev,
                      format: e.target.value as TextExportFormat,
                    }))
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100"
                >
                  <option value="TAGGED_BLOCK">
                    Chuẩn Khối @@@ [0001 | HASH | ID] (Khuyên dùng)
                  </option>
                  <option value="INDEXED_LINE">
                    Chuẩn 1 Dòng [0001|HASH] (Gọn nhẹ, chống lệch dòng)
                  </option>
                  <option value="SIMPLE_NUMBERED">
                    Chuẩn Đánh Số === [0001] === (Đơn giản)
                  </option>
                </select>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="txt-file-filter"
                  className="block text-xs text-slate-400"
                >
                  Phạm vi tệp JSON cần xuất
                </label>
                <select
                  id="txt-file-filter"
                  value={exportOptions.fileFilter}
                  onChange={(e) =>
                    setExportOptions((prev) => ({
                      ...prev,
                      fileFilter: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100"
                >
                  <option value="ALL">Tất cả tệp JSON ({units.length} dòng)</option>
                  {uniqueFiles.map((f) => (
                    <option key={f} value={f}>
                      Chỉ tệp {f}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Checkboxes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <label className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-2 cursor-pointer">
                <span className="text-slate-300">
                  Gộp chuỗi trùng lặp (Unique Hash)
                </span>
                <input
                  type="checkbox"
                  checked={exportOptions.deduplicateByHash}
                  onChange={(e) =>
                    setExportOptions((prev) => ({
                      ...prev,
                      deduplicateByHash: e.target.checked,
                    }))
                  }
                  className="w-4 h-4 accent-amber-400"
                />
              </label>

              <label className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-2 cursor-pointer">
                <span className="text-slate-300">
                  Mã hóa lệnh thành [[CODE_n]]
                </span>
                <input
                  type="checkbox"
                  checked={exportOptions.useMaskedTokens}
                  onChange={(e) =>
                    setExportOptions((prev) => ({
                      ...prev,
                      useMaskedTokens: e.target.checked,
                    }))
                  }
                  className="w-4 h-4 accent-amber-400"
                />
              </label>

              <label className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-2 cursor-pointer">
                <span className="text-slate-300">
                  Chỉ xuất các câu chưa dịch
                </span>
                <input
                  type="checkbox"
                  checked={exportOptions.onlyPending}
                  onChange={(e) =>
                    setExportOptions((prev) => ({
                      ...prev,
                      onlyPending: e.target.checked,
                    }))
                  }
                  className="w-4 h-4 accent-amber-400"
                />
              </label>

              <label className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-2 cursor-pointer">
                <span className="text-slate-300">
                  Kèm ghi chú hướng dẫn ở đầu file
                </span>
                <input
                  type="checkbox"
                  checked={exportOptions.includeContextComments}
                  onChange={(e) =>
                    setExportOptions((prev) => ({
                      ...prev,
                      includeContextComments: e.target.checked,
                    }))
                  }
                  className="w-4 h-4 accent-amber-400"
                />
              </label>
            </div>

            {/* Live Preview of the exported .txt */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Xem trước nội dung file .txt sẽ tải xuống:</span>
                <button
                  type="button"
                  onClick={handleCopySourceTxt}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1 cursor-pointer"
                >
                  {copiedExport ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Đã sao chép</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Sao chép Text</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 overflow-x-auto max-h-60 leading-relaxed whitespace-pre-wrap">
                {exportedPreview.content || '(Không có chuỗi nào khớp bộ lọc hiện tại)'}
              </pre>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
            <span className="text-xs text-slate-400">
              Mã hóa UTF-8 chuẩn · Giữ nguyên 100% mã điều khiển RPG Maker
            </span>
            <button
              type="button"
              disabled={exportedPreview.exportedCount === 0}
              onClick={handleDownloadSourceTxt}
              className="min-h-[40px] px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
            >
              <FileDown className="w-4 h-4" />
              <span>Tải File .txt Cần Dịch</span>
            </button>
          </div>
        </div>

        {/* Column 2: Upload / Paste Translated .txt with Auto-Recognition */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileUp className="w-4 h-4 text-sky-400" />
                <h2 className="text-base font-semibold text-slate-100">
                  Bước 2: Tải Lên File Text Đã Dịch (<code className="font-mono text-sky-300">.txt</code>)
                </h2>
              </div>
              <button
                type="button"
                onClick={onLoadDemoTranslatedText}
                className="px-3 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Thử Nạp Bản Dịch Mẫu</span>
              </button>
            </div>

            <input
              ref={txtFileInputRef}
              type="file"
              accept=".txt,text/plain"
              multiple
              onChange={async (e) => {
                await handleUploadTxtFiles(e.target.files);
                e.target.value = '';
              }}
              className="hidden"
              aria-label="Tải lên tệp văn bản .txt đã dịch"
            />

            {/* Drag & Drop .txt Upload Box */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDraggingTxt(true);
              }}
              onDragLeave={() => setIsDraggingTxt(false)}
              onDrop={async (e) => {
                e.preventDefault();
                setIsDraggingTxt(false);
                await handleUploadTxtFiles(e.dataTransfer.files);
              }}
              onClick={() => txtFileInputRef.current?.click()}
              className={`p-5 rounded-xl border-2 border-dashed text-center transition-colors cursor-pointer space-y-2 ${
                isDraggingTxt
                  ? 'border-sky-400 bg-sky-500/10'
                  : 'border-slate-700 hover:border-sky-400/70 bg-slate-950/70'
              }`}
            >
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-sky-500/15 text-sky-400">
                <FileUp className="w-5 h-5" />
              </div>
              <div className="text-sm font-semibold text-slate-100">
                Bấm vào đây để chọn hoặc kéo thả tệp <code className="font-mono text-sky-300">.txt</code> đã dịch
              </div>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Hệ thống tự động nhận diện cả 4 kiểu định dạng: Khối <code className="font-mono text-slate-300">@@@ [0001 | HASH | ID]</code>, Dòng <code className="font-mono text-slate-300">[0001|HASH]</code>, Khối <code className="font-mono text-slate-300">=== [0001] ===</code>, hoặc Văn bản dòng tuần tự.
              </p>
            </div>

            {/* Direct Paste Box */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <label htmlFor="paste-translated-txt">
                  Hoặc dán trực tiếp nội dung văn bản đã dịch vào khung dưới đây:
                </label>
                <span>Tự động khôi phục [[CODE_n]] &amp; đồng bộ Hash</span>
              </div>
              <textarea
                id="paste-translated-txt"
                rows={6}
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder={`Ví dụ:\n@@@ [0001 | HASH:... | ID:...]\n\\N[1], phế tích phương bắc đêm nay lạnh thấu xương.\n\nhoặc:\n[0001] \\N[1], phế tích phương bắc đêm nay lạnh thấu xương.`}
                className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 focus:border-sky-400 focus:outline-none text-xs font-mono text-slate-100 leading-relaxed"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
            <span className="text-xs text-slate-400">
              Tự động điền vào khung đã dịch &amp; kiểm tra SyntaxGuard
            </span>
            <button
              type="button"
              disabled={!pastedText.trim()}
              onClick={handleApplyPastedText}
              className="min-h-[40px] px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-40 text-slate-950 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
            >
              <ClipboardPaste className="w-4 h-4" />
              <span>Nhận Dạng &amp; Đưa Vào Khung Đã Dịch</span>
            </button>
          </div>
        </div>
      </section>

      {/* Bottom Split: 101+401 Page-Splitting Simulator & Import History Log */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left: Auto Word-Wrap & 101+401 Page-Splitting Simulator */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                <SplitSquareVertical className="w-4 h-4 text-amber-400" />
                <span>
                  Mô Phỏng Tự Tách Trang Hộp Thoại{' '}
                  <code className="font-mono text-amber-300">101 + 401</code>
                </span>
              </h2>
              <span className="text-xs font-mono tabular-nums text-slate-400">
                Ngắt dòng: {runConfig.wordWrapWidth} ký tự · Tối đa 4 dòng/trang
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Khi xuất file <code className="font-mono text-slate-200">data_translated.zip</code>, nếu câu dịch tiếng Việt dài quá 4 dòng sau khi <code className="font-mono text-slate-200">Auto Word-Wrap</code>, hệ thống tự động nhân bản lệnh <code className="font-mono text-slate-200">101</code> kèm các lệnh <code className="font-mono text-slate-200">401</code> tiếp theo để chữ không bao giờ bị tràn khung thoại trong game.
            </p>

            <div>
              <label
                htmlFor="dialogue-preview-select"
                className="block text-xs text-slate-400 mb-1.5"
              >
                Chọn đoạn hội thoại <code className="font-mono">Event401Group</code> để xem trước tách trang:
              </label>
              <select
                id="dialogue-preview-select"
                value={activePreviewUnit?.id || ''}
                onChange={(e) => setSelectedPreviewId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100"
              >
                {dialogueUnits.map((du) => (
                  <option key={du.id} value={du.id}>
                    {du.contextLabel} — {du.speaker ? `[${du.speaker}] ` : ''}
                    {du.sourceText.slice(0, 55)}...
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-3 pt-1">
              {previewPages.map((pageLines, pIdx) => (
                <div
                  key={pIdx}
                  className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5"
                >
                  <div className="flex items-center justify-between text-xs text-amber-300 font-mono">
                    <span>
                      Trang Hộp Thoại #{pIdx + 1} · Lệnh 101 [Speaker:{' '}
                      {activePreviewUnit?.speaker || 'Default'}]
                    </span>
                    <span>
                      {pIdx === 0 ? 'Khung 101 gốc' : '+ Tự động chèn thêm lệnh 101'}
                    </span>
                  </div>
                  <div className="space-y-1 pt-1 border-t border-slate-900 font-mono text-xs text-slate-200">
                    {pageLines.map((line, lIdx) => (
                      <div key={lIdx} className="flex items-start gap-2">
                        <span className="text-slate-500 select-none">[401]</span>
                        <span className="break-words">{line}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="text-xs text-slate-400 border-t border-slate-800 pt-3 flex items-center justify-between">
            <span>Tổng số dòng sau Word-Wrap: {wrappedPreviewLines.length} dòng</span>
            <span className="font-mono text-emerald-400">
              Số trang hộp thoại 101+401: {previewPages.length} trang
            </span>
          </div>
        </div>

        {/* Right: History of Text Imports */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-100">
                Nhật Ký Nhận Dạng &amp; Nhập File Text (<code className="font-mono text-sky-300">.txt</code>)
              </h2>
              <span className="text-xs font-mono tabular-nums text-slate-400">
                {importReports.length} lượt nhập
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Mọi câu dịch nhập từ file <code className="font-mono text-slate-200">.txt</code> đều được tự động lưu vào bộ nhớ cục bộ của trình duyệt và lan truyền sang các chuỗi trùng mã băm SHA-256.
            </p>

            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {importReports.length === 0 ? (
                <div className="p-6 rounded-xl bg-slate-950 border border-slate-800/80 text-center space-y-2">
                  <div className="text-sm font-medium text-slate-300">
                    Chưa có tệp .txt đã dịch nào được tải lên
                  </div>
                  <p className="text-xs text-slate-400">
                    Hãy bấm <strong>"1. Tải File Text Cần Dịch"</strong> để lấy file gốc, hoặc bấm <strong>"Thử Nạp Bản Dịch Mẫu"</strong> ở khung Bước 2 để kiểm tra ngay tính năng tự nhận dạng và ghép câu vào khung đã dịch.
                  </p>
                </div>
              ) : (
                importReports.map((rep) => (
                  <div
                    key={rep.id}
                    className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between font-mono">
                      <span className="text-slate-200 font-semibold">
                        {rep.fileName} · {rep.detectedFormat}
                      </span>
                      <span className="text-emerald-400">
                        +{rep.unitsUpdated} dòng khớp
                      </span>
                    </div>
                    <div className="text-slate-300">{rep.summary}</div>
                    <div className="text-slate-500 font-mono tabular-nums">
                      {rep.timestamp} · {rep.entriesParsed} mục đọc được ·{' '}
                      {rep.warningsCount} cảnh báo
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="text-xs text-slate-400 border-t border-slate-800 pt-3 flex items-center justify-between">
            <span>Trạng thái đóng gói ZIP:</span>
            <span className="font-mono text-emerald-400">
              Sẵn sàng tải data_translated.zip bất kỳ lúc nào
            </span>
          </div>
        </div>
      </section>
    </div>
  );
};
