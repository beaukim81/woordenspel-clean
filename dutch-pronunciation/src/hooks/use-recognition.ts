import { useCallback, useRef, useState } from "react";

// ── Minimal local types — avoids relying on lib.dom SpeechRecognition ──
interface SpeechRec {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((e: SpeechResultEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start(): void;
  abort(): void;
  stop(): void;
}

interface SpeechResultEvent {
  results: Array<SpeechResultList>;
}

interface SpeechResultList {
  isFinal?: boolean;
  length: number;
  [index: number]: { transcript: string };
}

// ── Levenshtein distance ────────────────────────────────────────────
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;

  const row = Array.from(
    { length: n + 1 },
    (_, i) => i
  );

  for (let i = 1; i <= m; i++) {
    let prev = row[0];
    row[0] = i;

    for (let j = 1; j <= n; j++) {
      const temp = row[j];

      row[j] =
        a[i - 1] === b[j - 1]
          ? prev
          : 1 +
            Math.min(
              prev,
              row[j],
              row[j - 1]
            );

      prev = temp;
    }
  }

  return row[n];
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z]/g, "");
}

export function isGoodEnough(
  recognized: string,
  target: string
): boolean {

  const t = normalize(target);

  if (!t) return false;

  const parts = recognized
    .split(/\s+/)
    .map(normalize)
    .filter(Boolean);

  const candidates = [
    normalize(recognized),
    ...parts,
  ];

  const isStWord = t.startsWith("st");
  const isTwWord = t.startsWith("tw");
  const isDrWord = t.startsWith("dr");

  const isClusterWord =
    isStWord ||
    isTwWord ||
    isDrWord;

  const extraCandidates: string[] = [];

  for (const r of candidates) {

    if (!r) continue;

    // Remove accidental leading vowel
    if (/^[eaio]/.test(r)) {
      extraCandidates.push(r.slice(1));
    }

    // ST cluster
    if (
      isStWord &&
      /^ss+/.test(r)
    ) {
      extraCandidates.push(
        r.replace(/^s+/, "s")
      );
    }

    // TW cluster
    if (
      isTwWord &&
      /^tt+/.test(r)
    ) {
      extraCandidates.push(
        r.replace(/^t+/, "t")
      );
    }

    // DR cluster support
    if (isDrWord) {
      // Browser slikt soms de D in bij DR woorden
      if (
        r.startsWith("r") &&
        r.length >= 2
      ) {
        extraCandidates.push("d" + r);
      }
if (
  r === "raad"
) {
  extraCandidates.push("draad");
}

if (
  r === "raak"
) {
  extraCandidates.push("draak");
}

if (
  r === "vragen"
) {
  extraCandidates.push("dragen");
}

if (
  r === "rob"
) {
  extraCandidates.push("drop");
}

if (
  r === "drive"
) {
  extraCandidates.push("druif");
}

      // Soms wordt alleen de klinker gehoord
      if (
        r === "de" ||
        r === "dee" ||
        r === "die"
      ) {
        extraCandidates.push("drie");
      }

      if (
        r === "rum"
      ) {
        extraCandidates.push("drum");
      }

      if (
        r === "rank"
      ) {
        extraCandidates.push("drank");
      }

      if (
        r === "raai" ||
        r === "raaien" ||
        r === "naaien"
      ) {
        extraCandidates.push("draaien");
      }

      if (
        r.length >= 4 &&
        (
          r.startsWith("rie") ||
          r.startsWith("rop") ||
          r.startsWith("roo") ||
          r.startsWith("raa") ||
          r.startsWith("rui")
        )
      ) {
        extraCandidates.push("d" + r);
      }

      if (
        r.startsWith("die") ||
        r.startsWith("djie")
      ) {
        extraCandidates.push("drie");
      }

      if (
        r === "tree" ||
        r === "free"
      ) {
        extraCandidates.push("drie");
      }
    }
  }

  const allCandidates = [
    ...candidates,
    ...extraCandidates,
  ];

  const clusterBonus =
    isClusterWord ? 1 : 0;

  for (const r of allCandidates) {

    if (!r) continue;

    // Exact
    if (r === t) {
      return true;
    }

    // Contains
    if (
      r.includes(t) ||
      t.includes(r)
    ) {
      return true;
    }

    // Prefix
    const prefix = t.slice(
      0,
      Math.max(
        2,
        Math.floor(t.length * 0.72)
      )
    );

    if (
      t.length >= 4 &&
      r.startsWith(prefix)
    ) {
      return true;
    }

    // Levenshtein
    const maxDist =
      (t.length >= 6 ? 2 : 1) +
      clusterBonus;

    if (
      levenshtein(r, t) <= maxDist
    ) {
      return true;
    }
  }

  return false;
}

