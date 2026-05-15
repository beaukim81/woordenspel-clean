import { useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, useSpring, useTransform, AnimatePresence } from "framer-motion";
import { Settings, Trophy } from "lucide-react";
import { useGameStore, getLevelFromXP, getXPProgress, type Difficulty } from "@/lib/store";
import { getLevelTitle, nextMilestoneLevel, ACHIEVEMENTS } from "@/lib/achievements";
import { avatarForColor } from "@/pages/profile-select";

import egg from "@/assets/mascots/egg.png";
import babyDragon from "@/assets/mascots/baby-dragon.png";
import youngDragon from "@/assets/mascots/young-dragon.png";
import powerDragon from "@/assets/mascots/power-dragon.png";
import kingDragon from "@/assets/mascots/king-dragon.png";

const CLUSTER_OPTIONS: {
  cluster: string;
  difficulty: Difficulty;
  label: string;
  gradient: string;
  border: string;
  glow: string;
  cardBg: string;
  cardBorder: string;
  hint: string;
}[] = [
  { cluster:"sp", difficulty:"sp", label:"SP", gradient:"from-green-500 to-emerald-600", border:"border-b-[5px] border-green-800", glow:"0 6px 24px rgba(34,197,94,0.45)", cardBg:"bg-green-500/12", cardBorder:"border-green-500/35", hint:"Spin · Spook · Speelgoed" },
  { cluster:"bl", difficulty:"bl", label:"BL", gradient:"from-sky-500 to-blue-600", border:"border-b-[5px] border-sky-800", glow:"0 6px 24px rgba(14,165,233,0.45)", cardBg:"bg-sky-500/12", cardBorder:"border-sky-500/35", hint:"Blad · Bloem · Blauw" },
  { cluster:"br", difficulty:"br", label:"BR", gradient:"from-orange-500 to-amber-600", border:"border-b-[5px] border-orange-800", glow:"0 6px 24px rgba(249,115,22,0.45)", cardBg:"bg-orange-500/12", cardBorder:"border-orange-500/35", hint:"Brood · Brug · Bruin" },
  { cluster:"st", difficulty:"st", label:"ST", gradient:"from-teal-500 to-cyan-600", border:"border-b-[5px] border-teal-800", glow:"0 6px 24px rgba(20,184,166,0.45)", cardBg:"bg-teal-500/12", cardBorder:"border-teal-500/35", hint:"Ster · Stoel · Storm" },
  { cluster:"dr", difficulty:"dr", label:"DR", gradient:"from-amber-500 to-orange-600", border:"border-b-[5px] border-amber-800", glow:"0 6px 24px rgba(245,158,11,0.45)", cardBg:"bg-amber-500/12", cardBorder:"border-amber-500/35", hint:"Draak · Droom · Druif" },
  { cluster:"sl", difficulty:"sl", label:"SL", gradient:"from-pink-500 to-rose-600", border:"border-b-[5px] border-pink-800", glow:"0 6px 24px rgba(236,72,153,0.45)", cardBg:"bg-pink-500/12", cardBorder:"border-pink-500/35", hint:"Slang · Sleutel · Slim" },
  { cluster:"tw", difficulty:"tw", label:"TW", gradient:"from-purple-500 to-violet-600", border:"border-b-[5px] border-purple-800", glow:"0 6px 24px rgba(168,85,247,0.45)", cardBg:"bg-purple-500/12", cardBorder:"border-purple-500/35", hint:"Twee · Twijg · Tweeling" },
];

function getMascot(level: number) {

  if (level <= 2) {
    return egg;
  }

  if (level <= 4) {
    return babyDragon;
  }

  if (level <= 6) {
    return youngDragon;
  }

  if (level <= 8) {
    return powerDragon;
  }

  return kingDragon;
}

const BG_STARS = Array.from({ length: 16 }, (_, i) => ({
  id: i,
  size: 3 + (i * 3.7) % 9,
  top: ((i * 37 + 11) % 90) + 2,
  left: ((i * 61 + 7) % 88) + 2,
  dur: 2 + (i % 5) * 0.45,
  delay: (i % 7) * 0.35,
}));

