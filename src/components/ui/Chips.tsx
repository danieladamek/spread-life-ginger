import { TIER_LABEL, TIER_NOTE } from '@/lib/data';

/** Tier: text, not colour — tier is information, not status (DESIGN-SYSTEM §3.1). */
export function TierChip({ tier }: { tier: string }) {
  return <span className="bx-tier" title={TIER_NOTE[tier]} data-tier={tier}>{TIER_LABEL[tier] ?? tier}</span>;
}

/** Daniel named this one in the scoping interview (scope.yaml anchors). */
export function AnchorChip() {
  return <span className="bx-chip bg-brand-butter text-ink" title="An anchor: named by Daniel in the scoping interview">anchor</span>;
}

/** How far the builder read this source (KICKOFF §8.3). No full text was read for any reference. */
export function LevelChip({ level }: { level?: string }) {
  return <span className="bx-level" title="What the builder read of this source. No full text was read for any reference in this review." data-testid="verified-level">read: {level ?? 'unstated'}</span>;
}
