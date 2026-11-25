import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { hostOf } from '@/lib/note-dom';
import { FloatingFocusManager, FloatingPortal, autoUpdate, flip, offset, safePolygon, shift, useClick, useDismiss, useFloating, useHover, useInteractions, useRole } from '@floating-ui/react';

interface Props {
  children: ReactNode;          // trigger label
  content: ReactNode;           // popover body
  className?: string;           // trigger classes (e.g. bx-term, bx-chip)
  style?: CSSProperties;
  ariaLabel?: string;
  hover?: boolean;              // open on hover too (default true); keyboard/click always work
  placement?: 'bottom-start' | 'bottom' | 'top-start' | 'top' | 'right' | 'left';
  testId?: string;
  onOpen?: () => void;
  /** `data-note-opener` for the trigger (e.g. `term:trauma`): a note taken inside the popover can reopen it. */
  noteOpener?: string;
}

type Arm = 'hover' | 'focus' | 'click';

/**
 * Popover anchored to a <button> trigger (floating-ui). Hover shows a read-only preview; click / Enter / Space
 * opens it interactively (focus moves inside, Esc closes and returns focus). Never hover-only.
 *
 * The draft carries hundreds of term and citation triggers, so the floating-ui machinery is mounted only when a
 * trigger is first hovered, focused or clicked; until then it is a plain button. Arming keeps focus on the trigger.
 */
export default function Popover(props: Props) {
  const [armed, setArmed] = useState<Arm | null>(null);
  if (armed) return <ArmedPopover {...props} armedBy={armed} />;
  const { children, className, style, ariaLabel, testId, noteOpener } = props;
  return (
    <button
      type="button"
      className={className}
      style={style}
      aria-label={ariaLabel}
      aria-haspopup="dialog"
      aria-expanded={false}
      data-testid={testId}
      data-note-opener={noteOpener}
      onPointerEnter={(e) => { if (e.pointerType === 'mouse' && props.hover !== false) setArmed('hover'); }}
      onFocus={() => setArmed('focus')}
      // A press arms *and opens*: arming swaps this button for the armed one, so the click that follows a
      // mousedown never reaches either — opening on pointerdown makes a click open the popover every time.
      onPointerDown={(e) => { if (e.button === 0) setArmed('click'); }}
      onClick={() => setArmed('click')}
    >
      {children}
    </button>
  );
}

function ArmedPopover({ children, content, className, style, ariaLabel, hover = true, placement = 'bottom-start', testId, onOpen, noteOpener, armedBy }: Props & { armedBy: Arm }) {
  const [open, setOpen] = useState(armedBy === 'click');
  const [interactive, setInteractive] = useState(armedBy === 'click');
  const btn = useRef<HTMLButtonElement | null>(null);
  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: (o, _e, reason) => {
      setOpen(o);
      setInteractive(o && reason !== 'hover' && reason !== 'safe-polygon');
      if (o) onOpen?.();
    },
    placement,
    middleware: [offset(6), flip({ padding: 8 }), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });
  useEffect(() => {
    // arming swaps the plain button for this one: keep keyboard focus on the trigger (a click focuses it anyway)
    if (armedBy === 'focus') btn.current?.focus();
    if (armedBy === 'hover') setOpen(true);
    if (armedBy === 'click') onOpen?.();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // hover opens and closes the preview only: once a click made the popover interactive, leaving the trigger (or
  // scrolling it out from under the mouse) does not close it
  const hoverI = useHover(context, { enabled: hover && !interactive, delay: { open: 120, close: 80 }, handleClose: safePolygon(), move: false });
  // Clicks (and Enter / Space) are handled here, not by floating-ui's useClick, whose toggle raced the hover arming
  // (a click within ~120 ms of hovering closed the preview it had just opened): a click on a closed popover or a
  // hover preview opens it interactively (focus moves in); a click on an interactive popover closes it.
  const click = useClick(context, { enabled: false });
  const onClick = () => {
    if (open && interactive) { setOpen(false); setInteractive(false); return; }
    setOpen(true); setInteractive(true); onOpen?.();
  };
  // Selecting inside the popover never closes it, and neither does pressing the notepad's Add note control.
  const dismiss = useDismiss(context, { outsidePress: (e) => !(e.target as Element | null)?.closest?.('[data-note-capture]') });
  const role = useRole(context, { role: 'dialog' });
  const { getReferenceProps, getFloatingProps } = useInteractions([hoverI, click, dismiss, role]);
  const panel = (
    <div ref={refs.setFloating} style={{ ...floatingStyles, zIndex: 60 }} {...getFloatingProps()} className="bx-card p-3 max-w-sm w-max text-sm shadow-lg bg-paper dark:bg-night" data-testid={testId ? `${testId}-popover` : undefined}
      data-note-within="popover" data-note-opener={noteOpener} data-note-host={open ? hostOf(btn.current) : undefined}>
      {content}
    </div>
  );
  return (
    <>
      <button
        type="button"
        ref={(el) => { btn.current = el; refs.setReference(el); }}
        {...getReferenceProps({ 'aria-describedby': open ? context.floatingId : undefined, onClick })}
        className={className}
        style={style}
        aria-label={ariaLabel}
        data-testid={testId}
        data-note-opener={noteOpener}
      >
        {children}
      </button>
      {open && (
        <FloatingPortal>
          {interactive ? (
            <FloatingFocusManager context={context} modal={false} initialFocus={-1} returnFocus>
              {panel}
            </FloatingFocusManager>
          ) : panel}
        </FloatingPortal>
      )}
    </>
  );
}
