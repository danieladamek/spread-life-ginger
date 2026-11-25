import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

/** KaTeX-enabled markdown (only where the pack has maths). Loaded lazily. */
export default function MathMarkdown({ md, components, className }: { md: string; components?: Components; className?: string }) {
  return (
    <div className={className}>
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[[rehypeKatex, { output: 'html' }]]} components={components}>{md}</ReactMarkdown>
    </div>
  );
}
