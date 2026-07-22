"use client";
import { useRef, useState, useEffect, ReactNode } from "react";

interface FadeUpProps {
  children: ReactNode;
  delay?: number;
  className?: string;
  threshold?: number;
}

/**
 * Scroll-triggered fade-up animation component.
 * Wraps children and animates them upward when they enter the viewport.
 *
 * @param delay - Animation delay in seconds (default: 0)
 * @param threshold - IntersectionObserver threshold (default: 0.15)
 */
export default function FadeUp({ children, delay = 0, className = "", threshold = 0.15 }: FadeUpProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(30px)",
        transition: `all 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}s`,
      }}
    >
      {children}
    </div>
  );
}