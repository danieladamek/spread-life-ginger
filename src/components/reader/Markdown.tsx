import { lazy, Suspense, type ReactNode } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Anchor from './Anchor';
import { Paragraph } from './Cite';
import { rehypeSupSub } from './rehype-supsub';

const Table = ({ children }: { children?: ReactNode }) => <div className="bx-tablewrap"><table>{children}</table></div>;

export const proseComponents: Components = { a: Anchor, p: ({ children }) => <Paragraph>{children}</Paragraph>, table: Table };
/** Inline prose (a figure caption, a recipe note): no <p> wrapper, but citations still fold out. */
export const inlineComponents: Components = { a: Anchor, p: ({ children }) => <Paragraph inline>{children}</Paragraph> };

/** One block of the review, as written: terms and citations linked, synthesised sentences marked (rehype-supsub). */
export function ReviewBlock({ md }: { md: string }) {
  return <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSupSub]} components={proseComponents}>{md}</ReactMarkdown>;
}

const MathMarkdown = lazy(() => import('./MathMarkdown'));

/** Builder prose (101s, figure text, recipe notes). `math` switches to the KaTeX renderer (separate chunk). */
export default function Markdown({ md, math = false, className, components = proseComponents }: { md: string; math?: boolean; className?: string; components?: Components }) {
  if (math) return <Suspense fallback={<div className="bx-muted text-sm">Rendering maths…</div>}><MathMarkdown md={md} components={components} className={className} /></Suspense>;
  return <div className={className}><ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSupSub]} components={components}>{md}</ReactMarkdown></div>;
}
