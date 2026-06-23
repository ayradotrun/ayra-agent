"use client";

import { useEffect } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

export function LandingHeroBg() {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const smoothX = useSpring(mouseX, { stiffness: 40, damping: 20 });
  const smoothY = useSpring(mouseY, { stiffness: 40, damping: 20 });

  const orb1X = useTransform(smoothX, [-1, 1], [-30, 30]);
  const orb1Y = useTransform(smoothY, [-1, 1], [-20, 20]);
  const orb2X = useTransform(smoothX, [-1, 1], [20, -25]);
  const orb2Y = useTransform(smoothY, [-1, 1], [15, -15]);

  useEffect(() => {
    function onMove(e: MouseEvent) {
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = (e.clientY / window.innerHeight) * 2 - 1;
      mouseX.set(x);
      mouseY.set(y);
    }
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, [mouseX, mouseY]);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <motion.div
        style={{ x: orb1X, y: orb1Y }}
        className="absolute left-1/2 top-0 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-emerald-500/[0.07] blur-3xl"
        animate={{ scale: [1, 1.06, 1], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        style={{ x: orb2X, y: orb2Y }}
        className="absolute -right-24 top-1/4 h-[360px] w-[360px] rounded-full bg-emerald-600/[0.05] blur-3xl"
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      />
      <motion.div
        className="absolute -left-20 bottom-1/3 h-[280px] w-[280px] rounded-full bg-teal-500/[0.04] blur-3xl"
        animate={{ y: [0, -18, 0], x: [0, 12, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Floating dots */}
      {[
        { top: "18%", left: "12%", delay: 0 },
        { top: "32%", left: "78%", delay: 1.2 },
        { top: "62%", left: "8%", delay: 0.6 },
        { top: "72%", left: "85%", delay: 2 },
      ].map((dot, i) => (
        <motion.span
          key={i}
          className="absolute h-1 w-1 rounded-full bg-emerald-400/40"
          style={{ top: dot.top, left: dot.left }}
          animate={{ opacity: [0.2, 0.8, 0.2], scale: [1, 1.5, 1] }}
          transition={{ duration: 4, repeat: Infinity, delay: dot.delay }}
        />
      ))}
    </div>
  );
}
