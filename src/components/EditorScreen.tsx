import React, {
  memo,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Filter,
  Link2Off,
  RotateCcw,
  Search,
  Sparkles,
  TriangleAlert,
} from 'lucide-react';
import { TranslationUnit } from '../domain/types';

interface EditorScreenProps {
  units: TranslationUnit[];
  selectedFileFilter: string;
  repairingUnitId: string | null;
  onChangeFileFilter: (filePath: string) => void;
  onUpdateUnitTranslation: (
    unitId: string,
    newText: string,
    propagateTM: boolean
  ) => void;
  onToggleUnlinkTM: (unitId: string) => void;
  onResetSingleUnit: (unitId: string) => void;
  onResetFileUnits: (filePath: string) => void;
  onAutoRepairUnit: (unit: TranslationUnit) => Promise<void>;
}

interface EditorUnitRowProps {
  unit: TranslationUnit;
  isRepairing: boolean;
  onUpdateUnitTranslation: (
    unitId: string,
    newText: string,
    propagateTM: boolean
  ) => void;
  onToggleUnlinkTM: (unitId: string) => void;
  onResetSingleUnit: (unitId: string) => void;
  onAutoRepairUnit: (unit: TranslationUnit) => Promise<void>;
}

const EditorUnitRow: React.FC<EditorUnitRowProps> = memo(
  ({
    unit,
    isRepairing,
    onUpdateUnitTranslation,
    onToggleUnlinkTM,
    onResetSingleUnit,
    onAutoRepairUnit,
  }) => {
    const [draftText, setDraftText] = useState(unit.translatedText);

    useEffect(() => {
      setDraftText(unit.translatedText);
    }, [unit.translatedText]);

    // Debounce syncing draftText back to global state while typing so keystrokes are instant
    useEffect(() => {
      if (draftText === unit.translatedText) return;
      const timer = setTimeout(() => {
        onUpdateUnitTranslation(unit.id, draftText, !unit.isUnlinkedFromTM);
      }, 220);
      return () => clearTimeout(timer);
    }, [
      draftText,
      unit.id,
      unit.translatedText,
      unit.isUnlinkedFromTM,
      onUpdateUnitTranslation,
    ]);

    const hasError =
      unit.status === 'VALIDATION_ERROR' ||
      unit.status === 'GLOSSARY_VIOLATION';

    const handleInsertToken = (rawCode: string) => {
      const next = draftText ? `${draftText} ${rawCode}` : rawCode;
      setDraftText(next);
      onUpdateUnitTranslation(unit.id, next, !unit.isUnlinkedFromTM);
    };

    return (
      <div
        className={`rounded-2xl border p-4 sm:p-5 space-y-3 transition-colors ${
          hasError
            ? 'bg-rose-950/20 border-rose-500/40'
            : 'bg-slate-900 border-slate-800'
        }`}
      >
        {/* Top unboxed metadata row */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-amber-300 font-medium">
              {unit.contextLabel}
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono text-slate-300">
              Locator: {unit.locator.kind}
            </span>
            {unit.speaker && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-emerald-300 font-medium">
                  Người nói: {unit.speaker}
                </span>
              </>
            )}
            <span aria-hidden="true">·</span>
            <span
              className={`font-mono ${
                unit.status === 'TRANSLATED'
                  ? 'text-emerald-400'
                  : hasError
                  ? 'text-rose-400 font-semibold'
                  : 'text-slate-400'
              }`}
            >
              {unit.status}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onToggleUnlinkTM(unit.id)}
              title="Tách liên kết chuỗi này khỏi Translation Memory toàn cục"
              className={`px-2.5 py-1 rounded-lg text-xs flex items-center gap-1 border transition-colors cursor-pointer ${
                unit.isUnlinkedFromTM
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Link2Off className="w-3 h-3" />
              <span>
                {unit.isUnlinkedFromTM ? 'Đã tách TM riêng' : 'Đồng bộ TM'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setDraftText('');
                onResetSingleUnit(unit.id);
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Khôi phục gốc</span>
            </button>
          </div>
        </div>

        {/* Source vs Translated Split */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/90 space-y-2">
            <div className="text-xs text-slate-400 flex items-center justify-between">
              <span>Văn bản gốc (RPG Maker JSON)</span>
              <span className="font-mono text-slate-500">
                Hash: {unit.hash.slice(0, 8)}
              </span>
            </div>
            <div className="text-xs sm:text-sm text-slate-200 font-mono whitespace-pre-wrap leading-relaxed">
              {unit.sourceText}
            </div>

            {unit.tokens.length > 0 && (
              <div className="pt-2 border-t border-slate-900 flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-slate-400 mr-1">
                  Chèn nhanh mã điều khiển:
                </span>
                {unit.tokens.map((tok) => (
                  <button
                    key={tok.placeholder}
                    type="button"
                    onClick={() => handleInsertToken(tok.raw)}
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 font-mono text-xs transition-colors cursor-pointer"
                  >
                    {tok.raw} ({tok.placeholder})
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <textarea
              rows={3}
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              onBlur={() => {
                if (draftText !== unit.translatedText) {
                  onUpdateUnitTranslation(
                    unit.id,
                    draftText,
                    !unit.isUnlinkedFromTM
                  );
                }
              }}
              aria-label={`Bản dịch cho ${unit.contextLabel}`}
              placeholder="Nhập bản dịch tiếng Việt hoặc chạy dịch tự động..."
              className="w-full rounded-xl bg-slate-950 border border-slate-800 focus:border-amber-400 focus:outline-none p-3 text-xs sm:text-sm text-slate-100 font-mono leading-relaxed"
            />

            {hasError && unit.errorDetail && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-rose-950/60 border border-rose-500/40 px-3 py-2 text-xs text-rose-200">
                <div className="flex items-center gap-1.5">
                  <TriangleAlert className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span>{unit.errorDetail}</span>
                </div>
                <button
                  type="button"
                  disabled={isRepairing}
                  onClick={() => onAutoRepairUnit(unit)}
                  className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-semibold text-xs flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Tự động gắn lại Mã lệnh thiếu</span>
                </button>
              </div>
            )}

            {!hasError && unit.status === 'TRANSLATED' && (
              <div className="text-xs text-emerald-400 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                <span>
                  Đã khớp đủ {unit.tokens.length}/{unit.tokens.length} mã điều
                  khiển SyntaxGuard
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
);

export const EditorScreen: React.FC<EditorScreenProps> = ({
  units,
  selectedFileFilter,
  repairingUnitId,
  onChangeFileFilter,
  onUpdateUnitTranslation,
  onToggleUnlinkTM,
  onResetSingleUnit,
  onResetFileUnits,
  onAutoRepairUnit,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [statusFilter, setStatusFilter] = useState<
    'ALL' | 'TRANSLATED' | 'PENDING' | 'ERROR'
  >('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const uniqueFiles = useMemo(
    () => Array.from(new Set(units.map((u) => u.filePath))),
    [units]
  );

  const filteredUnits = useMemo(() => {
    const q = deferredSearchQuery.trim().toLowerCase();
    return units.filter((u) => {
      if (selectedFileFilter !== 'ALL' && u.filePath !== selectedFileFilter) {
        return false;
      }
      if (statusFilter === 'TRANSLATED' && u.status !== 'TRANSLATED')
        return false;
      if (statusFilter === 'PENDING' && u.status !== 'PENDING') return false;
      if (
        statusFilter === 'ERROR' &&
        u.status !== 'VALIDATION_ERROR' &&
        u.status !== 'GLOSSARY_VIOLATION'
      ) {
        return false;
      }
      if (q) {
        return (
          u.sourceText.toLowerCase().includes(q) ||
          u.translatedText.toLowerCase().includes(q) ||
          (u.speaker && u.speaker.toLowerCase().includes(q)) ||
          u.contextLabel.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [units, selectedFileFilter, statusFilter, deferredSearchQuery]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedFileFilter, statusFilter, deferredSearchQuery, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredUnits.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const paginatedUnits = useMemo(
    () => filteredUnits.slice(startIndex, startIndex + pageSize),
    [filteredUnits, startIndex, pageSize]
  );

  return (
    <div className="space-y-6">
      {/* Header & Filter Bar */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">
              Trình Chỉnh Sửa Chuỗi &amp; Kiểm Lỗi{' '}
              <code className="font-mono text-amber-300">SyntaxGuard</code>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Sửa trực tiếp từng dòng, bấm chèn nhanh mã điều khiển{' '}
              <code className="font-mono text-slate-200">\C[n]</code>,{' '}
              <code className="font-mono text-slate-200">\N[n]</code>, gọi{' '}
              <strong>Auto-Repair</strong> hoặc khôi phục tệp về bản gốc
            </p>
          </div>

          {selectedFileFilter !== 'ALL' && (
            <button
              type="button"
              onClick={() => onResetFileUnits(selectedFileFilter)}
              className="min-h-[40px] px-3.5 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Khôi phục tệp {selectedFileFilter} về bản gốc</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-1">
          {/* Search Input */}
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo câu gốc, bản dịch, tên nhân vật..."
              aria-label="Tìm kiếm chuỗi dịch"
              className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-amber-400 focus:outline-none text-xs text-slate-100"
            />
          </div>

          {/* File Selector */}
          <div className="md:col-span-3 flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedFileFilter}
              onChange={(e) => onChangeFileFilter(e.target.value)}
              aria-label="Lọc theo tệp JSON"
              className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100"
            >
              <option value="ALL">Tất cả tệp ({units.length} dòng)</option>
              {uniqueFiles.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>

          {/* Status Segmented Filter Controls */}
          <div className="md:col-span-4 flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-xl">
            {(
              [
                { id: 'ALL', label: 'Tất cả' },
                { id: 'TRANSLATED', label: 'Đã dịch' },
                { id: 'PENDING', label: 'Chưa dịch' },
                { id: 'ERROR', label: 'Lỗi Token' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-amber-500 text-slate-950 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Units List with Fast Pagination */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 px-1">
          <span>
            Hiển thị dòng{' '}
            <strong className="text-slate-200 font-mono tabular-nums">
              {filteredUnits.length === 0 ? 0 : startIndex + 1}–
              {Math.min(startIndex + pageSize, filteredUnits.length)}
            </strong>{' '}
            trên tổng{' '}
            <strong className="text-slate-200 font-mono tabular-nums">
              {filteredUnits.length}
            </strong>{' '}
            chuỗi khớp lọc ({units.length} toàn dự án)
          </span>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5">
              <span>Số dòng/trang:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                aria-label="Số dòng hiển thị mỗi trang"
                className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 font-mono text-xs"
              >
                <option value={15}>15</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </label>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                aria-label="Trang trước"
                className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-40 border border-slate-800 text-slate-200 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="font-mono tabular-nums text-slate-300 px-1">
                Trang {safePage}/{totalPages}
              </span>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                aria-label="Trang sau"
                className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-40 border border-slate-800 text-slate-200 cursor-pointer"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {filteredUnits.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center space-y-2">
            <div className="text-base font-semibold text-slate-200">
              Không tìm thấy chuỗi nào khớp bộ lọc hiện tại
            </div>
            <p className="text-xs text-slate-400">
              Hãy thử xóa từ khóa tìm kiếm hoặc chuyển bộ lọc trạng thái về "Tất
              cả".
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {paginatedUnits.map((unit) => (
              <EditorUnitRow
                key={unit.id}
                unit={unit}
                isRepairing={repairingUnitId === unit.id}
                onUpdateUnitTranslation={onUpdateUnitTranslation}
                onToggleUnlinkTM={onToggleUnlinkTM}
                onResetSingleUnit={onResetSingleUnit}
                onAutoRepairUnit={onAutoRepairUnit}
              />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-3">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => {
                setCurrentPage((p) => Math.max(1, p - 1));
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-40 border border-slate-800 text-xs font-medium text-slate-200 flex items-center gap-1 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Trang trước</span>
            </button>
            <span className="text-xs font-mono tabular-nums text-slate-400 px-2">
              Trang {safePage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => {
                setCurrentPage((p) => Math.min(totalPages, p + 1));
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-40 border border-slate-800 text-xs font-medium text-slate-200 flex items-center gap-1 cursor-pointer"
            >
              <span>Trang tiếp</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </section>
    </div>
  );
};

