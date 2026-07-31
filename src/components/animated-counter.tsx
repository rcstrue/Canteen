"use client";

import { useEffect, useMemo, useRef, useState } from "react";

interface AnimatedCounterProps {
  /** Target value to count up to. */
  value: number;
  /** Animation duration in milliseconds (default 1200). */
  duration?: number;
  /** Number of decimals to display (default 0). */
  decimals?: number;
  /** Optional prefix (e.g. "₹"). */
  prefix?: string;
  /** Optional suffix (e.g. "%", " kg"). */
  suffix?: string;
  /** Optional className for the displayed number. */
  className?: string;
}

/** easeOutExpo — fast start, slow settle, dramatic finish. */
function easeOutExpo(progress: number): number {
  return progress >= 1 ? 1 : 1 - Math.pow(2, -10 * progress);
}

/**
 * AnimatedCounter — counts from 0 to `value` on first mount using
 * requestAnimationFrame + easeOutExpo. Subsequent updates to `value`
 * simply display the new value (no re-animation).
 *
 * Uses Intl.NumberFormat('en-IN') for Indian digit grouping (lakhs/crores).
 *
 * Implementation note: all setState calls happen inside the rAF callback
 * (which is async), never synchronously inside the effect body — this
 * keeps React's `react-hooks/set-state-in-effect` lint rule happy and
 * avoids cascading renders.
 */
export function AnimatedCounter({
  value,
  duration = 1200,
  decimals = 0,
  prefix = "",
  suffix = "",
  className,
}: AnimatedCounterProps) {
  // `progress` animates 0 → 1 over `duration` ms on first mount only.
  const [progress, setProgress] = useState(0);

  // Freeze the initial target so the animation isn't disturbed if the
  // parent updates `value` mid-animation. `useState(value)` only reads
  // `value` on the very first render.
  const [initialValue] = useState(value);

  const rafRef = useRef<number | null>(null);

  // Formatter stays in sync with `decimals`.
  const formatter = useMemo(
    () =>
      new Intl.NumberFormat("en-IN", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }),
    [decimals]
  );

  useEffect(() => {
    // Always kick off the rAF loop. If `value` is 0 or negative on mount,
    // the animation is a visual no-op (0 → 0) but `progress` still reaches 1,
    // which lets the render branch switch to "show live value".
    const start = performance.now();

    const tick = (now: number) => {
      const elapsed = now - start;
      const p = Math.min(elapsed / duration, 1);
      // setState inside a rAF callback is async — safe per React's lint rule.
      setProgress(p);
      if (p < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [duration]);

  // During animation: animate from 0 → initialValue using eased progress.
  // After animation (progress === 1): show the live `value` prop directly,
  // so subsequent updates appear instantly without re-animating.
  const easedProgress = easeOutExpo(progress);
  const shownValue = progress >= 1 ? value : initialValue * easedProgress;

  return (
    <span className={className}>
      {prefix}
      {formatter.format(shownValue)}
      {suffix}
    </span>
  );
}

export default AnimatedCounter;
