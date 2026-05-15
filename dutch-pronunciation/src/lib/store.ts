import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { checkNewAchievements } from './achievements';

export type Difficulty =
  | 'sp'
  | 'bl'
  | 'br'
  | 'st'
  | 'dr'
  | 'sl'
  | 'tw'
  | 'str'
  | 'tr';

export interface WordData {
  word: string;
  emoji: string;
  cluster: string;
}

export const PRELOADED_WORDS: WordData[] = [

  // ── sp ─────────────────────────────────────────────
  { word: "spin",     emoji: "🕷️", cluster: "sp" },
  { word: "spel",     emoji: "🎮", cluster: "sp" },
  { word: "spook",    emoji: "👻", cluster: "sp" },
  { word: "sport",    emoji: "⚽", cluster: "sp" },
  { word: "spiegel",  emoji: "🪞", cluster: "sp" },
  { word: "sprong",   emoji: "🦘", cluster: "sp" },
  { word: "spijker",  emoji: "🔩", cluster: "sp" },
  { word: "spetter",  emoji: "💦", cluster: "sp" },
  { word: "spek",     emoji: "🥓", cluster: "sp" },
  { word: "speld",    emoji: "📌", cluster: "sp" },

  // ── bl ─────────────────────────────────────────────
  { word: "blad",     emoji: "🍃", cluster: "bl" },
  { word: "blauw",    emoji: "💙", cluster: "bl" },
  { word: "bloem",    emoji: "🌸", cluster: "bl" },
  { word: "blij",     emoji: "😄", cluster: "bl" },
  { word: "blok",     emoji: "🧱", cluster: "bl" },
  { word: "blik",     emoji: "🥫", cluster: "bl" },
  { word: "bliksem",  emoji: "⚡", cluster: "bl" },
  { word: "blind",    emoji: "🙈", cluster: "bl" },
  { word: "blond",    emoji: "👱", cluster: "bl" },
  { word: "blozen",   emoji: "😊", cluster: "bl" },

  // ── br ─────────────────────────────────────────────
  { word: "brood",    emoji: "🍞", cluster: "br" },
  { word: "brug",     emoji: "🌉", cluster: "br" },
  { word: "brief",    emoji: "✉️", cluster: "br" },
  { word: "bril",     emoji: "👓", cluster: "br" },
  { word: "bruin",    emoji: "🟤", cluster: "br" },
  { word: "brand",    emoji: "🔥", cluster: "br" },
  { word: "broer",    emoji: "👦", cluster: "br" },
  { word: "bron",     emoji: "💧", cluster: "br" },
  { word: "bramen",   emoji: "🫐", cluster: "br" },
  { word: "brullen",  emoji: "🦁", cluster: "br" },

  // ── st ─────────────────────────────────────────────
  { word: "ster",     emoji: "⭐", cluster: "st" },
  { word: "stoel",    emoji: "🪑", cluster: "st" },
  { word: "stop",     emoji: "🛑", cluster: "st" },
  { word: "storm",    emoji: "⛈️", cluster: "st" },
  { word: "steen",    emoji: "🪨", cluster: "st" },
  { word: "stad",     emoji: "🏙️", cluster: "st" },
  { word: "stap",     emoji: "👣", cluster: "st" },
  { word: "strik",    emoji: "🎀", cluster: "st" },
  { word: "stout",    emoji: "😈", cluster: "st" },
  { word: "stoep",    emoji: "🚶", cluster: "st" },

  // ── dr ─────────────────────────────────────────────
  { word: "draak",    emoji: "🐉", cluster: "dr" },
  { word: "droom",    emoji: "💫", cluster: "dr" },
  { word: "druif",    emoji: "🍇", cluster: "dr" },
  { word: "drop",     emoji: "🍬", cluster: "dr" },
  { word: "draven",   emoji: "🐎", cluster: "dr" },
  { word: "drum",     emoji: "🥁", cluster: "dr" },
  { word: "draad",    emoji: "🧵", cluster: "dr" },
  { word: "dragen",   emoji: "🎒", cluster: "dr" },
  { word: "draaien",  emoji: "🌀", cluster: "dr" },
  { word: "drank",    emoji: "🧃", cluster: "dr" },

  // ── sl ─────────────────────────────────────────────
  { word: "slang",    emoji: "🐍", cluster: "sl" },
  { word: "sleutel",  emoji: "🔑", cluster: "sl" },
  { word: "slapen",   emoji: "😴", cluster: "sl" },
  { word: "slim",     emoji: "🧠", cluster: "sl" },
  { word: "slak",     emoji: "🐌", cluster: "sl" },
  { word: "slee",     emoji: "🛷", cluster: "sl" },
  { word: "slijm",    emoji: "🟢", cluster: "sl" },
  { word: "slepen",   emoji: "🚜", cluster: "sl" },
  { word: "sloot",    emoji: "💧", cluster: "sl" },
  { word: "slurpen",  emoji: "🥤", cluster: "sl" },

  // ── tw ─────────────────────────────────────────────
  { word: "twin",     emoji: "👯", cluster: "tw" },
  { word: "twijg",    emoji: "🌿", cluster: "tw" },
  { word: "tweekop",   emoji: "👥", cluster: "tw" },
  { word: "twink",  emoji: "🌟", cluster: "tw" },
  { word: "twist",    emoji: "🌪️", cluster: "tw" },
  { word: "tweeling", emoji: "👯", cluster: "tw" },
  { word: "twijfel",  emoji: "🤔", cluster: "tw" },
  { word: "twinkel",  emoji: "✨", cluster: "tw" },
  { word: "twijgen",  emoji: "🌿", cluster: "tw" },
  { word: "twister",  emoji: "🌪️", cluster: "tw" },

    // str
  { word: "straat", emoji: "🛣️", cluster: "str" },
  { word: "strand", emoji: "🏖️", cluster: "str" },
  { word: "struik", emoji: "🌳", cluster: "str" },
  { word: "strik", emoji: "🎀", cluster: "str" },
  { word: "stroom", emoji: "⚡", cluster: "str" },
  { word: "streng", emoji: "📏", cluster: "str" },
  { word: "stralen", emoji: "☀️", cluster: "str" },
  { word: "stroop", emoji: "🍯", cluster: "str" },
  { word: "strijd", emoji: "⚔️", cluster: "str" },
  { word: "stronk", emoji: "🪵", cluster: "str" },

   // ── tr ─────────────────────────────────────────────
  { word: "trein",     emoji: "🚂", cluster: "tr" },
  { word: "trap",      emoji: "🪜", cluster: "tr" },
  { word: "tractor",   emoji: "🚜", cluster: "tr" },
  { word: "trui",      emoji: "🧥", cluster: "tr" },
  { word: "trommel",   emoji: "🥁", cluster: "tr" },
  { word: "troon",     emoji: "👑", cluster: "tr" },
  { word: "tranen",    emoji: "😢", cluster: "tr" },
  { word: "truc",      emoji: "🎩", cluster: "tr" },
  { word: "trillen",   emoji: "📳", cluster: "tr" },
  { word: "trampoline",emoji: "🤸", cluster: "tr" },
];

