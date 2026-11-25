import type { ComponentProps } from 'react';
import Term from './Term';
import Cite from './Cite';
import { textOf } from './text';

/**
 * Link renderer for all markdown in the app. The content build writes two link kinds:
 *   #term:id → glossary popover · #cite:n,n → citation fold-out under the paragraph
 */
export default function Anchor({ href, children }: ComponentProps<'a'>) {
  if (href?.startsWith('#term:')) return <Term id={href.slice(6)}>{children}</Term>;
  if (href?.startsWith('#cite:')) return <Cite ns={href.slice(6).split(',').map(Number)} label={textOf(children)} />;
  const external = !!href && /^https?:/.test(href);
  return <a href={href} className="underline" target={external ? '_blank' : undefined} rel={external ? 'noreferrer' : undefined}>{children}</a>;
}
