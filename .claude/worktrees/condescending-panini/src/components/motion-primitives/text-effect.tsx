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

type TextEffectProps = {
  children: string;
  per?: "word" | "char" | "line";
  as?: React.ElementType;
  variants?: PrescriptionVariants;
  className?: string;
  preset?: "blur" | "fade-in-blur" | "scale" | "fade" | "slide";
  delay?: number;
  speedSegment?: number;
  trigger?: boolean;
  onAnimationComplete?: () => void;
  segmentWrapperClassName?: string;
};

const defaultContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
  exit: {
    transition: { staggerChildren: 0.05, staggerDirection: -1 },
  },
};

const defaultItemVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
  },
  exit: { opacity: 0 },
};

const presets = {
  blur: {
    container: defaultContainerVariants,
    item: {
      hidden: { opacity: 0, filter: "blur(12px)" },
      visible: { opacity: 1, filter: "blur(0px)" },
      exit: { opacity: 0, filter: "blur(12px)" },
    },
  },
  "fade-in-blur": {
    container: defaultContainerVariants,
    item: {
      hidden: { opacity: 0, y: 20, filter: "blur(12px)" },
      visible: { opacity: 1, y: 0, filter: "blur(0px)" },
      exit: { opacity: 0, y: 20, filter: "blur(12px)" },
    },
  },
  scale: {
    container: defaultContainerVariants,
    item: {
      hidden: { opacity: 0, scale: 0 },
      visible: { opacity: 1, scale: 1 },
      exit: { opacity: 0, scale: 0 },
    },
  },
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
};

const AnimationComponent: React.FC<TextEffectProps> = ({
  children,
  per = "word",
  as = "div",
  variants,
  className,
  preset,
  delay = 0,
  speedSegment = 0.05,
  trigger = true,
  onAnimationComplete,
  segmentWrapperClassName,
}) => {
  const Component = as as any; // motion(as) is not directly supported for dynamic strings, using generic motion component

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

  // Override stagger based on speedSegment if provided
  if (speedSegment && computedVariants.container?.visible) {
    const visible = computedVariants.container.visible as TargetAndTransition;
    if (visible.transition) {
      // @ts-ignore
      visible.transition.staggerChildren = speedSegment;
    }
  }

  // Split text logic
  const segments = React.useMemo(() => {
    if (per === "line") {
      return children.split("\n");
    }
    if (per === "word") {
      return children.split(/(\s+)/);
    }
    return children.split("");
  }, [children, per]);

  return (
    <AnimatePresence mode="wait">
      {trigger && (
        <MotionTag
          className={cn("whitespace-pre-wrap", className)}
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={computedVariants.container}
          onAnimationComplete={onAnimationComplete}
        >
          {segments.map((segment, index) => (
            <motion.span
              key={index}
              variants={computedVariants.item}
              className={cn("inline-block", segmentWrapperClassName)}
            >
              {segment}
            </motion.span>
          ))}
        </MotionTag>
      )}
    </AnimatePresence>
  );
};

export { AnimationComponent as TextEffect };
