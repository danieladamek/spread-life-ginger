import { Children, isValidElement, type ReactNode } from 'react';

/** Plain text of React children (link text may have been split into claim spans by rehype-claims). */
export function textOf(node: ReactNode): string {
  let s = '';
  Children.forEach(node, (c) => {
    if (typeof c === 'string' || typeof c === 'number') s += String(c);
    else if (isValidElement<{ children?: ReactNode }>(c)) s += textOf(c.props.children);
  });
  return s;
}
