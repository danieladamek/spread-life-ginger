import { Link } from 'react-router-dom';
import { AS_OF, manifest } from '@/lib/data';
import ReviewBadges from '@/components/ui/ReviewBadges';

/** /about (APP-SPEC §2, topic mode): who wrote the review, that it is not peer reviewed, its as_of, figure provenance, how to report an error. */
export default function About() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8" data-note-anchor="page:/about">
      <h1 className="text-3xl sm:text-4xl">About</h1>
      <ReviewBadges className="mt-3" />
      <div className="bx-prose mt-4 grid gap-3">
        <p><strong>What this is.</strong> “{manifest.title}” is a commissioned review: one scoped, fully cited account of ginger written as a reference for {manifest.audience}. It is <strong>not peer reviewed</strong> and is not a systematic review. It was written once, from a literature sweep that closed on {AS_OF}; nothing published after that date is in it.</p>
        <p><strong>Who wrote it.</strong> {manifest.authors.join(', ')}. Builder: {manifest.builder.name}, {manifest.builder.version} ({manifest.builder.date}). This app was built from that content pack by Claude Code; the build renders the review as written and adds no facts of its own.</p>
        <p><strong>How it was read.</strong> {manifest.verification_level} Every reference card says what was read of it; <Link className="underline" to="/methods#verification">Methods</Link> counts them.</p>
        <p data-testid="attribution"><strong>Text.</strong> {manifest.permissions.text}. Quotations from other works are short and attributed.</p>
        <p><strong>Figures.</strong> {manifest.permissions.figures}. Every figure is synthesised by the builder from values the cited studies report, and its page names the references it was made from; none is a reproduced image.</p>
        <p><strong>Health.</strong> This is a literature review for education, not medical advice. Doses appear only as what a study gave its participants; none is a recommendation. Safety, interactions and pregnancy are in <Link className="underline" to="/read#10-safety-interactions-and-pregnancy">section 10</Link>.</p>
        <p><strong>Look and name.</strong> Colours and shapes follow the UAH Greenhouse's “Spread Life” style; the name is used with the team's agreement. The logo artwork and the university's mark are not reproduced here; the ginger drawing is this app's own.</p>
        <p><strong>Reporting an error.</strong> Select the passage, add a note saying what is wrong, export your notes from <Link className="underline" to="/notes">Notes</Link>, and send the file to Daniel Adamek, the editor. Corrections are made in the content pack and the app is rebuilt; this app never repairs the review itself.</p>
      </div>
    </div>
  );
}
