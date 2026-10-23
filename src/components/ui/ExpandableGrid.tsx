'use client';

import { useId, useRef, useState, type ReactNode, type TransitionEvent } from 'react';
import { FiChevronDown } from 'react-icons/fi';

const GRID = 'grid grid-cols-1 gap-5 md:grid-cols-2';

interface ExpandableGridProps {
  /** Always-visible cards. */
  visible: ReactNode;
  /** Cards folded behind the toggle. */
  hidden: ReactNode;
  hiddenCount: number;
  /** Rendered beside the toggle, e.g. a link to the full list. */
  actions?: ReactNode;
}

/** A card grid that shows a fixed first batch and folds the rest behind a
 *  "Show more" toggle. The cards arrive as props rather than data so they stay
 *  server components; only this small toggle ships to the client.
 *
 *  The folded region animates by transitioning its grid row between `0fr` and
 *  `1fr`, which lets height animate without measuring anything in JS. It stays
 *  in the DOM, so the content is still in the HTML, but while collapsed it is
 *  `visibility: hidden`, which also takes its links out of the tab order and
 *  the accessibility tree. */
export default function ExpandableGrid({
  visible,
  hidden,
  hiddenCount,
  actions,
}: ExpandableGridProps) {
  const [open, setOpen] = useState(false);
  const regionId = useId();
  const toggle = useRef<HTMLButtonElement>(null);

  const onRegionTransitionEnd = (event: TransitionEvent<HTMLDivElement>) => {
    // Card hover transitions bubble up to here, so only react to this
    // element's own row animation.
    if (event.target !== event.currentTarget || event.propertyName !== 'grid-template-rows') return;

    // Collapsing from far down the list shortens the page and can leave the
    // toggle above the viewport. Nearest is a no-op when it is already visible.
    if (!open) toggle.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  };

  return (
    <>
      <div className={GRID}>{visible}</div>

      {hiddenCount > 0 && (
        <div
          id={regionId}
          onTransitionEnd={onRegionTransitionEnd}
          className={`grid transition-[grid-template-rows,opacity,visibility] duration-500 ease-out ${
            open ? 'visible grid-rows-[1fr] opacity-100' : 'invisible grid-rows-[0fr] opacity-0'
          }`}
        >
          {/* The negative margin and matching padding give card hover lift and
              focus rings room inside the clipping box, which would otherwise
              shave them off at the edges. */}
          <div className="-mx-2 min-h-0 overflow-hidden px-2 pb-2">
            <div className={`${GRID} pt-5`}>{hidden}</div>
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        {hiddenCount > 0 && (
          <button
            ref={toggle}
            type="button"
            aria-expanded={open}
            aria-controls={regionId}
            onClick={() => setOpen((value) => !value)}
            className="inline-flex items-center gap-1.5 rounded-full border border-nova/30 bg-nova/10 px-5 py-2.5 font-mono text-xs uppercase tracking-[0.14em] text-nova transition-colors hover:bg-nova/20"
          >
            {open ? 'Show fewer' : `Show ${hiddenCount} more`}
            <FiChevronDown
              className={`h-3.5 w-3.5 transition-transform duration-500 ${open ? 'rotate-180' : ''}`}
              aria-hidden="true"
            />
          </button>
        )}
        {actions}
      </div>
    </>
  );
}