const CUSTOM_WORD_EMOJIS: Record<
  string,
  string
> = {

  // ── sp ─────────────────────────────────────────────
  spinnenweb: "🕸️",
  spuit: "🔫",
  speelgoed: "🧸",
  specht: "🐦",
  sponsor: "🏅",
  spalk: "🩹",

  // ── bl ─────────────────────────────────────────────
  blaffen: "🐶",
  blender: "🥤",
  blikje: "🥫",
  blaren: "🍂",
  blouse: "👚",
  bloemkool: "🥦",

  // ── br ─────────────────────────────────────────────
  broccoli: "🥦",
  brommer: "🛵",
  bruid: "👰",
  bruidsjurk: "👗",
  brontosaurus: "🦕",
  brievenbus: "📮",

  // ── st ─────────────────────────────────────────────
  stempel: "📬",
  streep: "➖",
  strand: "🏖️",
  struik: "🌳",
  stropdas: "👔",
  stuiterbal: "⚽",

  // ── dr ─────────────────────────────────────────────
  dribbel: "⚽",
  drone: "🚁",
  druppel: "💧",
  drijven: "🛟",
  draak: "🐲",
  dressoir: "🪵",

  // ── sl ─────────────────────────────────────────────
  slippers: "🩴",
  slush: "🥤",
  slinger: "🎉",
  slot: "🔒",
  slurf: "🐘",
  sluier: "👰",

  // ── tw ─────────────────────────────────────────────
  twitter: "🐦",
  twisterspel: "🌀",
  twilight: "🌙",
  twijgje: "🌿",
  twinkelster: "✨",

  // ── tr ─────────────────────────────────────────────
  trein: "🚂",
  trampoline: "🤸",
  trechter: "🔻",
  traktor: "🚜",
  trillen: "📳",
  traan: "💧",
  truffel: "🍫",
  trouwen: "💍",
  trompet: "🎺",
  trofee: "🏆",

  // ── str ─────────────────────────────────────────────
  straat: "🛣️",
  strandbal: "🏖️",
  struiken: "🌳",
  strijken: "👕",
  stroom: "🔌",
  stralen: "☀️",
  struisveer: "🪶",
  strijdschild: "🛡️",
};

