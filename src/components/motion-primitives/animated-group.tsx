"use client";

import { cn } from "@/lib/utils";
import {
  AnimatePresence,
  motion,
  TargetAndTransition,
  Variants,
} from "motion/react";
import React from "react";

type PrescriptionVariants = {
  container?: Variants;
  item?: Variants;
};

type AnimatedGroupProps = {
  children: React.ReactNode;
  className?: string;
  variants?: PrescriptionVariants;
  preset?: "fade" | "slide" | "scale" | "blur" | "blur-slide" | "zoom" | "flip";
  as?: React.ElementType;
  asChild?: boolean; // Note: asChild logic complexity omitted for simplicity, treating as direct wrapper
};

const defaultContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      staggerChildren: 0.1,
      staggerDirection: -1,
    },
  },
};

const defaultItemVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

const presets = {
  fade: {
    container: defaultContainerVariants,
    item: {
      hidden: { opacity: 0 },
      visible: { opacity: 1 },
      exit: { opacity: 0 },
    },
  },
  slide: {
    container: defaultContainerVariants,
    item: {
      hidden: { opacity: 0, y: 20 },
      visible: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: 20 },
    },
  },
  scale: {
    container: defaultContainerVariants,
    item: {
      hidden: { opacity: 0, scale: 0.8 },
      visible: { opacity: 1, scale: 1 },
      exit: { opacity: 0, scale: 0.8 },
    },
  },
  blur: {
    container: defaultContainerVariants,
    item: {
      hidden: { opacity: 0, filter: "blur(8px)" },
      visible: { opacity: 1, filter: "blur(0px)" },
      exit: { opacity: 0, filter: "blur(8px)" },
    },
  },
  "blur-slide": {
    container: defaultContainerVariants,
    item: {
      hidden: { opacity: 0, filter: "blur(8px)", y: 20 },
      visible: { opacity: 1, filter: "blur(0px)", y: 0 },
      exit: { opacity: 0, filter: "blur(8px)", y: 20 },
    },
  },
  zoom: {
    container: defaultContainerVariants,
    item: {
      hidden: { opacity: 0, scale: 0.5 },
      visible: {
        opacity: 1,
        scale: 1,
        transition: { type: "spring", stiffness: 300, damping: 20 } as const,
      },
      exit: { opacity: 0, scale: 0.5 },
    },
  },
  flip: {
    container: defaultContainerVariants,
    item: {
      hidden: { opacity: 0, rotateX: -90 },
      visible: {
        opacity: 1,
        rotateX: 0,
        transition: { type: "spring", stiffness: 300, damping: 20 } as const,
      },
      exit: { opacity: 0, rotateX: 90 },
    },
  },
};

function AnimatedGroup({
  children,
  className,
  variants,
  preset,
  as = "div",
}: AnimatedGroupProps) {
  const MotionTag = (motion[as as keyof typeof motion] as any) || motion.div;

  let computedVariants: PrescriptionVariants = {
    container: defaultContainerVariants,
    item: defaultItemVariants,
  };

  if (preset) {
    computedVariants = presets[preset];
  }

  if (variants) {
    computedVariants = { ...computedVariants, ...variants };
  }

  return (
    <MotionTag
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={computedVariants.container}
      className={className}
    >
      {React.Children.map(children, (child, index) => (
        <motion.div key={index} variants={computedVariants.item}>
          {child}
        </motion.div>
      ))}
    </MotionTag>
  );
}

export { AnimatedGroup };
