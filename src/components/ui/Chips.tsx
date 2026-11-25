import { LEVEL_LABEL, LEVEL_NOTE, TIER_LABEL, TIER_NOTE } from '@/lib/data';

/** Tier: text, not colour — tier is information, not status (DESIGN-SYSTEM §3.1). */
export function TierChip({ tier }: { tier: string }) {
  return <span className="bx-tier" title={TIER_NOTE[tier]} data-tier={tier}>{TIER_LABEL[tier] ?? tier}</span>;
}

/** Daniel named this one in the scoping interview (scope.yaml anchors). */
export function AnchorChip() {
  return <span className="bx-chip bg-brand-butter text-ink" title="An anchor: named by Daniel in the scoping interview">anchor</span>;
}

/** How far the builder read this source (pack 0.2 `verified_level`: full-text · abstract · partial). */
export function LevelChip({ level }: { level?: string }) {
  return <span className="bx-level" title={level ? LEVEL_NOTE[level] : 'The pack does not say how far this source was read.'} data-testid="verified-level" data-level={level ?? 'unstated'}>{level ? LEVEL_LABEL[level] ?? `read: ${level}` : 'read: unstated'}</span>;
}

/** One of the historical texts the review reads as a primary source (pack 0.2 `primary_source: true`). */
export function PrimaryChip() {
  return <span className="bx-chip border border-[color:var(--bx-line)] bx-muted" title="A historical text read as a primary source">primary source</span>;
}
