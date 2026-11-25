import { AS_OF, manifest } from '@/lib/data';

/** "Commissioned review — not peer reviewed" and the as_of date, always together (APP-SPEC §6.1 rule 9). */
export default function ReviewBadges({ className = '' }: { className?: string }) {
  return (
    <p className={`flex flex-wrap items-center gap-2 text-xs ${className}`}>
      <span className="bx-badge" data-testid="review-badge">{manifest.venue}</span>
      <span className="bx-asof" data-testid="as-of">Current as of {AS_OF}</span>
    </p>
  );
}
