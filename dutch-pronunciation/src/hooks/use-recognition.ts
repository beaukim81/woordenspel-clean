import { useCallback, useRef, useState } from "react";

interface SpeechAlternative {
  transcript: string;
  confidence?: number;
}

interface SpeechResult {
  isFinal?: boolean;
  length: number;
  [index: number]: SpeechAlternative;
}

interface SpeechResultEvent {
  resultIndex?: number;
  results: Array<SpeechResult>;
}

interface SpeechRec {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: SpeechResultEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start(): void;
  abort(): void;
  stop(): void;
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

const SPEECH_VARIANTS: Record<string, string[]> = {
  stop: ["stap", "top", "stok", "stob", "stoppen", "sto"],
  ster: ["ter", "sterr", "stehr"],
  steen: ["teen", "stean", "stien"],
  droom: ["room", "rhoon", "ram", "roam", "droem", "droam"],
  druif: ["drive", "driv", "live", "ruif", "ruig", "ruit", "druyf", "druijf", "druijff"],
  draak: ["raak", "raaq", "raac", "rakh", "raaak", "draek", "draeck", "draken", "drague"],
  draad: ["raad", "draat", "draht"],
  dragen: ["vragen", "rager", "rage"],
  drop: ["rob", "drap", "drab", "dropp", "drob"],
  draven: ["draven", "draaven", "dravin", "dravenn", "drayven", "drayvin"],
  drum: ["rum", "dram", "dramm", "drumm", "trump"],
  drank: ["rank", "drunk"],
  draaien: ["raai", "raaien", "naaien", "ryan", "brian"],
};

export function isGoodEnough(recognized: string, target: string): boolean {
  const expected = normalize(target);
  if (!expected) return false;

  const heardWords = recognized.split(/\s+/).map(normalize).filter(Boolean);
  const allowed = [expected, ...(SPEECH_VARIANTS[expected] ?? []).map(normalize)];
  return heardWords.some((heard) => allowed.includes(heard));
}

function getSpeechRecognitionClass(): (new () => SpeechRec) | null {
  if (typeof window === "undefined") return null;
  const browser = window as unknown as Record<string, unknown>;
  return (browser["SpeechRecognition"] ?? browser["webkitSpeechRecognition"] ?? null) as
    | (new () => SpeechRec)
    | null;
}

type OnResult = (matched: boolean, transcript: string, confidence: number) => void;

interface LastResult {
  transcript: string;
  confidence: number;
  matched: boolean;
}

export function useRecognition() {
  const [listening, setListening] = useState(false);
  const [lastResult, setLastResult] = useState<LastResult | null>(null);
  const listeningRef = useRef(false);
  const recRef = useRef<SpeechRec | null>(null);
  const supported = !!getSpeechRecognitionClass();

  const listen = useCallback((onResult: OnResult, targetWord: string) => {
    const Recognition = getSpeechRecognitionClass();
    if (!Recognition || listeningRef.current) return;

    recRef.current?.abort();
    const rec = new Recognition();
    recRef.current = rec;
    rec.lang = "nl-NL";
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 15;

    let resultFired = false;
    setLastResult(null);

    rec.onstart = () => {
      listeningRef.current = true;
      setListening(true);
    };

    rec.onresult = (event) => {
      const startIndex = event.resultIndex ?? 0;
      for (let resultIndex = startIndex; resultIndex < event.results.length; resultIndex++) {
        const result = event.results[resultIndex];
        if (!result.isFinal) continue;

        for (let alternativeIndex = 0; alternativeIndex < result.length; alternativeIndex++) {
          const alternative = result[alternativeIndex];
          const transcript = alternative.transcript.trim();
          if (!transcript) continue;

          const confidence = typeof alternative.confidence === "number" ? alternative.confidence : 0;
          const matched = isGoodEnough(transcript, targetWord);
          setLastResult({ transcript, confidence, matched });

          if (!matched) continue;

          resultFired = true;
          listeningRef.current = false;
          setListening(false);
          rec.stop();
          onResult(true, transcript, confidence);
          return;
        }
      }
    };

    rec.onerror = () => {
      resultFired = true;
      listeningRef.current = false;
      setListening(false);
      onResult(false, "", 0);
    };

    rec.onend = () => {
      listeningRef.current = false;
      setListening(false);
      if (!resultFired) {
        window.setTimeout(() => {
          if (!resultFired) onResult(false, "", 0);
        }, 700);
      }
    };

    try {
      rec.start();
    } catch {
      listeningRef.current = false;
      setListening(false);
    }
  }, []);

  const cancel = useCallback(() => {
    recRef.current?.abort();
    listeningRef.current = false;
    setListening(false);
  }, []);

  return { listen, cancel, listening, supported, lastResult };
}
