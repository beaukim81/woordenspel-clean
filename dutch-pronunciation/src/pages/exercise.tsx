import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Volume2, Mic, MicOff } from "lucide-react";
import { useGameStore, getSessionWords, getLevelFromXP, type WordData } from "@/lib/store";
import { useSpeech } from "@/hooks/use-speech";
import { useRecognition } from "@/hooks/use-recognition";
import { playCoinSound } from "@/hooks/use-sound";
import { ACHIEVEMENTS } from "@/lib/achievements";

const COINS_PER_WORD = 1;
const XP_PER_WORD = 5;

const ENCOURAGE = [
  "Super goed!",
  "Geweldig!",
  "Fantastisch!",
  "Toppertje!",
  "Bravo!",
  "Wauw!",
  "Prachtig!",
  "Knap gedaan!",
  "Helemaal top!",
  "Jij bent een ster!",
];

const CLUSTER_THEME: Record<
  string,
  {
    cardGrad: string;
    cardBorder: string;
    cardGlow: string;
    wordColor: string;
    clusterBadge: string;
  }
> = {
  sp: {
    cardGrad: "from-green-950 via-emerald-950 to-green-950",
    cardBorder: "border-green-500/40",
    cardGlow: "rgba(34,197,94,0.18)",
    wordColor: "text-green-300",
    clusterBadge: "bg-green-500/15 text-green-300 border-green-500/30",
  },
  bl: {
    cardGrad: "from-sky-950 via-blue-950 to-sky-950",
    cardBorder: "border-sky-500/40",
    cardGlow: "rgba(14,165,233,0.18)",
    wordColor: "text-sky-300",
    clusterBadge: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  },
  br: {
    cardGrad: "from-orange-950 via-amber-950 to-orange-950",
    cardBorder: "border-orange-500/40",
    cardGlow: "rgba(249,115,22,0.18)",
    wordColor: "text-orange-300",
    clusterBadge: "bg-orange-500/15 text-orange-300 border-orange-500/30",
  },
  st: {
    cardGrad: "from-teal-950 via-cyan-950 to-teal-950",
    cardBorder: "border-teal-500/40",
    cardGlow: "rgba(20,184,166,0.18)",
    wordColor: "text-teal-300",
    clusterBadge: "bg-teal-500/15 text-teal-300 border-teal-500/30",
  },
  dr: {
    cardGrad: "from-amber-950 via-orange-950 to-amber-950",
    cardBorder: "border-amber-500/40",
    cardGlow: "rgba(245,158,11,0.18)",
    wordColor: "text-amber-300",
    clusterBadge: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  },
  sl: {
    cardGrad: "from-pink-950 via-rose-950 to-pink-950",
    cardBorder: "border-pink-500/40",
    cardGlow: "rgba(236,72,153,0.18)",
    wordColor: "text-pink-300",
    clusterBadge: "bg-pink-500/15 text-pink-300 border-pink-500/30",
  },
  tw: {
    cardGrad: "from-purple-950 via-violet-950 to-purple-950",
    cardBorder: "border-purple-500/40",
    cardGlow: "rgba(168,85,247,0.18)",
    wordColor: "text-purple-300",
    clusterBadge: "bg-purple-500/15 text-purple-300 border-purple-500/30",
  },
};

const DEFAULT_THEME = CLUSTER_THEME.sp;

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  rotate: number;
  star: boolean;
}

interface FloatLabel {
  id: number;
  text: string;
  color: string;
  x: number;
}

function burst(): Particle[] {
  const colors = [
    "#facc15",
    "#fbbf24",
    "#a855f7",
    "#22d3ee",
    "#34d399",
    "#f472b6",
    "#fb923c",
  ];

  return Array.from({ length: 20 }, (_, i) => ({
    id: Date.now() + i,
    x: (Math.random() - 0.5) * 280,
    y: -(Math.random() * 240 + 50),
    size: Math.random() * 12 + 8,
    color: colors[i % colors.length],
    rotate: Math.random() * 360,
    star: Math.random() > 0.55,
  }));
}

