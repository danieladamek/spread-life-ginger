import { Link } from 'react-router-dom';
import { SAFETY_SECTION } from '@/lib/data';

/**
 * The persistent, quiet health notice (KICKOFF §8.4, safety profile `health`) on /read and /recipes. Not an alarm:
 * it says what the app is, and points to the review's own safety section.
 */
export default function HealthNotice({ className = '' }: { className?: string }) {
  return (
    <p className={`bx-notice ${className}`} role="note" data-testid="health-notice">
      This is a literature review for education, not medical advice. It gives no doses and makes no recommendations; any
      amount mentioned is what a study gave its participants.
      {SAFETY_SECTION && <> What is known about harm is in <Link className="underline" to={`/read#${SAFETY_SECTION}`}>section 10, Safety, interactions and pregnancy</Link>.</>}
    </p>
  );
}
