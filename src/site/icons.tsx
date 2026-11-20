// Four Lucide icons (ISC licence), inlined: stroke 1.5, 20 px, currentColor (SYSTEM.md §8).
const paths = {
  "arrow-right": "M5 12h14M12 5l7 7-7 7",
  "arrow-up": "M12 19V5M5 12l7-7 7 7",
  menu: "M4 8h16M4 16h16",
  close: "M18 6 6 18M6 6l12 12",
} as const;

export function Icon({ name, className }: { name: keyof typeof paths; className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d={paths[name]} />
    </svg>
  );
}
