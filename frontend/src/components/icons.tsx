const PATHS = {
  today: 'M12 3v2M12 19v2M5 12H3M21 12h-2M6.3 6.3 4.9 4.9M19.1 19.1l-1.4-1.4M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z',
  scroll: 'M8 4h10a2 2 0 0 1 2 2v1h-4M8 4a2 2 0 0 0-2 2v12a2 2 0 0 1-2 2h12a2 2 0 0 0 2-2V7M8 4a2 2 0 0 1 2 2v0M9 10h6M9 14h6',
  map: 'M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Zm0 0v14m6-12v14',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0',
  back: 'm15 18-6-6 6-6',
  close: 'M6 6l12 12M18 6 6 18',
  share: 'M12 15V3m0 0L8 7m4-4 4 4M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7',
  check: 'm5 12 5 5L20 7',
  star: 'M12 2.8 14.8 9l6.7.6-5.1 4.4 1.6 6.6L12 17.2 6 20.6l1.6-6.6L2.5 9.6 9.2 9 12 2.8Z',
  crown: 'M3 8l4 4 5-7 5 7 4-4-2 11H5L3 8Z',
  bell: 'M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8Zm4 12a2 2 0 0 0 4 0',
  lock: 'M6 11h12v10H6V11Zm2 0V7a4 4 0 1 1 8 0v4',
  up: 'M12 19V5m0 0-6 6m6-6 6 6',
  down: 'M12 5v14m0 0 6-6m-6 6-6-6',
  search: 'm20 20-4.5-4.5M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14Z',
  copy: 'M9 9h10v10H9V9Zm-4 6V5h10',
  eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  pin: 'M12 21s-7-6.2-7-12a7 7 0 1 1 14 0c0 5.8-7 12-7 12Zm0-9a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  route: 'M6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm12-10a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM6 15V9a3 3 0 0 1 3-3h7M18 9v6a3 3 0 0 1-3 3H8',
  target: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-4a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0-4a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7.6 7.6 0 0 0-2-1.2L14.5 3h-5l-.4 2.6a7.6 7.6 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7.6 7.6 0 0 0 2 1.2l.4 2.6h5l.4-2.6a7.6 7.6 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2Z',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-11v6m0-9h.01',
  chart: 'M4 20V10m6 10V4m6 16v-7m4 7H2',
  plus: 'M12 5v14M5 12h14',
  shield: 'M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3Z',
  flame: 'M12 22c4 0 7-3 7-7 0-5-5-7-5-12-3 2-5 5-5 8-1-1-2-2-2-4-2 2-2 5-2 8 0 4 3 7 7 7Z',
  quote: 'M7 7h4v4c0 3-2 5-4 6m6-10h4v4c0 3-2 5-4 6',
  edit: 'M4 20h4L19 9l-4-4L4 16v4Zm11-15 4 4',
}

export type IconName = keyof typeof PATHS

export function Icon({ name, size = 22, className = '', stroke = 1.8 }: { name: IconName; size?: number; className?: string; stroke?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke}
      strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d={PATHS[name]} />
    </svg>
  )
}
