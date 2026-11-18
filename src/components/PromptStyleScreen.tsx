import React, { useState } from 'react';
import { BookOpen, Plus, Trash2, UserCheck, Users } from 'lucide-react';
import {
  PROMPT_PRESETS,
  buildSystemInstruction,
} from '../domain/promptBuilder';
import {
  CharacterProfile,
  GlossaryEntry,
  GlossaryMode,
  PronounRelation,
} from '../domain/types';

interface PromptStyleScreenProps {
  selectedPresetId: string;
  customSystemPrompt: string;
  characters: CharacterProfile[];
  relations: PronounRelation[];
  glossary: GlossaryEntry[];
  onSelectPreset: (presetId: string, promptText: string) => void;
  onChangeSystemPrompt: (text: string) => void;
  onAddCharacter: (char: Omit<CharacterProfile, 'id'>) => void;
  onDeleteCharacter: (id: string) => void;
  onAddRelation: (rel: Omit<PronounRelation, 'id'>) => void;
  onDeleteRelation: (id: string) => void;
  onAddGlossary: (entry: Omit<GlossaryEntry, 'id'>) => void;
  onDeleteGlossary: (id: string) => void;
}

export const PromptStyleScreen: React.FC<PromptStyleScreenProps> = ({
  selectedPresetId,
  customSystemPrompt,
  characters,
  relations,
  glossary,
  onSelectPreset,
  onChangeSystemPrompt,
  onAddCharacter,
  onDeleteCharacter,
  onAddRelation,
  onDeleteRelation,
  onAddGlossary,
  onDeleteGlossary,
}) => {
  // New Character Form state
  const [newCharName, setNewCharName] = useState('');
  const [newCharTransName, setNewCharTransName] = useState('');
  const [newCharGender, setNewCharGender] = useState<CharacterProfile['gender']>('Nữ');
  const [newCharStyle, setNewCharStyle] = useState('');
  const [newCharSelf, setNewCharSelf] = useState('Ta');
  const [newCharAddress, setNewCharAddress] = useState('Ngươi');

  // New Pronoun Relation Form state
  const [relSource, setRelSource] = useState('Kael');
  const [relTarget, setRelTarget] = useState('Aria');
  const [relSelfPronoun, setRelSelfPronoun] = useState('Thần');
  const [relTargetPronoun, setRelTargetPronoun] = useState('Công chúa');
  const [relNote, setRelNote] = useState('');

  // New Glossary Entry Form state
  const [glSource, setGlSource] = useState('');
  const [glTarget, setGlTarget] = useState('');
  const [glMode, setGlMode] = useState<GlossaryMode>('custom');
  const [glCategory, setGlCategory] =
    useState<GlossaryEntry['category']>('term');

  const [showCompiledPreview, setShowCompiledPreview] = useState(false);

  const compiledInstruction = buildSystemInstruction(
    customSystemPrompt,
    characters,
    relations,
    glossary
  );

  const handleAddCharSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCharName.trim()) return;
    onAddCharacter({
      originalName: newCharName.trim(),
      translatedName: newCharTransName.trim() || newCharName.trim(),
      gender: newCharGender,
      speechStyle: newCharStyle.trim() || 'Tự nhiên, nhất quán theo bối cảnh',
      defaultSelfPronoun: newCharSelf.trim() || 'Tôi',
      defaultAddressPronoun: newCharAddress.trim() || 'Bạn',
    });
    setNewCharName('');
    setNewCharTransName('');
    setNewCharStyle('');
  };

  const handleAddRelationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!relSource.trim() || !relTarget.trim() || !relSelfPronoun.trim() || !relTargetPronoun.trim()) {
      return;
    }
    onAddRelation({
      sourceCharacter: relSource.trim(),
      targetCharacter: relTarget.trim(),
      selfPronoun: relSelfPronoun.trim(),
      targetPronoun: relTargetPronoun.trim(),
      note: relNote.trim() || undefined,
    });
    setRelNote('');
  };

  const handleAddGlossarySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!glSource.trim()) return;
    onAddGlossary({
      sourceTerm: glSource.trim(),
      targetTerm: glMode === 'keep' ? glSource.trim() : glTarget.trim() || glSource.trim(),
      mode: glMode,
      category: glCategory,
    });
    setGlSource('');
    setGlTarget('');
  };

  return (
    <div className="space-y-8">
      {/* Section 1: Genre Presets & System Prompt Editor */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">
              Khung System Prompt &amp; Ma Trận Xưng Hô (Implicit Context Caching)
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Toàn bộ khung văn phong, hồ sơ nhân vật từ <code className="font-mono text-amber-300">Actors.json</code> và từ điển Glossary được khóa cố định vào <code className="font-mono text-amber-300">systemInstruction</code>
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowCompiledPreview((v) => !v)}
            className="min-h-[40px] px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-amber-300 border border-slate-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {showCompiledPreview ? 'Ẩn System Prompt Đầy Đủ' : 'Xem System Prompt Đầy Đủ'}
          </button>
        </div>

        {/* Preset Selector Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {PROMPT_PRESETS.map((preset) => {
            const active = selectedPresetId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => onSelectPreset(preset.id, preset.systemPrompt)}
                className={`text-left p-4 rounded-xl border transition-colors cursor-pointer flex flex-col justify-between ${
                  active
                    ? 'bg-amber-500/10 border-amber-400 text-slate-100'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div>
                  <div className="text-xs text-amber-400 font-mono">
                    {preset.genreTag}
                  </div>
                  <div className="text-sm font-semibold text-slate-100 mt-1">
                    {preset.name}
                  </div>
                  <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                    {preset.description}
                  </p>
                </div>
                <div className="text-xs font-medium text-amber-300 mt-3">
                  {active ? 'Đang áp dụng mẫu này' : 'Áp dụng mẫu văn phong'}
                </div>
              </button>
            );
          })}
        </div>

        {/* System Prompt Textarea */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
          <label
            htmlFor="system-prompt-editor"
            className="block text-sm font-semibold text-slate-200"
          >
            Quy tắc Văn phong &amp; Chỉ dẫn Dịch thuật Cốt lõi
          </label>
          <textarea
            id="system-prompt-editor"
            rows={5}
            value={customSystemPrompt}
            onChange={(e) => onChangeSystemPrompt(e.target.value)}
            className="w-full rounded-xl bg-slate-950 border border-slate-800 focus:border-amber-400 focus:outline-none p-3.5 text-sm text-slate-100 font-mono leading-relaxed"
            placeholder="Nhập chỉ dẫn dịch thuật cho Gemini..."
          />
          {showCompiledPreview && (
            <div className="pt-3 border-t border-slate-800">
              <div className="text-xs text-slate-400 mb-2">
                Nội dung <code className="font-mono text-amber-300">systemInstruction</code> thực tế gửi lên Gemini API:
              </div>
              <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 font-mono whitespace-pre-wrap max-h-64 overflow-y-auto">
                {compiledInstruction}
              </pre>
            </div>
          )}
        </div>
      </section>

      {/* Section 2: Character Profiles & Pairwise Pronoun Matrix */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Character Profiles (Actors.json) */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-amber-400" />
                <span>Hồ Sơ Nhân Vật (<code className="font-mono text-amber-300">Actors.json</code>)</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Giới tính, tính cách và ngôi xưng mặc định của từng nhân vật
              </p>
            </div>
            <span className="text-xs font-mono tabular-nums text-slate-400">
              {characters.length} nhân vật
            </span>
          </div>

          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
            {characters.map((c) => (
              <div
                key={c.id}
                className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/90 flex items-start justify-between gap-3"
              >
                <div className="space-y-1 text-xs">
                  <div className="font-semibold text-slate-100 text-sm">
                    {c.originalName}{' '}
                    <span className="text-slate-400 font-normal">
                      · {c.gender} · Tự xưng:{' '}
                      <span className="text-amber-300 font-mono">{c.defaultSelfPronoun}</span>{' '}
                      / Gọi:{' '}
                      <span className="text-amber-300 font-mono">{c.defaultAddressPronoun}</span>
                    </span>
                  </div>
                  <p className="text-slate-400">{c.speechStyle}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onDeleteCharacter(c.id)}
                  aria-label={`Xóa nhân vật ${c.originalName}`}
                  className="min-h-[36px] min-w-[36px] rounded-lg hover:bg-rose-500/15 text-slate-400 hover:text-rose-300 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <form
            onSubmit={handleAddCharSubmit}
            className="pt-3 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-2.5"
          >
            <input
              type="text"
              value={newCharName}
              onChange={(e) => setNewCharName(e.target.value)}
              placeholder="Tên gốc (vd: Lyra)"
              aria-label="Tên nhân vật gốc"
              className="px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100"
            />
            <select
              value={newCharGender}
              onChange={(e) =>
                setNewCharGender(e.target.value as CharacterProfile['gender'])
              }
              aria-label="Giới tính nhân vật"
              className="px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100"
            >
              <option value="Nữ">Giới tính: Nữ</option>
              <option value="Nam">Giới tính: Nam</option>
              <option value="Không rõ">Giới tính: Không rõ</option>
              <option value="Khác">Giới tính: Khác</option>
            </select>
            <input
              type="text"
              value={newCharSelf}
              onChange={(e) => setNewCharSelf(e.target.value)}
              placeholder="Tự xưng (vd: Ta / Thiếp)"
              aria-label="Ngôi tự xưng mặc định"
              className="px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100"
            />
            <input
              type="text"
              value={newCharAddress}
              onChange={(e) => setNewCharAddress(e.target.value)}
              placeholder="Gọi đối phương (vd: Chàng)"
              aria-label="Ngôi gọi đối phương mặc định"
              className="px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100"
            />
            <input
              type="text"
              value={newCharStyle}
              onChange={(e) => setNewCharStyle(e.target.value)}
              placeholder="Tính cách / Giọng điệu (vd: Pháp sư bí ẩn, điềm tĩnh)"
              aria-label="Tính cách và giọng điệu"
              className="sm:col-span-2 px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100"
            />
            <button
              type="submit"
              className="sm:col-span-2 min-h-[40px] px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm Hồ Sơ Nhân Vật</span>
            </button>
          </form>
        </div>

        {/* Right: Pairwise Pronoun Matrix */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                <span>Ma Trận Cặp Xưng Hô Cố Định (Pronoun Matrix)</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Khóa chặt đại từ nhân xưng 2 chiều giữa từng cặp nhân vật xuyên suốt mọi batch
              </p>
            </div>
            <span className="text-xs font-mono tabular-nums text-slate-400">
              {relations.length} quy tắc
            </span>
          </div>

          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
            {relations.map((rel) => (
              <div
                key={rel.id}
                className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/90 flex items-start justify-between gap-3"
              >
                <div className="space-y-1 text-xs">
                  <div className="font-semibold text-slate-100 text-sm">
                    {rel.sourceCharacter} &rarr; {rel.targetCharacter}
                  </div>
                  <div className="text-slate-300 font-mono">
                    Xưng: <span className="text-emerald-300">"{rel.selfPronoun}"</span> · Gọi:{' '}
                    <span className="text-amber-300">"{rel.targetPronoun}"</span>
                  </div>
                  {rel.note && <div className="text-slate-400">{rel.note}</div>}
                </div>
                <button
                  type="button"
                  onClick={() => onDeleteRelation(rel.id)}
                  aria-label={`Xóa cặp xưng hô ${rel.sourceCharacter} và ${rel.targetCharacter}`}
                  className="min-h-[36px] min-w-[36px] rounded-lg hover:bg-rose-500/15 text-slate-400 hover:text-rose-300 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <form
            onSubmit={handleAddRelationSubmit}
            className="pt-3 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-2.5"
          >
            <input
              type="text"
              value={relSource}
              onChange={(e) => setRelSource(e.target.value)}
              placeholder="Người nói (vd: Kael)"
              aria-label="Nhân vật nói"
              className="px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100"
            />
            <input
              type="text"
              value={relTarget}
              onChange={(e) => setRelTarget(e.target.value)}
              placeholder="Người nghe (vd: Aria)"
              aria-label="Nhân vật nghe"
              className="px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100"
            />
            <input
              type="text"
              value={relSelfPronoun}
              onChange={(e) => setRelSelfPronoun(e.target.value)}
              placeholder="Ngôi tự xưng (vd: Anh / Thần)"
              aria-label="Ngôi tự xưng trong cặp"
              className="px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100"
            />
            <input
              type="text"
              value={relTargetPronoun}
              onChange={(e) => setRelTargetPronoun(e.target.value)}
              placeholder="Ngôi gọi (vd: Em / Công chúa)"
              aria-label="Ngôi gọi trong cặp"
              className="px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100"
            />
            <input
              type="text"
              value={relNote}
              onChange={(e) => setRelNote(e.target.value)}
              placeholder="Ghi chú ngữ cảnh (tùy chọn)"
              aria-label="Ghi chú ngữ cảnh xưng hô"
              className="sm:col-span-2 px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100"
            />
            <button
              type="submit"
              className="sm:col-span-2 min-h-[40px] px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm Quy Tắc Xưng Hô</span>
            </button>
          </form>
        </div>
      </section>

      {/* Section 3: Glossary Dictionary (4 Modes: keep, custom, translate, transliterate) */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-sky-400" />
              <span>Từ Điển Thuật Ngữ &amp; Kiểm Tra Hậu Dịch (<code className="font-mono text-amber-300">GLOSSARY_VIOLATION</code>)</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Hỗ trợ 4 chế độ: <code className="font-mono text-slate-200">keep</code> (giữ nguyên tên riêng), <code className="font-mono text-slate-200">custom</code> (ép đúng bản dịch), <code className="font-mono text-slate-200">translate</code> (dịch nghĩa), <code className="font-mono text-slate-200">transliterate</code> (phiên âm)
            </p>
          </div>
          <span className="text-xs font-mono tabular-nums text-slate-400">
            {glossary.length} thuật ngữ
          </span>
        </div>

        <form
          onSubmit={handleAddGlossarySubmit}
          className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 pt-2"
        >
          <input
            type="text"
            value={glSource}
            onChange={(e) => setGlSource(e.target.value)}
            placeholder="Từ gốc (vd: Astral Shards)"
            aria-label="Từ khóa gốc trong Glossary"
            className="sm:col-span-3 px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100"
          />
          <input
            type="text"
            value={glTarget}
            onChange={(e) => setGlTarget(e.target.value)}
            disabled={glMode === 'keep'}
            placeholder={
              glMode === 'keep' ? 'Giữ nguyên từ gốc' : 'Bản dịch bắt buộc (vd: Mảnh Tinh Quang)'
            }
            aria-label="Bản dịch bắt buộc trong Glossary"
            className="sm:col-span-3 px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100 disabled:opacity-50"
          />
          <select
            value={glMode}
            onChange={(e) => setGlMode(e.target.value as GlossaryMode)}
            aria-label="Chế độ Glossary"
            className="sm:col-span-2 px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100"
          >
            <option value="custom">Chế độ: custom (Ép dịch)</option>
            <option value="keep">Chế độ: keep (Giữ nguyên)</option>
            <option value="translate">Chế độ: translate (Dịch nghĩa)</option>
            <option value="transliterate">Chế độ: transliterate (Phiên âm)</option>
          </select>
          <select
            value={glCategory}
            onChange={(e) =>
              setGlCategory(e.target.value as GlossaryEntry['category'])
            }
            aria-label="Phân loại thuật ngữ"
            className="sm:col-span-2 px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100"
          >
            <option value="term">Loại: Thuật ngữ chung</option>
            <option value="character">Loại: Nhân vật</option>
            <option value="location">Loại: Địa danh</option>
            <option value="skill_item">Loại: Kỹ năng / Vật phẩm</option>
          </select>
          <button
            type="submit"
            className="sm:col-span-2 min-h-[40px] px-3 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Từ</span>
          </button>
        </form>

        <div className="overflow-x-auto border-t border-slate-800 pt-3">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2.5 px-3 font-medium">Thuật ngữ gốc</th>
                <th className="py-2.5 px-3 font-medium">Bản dịch quy chuẩn</th>
                <th className="py-2.5 px-3 font-medium">Chế độ xử lý</th>
                <th className="py-2.5 px-3 font-medium">Phân loại</th>
                <th className="py-2.5 px-3 font-medium text-right">Xóa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {glossary.map((g) => (
                <tr key={g.id} className="hover:bg-slate-800/30">
                  <td className="py-2.5 px-3 font-mono text-slate-100">
                    {g.sourceTerm}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-amber-300">
                    {g.mode === 'keep' ? g.sourceTerm : g.targetTerm}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-300">
                    {g.mode}
                  </td>
                  <td className="py-2.5 px-3 text-slate-400">{g.category}</td>
                  <td className="py-2.5 px-3 text-right">
                    <button
                      type="button"
                      onClick={() => onDeleteGlossary(g.id)}
                      aria-label={`Xóa thuật ngữ ${g.sourceTerm}`}
                      className="p-1.5 rounded hover:bg-rose-500/15 text-slate-400 hover:text-rose-300 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
