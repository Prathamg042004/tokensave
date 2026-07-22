"use client";
import { useRef, useState, useEffect } from "react";

interface CountUpProps {
  /** Target number to count to */
  end: number;
  /** Text before the number (e.g. "$") */
  prefix?: string;
  /** Text after the number (e.g. "%", "ms") */
  suffix?: string;
  /** Number of decimal places */
  decimals?: number;
  /** Animation duration in milliseconds */
  duration?: number;
}

/**
 * Animated counter that counts from 0 to a target number
 * when it enters the viewport. Uses easeOutQuart easing
 * for a natural deceleration effect.
 */
export default function CountUp({
  end,
  prefix = "",
  suffix = "",
  decimals = 0,
  duration = 1200,
}: CountUpProps) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current && end > 0) {
          hasAnimated.current = true;
          const start = performance.now();

          const animate = (now: number) => {
            const progress = Math.min((now - start) / duration, 1);
            // easeOutQuart: fast start, slow finish
            const eased = 1 - Math.pow(1 - progress, 4);
            setValue(eased * end);

            if (progress < 1) requestAnimationFrame(animate);
          };

          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [end, duration]);

  const display = decimals > 0
    ? value.toFixed(decimals)
    : Math.floor(value).toLocaleString();

  return (
    <span ref={ref}>
      {prefix}{display}{suffix}
    </span>
  );
}