export function detectCluster(
  word: string
): Difficulty | null {

  const w =
    word.toLowerCase().trim();

  // langste clusters eerst
  if (w.startsWith("str")) return "str";

  if (w.startsWith("sp")) return "sp";
  if (w.startsWith("bl")) return "bl";
  if (w.startsWith("br")) return "br";
  if (w.startsWith("st")) return "st";
  if (w.startsWith("dr")) return "dr";
  if (w.startsWith("sl")) return "sl";
  if (w.startsWith("tw")) return "tw";
  if (w.startsWith("tr")) return "tr";
  if (w.startsWith("str")) return "str";

  return null;
}

const CLUSTER_EMOJI: Record<
  string,
  string
> = {
  sp: "⭐",
  bl: "💙",
  br: "🔥",
  st: "⭐",
  dr: "🌟",
  sl: "🐍",
  tw: "✨",
  str: "🏖️",
  tr: "🚂",
};

export function customWordToWordData(
  word: string
): WordData | null {

  const cleanWord =
    word
      .toLowerCase()
      .trim();

  const cluster =
    detectCluster(cleanWord);

  if (!cluster) {
    return null;
  }

  const emoji =
    CUSTOM_WORD_EMOJIS[
      cleanWord
    ] ??
    CLUSTER_EMOJI[
      cluster
    ] ??
    "⭐";

  return {
    word: cleanWord,
    emoji,
    cluster,
  };
}

export function getSessionWords(
  cluster: Difficulty,
  customWords: string[]
): WordData[] {

  const preloaded =
    PRELOADED_WORDS.filter(
      (w) => w.cluster === cluster
    );

  const preloadedSet =
    new Set(
      preloaded.map((w) => w.word)
    );

  const custom = customWords
    .map(customWordToWordData)
    .filter(
      (w): w is WordData =>
        w !== null &&
        w.cluster === cluster &&
        !preloadedSet.has(w.word)
    );

  return [
    ...preloaded,
    ...custom,
  ];
}

export interface SessionState {
  sessionCoins: number;
  sessionXP: number;
  currentWordIndex: number;
  completedWords: string[];
  leveledUp: boolean;
  startLevel: number;
  achievementsUnlockedInSession: string[];
}

interface GameState {
  avatarColor: string;
  coins: number;
  xp: number;
  difficulty: Difficulty;
  customWords: string[];
  childName: string;
  totalWordsCompleted: number;
  achievements: string[];
  wordErrors: Record<string, number>;
  session: SessionState | null;

  addCoins: (
    amount: number
  ) => void;

  addXP: (
    amount: number
  ) => void;

  setDifficulty: (
    diff: Difficulty
  ) => void;

  setCustomWords: (
    words: string[]
  ) => void;

  setChildName: (
    name: string
  ) => void;

  setAvatarColor: (
    color: string
  ) => void;

  recordWordError: (
    word: string
  ) => void;

  clearWordErrors: () => void;

  startSession: () => void;

  advanceWord: (
    coinsEarned: number,
    xpEarned: number
  ) => void;

  endSession: () => void;

  resetProgress: () => void;
}

export function getLevelFromXP(
  xp: number
): number {

  return (
    Math.floor(xp / 50) + 1
  );
}

export function getXPProgress(
  xp: number
): number {

  return xp % 50;
}

const defaultState = {
  avatarColor: 'purple',
  coins: 0,
  xp: 0,
  difficulty: 'sp' as Difficulty,
  customWords: [] as string[],
  childName: '',
  totalWordsCompleted: 0,
  achievements: [] as string[],
  wordErrors: {} as Record<string, number>,
  session: null,
};

