import type { Variants, Transition } from 'motion/react';

export const durations = {
  instant: 0.12,
  fast: 0.2,
  base: 0.35,
  slow: 0.6,
  xslow: 0.9,
} as const;

export const easings = {
  egg: [0.34, 1.56, 0.64, 1] as const,
  smooth: [0.16, 1, 0.3, 1] as const,
  outExpo: [0.16, 1, 0.3, 1] as const,
  inOut: [0.76, 0, 0.24, 1] as const,
  outBack: [0.34, 1.56, 0.64, 1] as const,
};

export const spring: Transition = {
  type: 'spring',
  stiffness: 250,
  damping: 20,
  mass: 0.8,
};

export const springSnap: Transition = {
  type: 'spring',
  stiffness: 350,
  damping: 25,
  mass: 0.5,
};

export const springSoft: Transition = {
  type: 'spring',
  stiffness: 200,
  damping: 22,
  mass: 1,
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: durations.base, ease: easings.smooth } },
};

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: durations.base, ease: easings.smooth } },
};

export const fadeInDown: Variants = {
  hidden: { opacity: 0, y: -16 },
  visible: { opacity: 1, y: 0, transition: { duration: durations.base, ease: easings.smooth } },
};

export const fadeInScale: Variants = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: { opacity: 1, scale: 1, transition: { duration: durations.base, ease: easings.smooth } },
};

export const slideInRight: Variants = {
  hidden: { x: 20, opacity: 0 },
  visible: { x: 0, opacity: 1, transition: { duration: durations.base, ease: easings.smooth } },
};

export const slideOutRight: Variants = {
  hidden: { x: 0, opacity: 1 },
  visible: { x: 20, opacity: 0, transition: { duration: durations.fast, ease: easings.smooth } },
};

export const eggBounce: Variants = {
  hidden: { scale: 0.8, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: { type: 'spring', stiffness: 300, damping: 14, mass: 0.6 },
  },
};

export const badgePop: Variants = {
  hidden: { scale: 0.5, opacity: 0 },
  visible: { scale: 1, opacity: 1, transition: springSnap },
  exit: { scale: 0.5, opacity: 0, transition: { duration: durations.fast } },
};

export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.05,
    },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: durations.base, ease: easings.smooth },
  },
};

export const cardHover = {
  scale: 1.02,
  transition: spring,
};

export const cardTap = {
  scale: 0.98,
  transition: springSnap,
};

export const buttonHover = {
  scale: 1.03,
  transition: spring,
};

export const buttonTap = {
  scale: 0.97,
  transition: springSnap,
};

export const iconHover = {
  scale: 1.15,
  transition: spring,
};

export const iconTap = {
  scale: 0.9,
  transition: springSnap,
};

export const yolkPulse = {
  scale: [1, 1.04, 1],
  transition: {
    duration: 4,
    repeat: Infinity,
    ease: 'easeInOut',
  },
};

export const pageTransition: Variants = {
  initial: { opacity: 0, y: -8, scale: 0.99 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 12, scale: 0.98 },
};

export const pageTransitionConfig: Transition = {
  duration: durations.base,
  ease: easings.smooth,
};

export const listTransition: Transition = {
  type: 'spring',
  stiffness: 280,
  damping: 24,
  mass: 0.8,
};
