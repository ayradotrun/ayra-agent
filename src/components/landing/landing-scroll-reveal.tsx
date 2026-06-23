"use client";

import {
  motion,
  useReducedMotion,
  type Variants,
} from "framer-motion";

const VARIANTS = {
  fadeUp: {
    hidden: { opacity: 0, y: 32 },
    visible: { opacity: 1, y: 0 },
  },
  fadeIn: {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  },
  slideLeft: {
    hidden: { opacity: 0, x: -36 },
    visible: { opacity: 1, x: 0 },
  },
  slideRight: {
    hidden: { opacity: 0, x: 36 },
    visible: { opacity: 1, x: 0 },
  },
  scale: {
    hidden: { opacity: 0, scale: 0.92 },
    visible: { opacity: 1, scale: 1 },
  },
} satisfies Record<string, Variants>;

export type ScrollRevealVariant = keyof typeof VARIANTS;

const EASE = [0.22, 1, 0.36, 1] as const;

interface ScrollRevealProps {
  children: React.ReactNode;
  variant?: ScrollRevealVariant;
  delay?: number;
  duration?: number;
  className?: string;
  amount?: number;
  once?: boolean;
}

export function ScrollReveal({
  children,
  variant = "fadeUp",
  delay = 0,
  duration = 0.55,
  className,
  amount = 0.18,
  once = true,
}: ScrollRevealProps) {
  const reduced = useReducedMotion();

  if (reduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, amount }}
      variants={VARIANTS[variant]}
      transition={{ duration, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

interface ScrollStaggerProps {
  children: React.ReactNode;
  className?: string;
  stagger?: number;
  delayChildren?: number;
  amount?: number;
}

export function ScrollStagger({
  children,
  className,
  stagger = 0.08,
  delayChildren = 0.05,
  amount = 0.12,
}: ScrollStaggerProps) {
  const reduced = useReducedMotion();

  if (reduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount }}
      variants={{
        hidden: {},
        visible: {
          transition: { staggerChildren: stagger, delayChildren },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

const STAGGER_ITEM_VARIANTS = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: EASE },
  },
} satisfies Variants;

export function ScrollStaggerItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reduced = useReducedMotion();

  if (reduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div className={className} variants={STAGGER_ITEM_VARIANTS}>
      {children}
    </motion.div>
  );
}

interface ScrollStaggerListProps {
  children: React.ReactNode;
  className?: string;
  stagger?: number;
  delayChildren?: number;
  amount?: number;
}

export function ScrollStaggerList({
  children,
  className,
  stagger = 0.08,
  delayChildren = 0.05,
  amount = 0.12,
}: ScrollStaggerListProps) {
  const reduced = useReducedMotion();

  if (reduced) {
    return <ul className={className}>{children}</ul>;
  }

  return (
    <motion.ul
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount }}
      variants={{
        hidden: {},
        visible: {
          transition: { staggerChildren: stagger, delayChildren },
        },
      }}
    >
      {children}
    </motion.ul>
  );
}

export function ScrollStaggerListItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reduced = useReducedMotion();

  if (reduced) {
    return <li className={className}>{children}</li>;
  }

  return (
    <motion.li className={className} variants={STAGGER_ITEM_VARIANTS}>
      {children}
    </motion.li>
  );
}
