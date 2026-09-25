import { useMemo, useState } from "react";
import { ArrowLeft, Mic, MicOff } from "lucide-react";
import { useLocation } from "wouter";
import { useRecognition } from "@/hooks/use-recognition";
import { PRELOADED_WORDS, customWordToWordData, useGameStore } from "@/lib/store";

const DIAGNOSTIC_WORDS = [
  { word: "twee", emoji: "", cluster: "test" },
  { word: "drie", emoji: "", cluster: "test" },
];

export default function SpeechTest() {
  const [, setLocation] = useLocation();
  const customWords = useGameStore((state) => state.customWords);
  const [target, setTarget] = useState("spin");
  const [outcome, setOutcome] = useState<string | null>(null);
  const { listen, cancel, listening, supported, lastResult } = useRecognition();

  const words = useMemo(() => {
    const custom = customWords.flatMap((word) => {
      const data = customWordToWordData(word);
      return data ? [data] : [];
    });
    return Array.from(
      new Map([...PRELOADED_WORDS, ...custom, ...DIAGNOSTIC_WORDS].map((word) => [word.word, word])).values()
    );
  }, [customWords]);

  function startTest() {
    setOutcome(null);
    listen((matched) => {
      setOutcome(matched ? "De matchregel vond het doelwoord." : "Luisteren gestopt zonder match.");
    }, target);
  }

  return (
    <main className="min-h-screen min-h-[100dvh] bg-background text-white px-5 py-6">
      <div className="mx-auto w-full max-w-lg">
        <button
          type="button"
          onClick={() => setLocation("/settings")}
          className="mb-8 inline-flex h-11 items-center gap-2 text-white/80"
        >
          <ArrowLeft className="h-5 w-5" />
          Terug
        </button>

        <h1 className="text-2xl font-bold">Spraaktest</h1>
        <p className="mt-2 text-sm text-white/65">Test de woorden uit het spel. Twee en drie zijn alleen toegevoegd als testwoorden, niet als spelwoorden.</p>

        <label className="mt-8 block text-sm font-semibold" htmlFor="speech-test-target">Te testen woord</label>
        <select
          id="speech-test-target"
          value={target}
          onChange={(event) => {
            setTarget(event.target.value);
            setOutcome(null);
          }}
          disabled={listening}
          className="mt-2 w-full rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-lg"
        >
          {words.map((word) => (
            <option key={word.word} value={word.word}>
              {word.cluster === "test" ? "TEST (niet in spel)" : word.cluster.toUpperCase()} - {word.word}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={listening ? cancel : startTest}
          disabled={!supported}
          className="mt-4 inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-cyan-400 px-5 font-bold text-gray-950 disabled:opacity-50"
        >
          {listening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          {listening ? "Stop luisteren" : "Start test"}
        </button>

        {!supported && <p className="mt-4 text-amber-300">Spraakherkenning wordt niet ondersteund in deze browser.</p>}

        <section className="mt-8 border-t border-white/15 pt-5" aria-live="polite">
          <h2 className="text-lg font-semibold">Resultaat</h2>
          {lastResult ? (
            <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-white/60">Herkenning</dt><dd className="break-all font-semibold">{lastResult.transcript}</dd>
              <dt className="text-white/60">Doelwoord</dt><dd>{target}</dd>
              <dt className="text-white/60">Confidence</dt><dd>{lastResult.confidence.toFixed(2)}</dd>
              <dt className="text-white/60">Matchregel</dt><dd>{lastResult.matched ? "Match" : "Geen match"}</dd>
            </dl>
          ) : (
            <p className="mt-3 text-sm text-white/55">Nog geen spraakresultaat.</p>
          )}
          <p className="mt-4 text-xs text-white/55">De match is alleen de tekstvergelijking. In het spel kan een lage confidence alsnog om een nieuwe poging vragen.</p>
          {outcome && <p className="mt-3 font-semibold">{outcome}</p>}
        </section>
      </div>
    </main>
  );
}