type ClusterOption = typeof CLUSTER_OPTIONS[number];

function ClusterBtn({
  opt,
  active,
  onSelect,
}: {
  opt: ClusterOption;
  active: boolean;
  onSelect: () => void;
}) {

  return (
    <motion.button
      whileTap={{ scale: 0.93, y: active ? 2 : 1 }}
      onClick={onSelect}
      role="radio"
      aria-checked={active}
      data-testid={`cluster-btn-${opt.cluster}`}
      className={`relative py-4 rounded-2xl font-black overflow-hidden touch-manipulation transition-all duration-200 w-full ${
        active
          ? `bg-gradient-to-br ${opt.gradient} ${opt.border} text-white`
          : `${opt.cardBg} border-2 ${opt.cardBorder} text-white/45 border-b-[3px]`
      }`}
      style={active ? { boxShadow: opt.glow } : undefined}
      aria-label={opt.cluster}
    >
      {active && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.22) 50%, transparent 70%)",
          }}
          animate={{ x: ["-120%", "220%"] }}
          transition={{
            duration: 2.2,
            repeat: Infinity,
            repeatDelay: 1.2,
          }}
        />
      )}

      <div
        className="relative z-10 text-xl tracking-widest uppercase leading-none"
        style={
          active
            ? { textShadow: "0 2px 8px rgba(0,0,0,0.3)" }
            : undefined
        }
      >
        {opt.cluster}
      </div>

      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-white/70"
          />
        )}
      </AnimatePresence>
    </motion.button>
  );
}

function AnimatedNumber({
  value,
}: {
  value: number;
}) {

  const spring = useSpring(value, {
    stiffness: 100,
    damping: 16,
  });

  const display = useTransform(
    spring,
    (v) => Math.round(v).toLocaleString()
  );

  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  return <motion.span>{display}</motion.span>;
}

export default function Home() {

  const [, setLocation] = useLocation();

  const {
    coins,
    xp,
    difficulty,
    achievements,
    childName,
    startSession,
    setDifficulty,
    avatarColor,
  } = useGameStore();

  const level = getLevelFromXP(xp);

  const mascotImage = getMascot(level);

  const xpProgress = getXPProgress(xp);

  const levelTitle = getLevelTitle(level);

  const nextMilestone =
    nextMilestoneLevel(level);

  const xpToNext = 50 - xpProgress;

  const xpPct = (xpProgress / 50) * 100;

  const prevCoins = useRef(coins);

  const coinKey = useRef(0);

  if (prevCoins.current !== coins) {
    prevCoins.current = coins;
    coinKey.current++;
  }

  const activeCluster =
    CLUSTER_OPTIONS.find(
      (o) => o.difficulty === difficulty
    ) ?? CLUSTER_OPTIONS[0];

  const recentAchievements =
    achievements.slice(-4);

  function handlePlay() {
    startSession();
    setLocation("/exercise");
  }

  return (
    <div className="min-h-screen min-h-[100dvh] w-full flex flex-col items-center bg-background px-4 pt-5 pb-6 relative overflow-hidden">

      {BG_STARS.map((s) => (
        <motion.div
          key={s.id}
          className="absolute rounded-full pointer-events-none"
          style={{
            width: s.size,
            height: s.size,
            top: `${s.top}%`,
            left: `${s.left}%`,
            background:
              "radial-gradient(circle, rgba(250,204,21,0.5), transparent)",
          }}
          animate={{
            opacity: [0.1, 0.5, 0.1],
            scale: [1, 1.6, 1],
          }}
          transition={{
            duration: s.dur,
            repeat: Infinity,
            delay: s.delay,
            ease: "easeInOut",
          }}
        />
      ))}

      <motion.img
        src={mascotImage}
        alt="Mascot"
        animate={{
          y: [0, -14, 0],
          rotate: [0, 3, -3, 0],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="w-40 h-40 my-2 object-contain shrink-0 select-none"
        style={{
          filter:
            "drop-shadow(0 8px 24px rgba(139,92,246,0.4))",
        }}
        draggable={false}
      />
    </div>
  );
}
