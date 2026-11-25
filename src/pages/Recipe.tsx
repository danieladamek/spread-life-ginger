import { Link, useParams } from 'react-router-dom';
import { getRecipe, sectionTitle } from '@/lib/data';
import { loadRecipes, loadReferences, loadTerms, useAsync } from '@/lib/heavy';
import Markdown from '@/components/reader/Markdown';
import ReferenceCard from '@/components/reader/ReferenceCard';
import HealthNotice from '@/components/ui/HealthNotice';
import NoteThis from '@/components/notepad/NoteThis';

/**
 * One recipe (KICKOFF §8.5): title, kind, date and place; the source with its reference card; the original text,
 * set as a block quotation with its language named, where the pack carries it (otherwise the gloss is shown as a
 * "Paraphrase" and no empty quotation is drawn); the gloss and who made it; ingredients;
 * the form of ginger and whether it is heated; the science note with working [n] citations; the safety note; and
 * links to the review sections and glossary terms. Every field is the pack's; nothing is added — no servings,
 * quantities, timings or steps. A medicinal recipe carries a visible "historical document, not advice" label.
 */
export default function Recipe() {
  const { id = '' } = useParams();
  const file = useAsync(loadRecipes);
  const refs = useAsync(loadReferences);
  const terms = useAsync(loadTerms);
  const meta = getRecipe(id);
  if (!meta) return <div className="mx-auto max-w-3xl px-4 py-12"><h1 className="text-3xl">Recipe not found</h1><p className="mt-2"><Link className="underline" to="/recipes">All recipes →</Link></p></div>;
  const r = file?.recipes.find((x) => x.id === id);
  const src = refs?.find((x) => x.n === r?.source_ref);
  const langCode = langOf(r?.original_language);
  const paraphrase = !!r && !r.original_text;
  return (
    <div className="mx-auto max-w-3xl px-4 py-8" data-note-anchor={`recipe:${id}`}>
      <p className="text-sm"><Link className="underline" to="/recipes">← All recipes</Link></p>
      <p className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
        <span className="bx-status" data-testid="recipe-kind">{meta.kind}</span>
        {meta.kind === 'medicinal' && <span className="bx-historical" data-testid="historical-label">historical document, not advice</span>}
      </p>
      <h1 className="text-3xl sm:text-4xl mt-2">{meta.title}</h1>
      <p className="mt-2 text-lg">{meta.date} · {meta.place}</p>
      <p className="mt-1 text-sm bx-muted" data-testid="recipe-tradition">Tradition: {meta.tradition}</p>
      <HealthNotice className="mt-4" />
      {!r ? <p className="bx-muted mt-6" role="status">Loading…</p> : (
        <div className="bx-101">
          <section aria-labelledby="src-h"><h2 id="src-h" className="bx-arc">Source</h2>
            {r.source_note && <p className="text-sm">{r.source_note}</p>}
            <div className="bx-card p-3 mt-3">{src ? <ReferenceCard r={src} compact /> : <p className="bx-muted text-sm" role="status">Loading…</p>}</div>
          </section>
          <section aria-labelledby="text-h"><h2 id="text-h" className="bx-noteable">The text <NoteThis anchor={{ type: 'recipe', id, heading: 'text-h' }} label="the text" /></h2>
            {r.original_text ? (
              <figure className="my-3" data-testid="original">
                <p className="text-xs font-semibold uppercase tracking-wider bx-muted" data-testid="original-language">Original text · {r.original_language}</p>
                <blockquote lang={langCode} className="mt-1 font-serif text-[17px] leading-8 border-l-4 border-brand-olive pl-4 whitespace-pre-line" data-testid="original-text">{r.original_text}</blockquote>
                <figcaption className="mt-1 text-xs bx-muted">As the source prints it, in {r.original_language} [{r.source_ref}].</figcaption>
              </figure>
            ) : (
              <p className="text-sm bx-muted" data-testid="no-original">The original is not reproduced here{r.original_language ? ` (${r.original_language})` : ''}: the source is in copyright or its text was not captured, so the entry is given as a paraphrase.</p>
            )}
            {r.gloss.trim() && (
              <div data-testid={paraphrase ? 'paraphrase' : 'gloss'}>
                <h3 className="text-lg mt-4">{paraphrase ? 'Paraphrase' : 'Gloss'}</h3>
                <Markdown md={r.gloss_md} className="bx-prose" />
                {r.gloss_by.trim() && <p className="text-xs bx-muted">{paraphrase ? 'Paraphrase' : 'Gloss'}: {r.gloss_by}.</p>}
              </div>
            )}
          </section>
          <section aria-labelledby="ing-h"><h2 id="ing-h">Ingredients named in the source</h2>
            <ul data-testid="ingredients">{r.ingredients.map((x) => <li key={x}>{x}</li>)}</ul>
            <p className="text-xs bx-muted">As the source names them. Any quantity is the source's own, in the text above; none is added here.</p>
            <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              <dt className="font-semibold">Form of ginger</dt><dd data-testid="ginger-form">{r.ginger_form.replace(/-/g, ', ')}</dd>
              <dt className="font-semibold">Heated</dt><dd data-testid="heated">{r.heated ? 'yes' : 'no'}</dd>
            </dl>
          </section>
          <section aria-labelledby="sci-h" data-testid="science-note"><h2 id="sci-h" className="bx-noteable">What the review's evidence says <NoteThis anchor={{ type: 'recipe', id, heading: 'sci-h' }} label="the science note" /></h2>
            <Markdown md={r.science_md} />
          </section>
          {r.safety_note.trim() && (
            <section aria-labelledby="safe-h" data-testid="safety-note"><h2 id="safe-h">Safety note</h2>
              <Markdown md={r.safety_md} />
            </section>
          )}
          <section aria-labelledby="links-h"><h2 id="links-h">In the review</h2>
            <ul className="bx-targets">{r.links.sections.map((s) => <li key={s}><Link className="underline" to={`/read#${s}`} data-testid="recipe-section-link">{sectionTitle(s)}</Link></li>)}</ul>
            {r.terms.length > 0 && <p className="text-sm mt-2 bx-targets">Glossary: {r.terms.map((t) => <Link key={t} className="underline mr-3" to={`/glossary#${t}`}>{terms?.get(t)?.term ?? t}</Link>)}</p>}
            {r.compounds.length > 0 && <p className="text-xs bx-muted mt-1">Compounds the pack links: {r.compounds.map((c) => c.name).join(', ')}.</p>}
          </section>
          <p className="mt-8 no-print"><NoteThis anchor={{ type: 'recipe', id }} label={meta.title} variant="button" /></p>
        </div>
      )}
    </div>
  );
}

/** BCP 47 tags for the languages the pack names, so screen readers and hyphenation treat the original correctly. */
function langOf(name?: string): string | undefined {
  if (!name) return undefined;
  const n = name.toLowerCase();
  if (n.startsWith('middle english')) return 'enm';
  if (n.startsWith('middle french')) return 'frm';
  if (n.startsWith('latin')) return 'la';
  if (n.startsWith('french')) return 'fr';
  if (n.startsWith('english')) return 'en';
  if (n.startsWith('irish')) return 'ga';
  return undefined;
}
