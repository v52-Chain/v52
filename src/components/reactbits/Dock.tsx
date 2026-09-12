import { motion, useMotionValue, useSpring, useTransform, type MotionValue } from "motion/react";
import { useRef, useState, type ReactNode } from "react";
import "./reactBits.css";

export interface DockItemData {
  icon: ReactNode;
  label: string;
  href: string;
}

interface DockProps {
  items: DockItemData[];
  ariaLabel: string;
}

function DockItem({ item, mouseX }: { item: DockItemData; mouseX: MotionValue<number> }) {
  const ref = useRef<HTMLAnchorElement>(null);
  const [hovered, setHovered] = useState(false);
  const distance = useTransform(mouseX, (value) => {
    const rect = ref.current?.getBoundingClientRect();
    return rect ? value - rect.left - rect.width / 2 : Infinity;
  });
  const targetSize = useTransform(distance, [-140, 0, 140], [42, 61, 42]);
  const size = useSpring(targetSize, { mass: .12, stiffness: 170, damping: 14 });

  return (
    <motion.a
      ref={ref}
      href={item.href}
      className="v52-dock-item"
      style={{ width: size, height: size }}
      aria-label={item.label}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
    >
      <span className="v52-dock-icon" aria-hidden="true">{item.icon}</span>
      {hovered ? <motion.span initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="v52-dock-label">{item.label}</motion.span> : null}
    </motion.a>
  );
}

export function Dock({ items, ariaLabel }: DockProps) {
  const mouseX = useMotionValue(Infinity);
  return (
    <nav className="v52-dock-shell" aria-label={ariaLabel}>
      <motion.div
        className="v52-dock-panel"
        onMouseMove={(event) => mouseX.set(event.pageX)}
        onMouseLeave={() => mouseX.set(Infinity)}
      >
        {items.map((item) => <DockItem key={item.href} item={item} mouseX={mouseX} />)}
      </motion.div>
    </nav>
  );
}
