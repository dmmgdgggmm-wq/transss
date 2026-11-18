import React, { useState } from 'react';
import {
  Check,
  Code2,
  Copy,
  Cpu,
  Download,
} from 'lucide-react';
import { ANDROID_PROJECT_FILES } from '../domain/androidSourceGenerator';
import { RunConfig } from '../domain/types';

interface SettingsAndAndroidScreenProps {
  runConfig: RunConfig;
  onUpdateRunConfig: (partial: Partial<RunConfig>) => void;
  onDownloadAndroidStudioZip: () => Promise<void>;
}

export const SettingsAndAndroidScreen: React.FC<
  SettingsAndAndroidScreenProps
> = ({
  runConfig,
  onUpdateRunConfig,
  onDownloadAndroidStudioZip,
}) => {
  const [selectedAndroidPath, setSelectedAndroidPath] = useState<string>(
    ANDROID_PROJECT_FILES[0].path
  );
  const [copiedFile, setCopiedFile] = useState(false);

  const activeAndroidFile =
    ANDROID_PROJECT_FILES.find((f) => f.path === selectedAndroidPath) ||
    ANDROID_PROJECT_FILES[0];

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(activeAndroidFile.code);
      setCopiedFile(true);
      setTimeout(() => setCopiedFile(false), 1800);
    } catch {
      // Ignore clipboard failures in restricted environments
    }
  };

  return (
    <div className="space-y-8">
      {/* Section 1: Word-Wrap & JSON Extraction Settings */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-6">
        <div className="space-y-1">
          <div className="text-xs text-amber-400 font-medium">
            Cấu hình Đóng gói JSON &amp; Ngắt dòng Hộp thoại 101 + 401
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-100">
            Tùy Chỉnh Ngắt Dòng (<code className="font-mono text-amber-300">Auto Word-Wrap</code>) &amp; Bóc Tách Chuỗi
          </h1>
          <p className="text-xs text-slate-400">
            Điều chỉnh giới hạn ký tự trên mỗi dòng hội thoại RPG Maker MV/MZ và phạm vi trích xuất các lệnh sự kiện trước khi xuất file <code className="font-mono text-slate-200">.txt</code> hoặc đóng gói <code className="font-mono text-slate-200">data_translated.zip</code>.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between gap-2 text-xs">
              <label htmlFor="word-wrap-num" className="text-slate-300 font-medium">
                Độ rộng ngắt dòng (Word-Wrap)
              </label>
              <input
                id="word-wrap-num"
                type="number"
                min={30}
                max={80}
                value={runConfig.wordWrapWidth}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!Number.isNaN(val)) {
                    onUpdateRunConfig({
                      wordWrapWidth: Math.max(30, Math.min(80, val)),
                    });
                  }
                }}
                className="w-16 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-right font-mono tabular-nums text-amber-300 font-bold"
              />
            </div>
            <input
              type="range"
              min={38}
              max={58}
              value={Math.min(58, Math.max(38, runConfig.wordWrapWidth))}
              onChange={(e) =>
                onUpdateRunConfig({ wordWrapWidth: parseInt(e.target.value, 10) })
              }
              className="w-full accent-amber-400 cursor-pointer"
            />
            <div className="text-xs text-slate-500">
              Tự tách trang <code className="font-mono">101 + 401</code> khi vượt 4 dòng
            </div>
          </div>

          <label className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3 cursor-pointer">
            <div className="text-xs space-y-0.5">
              <div className="font-semibold text-slate-200">
                Tự động Ngắt dòng (Auto Word-Wrap)
              </div>
              <div className="text-slate-400">
                Chống tràn chữ khỏi khung thoại khi đóng gói ZIP
              </div>
            </div>
            <input
              type="checkbox"
              checked={runConfig.enableAutoWordWrap}
              onChange={(e) =>
                onUpdateRunConfig({ enableAutoWordWrap: e.target.checked })
              }
              className="w-4 h-4 accent-amber-400"
            />
          </label>

          <label className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3 cursor-pointer">
            <div className="text-xs space-y-0.5">
              <div className="font-semibold text-slate-200">
                Bóc tách chữ cuộn (Lệnh 105/405)
              </div>
              <div className="text-slate-400">
                Bao gồm các đoạn văn bản cuộn (Scrolling Text)
              </div>
            </div>
            <input
              type="checkbox"
              checked={runConfig.translateScrollingText}
              onChange={(e) =>
                onUpdateRunConfig({ translateScrollingText: e.target.checked })
              }
              className="w-4 h-4 accent-amber-400"
            />
          </label>

          <label className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3 cursor-pointer">
            <div className="text-xs space-y-0.5">
              <div className="font-semibold text-slate-200">
                Dịch tên Speaker (Lệnh 101 param[4])
              </div>
              <div className="text-slate-400">
                Mặc định tắt để bảo vệ plugin Portrait
              </div>
            </div>
            <input
              type="checkbox"
              checked={runConfig.translateSpeakerNames}
              onChange={(e) =>
                onUpdateRunConfig({ translateSpeakerNames: e.target.checked })
              }
              className="w-4 h-4 accent-amber-400"
            />
          </label>
        </div>
      </section>

      {/* Section 2: Compiled Android APK Download & Native Project Explorer */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
        {typeof window !== 'undefined' && !window.AndroidFileBridge && (
          <div className="p-4 sm:p-5 rounded-2xl bg-emerald-950/35 border border-emerald-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-xs font-semibold text-emerald-300">
                APK Android Đóng Gói Sẵn (Đã Biên Dịch &amp; Ký Số Debug)
              </div>
              <div className="text-base font-bold text-slate-100">
                RPGM_Translator.apk (Android 7.0+ · Offline 100%)
              </div>
              <p className="text-xs text-slate-300">
                Tích hợp chọn file <code className="font-mono">.zip</code> / <code className="font-mono">.txt</code> qua Android SAF và lưu tự động các file xuất ra vào <code className="font-mono text-emerald-300">Download/RPGMTranslator/</code>.
              </p>
            </div>
            <a
              href="/downloads/RPGM_Translator.apk"
              download="RPGM_Translator.apk"
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-4 h-4" />
              <span>Tải File APK (.apk)</span>
            </a>
          </div>
        )}

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs text-emerald-400 font-medium flex items-center gap-1.5">
              <Cpu className="w-4 h-4" />
              <span>Kiến trúc Android: Android Gradle Project + WebViewAssetLoader + MediaStore SAF Bridge</span>
            </div>
            <h2 className="text-xl font-bold text-slate-100">
              Mã Nguồn Dự Án Android Studio (<code className="font-mono text-amber-300">com.example.rpgmtranslator</code>)
            </h2>
            <p className="text-xs text-slate-400">
              Bạn có thể cài trực tiếp file <code className="font-mono text-emerald-300">RPGM_Translator.apk</code> ở trên lên điện thoại Android, hoặc duyệt/tải mã nguồn dự án Android Studio bên dưới.
            </p>
          </div>

          <button
            type="button"
            onClick={onDownloadAndroidStudioZip}
            className="min-h-[44px] px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Tải Mã Nguồn Android (.zip)</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* File Tree Sidebar */}
          <div className="lg:col-span-4 space-y-2">
            {ANDROID_PROJECT_FILES.map((file) => {
              const active = file.path === activeAndroidFile.path;
              return (
                <button
                  key={file.path}
                  type="button"
                  onClick={() => setSelectedAndroidPath(file.path)}
                  className={`w-full text-left p-3 rounded-xl border transition-colors cursor-pointer ${
                    active
                      ? 'bg-amber-500/10 border-amber-400 text-slate-100'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-semibold text-amber-300">
                      {file.title}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      {file.layer}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-500 truncate mt-0.5">
                    {file.path}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Code Viewer */}
          <div className="lg:col-span-8 bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between space-y-3">
            <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <div className="font-mono text-xs text-amber-300 flex items-center gap-1.5">
                  <Code2 className="w-4 h-4" />
                  <span>{activeAndroidFile.path}</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {activeAndroidFile.description}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCopyCode}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                {copiedFile ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Đã chép</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Sao chép Kotlin</span>
                  </>
                )}
              </button>
            </div>

            <pre className="text-xs font-mono text-slate-200 overflow-x-auto max-h-[420px] leading-relaxed p-2">
              {activeAndroidFile.code}
            </pre>
          </div>
        </div>
      </section>
    </div>
  );
};
