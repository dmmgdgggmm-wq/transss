import JSZip from 'jszip';
import { CharacterProfile, GlossaryEntry, PronounRelation } from './types';

export const SAMPLE_RPGM_FILES: Record<string, unknown> = {
  'www/data/System.json': {
    gameTitle: 'Chronicles of Aethelgard: Echoes of the Astral Crown',
    currencyUnit: 'G',
    locale: 'ja_JP',
    encryptionKey: '9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c',
    switches: ['', 'Intro_Completed', 'Met_Princess_Aria', 'Boss_Defeated'],
    variables: ['', 'Player_Karma', 'Astral_Shards_Count', 'Current_Chapter'],
    elements: ['', 'Physical', 'Fire', 'Ice', 'Thunder', 'Astral Light'],
    skillTypes: ['', 'Magic', 'Swordplay', 'Royal Decree'],
    weaponTypes: ['', 'Dagger', 'Astral Blade', 'Staff'],
    armorTypes: ['', 'General Armor', 'Magic Robe', 'Royal Shield'],
    equipTypes: ['', 'Weapon', 'Shield', 'Head', 'Body', 'Accessory'],
    terms: {
      basic: ['Level', 'Lv', 'HP', 'HP', 'MP', 'MP', 'TP', 'TP', 'EXP', 'EXP'],
      commands: [
        'Fight',
        'Escape',
        'Attack',
        'Guard',
        'Item',
        'Skill',
        'Equip',
        'Status',
        'Save',
        'Game End',
      ],
      params: [
        'Max HP',
        'Max MP',
        'Attack',
        'Defense',
        'M.Attack',
        'M.Defense',
        'Agility',
        'Luck',
      ],
      messages: {
        alwaysDash: 'Always Dash',
        commandRemember: 'Command Remember',
        bgmVolume: 'BGM Volume',
        ObtainExp: '%1 EXP received!',
        ObtainGold: 'Found %1\\G!',
        ObtainItem: 'Found %1!',
      },
    },
  },
  'www/data/Actors.json': [
    null,
    {
      id: 1,
      name: 'Kael',
      nickname: 'Vanguard of Dawn',
      classId: 1,
      initialLevel: 1,
      maxLevel: 99,
      characterName: 'Actor1',
      characterIndex: 0,
      faceName: 'Actor1',
      faceIndex: 0,
      profile:
        'A former royal squire sworn to protect Princess \\C[2]Aria\\C[0] across the shattered realm of \\C[4]Aethelgard\\C[0].',
      note: '<Portrait: Kael_Default><WalkSpeed: 4>',
    },
    {
      id: 2,
      name: 'Aria',
      nickname: 'Princess of Starlight',
      classId: 2,
      initialLevel: 1,
      maxLevel: 99,
      characterName: 'Actor2',
      characterIndex: 1,
      faceName: 'Actor2',
      faceIndex: 1,
      profile:
        'Heir to the Astral Throne of \\C[4]Aethelgard\\C[0]. Speaks with gentle dignity and unwavering resolve.',
      note: '<Portrait: Aria_Royal><AutoState: 12>',
    },
    {
      id: 3,
      name: 'Aldric',
      nickname: 'Sovereign of Iron',
      classId: 3,
      initialLevel: 25,
      maxLevel: 99,
      characterName: 'Actor3',
      characterIndex: 2,
      faceName: 'Actor3',
      faceIndex: 2,
      profile:
        'The stern ruler of the Northern Citadel who commands the Astral Knights with iron discipline.',
      note: '<Portrait: King_Aldric>',
    },
  ],
  'www/data/Skills.json': [
    null,
    {
      id: 1,
      name: 'Astral Severance',
      description:
        'Unleashes a crescent wave of \\C[14]Starlight\\C[0] that deals heavy damage to all foes.',
      message1: ' casts \\C[14]Astral Severance\\C[0]!',
      message2: '',
      iconIndex: 76,
      mpCost: 15,
      note: '<SkillAnim: 42>',
    },
    {
      id: 2,
      name: 'Benediction of Dawn',
      description:
        'Restores \\V[12] HP to an ally and cures all negative status ailments.',
      message1: ' prays for the \\C[3]Benediction of Dawn\\C[0]!',
      message2: '',
      iconIndex: 72,
      mpCost: 10,
      note: '<HealRate: 1.5>',
    },
  ],
  'www/data/Items.json': [
    null,
    {
      id: 1,
      name: 'Starlight Elixir',
      description:
        'A luminescent phial brewed in \\C[4]Aethelgard\\C[0]. Restores 500 HP and 100 MP.',
      iconIndex: 176,
      price: 250,
      note: '<Category: Alchemy>',
    },
  ],
  'www/data/CommonEvents.json': [
    null,
    {
      id: 1,
      name: 'Campfire Rest Dialogue',
      trigger: 0,
      switchId: 1,
      list: [
        {
          code: 101,
          indent: 0,
          parameters: ['Actor2', 1, 0, 2, 'Aria'],
        },
        {
          code: 401,
          indent: 0,
          parameters: [
            '\\N[1], the night wind from the Northern Ruins is growing colder\\. Let us rest by the campfire before pushing onward.',
          ],
        },
        {
          code: 401,
          indent: 0,
          parameters: [
            'We still have \\V[2] \\C[14]Astral Shards\\C[0] to recover before King \\C[2]Aldric\\C[0] seals the sanctuary gates.',
          ],
        },
        {
          code: 102,
          indent: 0,
          parameters: [
            ['Set up camp for the night', 'Keep marching through the fog'],
            1,
            0,
            2,
            0,
          ],
        },
        {
          code: 402,
          indent: 0,
          parameters: [0, 'Set up camp for the night'],
        },
        {
          code: 101,
          indent: 1,
          parameters: ['Actor1', 0, 0, 2, 'Kael'],
        },
        {
          code: 401,
          indent: 1,
          parameters: [
            'Understood, Princess \\C[2]Aria\\C[0]. Please stay close to the fire while I keep watch over the perimeter.',
          ],
        },
        {
          code: 402,
          indent: 0,
          parameters: [1, 'Keep marching through the fog'],
        },
        {
          code: 101,
          indent: 1,
          parameters: ['Actor1', 0, 0, 2, 'Kael'],
        },
        {
          code: 401,
          indent: 1,
          parameters: [
            'If we stop now, the Imperial Vanguard will overtake us. Let me carry the torch and lead the way!',
          ],
        },
        {
          code: 404,
          indent: 0,
          parameters: [],
        },
        {
          code: 0,
          indent: 0,
          parameters: [],
        },
      ],
    },
  ],
  'www/data/Map001.json': {
    displayName: 'Sanctuary of Starlight',
    tilesetId: 2,
    width: 20,
    height: 15,
    events: [
      null,
      {
        id: 1,
        name: 'EV001_RoyalAudience',
        x: 10,
        y: 6,
        pages: [
          {
            conditions: { switch1Valid: false },
            list: [
              {
                code: 101,
                indent: 0,
                parameters: ['Actor3', 2, 0, 2, 'Aldric'],
              },
              {
                code: 401,
                indent: 0,
                parameters: [
                  'Listen well, \\N[1]! The seal upon the \\C[4]Aethelgard\\C[0] Sanctum has fractured after three hundred years of silence.',
                ],
              },
              {
                code: 401,
                indent: 0,
                parameters: [
                  'Take these \\C[17]500\\G\\C[0] from the royal treasury, escort Princess \\C[2]Aria\\C[0] to the Astral Spire, and do not fail your oath!',
                ],
              },
              {
                code: 101,
                indent: 0,
                parameters: ['Actor2', 1, 0, 2, 'Aria'],
              },
              {
                code: 401,
                indent: 0,
                parameters: [
                  'Father, I shall not falter. With \\N[1] by my side, we will restore the light of the \\C[14]Astral Crown\\C[0] and bring peace back to our people.',
                ],
              },
              {
                code: 355,
                indent: 0,
                parameters: ['$gameSwitches.setValue(2, true); // Internal script - DO NOT TRANSLATE'],
              },
              {
                code: 0,
                indent: 0,
                parameters: [],
              },
            ],
          },
        ],
      },
    ],
  },
};

