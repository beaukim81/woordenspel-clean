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
    .replace(/[^a-z0-9]/g, "");
}

// ── Matching ───────────────────────────────────────────────────────
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

    // ── Remove accidental leading vowel ─────────────────
    if (/^[eaio]/.test(r)) {
      extraCandidates.push(r.slice(1));
    }

    // ── ST cluster ──────────────────────────────────────
    if (
      isStWord &&
      /^ss+/.test(r)
    ) {
      extraCandidates.push(
        r.replace(/^s+/, "s")
      );
    }

    // ── TW cluster ──────────────────────────────────────
    if (
      isTwWord &&
      /^tt+/.test(r)
    ) {
      extraCandidates.push(
        r.replace(/^t+/, "t")
      );
    }

    // ── DR cluster ──────────────────────────────────────
    if (isDrWord) {

      // Browser slikt soms de D in
      if (
        r.startsWith("r") &&
        r.length >= 2
      ) {
        extraCandidates.push("d" + r);
      }

      // droom
      if (
        r === "room" ||
        r === "rhoon" ||
        r === "ram" ||
        r === "dro"
      ) {
        extraCandidates.push("droom");
      }

      // druif
      if (
        r === "drive" ||
        r === "driv" ||
        r === "live" ||
        r === "ruif" ||
        r === "ruig" ||
        r === "druyf" ||
        r === "druijf" ||
        r === "druijff" ||
        r === "ru"
      ) {
        extraCandidates.push("druif");
      }

      // draad
      if (
        r === "raad" ||
        r === "draat"
      ) {
        extraCandidates.push("draad");
      }

      // draak
      if (
        r === "raak" ||
        r === "draken"
      ) {
        extraCandidates.push("draak");
      }

      // dragen
      if (
        r === "vragen" ||
        r === "rager"
      ) {
        extraCandidates.push("dragen");
      }

      // drop
      if (
        r === "rob"
      ) {
        extraCandidates.push("drop");
      }

      // drie
      if (
        r === "rie" ||
        r === "3" ||
        r === "tree" ||
        r === "free" ||
        r === "de" ||
        r === "dee" ||
        r === "die" ||
        r === "djie"
      ) {
        extraCandidates.push("drie");
      }

      // drum
      if (
        r === "rum" ||
        r === "trump"
      ) {
        extraCandidates.push("drum");
      }

      // drank
      if (
        r === "rank"
      ) {
        extraCandidates.push("drank");
      }

      // draaien
      if (
        r === "raai" ||
        r === "raaien" ||
        r === "naaien" ||
        r === "ryan" ||
        r === "brian"
      ) {
        extraCandidates.push("draaien");
      }

      // General DR repair
      if (
        r.length >= 3 &&
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
    }
  }

  const allCandidates = [
    ...candidates,
    ...extraCandidates,
  ];

  // ── Clean repeated transcripts ───────────────────────
  const cleanedCandidates = allCandidates.map((c) => {

    const words = c.split(" ");

    if (
      words.length >= 2 &&
      words.every(w => w === words[0])
    ) {
      return words[0];
    }

    return c;
  });

  const clusterBonus =
    isClusterWord ? 1 : 0;

  for (const r of cleanedCandidates) {

    if (!r) continue;

    // ── Exact ──────────────────────────────────────────
    if (r === t) {
      return true;
    }

    // ── Contains ───────────────────────────────────────
    if (
      r.length >= 4 &&
      (
        r.includes(t) ||
        t.includes(r)
      )
    ) {
      return true;
    }

    // ── Prefix ─────────────────────────────────────────
    const prefix = t.slice(
      0,
      Math.max(
        2,
        Math.floor(t.length * 0.6)
      )
    );

    if (
      t.length >= 4 &&
      r.startsWith(prefix)
    ) {
      return true;
    }

    // ── Levenshtein ────────────────────────────────────
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

// ── Hook ───────────────────────────────────────────────
export function useRecognition() {

  const [listening, setListening] =
    useState(false);

  const listeningRef =
    useRef(false);

  const recRef =
    useRef<SpeechRec | null>(null);

  const supported =
    !!getSpeechRecognitionClass();

  const restartCountRef =
    useRef(0);

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

      // ── BIG IMPROVEMENTS ─────────────────────────────
      rec.continuous = true;

      // FALSE = stabielere volledige woorden
      rec.interimResults = false;

      // Meer alternatieven helpt enorm
      rec.maxAlternatives = 15;

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

            const cleaned =
              result[ai]
                .transcript
                .trim();

            if (
              cleaned.length > 0
            ) {
              transcripts.push(cleaned);
            }
          }
        }

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

            restartCountRef.current = 0;

            rec.stop();

            onResult(true, t);

            return;
          }

          if (
            t.length >
            bestTranscript.length
          ) {
            bestTranscript = t;
          }
        }

        const lastResult =
          e.results[e.results.length - 1];

        // Alleen failen als FINAL én transcript bestaat
        if (
          lastResult?.isFinal &&
          transcripts.length > 0
        ) {

          setTimeout(() => {

            if (resultFired) return;

            resultFired = true;

            listeningRef.current = false;

            setListening(false);

            restartCountRef.current = 0;

            onResult(
              false,
              bestTranscript
            );

          }, 900);
        }
      };

      rec.onerror = () => {

        resultFired = true;

        listeningRef.current = false;

        setListening(false);

        restartCountRef.current = 0;

        onResult(false, "");
      };

      rec.onend = () => {

        // Als al succesvol -> stoppen
        if (resultFired) {

          listeningRef.current = false;

          setListening(false);

          restartCountRef.current = 0;

          return;
        }

        // Max 4 auto restarts
        if (
          restartCountRef.current >= 4
        ) {

          listeningRef.current = false;

          setListening(false);

          restartCountRef.current = 0;

          onResult(false, "");

          return;
        }

        restartCountRef.current += 1;

        // Auto restart voorkomt halve woorden
        setTimeout(() => {

          try {

            rec.start();

          } catch {

            listeningRef.current = false;

            setListening(false);

            restartCountRef.current = 0;

            onResult(false, "");
          }

        }, 150);
      };

      try {

        rec.start();

      } catch {

        listeningRef.current = false;

        setListening(false);

        restartCountRef.current = 0;
      }
    },
    []
  );

  const cancel = useCallback(() => {

    recRef.current?.abort();

    listeningRef.current = false;

    setListening(false);

    restartCountRef.current = 0;

  }, []);

  return {
    listen,
    cancel,
    listening,
    supported,
  };
}

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
