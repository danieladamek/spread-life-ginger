/**
 * The app's own ginger motif (KICKOFF §8.6): a knobbly rhizome, a leafy shoot with two-ranked lance leaves, and the
 * cone-shaped flower spike with its small lipped flower — drawn for this app in flat, slightly irregular "painted"
 * shapes in the brand palette. It is not traced from, and does not reproduce, the Spread Life logo, the UAH mark or
 * the reference photo. Decorative only: always aria-hidden.
 *
 * `hero` sets it in the brand's half-dome with a ground line; `mark` is the small header glyph.
 */
const C = {
  rhizome: 'rgb(var(--c-rhizome))', leaf: 'rgb(var(--c-olive))', leafDeep: 'rgb(var(--c-olive-deep))', foliage: 'rgb(var(--c-foliage))',
  butter: 'rgb(var(--c-butter))', blue: 'rgb(var(--c-blue))', soft: 'rgb(var(--c-blue-soft))', dome: 'rgb(var(--c-paper-2))', hair: 'rgb(var(--c-hairline))',
};

function Plant() {
  return (
    <g>
      {/* leafy shoot: a pseudostem with alternate lance leaves */}
      <path d="M86 150 C 85 118, 88 86, 92 52" stroke={C.leafDeep} strokeWidth="3.2" fill="none" strokeLinecap="round" />
      <path d="M88 128 C 70 120, 52 118, 30 124 C 50 112, 72 112, 88 122 Z" fill={C.leaf} opacity="0.92" />
      <path d="M88 110 C 106 100, 126 96, 150 98 C 130 88, 106 90, 88 104 Z" fill={C.leaf} opacity="0.85" />
      <path d="M90 92 C 74 80, 58 72, 38 70 C 58 64, 78 72, 91 86 Z" fill={C.foliage} opacity="0.95" />
      <path d="M91 75 C 104 62, 118 54, 136 50 C 120 46, 102 54, 90 69 Z" fill={C.leaf} opacity="0.9" />
      <path d="M92 58 C 84 46, 80 36, 80 24 C 88 34, 93 44, 93 54 Z" fill={C.leafDeep} opacity="0.85" />
      {/* leaf midribs — brush marks */}
      <path d="M86 124 C 66 119, 50 120, 34 123" stroke={C.leafDeep} strokeWidth="0.9" fill="none" opacity="0.5" />
      <path d="M90 105 C 108 97, 126 95, 145 98" stroke={C.leafDeep} strokeWidth="0.9" fill="none" opacity="0.5" />
      {/* flower stalk rising separately from the rhizome, with its cone-shaped spike */}
      <path d="M124 152 C 126 136, 128 124, 132 112" stroke={C.leafDeep} strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <path d="M132 112 C 122 104, 122 86, 133 74 C 144 86, 144 104, 132 112 Z" fill={C.leaf} />
      <path d="M126 104 C 130 100, 136 100, 139 104" stroke={C.butter} strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M125 95 C 129 91, 136 91, 140 95" stroke={C.butter} strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M127 86 C 130 83, 135 83, 138 86" stroke={C.butter} strokeWidth="1.8" fill="none" strokeLinecap="round" />
      {/* one open flower: pale petals and a blue-lipped labellum */}
      <path d="M140 92 C 150 86, 157 88, 160 94 C 153 96, 146 96, 140 92 Z" fill={C.butter} />
      <path d="M144 95 C 152 97, 156 103, 152 108 C 147 105, 144 100, 144 95 Z" fill={C.blue} opacity="0.9" />
      <circle cx="150.5" cy="101" r="1.4" fill={C.butter} />
      {/* the rhizome: knobbly "hands" lying along the ground */}
      <path d="M40 160 C 40 150, 52 146, 62 150 C 66 142, 78 140, 86 148 C 94 142, 108 142, 114 150 C 120 144, 134 144, 140 152 C 150 150, 160 156, 158 164 C 156 172, 142 174, 132 170 C 122 176, 104 176, 94 170 C 82 176, 64 176, 56 170 C 46 172, 40 168, 40 160 Z" fill={C.rhizome} />
      <path d="M56 152 C 54 144, 58 138, 64 137 C 66 143, 64 148, 60 152 Z" fill={C.rhizome} />
      <path d="M112 151 C 112 143, 117 138, 123 138 C 123 145, 120 149, 116 152 Z" fill={C.rhizome} />
      {/* growth rings: the dry scale-leaf lines on the rhizome */}
      <path d="M62 151 C 64 158, 64 165, 60 170" stroke={C.leafDeep} strokeWidth="0.9" fill="none" opacity="0.35" />
      <path d="M86 149 C 89 157, 89 165, 86 171" stroke={C.leafDeep} strokeWidth="0.9" fill="none" opacity="0.35" />
      <path d="M114 151 C 117 158, 117 166, 113 172" stroke={C.leafDeep} strokeWidth="0.9" fill="none" opacity="0.35" />
      <path d="M140 153 C 143 159, 143 166, 140 170" stroke={C.leafDeep} strokeWidth="0.9" fill="none" opacity="0.35" />
      {/* small butter-yellow budding tips */}
      <ellipse cx="62" cy="137" rx="3" ry="2.2" fill={C.butter} opacity="0.85" />
      <ellipse cx="123" cy="138" rx="3" ry="2.2" fill={C.butter} opacity="0.85" />
    </g>
  );
}

export default function GingerMotif({ variant = 'mark', className }: { variant?: 'mark' | 'hero'; className?: string }) {
  if (variant === 'mark') {
    return (
      <svg viewBox="28 20 136 160" className={className} aria-hidden="true" focusable="false" role="presentation">
        <Plant />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden="true" focusable="false" role="presentation">
      {/* the half-dome with a thin outline, and a soft ground line */}
      <path d="M14 176 C 14 52, 186 52, 186 176" fill="none" stroke={C.hair} strokeWidth="1.4" />
      <path d="M14 176 C 14 52, 186 52, 186 176 Z" fill={C.dome} opacity="0.9" />
      <path d="M6 178 C 60 172, 140 172, 194 178" stroke={C.leaf} strokeWidth="2.6" fill="none" strokeLinecap="round" opacity="0.7" />
      <g transform="translate(0 4)"><Plant /></g>
    </svg>
  );
}
