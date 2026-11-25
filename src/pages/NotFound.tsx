import { Link } from 'react-router-dom';
import { NAV, NOTES_LINK } from '@/components/Layout';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl sm:text-4xl">Page not found</h1>
      <p className="bx-prose mt-3">There is nothing at this address. Try one of these:</p>
      <ul className="mt-3 flex flex-wrap gap-2">{[...NAV, NOTES_LINK].map((n) => <li key={n.to}><Link className="bx-btn" to={n.to}>{n.label}</Link></li>)}</ul>
    </div>
  );
}
