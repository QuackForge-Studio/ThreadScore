import { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(useGSAP, ScrollTrigger);

/* Fade + rise reveal khi vào viewport */
export function Reveal({ children, delay = 0, y = 28, className = '' }: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    gsap.fromTo(ref.current, { autoAlpha: 0, y },
      { autoAlpha: 1, y: 0, duration: 0.9, delay, ease: 'power3.out',
        scrollTrigger: { trigger: ref.current, start: 'top 88%', once: true } });
  }, { scope: ref });
  return <div ref={ref} className={className}>{children}</div>;
}

/* Scrub từng từ: opacity 0.12 -> 1 theo scroll */
export function ScrubText({ text, className = '' }: { text: string; className?: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  useGSAP(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const el = ref.current;
    if (!el) return;
    const words = el.querySelectorAll<HTMLElement>('.scrub-word');
    gsap.to(words, {
      opacity: 1,
      stagger: 0.08,
      ease: 'none',
      scrollTrigger: {
        trigger: el,
        start: 'top 80%',
        end: 'bottom 45%',
        scrub: 0.6,
      },
    });
  }, { scope: ref });
  return (
    <p ref={ref} className={className}>
      {text.split(' ').map((w, i) => (
        <span key={i} className="scrub-word">{w}&nbsp;</span>
      ))}
    </p>
  );
}

/* Đếm số khi vào viewport */
export function CountUp({ to, duration = 1.6, className = '' }: { to: number; duration?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useGSAP(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      if (ref.current) ref.current.textContent = String(to);
      return;
    }
    const obj = { v: 0 };
    gsap.to(obj, {
      v: to,
      duration,
      ease: 'power2.out',
      scrollTrigger: { trigger: ref.current, start: 'top 90%', once: true },
      onUpdate: () => {
        if (ref.current) ref.current.textContent = String(Math.round(obj.v));
      },
    });
  }, { scope: ref });
  return <span ref={ref} className={className}>0</span>;
}
