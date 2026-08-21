import { useEffect } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';

export function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  const spring = useSpring(0, { mass: 1, stiffness: 50, damping: 20 });
  const display = useTransform(spring, (current) => current.toFixed(1));

  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  return <motion.span className={className}>{display}</motion.span>;
}