function AchievementToast({
  id,
  onDone,
}: {
  id: string;
  onDone: () => void;
}) {
  const a = ACHIEVEMENTS[id];

  useEffect(() => {
    const t = setTimeout(onDone, 2800);
    return () => clearTimeout(t);
  }, [onDone]);

  if (!a) return null;

  return (
    <motion.div
      initial={{ y: -100, opacity: 0, scale: 0.85 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: -100, opacity: 0, scale: 0.85 }}
      transition={{ type: "spring", stiffness: 340, damping: 26 }}
      className="absolute top-3 left-3 right-3 z-50"
    >
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl
        bg-gradient-to-r from-yellow-500 to-amber-500 border-2 border-yellow-300/50"
      >
        <span className="text-3xl shrink-0">{a.icon}</span>

        <div className="flex-1 min-w-0">
          <div className="text-gray-900 font-black text-xs uppercase tracking-wider">
            Prestatie behaald!
          </div>

          <div className="text-gray-900 font-black text-base leading-tight">
            {a.label}
          </div>
        </div>

        <motion.span
          animate={{ rotate: [0, 15, -15, 0] }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="text-2xl shrink-0"
        >
          🏆
        </motion.span>
      </div>
    </motion.div>
  );
}

export default function Exercise() {
  const [, setLocation] = useLocation();

  const store = useGameStore();

  const {
    difficulty,
    customWords,
    session,
    advanceWord,
    recordWordError,
  } = store;

  const mountedWithSession = useRef(!!session);

  useEffect(() => {
    if (!mountedWithSession.current) {
      setLocation("/");
    }
  }, []);

  const [particles, setParticles] = useState<Particle[]>([]);
  const [floats, setFloats] = useState<FloatLabel[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [encourage, setEncourage] = useState("");
  const [wordShake, setWordShake] = useState(false);
  const [noMatch, setNoMatch] = useState(false);
  const [toastQueue, setToastQueue] = useState<string[]>([]);

  const { speak, speaking } = useSpeech();

  const {
    listen,
    cancel: cancelListening,
    listening,
    supported: recognitionSupported,
  } = useRecognition();

  const lockRef = useRef(false);

  const listenAfterSpeakRef = useRef(false);

  const listenTargetRef = useRef("");

  const prevSpeakingRef = useRef(false);

  // voorkomt snelle foutmelding vlak voor succes
  const noMatchTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      lockRef.current = false;
    };
  }, []);

  const seenAchievementsRef = useRef(
    new Set(session?.achievementsUnlockedInSession ?? [])
  );

  const words = getSessionWords(difficulty, customWords);

  const currentIndex = session?.currentWordIndex ?? 0;

  const totalWords = words.length;

  const isFinished = currentIndex >= totalWords;

  const currentWord: WordData | undefined = words[currentIndex];

  const progressPct =
    totalWords > 0 ? (currentIndex / totalWords) * 100 : 0;

  const theme =
    CLUSTER_THEME[currentWord?.cluster ?? difficulty] ??
    DEFAULT_THEME;

  useEffect(() => {
    if (totalWords === 0) {
      setLocation("/");
    }
  }, [totalWords, setLocation]);

  useEffect(() => {
    if (!isFinished) return;

    const t = setTimeout(() => {
      setLocation("/reward");
    }, 800);

    return () => clearTimeout(t);
  }, [isFinished, setLocation]);

  // automatisch uitspreken
  useEffect(() => {
    if (!currentWord) return;

    listenAfterSpeakRef.current = false;

    const t = setTimeout(() => {
      listenTargetRef.current = currentWord.word;

      listenAfterSpeakRef.current = recognitionSupported;

      speak(currentWord.word);
    }, 380);

    return () => clearTimeout(t);
  }, [currentWord?.word]);

  // luisteren na TTS
  useEffect(() => {
    const wasSpeaking = prevSpeakingRef.current;

    prevSpeakingRef.current = speaking;

    if (
      !wasSpeaking ||
      speaking ||
      showSuccess ||
      lockRef.current
    ) {
      return;
    }

    if (listenAfterSpeakRef.current) {
      listenAfterSpeakRef.current = false;

      const target = listenTargetRef.current;

      if (target && recognitionSupported) {
        listen((matched) => {

          // stop eventuele oude foutmelding
          if (noMatchTimeoutRef.current) {
            clearTimeout(noMatchTimeoutRef.current);
            noMatchTimeoutRef.current = null;
          }

          if (matched) {

            setNoMatch(false);

            triggerSuccess();

          } else if (!lockRef.current) {

            noMatchTimeoutRef.current = window.setTimeout(() => {

              if (lockRef.current) return;

              recordWordError(target);

              setNoMatch(true);

              window.setTimeout(() => {
                setNoMatch(false);
              }, 2000);

            }, 700);
          }

        }, target);
      }
    }
  }, [speaking]);

  useEffect(() => {
    const sessionAchievements =
      session?.achievementsUnlockedInSession ?? [];

    const newOnes = sessionAchievements.filter(
      (id) => !seenAchievementsRef.current.has(id)
    );

    if (newOnes.length > 0) {
      newOnes.forEach((id) =>
        seenAchievementsRef.current.add(id)
      );

      setToastQueue((q) => [...q, ...newOnes]);
    }
  }, [session?.achievementsUnlockedInSession]);

  const dismissToast = useCallback(() => {
    setToastQueue((q) => q.slice(1));
  }, []);

  function triggerSuccess() {
    if (!currentWord || showSuccess || lockRef.current) return;

    lockRef.current = true;

    if (noMatchTimeoutRef.current) {
      clearTimeout(noMatchTimeoutRef.current);
      noMatchTimeoutRef.current = null;
    }

    setNoMatch(false);

    playCoinSound();

    setShowSuccess(true);

    setWordShake(true);

    setEncourage(
      ENCOURAGE[Math.floor(Math.random() * ENCOURAGE.length)]
    );

    setParticles(burst());

    setFloats([
      {
        id: Date.now(),
        text: `+${COINS_PER_WORD}`,
        color: "#facc15",
        x: -48,
      },
      {
        id: Date.now() + 1,
        text: `+${XP_PER_WORD} XP`,
        color: "#c084fc",
        x: 48,
      },
    ]);

    void getLevelFromXP;

    setTimeout(() => {
      setWordShake(false);
    }, 380);

    setTimeout(() => {
      advanceWord(COINS_PER_WORD, XP_PER_WORD);

      setShowSuccess(false);

      setParticles([]);

      setFloats([]);

      setEncourage("");

      setNoMatch(false);

      lockRef.current = false;
    }, 1000);
  }

  const handleSayIt = useCallback(() => {
    if (!currentWord || showSuccess) return;

    if (listening) {
      cancelListening();
      return;
    }

    listenAfterSpeakRef.current = recognitionSupported;

    listenTargetRef.current = currentWord.word;

    speak(currentWord.word);

  }, [
    currentWord,
    showSuccess,
    listening,
    cancelListening,
    speak,
    recognitionSupported,
  ]);

  function handleBack() {
    cancelListening();
    setLocation("/");
  }

  if (!mountedWithSession.current) {
    return (
      <div className="min-h-screen min-h-[100dvh] bg-background" />
    );
  }

  if (isFinished) {
    return (
      <div className="min-h-screen min-h-[100dvh] flex items-center justify-center bg-background">
        <motion.div
          animate={{
            scale: [1, 1.18, 1],
            rotate: [0, 8, -8, 0],
          }}
          transition={{
            repeat: Infinity,
            duration: 0.85,
          }}
          className="text-8xl select-none"
        >
          🎉
        </motion.div>
      </div>
    );
  }

  if (!currentWord) {
    return (
      <div className="min-h-screen min-h-[100dvh] flex items-center justify-center bg-background">
        <div className="text-white/50 font-black text-xl">
          Laden...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen min-h-[100dvh] w-full flex flex-col items-center bg-background px-4 pt-5 pb-6 relative overflow-hidden">

      <AnimatePresence>
        {toastQueue[0] && (
          <AchievementToast
            key={toastQueue[0]}
            id={toastQueue[0]}
            onDone={dismissToast}
          />
        )}
      </AnimatePresence>

      <div className="h-9 flex items-center justify-center shrink-0">
        <AnimatePresence mode="wait">

          {encourage && (
            <motion.div
              key="encourage"
              initial={{ opacity: 0, scale: 0.65, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{
                type: "spring",
                stiffness: 420,
                damping: 22,
              }}
              className="font-black text-xl text-yellow-300 drop-shadow-lg"
              aria-live="polite"
            >
              {encourage}
            </motion.div>
          )}

          {!encourage && noMatch && (
            <motion.div
              key="nomatch"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="font-black text-base text-orange-400"
              aria-live="polite"
            >
              Probeer het nog eens!
            </motion.div>
          )}

          {!encourage && !noMatch && listening && (
            <motion.div
              key="listening-hint"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="font-bold text-sm text-purple-300/70"
              aria-live="polite"
            >
              Zeg het woord na…
            </motion.div>
          )}

        </AnimatePresence>
      </div>

    </div>
  );
}
