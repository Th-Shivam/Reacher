import { cn } from "@/lib/utils";
import { IconLayoutNavbarCollapse } from "@tabler/icons-react";
import {
  AnimatePresence,
  MotionValue,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from "motion/react";

import { useRef, useState } from "react";

export interface DockItem {
  title: string;
  icon: React.ReactNode;
  href?: string;
  onClick?: () => void;
  isActive?: boolean;
}

export const FloatingDock = ({
  items,
  desktopClassName,
  mobileClassName,
}: {
  items: DockItem[];
  desktopClassName?: string;
  mobileClassName?: string;
}) => {
  return (
    <>
      <FloatingDockDesktop items={items} className={desktopClassName} />
      <FloatingDockMobile items={items} className={mobileClassName} />
    </>
  );
};

const FloatingDockMobile = ({
  items,
  className,
}: {
  items: DockItem[];
  className?: string;
}) => {
  const [open, setOpen] = useState(false);
  return (
    <div className={cn("relative block md:hidden", className)}>
      <AnimatePresence>
        {open && (
          <motion.div
            layoutId="nav"
            className="absolute inset-x-0 bottom-full mb-3 flex flex-col gap-2 items-center"
          >
            {items.map((item, idx) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 10 }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                exit={{
                  opacity: 0,
                  y: 10,
                  transition: {
                    delay: idx * 0.04,
                  },
                }}
                transition={{ delay: (items.length - 1 - idx) * 0.04 }}
              >
                {item.onClick ? (
                  <button
                    onClick={() => {
                      setOpen(false);
                      item.onClick?.();
                    }}
                    aria-label={item.title}
                    className={cn(
                      "flex h-11 w-11 items-center justify-center rounded-full bg-neutral-900/90 border border-white/10 shadow-lg text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer",
                      item.isActive && "bg-neutral-800 border-indigo-500/50 text-indigo-400"
                    )}
                  >
                    <div className="flex items-center justify-center w-5 h-5">{item.icon}</div>
                  </button>
                ) : (
                  <a
                    href={item.href || "#"}
                    aria-label={item.title}
                    className={cn(
                      "flex h-11 w-11 items-center justify-center rounded-full bg-neutral-900/90 border border-white/10 shadow-lg text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors",
                      item.isActive && "bg-neutral-800 border-indigo-500/50 text-indigo-400"
                    )}
                  >
                    <div className="flex items-center justify-center w-5 h-5">{item.icon}</div>
                  </a>
                )}
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      <button
        onClick={() => setOpen(!open)}
        aria-label="Toggle navigation dock"
        className="flex h-11 w-11 items-center justify-center rounded-full bg-neutral-950/90 border border-white/15 shadow-xl text-neutral-300 hover:text-white hover:bg-neutral-900 transition-all cursor-pointer"
      >
        <IconLayoutNavbarCollapse className="h-5 w-5" />
      </button>
    </div>
  );
};

const FloatingDockDesktop = ({
  items,
  className,
}: {
  items: DockItem[];
  className?: string;
}) => {
  const mouseX = useMotionValue(Infinity);

  return (
    <motion.div
      onMouseMove={(e) => mouseX.set(e.pageX)}
      onMouseLeave={() => mouseX.set(Infinity)}
      className={cn(
        "hidden md:flex h-[58px] items-center justify-center gap-2 rounded-2xl bg-neutral-950/85 backdrop-blur-xl px-3.5 border border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.6)] ring-1 ring-white/5",
        className
      )}
    >
      {items.map((item) => (
        <IconContainer mouseX={mouseX} key={item.title} {...item} />
      ))}
    </motion.div>
  );
};

function IconContainer({
  mouseX,
  title,
  icon,
  href,
  onClick,
  isActive,
}: {
  mouseX: MotionValue;
  title: string;
  icon: React.ReactNode;
  href?: string;
  onClick?: () => void;
  isActive?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);

  const distance = useTransform(mouseX, (val) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
    return val - bounds.x - bounds.width / 2;
  });

  // Subtle magnification (42px -> 50px)
  const sizeTransform = useTransform(distance, [-120, 0, 120], [42, 50, 42]);
  const iconScaleTransform = useTransform(distance, [-120, 0, 120], [1, 1.08, 1]);

  const size = useSpring(sizeTransform, {
    mass: 0.1,
    stiffness: 220,
    damping: 18,
  });

  const iconScale = useSpring(iconScaleTransform, {
    mass: 0.1,
    stiffness: 220,
    damping: 18,
  });

  const content = (
    <motion.div
      ref={ref}
      style={{ width: size, height: size }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        "relative flex items-center justify-center rounded-xl transition-colors duration-150 cursor-pointer select-none",
        isActive
          ? "bg-white/15 text-white border border-white/20 shadow-[0_0_12px_rgba(255,255,255,0.15)]"
          : "bg-white/5 text-neutral-400 hover:text-white hover:bg-white/12 border border-white/5 hover:border-white/15"
      )}
    >
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, y: 6, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 3, x: "-50%" }}
            transition={{ duration: 0.15 }}
            className="absolute -top-10 left-1/2 -translate-x-1/2 pointer-events-none z-50 whitespace-nowrap rounded-md border border-white/10 bg-neutral-900/95 px-2.5 py-1 text-[11px] font-medium text-neutral-200 shadow-xl backdrop-blur-md"
          >
            {title}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        style={{ scale: iconScale }}
        className="flex items-center justify-center w-5 h-5 text-current"
      >
        {icon}
      </motion.div>
    </motion.div>
  );

  if (onClick) {
    return (
      <button
        onClick={onClick}
        aria-label={title}
        className="bg-transparent border-0 p-0 m-0 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-xl"
      >
        {content}
      </button>
    );
  }

  return (
    <a
      href={href || "#"}
      aria-label={title}
      className="outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-xl"
    >
      {content}
    </a>
  );
}
