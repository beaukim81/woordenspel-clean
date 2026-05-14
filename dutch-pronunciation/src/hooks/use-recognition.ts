import { useCallback, useRef, useState } from "react";

// ── Minimal local types ────────────────────────────────────────────
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
  [index: number]: {
    transcript: string;
  };
}

// ── Levenshtein ────────────────────────────────────────────────────
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

// ── Normalize ──────────────────────────────────────────────────────
function normalize(s: string): string {

  return s
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

// ── Matching logic ─────────────────────────────────────────────────
export function isGoodEnough(
  recognized: string,
  target: string
): boolean {

  const t = normalize(target);

  if (!t) {
    return false;
  }

  const parts = recognized
    .split(/\s+/)
    .map(normalize)
    .filter(Boolean);

  const candidates = [
    normalize(recognized),
    ...parts,
  ];

  const extraCandidates: string[] = [];

  const isDrWord = t.startsWith("dr");
  const isStWord = t.startsWith("st");
  const isTwWord = t.startsWith("tw");

  for (const r of candidates) {

    if (!r) continue;

    // ── ST ─────────────────────────────────────────────
    if (
      isStWord &&
      /^ss+/.test(r)
    ) {
      extraCandidates.push(
        r.replace(/^s+/, "s")
      );
    }

    // ── TW ─────────────────────────────────────────────
    if (
      isTwWord &&
      /^tt+/.test(r)
    ) {
      extraCandidates.push(
        r.replace(/^t+/, "t")
      );
    }

    // ── DR ─────────────────────────────────────────────
    if (isDrWord) {

      // Browser slikt D in
      if (
        r.startsWith("r") &&
        r.length >= 2
      ) {
        extraCandidates.push("d" + r);
      }

      // droom
      if (
        [
          "room",
          "rhoon",
          "ram",
          "dro",
        ].includes(r)
      ) {
        extraCandidates.push("droom");
      }

      // druif
      if (
        [
          "drive",
          "driv",
          "live",
          "ruif",
          "ruig",
          "ru",
          "druyf",
          "druijf",
          "druijff",
        ].includes(r)
      ) {
        extraCandidates.push("druif");
      }

      // draak
      if (
        [
          "raak",
          "draken",
        ].includes(r)
      ) {
        extraCandidates.push("draak");
      }

      // draad
      if (
        [
          "raad",
          "draat",
        ].includes(r)
      ) {
        extraCandidates.push("draad");
      }

      // dragen
      if (
        [
          "vragen",
          "rager",
        ].includes(r)
      ) {
        extraCandidates.push("dragen");
      }

      // drop
      if (
        [
          "rob",
        ].includes(r)
      ) {
        extraCandidates.push("drop");
      }

      // drie
      if (
        [
          "rie",
          "3",
          "tree",
          "free",
          "de",
          "dee",
          "die",
          "djie",
        ].includes(r)
      ) {
        extraCandidates.push("drie");
      }

      // drum
      if (
        [
          "rum",
          "trump",
        ].includes(r)
      ) {
        extraCandidates.push("drum");
      }

      // drank
      if (
        [
          "rank",
        ].includes(r)
      ) {
        extraCandidates.push("drank");
      }

      // draaien
      if (
        [
          "raai",
          "raaien",
          "naaien",
          "ryan",
          "brian",
        ].includes(r)
      ) {
        extraCandidates.push("draaien");
      }
    }
  }

  const allCandidates = [
    ...candidates,
    ...extraCandidates,
  ];

  // ── Clean duplicates ────────────────────────────────
  const cleanedCandidates = allCandidates.map((c) => {

    const words = c.split(" ");

    if (
      words.length >= 2 &&
      words.every(
        (w) => w === words[0]
      )
    ) {
      return words[0];
    }

    return c;
  });

  for (const r of cleanedCandidates) {

    if (!r) continue;

    // exact
    if (r === t) {
      return true;
    }

    // contains
    if (
      r.length >= 4 &&
      (
        r.includes(t) ||
        t.includes(r)
      )
    ) {
      return true;
    }

    // prefix
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

    // fuzzy
    const maxDist =
      t.length >= 6 ? 2 : 1;

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

  const restartCountRef =
    useRef(0);

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

      // stabieler
      rec.continuous = false;

      // GEEN halve woorden meer
      rec.interimResults = false;

      // meer alternatieven
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

        console.log(
          "TARGET:",
          targetWord
        );

        console.log(
          "TRANSCRIPTS:",
          transcripts
        );

        let bestTranscript = "";

        for (const t of transcripts) {

          if (
            isGoodEnough(
              t,
              targetWord
            )
          ) {

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

        if (
          lastResult?.isFinal &&
          transcripts.length > 0
        ) {

          setTimeout(() => {

            if (resultFired) {
              return;
            }

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

        if (resultFired) {

          listeningRef.current = false;

          setListening(false);

          restartCountRef.current = 0;

          return;
        }

        // auto restart
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
