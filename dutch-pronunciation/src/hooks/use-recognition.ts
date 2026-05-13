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
  length: number;
  [index: number]: { transcript: string };
}

// ── Levenshtein distance (single-row, space-optimised) ─────────────
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

/**
 * Lenient match for children's Dutch speech.
 */
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
    isStWord || isTwWord || isDrWord;

  // Build extended candidate list
  const extraCandidates: string[] = [];

  for (const r of candidates) {
    if (!r) continue;

    // Strip leading vowel
    if (/^[eaio]/.test(r)) {
      extraCandidates.push(r.slice(1));
    }

    // Collapse repeated leading consonants
    if (isStWord && /^ss+/.test(r)) {
      extraCandidates.push(
        r.replace(/^s+/, "s")
      );
    }

    if (isTwWord && /^tt+/.test(r)) {
      extraCandidates.push(
        r.replace(/^t+/, "t")
      );
    }

    // DR cluster support
    if (isDrWord) {

      // drie
      if (
        r.startsWith("rie") ||
        r.startsWith("die") ||
        r.startsWith("diee") ||
        r.startsWith("tree") ||
        r.startsWith("free")
      ) {
        extraCandidates.push("drie");
      }

      // drop
      if (
        r.startsWith("rop") ||
        r.startsWith("dop")
      ) {
        extraCandidates.push("drop");
      }

      // draak
      if (
        r.startsWith("raak") ||
        r.startsWith("raakh")
      ) {
        extraCandidates.push("draak");
      }

      // droom
      if (
        r.startsWith("room") ||
        r.startsWith("doom")
      ) {
        extraCandidates.push("droom");
      }
    }
  }

  // No extraTargets: the leading cluster
  // must still be present in what the child says.
  const extraTargets: string[] = [];

  const allCandidates = [
    ...candidates,
    ...extraCandidates,
  ];

  const allTargets = [
    t,
    ...extraTargets,
  ];

  // Allow one extra edit distance
  // for cluster words
  const clusterBonus =
    isClusterWord ? 1 : 0;

  for (const tgt of allTargets) {
    for (const r of allCandidates) {
      if (!r) continue;

      // Exact match
      if (r === tgt) return true;

      // Partial match
      if (
        r.includes(tgt) ||
        tgt.includes(r)
      ) {
        return true;
      }

      // Prefix match
      const prefix = tgt.slice(
        0,
        Math.max(
          2,
          Math.floor(tgt.length * 0.72)
        )
      );

      if (
        tgt.length >= 4 &&
        r.startsWith(prefix)
      ) {
        return true;
      }

      // Levenshtein tolerance
      const maxDist =
        (tgt.length >= 6 ? 2 : 1) +
        clusterBonus;

      if (
        levenshtein(r, tgt) <= maxDist
      ) {
        return true;
      }
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

  /** Start listening for `targetWord` */
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
      rec.continuous = false;
      rec.interimResults = false;
      rec.maxAlternatives = 6;

      rec.onstart = () => {
        listeningRef.current = true;
        setListening(true);
      };

      let resultFired = false;

      rec.onresult = (
        e: SpeechResultEvent
      ) => {
        resultFired = true;

        listeningRef.current = false;

        setListening(false);

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

        const best =
          transcripts[0] ?? "";

        const matched =
          transcripts.some((t) =>
            isGoodEnough(
              t,
              targetWord
            )
          );

        onResult(matched, best);
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

        // If recognition ended without result
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
