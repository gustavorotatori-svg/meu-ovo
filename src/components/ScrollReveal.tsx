import { useEffect, useRef, useState, ReactNode } from 'react';

type RevealDirection = 'up' | 'down' | 'left' | 'right' | 'fade' | 'zoom';

interface ScrollRevealProps {
  children: ReactNode;
  key?: string | number;
  direction?: RevealDirection;
  delay?: number;
  duration?: number;
  threshold?: number;
  className?: string;
  once?: boolean;
}

const transformMap: Record<RevealDirection, string> = {
  up: 'translateY(36px)',
  down: 'translateY(-36px)',
  left: 'translateX(-36px)',
  right: 'translateX(36px)',
  zoom: 'scale(0.92)',
  fade: 'none',
};

export default function ScrollReveal({
  children,
  direction = 'up',
  delay = 0,
  duration = 700,
  threshold = 0.1,
  className = '',
  once = true,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (once) observer.unobserve(el);
        } else if (!once) {
          setIsVisible(false);
        }
      },
      { threshold, rootMargin: '0px 0px -40px 0px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, once]);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'none' : transformMap[direction],
        transition: `opacity ${duration}ms cubic-bezier(0.16, 1, 0.3, 1), transform ${duration}ms cubic-bezier(0.16, 1, 0.3, 1)`,
        transitionDelay: `${delay}ms`,
        willChange: 'opacity, transform',
      }}
    >
      {children}
    </div>
  );
}
