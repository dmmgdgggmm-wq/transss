import React, { useRef, useState } from 'react';
import {
  Download,
  FileArchive,
  FileDown,
  FileSpreadsheet,
  FileUp,
  FolderCheck,
  RefreshCw,
  ShieldAlert,
  Upload,
} from 'lucide-react';
import { DryRunEstimate, TranslationUnit } from '../domain/types';

interface ProjectScreenProps {
  projectName: string;
  rootPrefix: string;
  rawFileCount: number;
  estimate: DryRunEstimate;
  units: TranslationUnit[];
  validationError: string | null;
  onUploadZipFile: (file: File) => Promise<void>;
  onLoadSampleProject: () => Promise<void>;
  onTestLegacyArchiveRejection: () => void;
  onDownloadSampleRawZip: () => Promise<void>;
  onQuickExportTxt: () => void;
  onQuickImportTxtFile: (file: File) => Promise<void>;
  onExportCsv: () => void;
  onImportCsvFile: (file: File) => Promise<void>;
  onSelectFileInEditor: (filePath: string) => void;
  onNavigateTab: (
    tab: 'project' | 'prompt' | 'translate' | 'editor' | 'settings'
  ) => void;
}

export const ProjectScreen: React.FC<ProjectScreenProps> = ({
  projectName,
  rootPrefix,
  rawFileCount,
  estimate,
  units,
  validationError,
  onUploadZipFile,
  onLoadSampleProject,
  onTestLegacyArchiveRejection,
  onDownloadSampleRawZip,
  onQuickExportTxt,
  onQuickImportTxtFile,
  onExportCsv,
  onImportCsvFile,
  onSelectFileInEditor,
  onNavigateTab,
}) => {
  const zipInputRef = useRef<HTMLInputElement>(null);
  const txtInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [importFeedback, setImportFeedback] = useState<string | null>(null);

  const translatedCount = units.filter((u) => u.status === 'TRANSLATED').length;
  const completionPercent =
    units.length > 0 ? Math.round((translatedCount / units.length) * 100) : 0;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await onUploadZipFile(file);
      e.target.value = '';
    }
  };

  const handleTxtChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await onQuickImportTxtFile(file);
      setImportFeedback(
        `Đã tự nhận dạng và ghép bản dịch từ tệp "${file.name}" vào khung đã dịch thành công.`
      );
      e.target.value = '';
    }
  };

  const handleCsvChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await onImportCsvFile(file);
      setImportFeedback(`Đã nhập dữ liệu từ tệp CSV "${file.name}" thành công.`);
      e.target.value = '';
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (file.name.toLowerCase().endsWith('.txt')) {
      await onQuickImportTxtFile(file);
      setImportFeedback(
        `Đã tự nhận dạng và ghép bản dịch từ tệp "${file.name}" vào khung đã dịch thành công.`
      );
    } else {
      await onUploadZipFile(file);
    }
  };

  return (
    <div className="space-y-8">
      {/* Hero & Upload Split */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="text-xs text-amber-400 font-medium">
              Storage Access Framework · Kiểm định RPG Maker MV/MZ · Xuất &amp; Nhập Text Tự Nhận Dạng
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 tracking-tight text-balance">
              Phân tích <code className="text-amber-300 font-mono">data.zip</code>, Xuất File Text <code className="text-amber-300 font-mono">.txt</code> &amp; Ghép Bản Dịch Tự Động
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed max-w-2xl">
              Hệ thống phân tích tọa độ <code className="font-mono text-slate-200">LineLocator</code> từ các tệp JSON, cho phép bạn tải file <code className="font-mono text-slate-200">.txt</code> cần dịch về máy, sau đó tải file <code className="font-mono text-slate-200">.txt</code> đã dịch lên để tự nhận diện, đưa thẳng vào khung đã dịch và đóng gói <code className="font-mono text-slate-200">data_translated.zip</code> mà không cần API.
            </p>
          </div>

          <div className="mt-6 pt-5 border-t border-slate-800/80 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => zipInputRef.current?.click()}
              className="min-h-[44px] px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>1. Chọn tệp data.zip</span>
            </button>

            <button
              type="button"
              onClick={onQuickExportTxt}
              className="min-h-[44px] px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-semibold text-sm flex items-center gap-2 border border-amber-500/40 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <FileDown className="w-4 h-4" />
              <span>2. Tải File .txt Cần Dịch</span>
            </button>

            <button
              type="button"
              onClick={() => txtInputRef.current?.click()}
              className="min-h-[44px] px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-sm flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <FileUp className="w-4 h-4" />
              <span>3. Up File .txt Đã Dịch</span>
            </button>

            <button
              type="button"
              onClick={onLoadSampleProject}
              className="min-h-[44px] px-3.5 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 font-medium text-xs flex items-center gap-2 border border-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
              <span>Nạp Dự Án Mẫu</span>
            </button>

            {typeof window !== 'undefined' && !window.AndroidFileBridge && (
              <a
                href="/downloads/RPGM_Translator.apk"
                download="RPGM_Translator.apk"
                className="min-h-[44px] px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
              >
                <Download className="w-4 h-4" />
                <span>Tải APK Android (.apk)</span>
              </a>
            )}

            <button
              type="button"
              onClick={onDownloadSampleRawZip}
              className="min-h-[44px] px-3.5 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 font-medium text-xs flex items-center gap-2 border border-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Tải data.zip Mẫu</span>
            </button>

            <button
              type="button"
              onClick={onTestLegacyArchiveRejection}
              className="min-h-[44px] px-3.5 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-200 font-medium text-xs flex items-center gap-2 border border-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              <span>Test Chặn .rvdata2</span>
            </button>
          </div>
        </div>

        {/* Dropzone & Archive Inspector */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`lg:col-span-5 rounded-2xl border p-6 flex flex-col justify-between transition-colors ${
            isDragging
              ? 'border-amber-400 bg-amber-500/10'
              : 'border-slate-800 bg-slate-900/60'
          }`}
        >
          <input
            ref={zipInputRef}
            type="file"
            accept=".zip,application/zip"
            onChange={handleFileChange}
            className="hidden"
            aria-label="Tải lên tệp data.zip"
          />
          <input
            ref={txtInputRef}
            type="file"
            accept=".txt,text/plain"
            onChange={handleTxtChange}
            className="hidden"
            aria-label="Tải lên tệp .txt đã dịch"
          />
          <input
            ref={csvInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleCsvChange}
            className="hidden"
            aria-label="Nhập tệp bảng dịch CSV"
          />

          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs text-slate-400">Gói dữ liệu đang mở</div>
                <h2 className="text-lg font-semibold text-slate-100 mt-0.5">
                  {projectName}
                </h2>
              </div>
              <FileArchive className="w-6 h-6 text-amber-400 shrink-0" />
            </div>

            <div className="space-y-2 text-xs text-slate-300 border-t border-slate-800 pt-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Tiền tố đường dẫn gốc:</span>
                <span className="font-mono text-amber-300">
                  {rootPrefix || '(Thư mục gốc /)'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Số tệp JSON hợp lệ:</span>
                <span className="font-mono tabular-nums text-slate-100">
                  {rawFileCount} tệp · RPG Maker MV/MZ
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Tiến độ ghép bản dịch:</span>
                <span className="font-mono tabular-nums text-emerald-400">
                  {translatedCount} / {units.length} dòng ({completionPercent}%)
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onExportCsv}
                className="min-h-[40px] px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>Xuất CSV</span>
              </button>
              <button
                type="button"
                onClick={() => csvInputRef.current?.click()}
                className="min-h-[40px] px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-sky-400" />
                <span>Nhập CSV</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => onNavigateTab('translate')}
              className="min-h-[40px] px-3.5 py-2 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Mở Bộ Xuất &amp; Nhập Text (.txt) &rarr;
            </button>
          </div>
        </div>
      </section>

      {/* Validation Error Alert (e.g. when testing .rvdata2 rejection) */}
      {validationError && (
        <div
          role="alert"
          className="rounded-xl border border-rose-500/40 bg-rose-950/40 px-5 py-4 text-sm text-rose-200 flex items-start justify-between gap-4"
        >
          <div className="space-y-1">
            <div className="font-semibold text-rose-300">
              Cảnh báo Kiểm định Định dạng Gói Nén (SAF Validator)
            </div>
            <p className="text-xs text-rose-200/90 leading-relaxed">
              {validationError}
            </p>
          </div>
        </div>
      )}

      {importFeedback && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/30 px-4 py-3 text-xs text-emerald-200 flex items-center justify-between">
          <span>{importFeedback}</span>
          <button
            type="button"
            onClick={() => setImportFeedback(null)}
            className="text-emerald-300 underline ml-4 cursor-pointer"
          >
            Đóng
          </button>
        </div>
      )}

      {/* Analysis Summary KPI Strip */}
      <section className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">
              01. Thống Kê Phân Tích Chuỗi &amp; Khử Trùng Lặp Toàn Cục
            </h2>
            <p className="text-xs text-slate-400">
              Gộp các chuỗi trùng nhau bằng mã băm SHA-256 để chỉ cần dịch 1 lần trong file <code className="font-mono text-slate-300">.txt</code> và tự động điền cho toàn bộ các vị trí trùng lặp
            </p>
          </div>
          <div className="text-xs text-slate-400 font-mono tabular-nums">
            Tiết kiệm {estimate.duplicateStringsSaved} câu trùng lặp · Đã lọc bỏ {estimate.skippedGarbageStrings} chuỗi mã hệ thống
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="text-xs text-slate-400">Tổng chuỗi trích xuất</div>
            <div className="text-2xl font-bold text-slate-100 font-mono tabular-nums mt-1">
              {estimate.totalStrings}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Trích xuất từ {estimate.fileBreakdown.length} tệp JSON
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="text-xs text-slate-400">Chuỗi duy nhất (Unique Hash)</div>
            <div className="text-2xl font-bold text-amber-400 font-mono tabular-nums mt-1">
              {estimate.uniqueStrings}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Số câu thực tế khi xuất ra file .txt
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="text-xs text-slate-400">Số câu trùng được tự đồng bộ</div>
            <div className="text-2xl font-bold text-emerald-400 font-mono tabular-nums mt-1">
              {estimate.duplicateStringsSaved}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Tự động điền qua Translation Memory
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="text-xs text-slate-400">Đã dịch / Hoàn tất</div>
            <div className="text-2xl font-bold text-sky-400 font-mono tabular-nums mt-1">
              {translatedCount} / {units.length}
            </div>
            <div className="text-xs text-slate-400 font-mono tabular-nums mt-1">
              Hoàn thành: {completionPercent}%
            </div>
          </div>
        </div>
      </section>

      {/* Extracted JSON Files Table */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">
              02. Danh Sách Tệp JSON &amp; Ánh Xạ Tọa Độ (<code className="font-mono text-amber-300">_manifest.json</code>)
            </h2>
            <p className="text-xs text-slate-400">
              Bấm vào từng tệp để mở nhanh trong Trình Sửa Chuỗi hoặc kiểm tra các câu đã được ghép từ file <code className="font-mono text-slate-300">.txt</code>
            </p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-xs text-slate-400 bg-slate-950/50">
                  <th className="py-3 px-4 font-medium">Tệp JSON trong gói nén</th>
                  <th className="py-3 px-4 font-medium">Nhóm cấu trúc RPG Maker</th>
                  <th className="py-3 px-4 font-medium text-right">Tổng chuỗi</th>
                  <th className="py-3 px-4 font-medium text-right">Đã dịch</th>
                  <th className="py-3 px-4 font-medium text-right">Cảnh báo lỗi</th>
                  <th className="py-3 px-4 font-medium text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 text-sm">
                {estimate.fileBreakdown.map((f) => {
                  const lower = f.filePath.toLowerCase();
                  const category = lower.startsWith('map')
                    ? 'Bản đồ & Sự kiện (101/401/102/402)'
                    : lower.includes('commonevents')
                    ? 'Sự kiện chung (CommonEvents)'
                    : lower.includes('system')
                    ? 'Hệ thống & Thuật ngữ (System.json)'
                    : 'Cơ sở dữ liệu (Actors / Skills / Items)';

                  return (
                    <tr
                      key={f.filePath}
                      className="hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-4 font-mono text-xs text-slate-100 flex items-center gap-2">
                        <FolderCheck className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>
                          {rootPrefix}
                          {f.filePath}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-300">{category}</td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-xs text-slate-200">
                        {f.totalUnits}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-xs text-emerald-400">
                        {f.translatedUnits}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-xs text-rose-400">
                        {f.errorUnits}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => onSelectFileInEditor(f.filePath)}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-amber-300 transition-colors whitespace-nowrap cursor-pointer"
                        >
                          Xem &amp; Sửa chuỗi
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
};
