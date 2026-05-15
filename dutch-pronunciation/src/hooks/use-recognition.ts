import { useCallback, useRef, useState } from "react";

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
    confidence?: number;
  };
}

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

  for (const r of candidates) {

    if (!r) continue;

    if (isStWord) {

      if (
        [
          "stap",
          "top",
          "stok",
          "stob",
          "stoppen",
          "sto",
        ].includes(r)
      ) {
        extraCandidates.push(
          "stop"
        );
      }

      if (
        [
          "ter",
          "sterr",
          "stehr",
        ].includes(r)
      ) {
        extraCandidates.push(
          "ster"
        );
      }

      if (
        [
          "teen",
          "stean",
          "stien",
        ].includes(r)
      ) {
        extraCandidates.push(
          "steen"
        );
      }
    }

    if (isDrWord) {

      if (
        r.startsWith("r") &&
        r.length >= 2
      ) {
        extraCandidates.push(
          "d" + r
        );
      }

      if (
        [
          "room",
          "rhoon",
          "ram",
          "roam",
          "droem",
          "droam",
        ].includes(r)
      ) {
        extraCandidates.push(
          "droom"
        );
      }

      if (
        [
          "drive",
          "driv",
          "live",
          "ruif",
          "ruig",
          "ruit",
          "druyf",
          "druijf",
          "druijff",
        ].includes(r)
      ) {
        extraCandidates.push(
          "druif"
        );
      }

      if (
        [
          "raak",
          "raaq",
          "raac",
          "rakh",
          "raaak",
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

      if (
        [
          "vragen",
          "rager",
          "rage",
        ].includes(r)
      ) {
        extraCandidates.push(
          "dragen"
        );
      }

      if (
        [
          "rob",
          "drap",
          "drab",
          "dropp",
          "drob",
        ].includes(r)
      ) {
        extraCandidates.push(
          "drop"
        );
      }

      if (
        [
          "draven",
          "draaven",
          "dravin",
          "dravenn",
          "drayven",
          "drayvin",
        ].includes(r)
      ) {
        extraCandidates.push(
          "draven"
        );
      }

      if (
        [
          "rum",
          "dram",
          "dramm",
          "drumm",
          "trump",
        ].includes(r)
      ) {
        extraCandidates.push(
          "drum"
        );
      }

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

      if (
        [
          "raai",
          "raaien",
          "naaien",
          "ryan",
          "brian",
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

    if (r === t) {
      return true;
    }

    if (
      t === "stop" &&
      (
        r === "stop" ||
        r === "stap" ||
        r === "top" ||
        r.startsWith("sto")
      )
    ) {
      return true;
    }

    if (
      t === "draven" &&
      (
        r === "draven" ||
        r.startsWith("drav") ||
        r.startsWith("dra")
      )
    ) {
      return true;
    }

    if (
      t === "drum" &&
      (
        r === "rum" ||
        r.startsWith("dru") ||
        r.startsWith("dra")
      )
    ) {
      return true;
    }

    if (
      t === "draad" &&
      (
        r === "raad" ||
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

    if (
      r.length >= 4 &&
      (
        r.includes(t) ||
        t.includes(r)
      )
    ) {
      return true;
    }

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

    let maxDist = 1;

    if (t.length >= 6) {
      maxDist = 2;
    }

    if (
      t.startsWith("dr") ||
      t.startsWith("st")
    ) {
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
  transcript: string,
  confidence: number
) => void;

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
      rec.continuous = true;
      rec.interimResults = true;
      rec.maxAlternatives = 25;

      rec.onstart = () => {

        listeningRef.current =
          true;

        setListening(true);
      };

      let resultFired = false;

      rec.onresult = (
        e: SpeechResultEvent
      ) => {

        const transcripts: {
          text: string;
          confidence: number;
        }[] = [];

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

            const alternative =
              result[ai];

            const cleaned =
              alternative
                .transcript
                .trim();

            const confidence =
              typeof alternative.confidence ===
              "number"
                ? alternative.confidence
                : 0;

            if (
              cleaned.length > 0
            ) {

              const firstWord =
                cleaned
                  .split(/\s+/)[0]
                  ?.trim();

              if (firstWord) {

                transcripts.push({
                  text: firstWord,
                  confidence,
                });
              }
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

        for (const item of transcripts) {

          const t =
            item.text;

          const confidence =
            item.confidence;

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

            onResult(
              true,
              t,
              confidence
            );

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

        onResult(
          false,
          "",
          0
        );
      };

      rec.onend = () => {

        listeningRef.current =
          false;

        setListening(false);

        if (!resultFired) {

          setTimeout(() => {

            if (resultFired) {
              return;
            }

            onResult(
              false,
              "",
              0
            );

          }, 700);
        }
      };

      try {

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