// ── Detect SpeechRecognition API ───────────────────────────────────
function getSpeechRecognitionClass():
  | (new () => SpeechRec)
  | null {

  if (typeof window === "undefined") {
    return null;
  }

  const w =
    window as unknown as Record<
      string,
      unknown
    >;

  return (
    (w["SpeechRecognition"] ??
      w["webkitSpeechRecognition"] ??
      null) as new () => SpeechRec
  );
}

type OnResult = (
  matched: boolean,
  transcript: string
) => void;

// ── Hook ───────────────────────────────────────────────────────────
export function useRecognition() {

  const [listening, setListening] =
    useState(false);

  const listeningRef =
    useRef(false);

  const recRef =
    useRef<SpeechRec | null>(null);

  const supported =
    !!getSpeechRecognitionClass();

  const listen = useCallback(
    (
      onResult: OnResult,
      targetWord: string
    ) => {

      const SR =
        getSpeechRecognitionClass();

      if (
        !SR ||
        listeningRef.current
      ) {
        return;
      }

      recRef.current?.abort();

      const rec = new SR();

      recRef.current = rec;

      rec.lang = "nl-NL";

      // IMPORTANT:
      // Better cluster recognition
      rec.continuous = false;

      // Allow ongoing speech refinement
      rec.interimResults = true;

      // More alternatives helps with children
      rec.maxAlternatives = 10;

      rec.onstart = () => {
        listeningRef.current = true;
        setListening(true);
      };

      let resultFired = false;

      rec.onresult = (
        e: SpeechResultEvent
      ) => {

        const transcripts: string[] = [];

        for (
          let ri = 0;
          ri < e.results.length;
          ri++
        ) {

          const result =
            e.results[ri];

          for (
            let ai = 0;
            ai < result.length;
            ai++
          ) {

            transcripts.push(
              result[ai].transcript
            );
          }
        }

        // Pick BEST transcript instead of first
        let bestTranscript = "";

console.log("TARGET:", targetWord);
console.log("TRANSCRIPTS:", transcripts);

        for (const t of transcripts) {

          if (
            isGoodEnough(
              t,
              targetWord
            )
          ) {

            bestTranscript = t;

            resultFired = true;

            listeningRef.current = false;

            setListening(false);

            rec.stop();

            onResult(true, t);

            return;
          }

          // fallback candidate
          if (
            t.length >
            bestTranscript.length
          ) {
            bestTranscript = t;
          }
        }

        // Only fail on FINAL result
        const lastResult =
          e.results[e.results.length - 1];

        if (
          lastResult?.isFinal
        ) {

          resultFired = true;

          listeningRef.current = false;

          setListening(false);

          onResult(
            false,
            bestTranscript
          );
        }
      };

      rec.onerror = () => {

        resultFired = true;

        listeningRef.current = false;

        setListening(false);

        onResult(false, "");
      };

      rec.onend = () => {

        listeningRef.current = false;

        setListening(false);

        if (!resultFired) {

          resultFired = true;

          onResult(false, "");
        }
      };

      try {
        rec.start();
      } catch {

        listeningRef.current = false;

        setListening(false);
      }
    },
    []
  );

  const cancel = useCallback(() => {

    recRef.current?.abort();

    listeningRef.current = false;

    setListening(false);

  }, []);

  return {
    listen,
    cancel,
    listening,
    supported,
  };
}