export const useGameStore =
  create<GameState>()(
    persist(
      (set, get) => ({
        ...defaultState,

        addCoins: (amount) =>
          set((s) => ({
            coins: Math.max(
              0,
              s.coins + amount
            ),
          })),

        addXP: (amount) =>
          set((s) => ({
            xp: Math.max(
              0,
              s.xp + amount
            ),
          })),

        setDifficulty: (
          difficulty
        ) =>
          set({ difficulty }),

        setCustomWords: (
          customWords
        ) =>
          set({ customWords }),

        setChildName: (
          childName
        ) =>
          set({ childName }),

        setAvatarColor: (
          avatarColor
        ) =>
          set({ avatarColor }),

        recordWordError: (
          word
        ) =>
          set((s) => ({
            wordErrors: {
              ...s.wordErrors,
              [word]:
                (s.wordErrors[word] ?? 0) + 1,
            },
          })),

        clearWordErrors: () =>
          set({
            wordErrors: {},
          }),

        startSession: () => {

          const { xp } = get();

          set({
            session: {
              sessionCoins: 0,
              sessionXP: 0,
              currentWordIndex: 0,
              completedWords: [],
              leveledUp: false,
              startLevel:
                getLevelFromXP(xp),
              achievementsUnlockedInSession: [],
            },
          });
        },

        advanceWord: (
          coinsEarned,
          xpEarned
        ) => {

          const state = get();

          if (!state.session) {
            return;
          }

          const words =
            getSessionWords(
              state.difficulty,
              state.customWords
            );

          const word =
            words[
              state.session.currentWordIndex
            ];

          const oldLevel =
            getLevelFromXP(state.xp);

          const newXP =
            state.xp + xpEarned;

          const newLevel =
            getLevelFromXP(newXP);

          const newCoins =
            state.coins + coinsEarned;

          const newTotal =
            state.totalWordsCompleted + 1;

          const newlyUnlocked =
            checkNewAchievements(
              newTotal,
              newCoins,
              newLevel,
              state.difficulty,
              state.achievements,
            );

          set((s) => ({
            coins: newCoins,
            xp: newXP,
            totalWordsCompleted: newTotal,

            achievements: [
              ...s.achievements,
              ...newlyUnlocked,
            ],

            session: s.session
              ? {
                  ...s.session,

                  sessionCoins:
                    s.session.sessionCoins +
                    coinsEarned,

                  sessionXP:
                    s.session.sessionXP +
                    xpEarned,

                  currentWordIndex:
                    s.session.currentWordIndex + 1,

                  completedWords:
                    word
                      ? [
                          ...s.session.completedWords,
                          word.word,
                        ]
                      : s.session.completedWords,

                  leveledUp:
                    s.session.leveledUp ||
                    newLevel > oldLevel,

                  achievementsUnlockedInSession: [
                    ...s.session
                      .achievementsUnlockedInSession,
                    ...newlyUnlocked,
                  ],
                }
              : null,
          }));
        },

        endSession: () =>
          set({
            session: null,
          }),

        resetProgress: () =>
          set((s) => ({
            ...defaultState,

            avatarColor:
              s.avatarColor,

            customWords:
              s.customWords,

            childName:
              s.childName,

            wordErrors:
              s.wordErrors,
          })),
      }),

      {
        name: 'dutch-game-storage',

        version: 8,

        storage:
          createJSONStorage(() => ({
            getItem: (key) => {
              try {
                return localStorage.getItem(key);
              } catch {
                return null;
              }
            },

            setItem: (
              key,
              value
            ) => {
              try {
                localStorage.setItem(
                  key,
                  value
                );
              } catch {}
            },

            removeItem: (key) => {
              try {
                localStorage.removeItem(key);
              } catch {}
            },
          })),

        partialize: (
          state
        ) => ({
          avatarColor:
            state.avatarColor,

          coins:
            state.coins,

          xp:
            state.xp,

          difficulty:
            state.difficulty,

          customWords:
            state.customWords,

          childName:
            state.childName,

          totalWordsCompleted:
            state.totalWordsCompleted,

          achievements:
            state.achievements,

          wordErrors:
            state.wordErrors,
        }),
      }
    )
  );
