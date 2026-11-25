import type { ReactNode } from 'react';

/** Amber marker for missing, pending or unverified content — the only thing amber means in this app. */
export default function Todo({ children }: { children: ReactNode }) {
  return <span className="bx-todo">{children}</span>;
}