export const DEFAULT_CHARACTER_PROFILES: CharacterProfile[] = [
  {
    id: 'char-kael',
    actorId: 1,
    originalName: 'Kael',
    translatedName: 'Kael',
    gender: 'Nam',
    speechStyle: 'Hiệp sĩ hộ vệ tận tụy, điềm tĩnh, lễ phép với công chúa Aria',
    defaultSelfPronoun: 'Thần / Tôi',
    defaultAddressPronoun: 'Người / Công chúa',
  },
  {
    id: 'char-aria',
    actorId: 2,
    originalName: 'Aria',
    translatedName: 'Aria',
    gender: 'Nữ',
    speechStyle: 'Công chúa hoàng gia dịu dàng, thanh lịch nhưng kiên định',
    defaultSelfPronoun: 'Ta / Em',
    defaultAddressPronoun: 'Huynh / Chàng',
  },
  {
    id: 'char-aldric',
    actorId: 3,
    originalName: 'Aldric',
    translatedName: 'Vua Aldric',
    gender: 'Nam',
    speechStyle: 'Quốc vương uy nghiêm, dứt khoát, mang khí chất bậc đế vương',
    defaultSelfPronoun: 'Trẫm / Phụ vương',
    defaultAddressPronoun: 'Khanh / Con',
  },
];

