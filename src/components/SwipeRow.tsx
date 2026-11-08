import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Icon } from './Icon';
import { dragOffset, settle, SWIPE_ACTION_W, SWIPE_SLOP } from '../lib/swipe';

/** Открыта может быть только одна карточка: открытие новой закрывает предыдущую. */
const OPEN_EVENT = 'swiperow:open';

type Gesture = { id: number; x: number; y: number; t: number; base: number; axis: 'x' | 'y' | null; lastX: number; lastT: number; v: number };

/**
 * Карточка списка, у которой свайп влево открывает справа кнопку «Удалить».
 * Вертикальная прокрутка остаётся за браузером (touch-action: pan-y), клик после
 * жеста или по открытой карточке не уводит на экран записи, а закрывает кнопку.
 */
export function SwipeRow({ children, onDelete, label, radius = 'm' }: { children: ReactNode; onDelete: () => void; label: string; radius?: 'm' | 'l' }) {
  const id = useId();
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const g = useRef<Gesture | null>(null);
  const swallowClick = useRef(false);
  const root = useRef<HTMLDivElement>(null);
  const open = offset < 0 && !dragging;

  useEffect(() => {
    const onOpen = (e: Event) => (e as CustomEvent<string>).detail !== id && setOffset(0);
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, [id]);

  // Тап мимо открытой карточки закрывает её.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOffset(0);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    swallowClick.current = offset < 0;
    g.current = { id: e.pointerId, x: e.clientX, y: e.clientY, t: e.timeStamp, base: offset, axis: null, lastX: e.clientX, lastT: e.timeStamp, v: 0 };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const s = g.current;
    if (!s || s.id !== e.pointerId) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (!s.axis) {
      if (Math.abs(dx) < SWIPE_SLOP && Math.abs(dy) < SWIPE_SLOP) return;
      s.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      if (s.axis === 'y') return;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      setDragging(true);
      swallowClick.current = true;
      window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: id }));
    }
    if (s.axis !== 'x') return;
    const dt = e.timeStamp - s.lastT;
    if (dt > 0) s.v = (e.clientX - s.lastX) / dt;
    s.lastX = e.clientX;
    s.lastT = e.timeStamp;
    setOffset(dragOffset(s.base, dx));
  };

  const finish = (e: React.PointerEvent) => {
    const s = g.current;
    if (!s || s.id !== e.pointerId) return;
    g.current = null;
    if (s.axis === 'x') {
      setDragging(false);
      setOffset((x) => (settle(x, s.v) ? -SWIPE_ACTION_W : 0));
    } else if (s.axis === null && s.base < 0) {
      setOffset(0); // тап по открытой карточке — просто закрыть
    }
  };

  return (
    <div ref={root} className={`swipe swipe-r-${radius}`}>
      <button
        type="button"
        className="swipe-action"
        aria-label={`Удалить «${label}»`}
        tabIndex={offset < 0 ? 0 : -1}
        aria-hidden={offset < 0 ? undefined : true}
        style={{ visibility: offset < 0 ? 'visible' : 'hidden' }}
        onClick={() => {
          setOffset(0);
          onDelete();
        }}
      >
        <Icon name="trash" size={22} />
        <span>Удалить</span>
      </button>
      <div
        className={'swipe-content' + (dragging ? ' dragging' : '')}
        style={{ transform: offset ? `translateX(${offset}px)` : undefined }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finish}
        onPointerCancel={finish}
        onClickCapture={(e) => {
          if (!swallowClick.current) return;
          swallowClick.current = false;
          e.preventDefault();
          e.stopPropagation();
        }}
        onDragStart={(e) => e.preventDefault()}
      >
        {children}
      </div>
    </div>
  );
}
