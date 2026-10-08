"use client";

import { useEffect, useState } from "react";

const PHRASE = "Bem-vindo de volta! A jornada continua.";
const TYPE_SPEED_MS = 55;
const DELETE_SPEED_MS = 30;
const HOLD_FULL_MS = 2200;
const HOLD_EMPTY_MS = 500;

export function TypewriterQuote() {
  const [chars, setChars] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!deleting && chars < PHRASE.length) {
      const t = setTimeout(() => setChars((c) => c + 1), TYPE_SPEED_MS);
      return () => clearTimeout(t);
    }
    if (!deleting && chars === PHRASE.length) {
      const t = setTimeout(() => setDeleting(true), HOLD_FULL_MS);
      return () => clearTimeout(t);
    }
    if (deleting && chars > 0) {
      const t = setTimeout(() => setChars((c) => c - 1), DELETE_SPEED_MS);
      return () => clearTimeout(t);
    }
    // deleting && chars === 0
    const t = setTimeout(() => setDeleting(false), HOLD_EMPTY_MS);
    return () => clearTimeout(t);
  }, [chars, deleting]);

  return (
    <p className="font-display text-xl italic text-white text-balance">
      &ldquo;{PHRASE.slice(0, chars)}
      <span className="animate-pulse">|</span>&rdquo;
    </p>
  );
}
