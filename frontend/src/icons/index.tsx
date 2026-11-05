// Our own icon set: 12 glyphs on a 24×24 grid, 1.5px stroke, round caps, no fills.
// Lines are drawn slightly off-grid on purpose so they read as pen work, not as a UI kit.

const GLYPHS = {
  // today: an unrolled scroll
  scroll: 'M6.2 4.6c2.6-.3 9-.2 11.6.1 1.3.2 1.6 1.7.4 2.1M6.2 4.6C4.7 4.9 4.6 7 6 7.3M6 7.3l.3 10.4c0 1.3-.6 1.9-1.6 1.9h11.6c1.2 0 1.9-.6 1.9-1.8L18 6.8M8.8 10.2h6.3M8.9 13.1h5.6M8.8 16h4',
  // predictions: balance scales
  scales: 'M12 3.8v15.9M7.6 20h8.9M5.1 6.4c2.3.6 4.6.5 6.9-.4 2.3-.8 4.6-.9 6.9-.2M5.3 6.6 2.9 12.4c.9 1.4 3.9 1.5 4.8 0L5.3 6.6Zm13.4-.6-2.4 5.9c.9 1.4 3.9 1.4 4.8 0l-2.4-5.9',
  // map: a compass rose
  compass: 'M12 3.1c5 .1 8.9 4 8.9 8.9-.1 5-4 8.9-8.9 8.9-5-.1-8.9-4-8.9-8.9.1-5 4-8.9 8.9-8.9ZM12 5.6l1.6 4.8 4.8 1.6-4.8 1.6L12 18.4l-1.6-4.8L5.6 12l4.8-1.6Z',
  // profile: a heater shield with a bend
  shield: 'M5.1 4.4c4.6-.6 9.2-.6 13.8 0l-.1 6.3c-.2 4.6-2.8 7.8-6.8 9.4-4-1.5-6.6-4.8-6.8-9.3Zm.4 1.9 12.8 9.3',
  quill: 'M19.6 3.6C13.4 5 8.7 9.6 6.4 16.2l-1.6 4.4M19.6 3.6c-.4 5.9-4.2 10.6-10.4 12.4M9.7 12.4l3.1.4M7.9 15.4l2.8.2',
  hourglass: 'M6.4 3.6h11.2M6.4 20.4h11.2M7.4 3.8c-.2 3.6 1.6 6 4.6 8.2-3 2.1-4.8 4.6-4.6 8.2M16.6 3.8c.2 3.6-1.6 6-4.6 8.2 3 2.1 4.8 4.6 4.6 8.2M9.6 18.2c1.6-1.3 3.2-1.3 4.8 0',
  lock: 'M5.6 10.6c4.3-.3 8.5-.3 12.8 0l-.2 9.6c-4.1.3-8.3.3-12.4 0ZM8.3 10.4V7.6c.1-2.4 1.6-3.9 3.7-3.9s3.6 1.5 3.7 3.9v2.8M12 14.2v2.6',
  key: 'M8.1 14.3c-2.1 0-3.6-1.5-3.6-3.4 0-2 1.6-3.5 3.6-3.4 1.9 0 3.4 1.5 3.4 3.4 0 2-1.5 3.4-3.4 3.4ZM11.4 10.9l8.4.1M16.4 11l.1 2.9M19 11v2.2',
  // a wax seal: blob with an impressed star
  seal: 'M12 3.4c2.1.4 2.8 1.6 4.6 1.7 1.9.9 1.9 2.4 2.9 4 .7 1.9-.4 3 0 4.9-.6 1.9-2 2.3-3.1 3.8-1.6 1-3 .4-4.6 1.2-1.9-.3-2.6-1.4-4.4-1.8-1.6-1.1-1.6-2.6-2.7-4.1-.5-1.9.6-3 .3-4.9.7-1.8 2.1-2.2 3.2-3.6 1.4-1 2.5-.5 3.8-1.2ZM12 8.2l1.1 2.7 2.8.2-2.2 1.8.7 2.8-2.4-1.5-2.4 1.5.7-2.8-2.2-1.8 2.8-.2Z',
  up: 'M12.1 19.6 11.9 4.8M6.6 10.1c2.2-1.6 3.9-3.4 5.3-5.6 1.4 2.2 3.1 4 5.5 5.6',
  down: 'M11.9 4.4l.2 14.8M17.4 13.9c-2.2 1.6-3.9 3.4-5.3 5.6-1.4-2.2-3.1-4-5.5-5.6',
  cross: 'M6.3 6.1c3.9 3.7 7.6 7.6 11.3 11.8M17.8 6.2C13.9 9.8 10.1 13.7 6.2 17.9',
}

export type IconName = keyof typeof GLYPHS

export function Icon({ name, size = 22, className = '', rotate = 0, title }: { name: IconName; size?: number; className?: string; rotate?: number; title?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}
      strokeLinecap="round" strokeLinejoin="round" className={className} role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true} aria-label={title} style={rotate ? { transform: `rotate(${rotate}deg)` } : undefined}>
      <path d={GLYPHS[name]} />
    </svg>
  )
}
