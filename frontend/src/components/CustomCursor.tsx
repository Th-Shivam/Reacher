import { useEffect, useRef } from 'react';

const INTERACTIVE_SELECTOR = 'a, button, input, textarea, select, summary, [role="button"], [data-cursor="interactive"]';

export default function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const pointerQuery = window.matchMedia('(pointer: fine)');

    if (!pointerQuery.matches || !cursorRef.current) {
      return;
    }

    const cursor = cursorRef.current;
    const current = { x: -100, y: -100 };
    const target = { x: -100, y: -100 };
    let animationFrame: number | null = null;

    const render = () => {
      current.x += (target.x - current.x) * 0.28;
      current.y += (target.y - current.y) * 0.28;
      cursor.style.transform = `translate3d(${current.x}px, ${current.y}px, 0)`;

      if (Math.abs(target.x - current.x) > 0.1 || Math.abs(target.y - current.y) > 0.1) {
        animationFrame = requestAnimationFrame(render);
      } else {
        animationFrame = null;
      }
    };

    const scheduleRender = () => {
      if (animationFrame === null) {
        animationFrame = requestAnimationFrame(render);
      }
    };

    const handlePointerMove = (event: PointerEvent) => {
      target.x = event.clientX;
      target.y = event.clientY;
      cursor.classList.add('is-visible');
      scheduleRender();
    };

    const handlePointerOver = (event: PointerEvent) => {
      const element = event.target instanceof Element ? event.target : null;
      cursor.classList.toggle('is-interactive', Boolean(element?.closest(INTERACTIVE_SELECTOR)));
    };

    const handlePointerDown = () => cursor.classList.add('is-pressed');
    const handlePointerUp = () => cursor.classList.remove('is-pressed');
    const handlePointerLeave = () => cursor.classList.remove('is-visible');

    document.documentElement.classList.add('custom-cursor-active');
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerover', handlePointerOver, { passive: true });
    window.addEventListener('pointerdown', handlePointerDown, { passive: true });
    window.addEventListener('pointerup', handlePointerUp, { passive: true });
    document.documentElement.addEventListener('mouseleave', handlePointerLeave);

    return () => {
      document.documentElement.classList.remove('custom-cursor-active');
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerover', handlePointerOver);
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointerup', handlePointerUp);
      document.documentElement.removeEventListener('mouseleave', handlePointerLeave);

      if (animationFrame !== null) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, []);

  return (
    <div ref={cursorRef} className="custom-cursor" aria-hidden="true">
      <span className="custom-cursor-glow" />
      <span className="custom-cursor-arrow" />
    </div>
  );
}
