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
function levenshtein(
  a: string,
  b: string
): number {

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
function normalize(
  s: string
): string {

  return s
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .replace(
      /[^a-z0-9]/g,
      ""
    );
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

  const isDrWord =
    t.startsWith("dr");

  const isStWord =
    t.startsWith("st");

  const isTwWord =
    t.startsWith("tw");

  for (const r of candidates) {

    if (!r) continue;

    // ── ST support ────────────────────────────────────
    if (
      isStWord &&
      /^ss+/.test(r)
    ) {
      extraCandidates.push(
        r.replace(/^s+/, "s")
      );
    }

    // ── TW support ────────────────────────────────────
    if (
      isTwWord &&
      /^tt+/.test(r)
    ) {
      extraCandidates.push(
        r.replace(/^t+/, "t")
      );
    }

    // ── DR support ────────────────────────────────────
    if (isDrWord) {

      // D wordt soms weggeslikt
      if (
        r.startsWith("r") &&
        r.length >= 2
      ) {
        extraCandidates.push(
          "d" + r
        );
      }

      // droom
      if (
        [
          "room",
          "rhoon",
          "ram",
          "dro",
          "roam",
          "rohm",
          "rome",
          "home",
          "droem",
          "droam",
          "chrome",
        ].includes(r)
      ) {
        extraCandidates.push(
          "droom"
        );
      }

      // druif
      if (
        [
          "drive",
          "driv",
          "live",
          "ruif",
          "ruig",
          "ruit",
          "eruit",
          "draait",
          "ru",
          "druyf",
          "druijf",
          "druijff",
        ].includes(r)
      ) {
        extraCandidates.push(
          "druif"
        );
      }

      // draak
      if (
        [
          "raak",
          "raaq",
          "raac",
          "rakh",
          "raaak",
          "raek",
          "raack",
          "draek",
          "draeck",
          "draken",
          "drague",
        ].includes(r)
      ) {
        extraCandidates.push(
          "draak"
        );
      }

      // draad
      if (
        [
          "raad",
          "draat",
          "draht",
        ].includes(r)
      ) {
        extraCandidates.push(
          "draad"
        );
      }

      // dragen
      if (
        [
          "vragen",
          "rager",
          "rage",
          "raj",
          "raige",
        ].includes(r)
      ) {
        extraCandidates.push(
          "dragen"
        );
      }

      // drop
      if (
        [
          "rob",
          "drap",
          "drab",
          "dropp",
          "drob",
          "drapp",
        ].includes(r)
      ) {
        extraCandidates.push(
          "drop"
        );
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
          "drie",
          "dri",
          "drih",
          "driee",
        ].includes(r)
      ) {
        extraCandidates.push(
          "drie"
        );
      }

      // drum
      if (
        [
          "rum",
          "trump",
          "dram",
          "dramm",
          "drumm",
          "druse",
          "druc",
        ].includes(r)
      ) {
        extraCandidates.push(
          "drum"
        );
      }

      // drank
      if (
        [
          "rank",
          "drunk",
        ].includes(r)
      ) {
        extraCandidates.push(
          "drank"
        );
      }

      // draaien
      if (
        [
          "raai",
          "raaien",
          "naaien",
          "ryan",
          "brian",
          "draaien",
          "draaien",
        ].includes(r)
      ) {
        extraCandidates.push(
          "draaien"
        );
      }
    }
  }

  const allCandidates = [
    ...candidates,
    ...extraCandidates,
  ];

  for (const r of allCandidates) {

    if (!r) continue;

    // ── Exact ─────────────────────────────────────────
    if (r === t) {
      return true;
    }

    // ── Speciale woorden ──────────────────────────────
    if (
      t === "drie" &&
      (
        r === "3" ||
        r === "drie" ||
        r === "rie" ||
        r.startsWith("dri")
      )
    ) {
      return true;
    }

    if (
      t === "drum" &&
      (
        r === "drum" ||
        r === "rum" ||
        r.startsWith("dru")
      )
    ) {
      return true;
    }

    if (
      t === "draad" &&
      (
        r === "raad" ||
        r === "draad" ||
        r.startsWith("dra")
      )
    ) {
      return true;
    }

    if (
      t === "draak" &&
      (
        r === "raak" ||
        r.startsWith("dra")
      )
    ) {
      return true;
    }

    // ── Contains ─────────────────────────────────────
    if (
      r.length >= 4 &&
      (
        r.includes(t) ||
        t.includes(r)
      )
    ) {
      return true;
    }

    // ── Prefix ───────────────────────────────────────
    const prefix = t.slice(
      0,
      Math.max(
        2,
        Math.floor(
          t.length * 0.6
        )
      )
    );

    if (
      t.length >= 4 &&
      r.startsWith(prefix)
    ) {
      return true;
    }

    // ── Fuzzy ────────────────────────────────────────
    let maxDist = 1;

    if (t.length >= 6) {
      maxDist = 2;
    }

    if (t.startsWith("dr")) {
      maxDist += 1;
    }

    if (
      levenshtein(r, t) <=
      maxDist
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

  if (
    typeof window === "undefined"
  ) {
    return null;
  }

  const w =
    window as unknown as Record<
      string,
      unknown
    >;

  return (
    (w["SpeechRecognition"] ??
      w[
        "webkitSpeechRecognition"
      ] ??
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
    useRef<SpeechRec | null>(
      null
    );

  const supported =
    !!getSpeechRecognitionClass();

  const listen = useCallback(
    async (
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

      // Meer tijd om korte woorden te horen
      rec.continuous = true;

      // Browser mag blijven verfijnen
      rec.interimResults = true;

      // Meer alternatieven
      rec.maxAlternatives = 8;

      rec.onstart = () => {

        listeningRef.current =
          true;

        setListening(true);
      };

      let resultFired = false;

      rec.onresult = (
        e: SpeechResultEvent
      ) => {

        const transcripts =
          new Set<string>();

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

              const firstWord =
                cleaned
                  .split(/\s+/)[0]
                  ?.trim();

              if (firstWord) {
                transcripts.add(
                  firstWord
                );
              }
            }
          }
        }

        const transcriptList =
          Array.from(transcripts);

        console.log(
          "TARGET:",
          targetWord
        );

        console.log(
          "TRANSCRIPTS:",
          transcriptList
        );

        let bestTranscript = "";

        for (const t of transcriptList) {

          if (
            isGoodEnough(
              t,
              targetWord
            )
          ) {

            resultFired = true;

            listeningRef.current =
              false;

            setListening(false);

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
      };

      rec.onerror = () => {

        resultFired = true;

        listeningRef.current =
          false;

        setListening(false);

        onResult(false, "");
      };

      rec.onend = () => {

        // succes al verwerkt
        if (resultFired) {

          listeningRef.current =
            false;

          setListening(false);

          return;
        }

        // browser stopte te snel
        setTimeout(() => {

          if (resultFired) {
            return;
          }

          listeningRef.current =
            false;

          setListening(false);

          onResult(false, "");

        }, 1200);
      };

      try {

        // warmup delay
        await new Promise(
          (resolve) =>
            setTimeout(
              resolve,
              180
            )
        );

        rec.start();

      } catch {

        listeningRef.current =
          false;

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