export const DEFAULT_PRONOUN_RELATIONS: PronounRelation[] = [
  {
    id: 'rel-1',
    sourceCharacter: 'Kael',
    targetCharacter: 'Aria',
    selfPronoun: 'Thần',
    targetPronoun: 'Công chúa Aria',
    note: 'Hộ vệ hoàng gia nói với công chúa',
  },
  {
    id: 'rel-2',
    sourceCharacter: 'Aria',
    targetCharacter: 'Kael',
    selfPronoun: 'Ta',
    targetPronoun: 'Kael',
    note: 'Tin cậy, thân thiết nhưng giữ lễ nghi',
  },
  {
    id: 'rel-3',
    sourceCharacter: 'Aldric',
    targetCharacter: 'Kael',
    selfPronoun: 'Trẫm',
    targetPronoun: 'Khanh',
    note: 'Quốc vương ban lệnh cho hiệp sĩ',
  },
  {
    id: 'rel-4',
    sourceCharacter: 'Aria',
    targetCharacter: 'Aldric',
    selfPronoun: 'Nhi thần / Con',
    targetPronoun: 'Phụ vương',
    note: 'Công chúa thưa chuyện với vua cha',
  },
];

export const DEFAULT_GLOSSARY_ENTRIES: GlossaryEntry[] = [
  {
    id: 'gl-1',
    sourceTerm: 'Aethelgard',
    targetTerm: 'Aethelgard',
    mode: 'keep',
    category: 'location',
  },
  {
    id: 'gl-2',
    sourceTerm: 'Aria',
    targetTerm: 'Aria',
    mode: 'keep',
    category: 'character',
  },
  {
    id: 'gl-3',
    sourceTerm: 'Astral Shards',
    targetTerm: 'Mảnh Tinh Quang',
    mode: 'custom',
    category: 'skill_item',
  },
  {
    id: 'gl-4',
    sourceTerm: 'Astral Crown',
    targetTerm: 'Vương Miện Tinh Tú',
    mode: 'custom',
    category: 'term',
  },
  {
    id: 'gl-5',
    sourceTerm: 'Astral Severance',
    targetTerm: 'Tinh Quang Đoạn Không',
    mode: 'custom',
    category: 'skill_item',
  },
];

export async function generateSampleDataZipBlob(): Promise<Blob> {
  const zip = new JSZip();
  for (const [path, content] of Object.entries(SAMPLE_RPGM_FILES)) {
    zip.file(path, JSON.stringify(content, null, 2));
  }
  return await zip.generateAsync({ type: 'blob' });
}

export function extractActorsIntoProfiles(
  actorsJson: unknown,
  existingProfiles: CharacterProfile[]
): CharacterProfile[] {
  if (!Array.isArray(actorsJson)) return existingProfiles;
  const existingByName = new Map(
    existingProfiles.map((p) => [p.originalName.toLowerCase(), p])
  );
  const merged = [...existingProfiles];

  for (const item of actorsJson) {
    if (!item || typeof item !== 'object') continue;
    const obj = item as Record<string, unknown>;
    const name = typeof obj.name === 'string' ? obj.name.trim() : '';
    if (!name || existingByName.has(name.toLowerCase())) continue;

    merged.push({
      id: `char-${obj.id || merged.length + 1}`,
      actorId: typeof obj.id === 'number' ? obj.id : undefined,
      originalName: name,
      translatedName: name,
      gender: 'Không rõ',
      speechStyle:
        typeof obj.nickname === 'string' && obj.nickname
          ? `Danh hiệu: ${obj.nickname}`
          : 'Nhân vật trong Actors.json',
      defaultSelfPronoun: 'Tôi',
      defaultAddressPronoun: 'Bạn',
    });
  }

  return merged;
}
