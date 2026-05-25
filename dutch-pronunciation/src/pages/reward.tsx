import { useEffect, useMemo, useRef } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useGameStore, getLevelFromXP } from "@/lib/store";
import { getLevelTitle } from "@/lib/achievements";
import { useCountUp } from "@/hooks/use-count-up";

const HEADLINES = [
  "Goed geoefend!",
  "Mooie ronde!",
  "Knap gedaan!",
  "Goed gewerkt!",
];

const SUBS = [
  "Ronde afgerond.",
  "Even rustig kijken wat je verdiend hebt.",
  "Je oefening is opgeslagen.",
];

function StatCard({
  emoji,
  value,
  label,
  delay,
  testId,
  gradient,
  border,
}: {
  emoji: string;
  value: string;
  label: string;
  delay: number;
  testId: string;
  gradient: string;
  border: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.22 }}
      className={`rounded-2xl bg-gradient-to-br ${gradient} border ${border} p-5 text-center`}
      data-testid={testId}
    >
      <div className="text-4xl mb-2 select-none" aria-hidden="true">
        {emoji}
      </div>

      <div className="font-black text-3xl leading-none mb-1">
        {value}
      </div>

      <div className="text-white/45 text-xs font-black uppercase tracking-widest">
        {label}
      </div>
    </motion.div>
  );
}

export default function Reward() {
  const [, setLocation] = useLocation();
  const { session, coins, xp, endSession } = useGameStore();
  const level = getLevelFromXP(xp);
  const levelTitle = getLevelTitle(level);

  const snap = useRef({
    sessionCoins: session?.sessionCoins ?? 0,
    sessionXP: session?.sessionXP ?? 0,
    leveledUp: session?.leveledUp ?? false,
    hadSession: !!session,
  }).current;

  useEffect(() => {
    if (!snap.hadSession) {
      setLocation("/");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const headline = useMemo(
    () => HEADLINES[Math.floor(Math.random() * HEADLINES.length)],
    []
  );

  const sub = useMemo(
    () => SUBS[Math.floor(Math.random() * SUBS.length)],
    []
  );

  const displayCoins = useCountUp(snap.sessionCoins, 700, 250);
  const displayXP = useCountUp(snap.sessionXP, 700, 320);
  const displayTotal = useCountUp(coins, 650, 380);

  function handleContinue() {
    endSession();
    setLocation("/");
  }

  if (!snap.hadSession) {
    return <div className="min-h-screen min-h-[100dvh] bg-background" />;
  }

  return (
    <div className="min-h-screen min-h-[100dvh] w-full flex flex-col items-center bg-background px-4 pt-8 pb-8 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.22 }}
        className="text-[72px] mb-3 select-none shrink-0"
        aria-hidden="true"
      >
        🏆
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08, duration: 0.22 }}
        className="text-center mb-6 shrink-0"
      >
        <div
          className="font-black uppercase tracking-wide leading-tight"
          style={{
            fontSize: "clamp(2rem, 10vw, 3.2rem)",
            background: "linear-gradient(135deg, #fde68a, #facc15, #f59e0b)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          {headline}
        </div>

        <div className="text-white/50 font-bold text-base mt-1">
          {sub}
        </div>
      </motion.div>

      <div className="w-full max-w-sm grid grid-cols-2 gap-4 mb-4 shrink-0">
        <StatCard
          emoji="🪙"
          value={`+${displayCoins}`}
          label="Munten"
          delay={0.16}
          testId="reward-coins"
          gradient="from-yellow-900/70 to-amber-950/60"
          border="border-yellow-500/25"
        />

        <StatCard
          emoji="⚡"
          value={`+${displayXP}`}
          label="XP"
          delay={0.2}
          testId="reward-xp"
          gradient="from-purple-900/70 to-violet-950/60"
          border="border-purple-500/25"
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.24, duration: 0.22 }}
        className="w-full max-w-sm rounded-2xl bg-white/[0.06] border border-white/10 px-6 py-4 mb-4 shrink-0"
      >
        <div className="flex items-center justify-around">
          <div className="text-center">
            <div className="font-black text-2xl text-yellow-300 tabular-nums">
              {displayTotal}
            </div>

            <div className="text-white/30 text-xs font-black uppercase tracking-widest mt-0.5">
              Totaal
            </div>
          </div>

          <div className="w-px h-10 bg-white/10" />

          <div className="text-center">
            <div className="font-black text-xl text-purple-300">
              Level {level}
            </div>

            <div className="text-white/30 text-xs font-black uppercase tracking-widest mt-0.5">
              {levelTitle}
            </div>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {snap.leveledUp && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ delay: 0.28, duration: 0.22 }}
            className="w-full max-w-sm rounded-2xl border border-yellow-400/40 p-5 mb-4 text-center shrink-0"
            style={{
              background:
                "linear-gradient(135deg, rgba(250,204,21,0.12), rgba(245,158,11,0.06))",
            }}
            role="alert"
            aria-label="Level omhoog gegaan"
          >
            <div className="text-4xl mb-2 select-none" aria-hidden="true">
              🎖️
            </div>

            <div className="font-black text-2xl text-yellow-300 uppercase tracking-wide">
              Level omhoog
            </div>

            <div className="text-yellow-200/55 font-bold text-sm mt-1">
              Je bent nu Level {level} - {levelTitle}.
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ delay: 0.32, duration: 0.22 }}
        whileTap={{ scale: 0.97, y: 2 }}
        onClick={handleContinue}
        data-testid="button-continue"
        className="relative w-full max-w-sm py-6 rounded-3xl bg-gradient-to-br from-yellow-400 to-amber-500
          text-gray-900 font-black text-2xl uppercase tracking-wider
          border-b-[6px] border-amber-700 active:border-b-0
          overflow-hidden touch-manipulation mt-auto mb-2 shrink-0"
        style={{
          boxShadow: "0 8px 24px rgba(245,158,11,0.25)",
        }}
        aria-label="Ga terug naar home"
      >
        Doorgaan
      </motion.button>
    </div>
  );
}
