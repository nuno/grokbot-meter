import { memo, type ReactNode } from "react";

type Props = {
  title: string;
  nodes: readonly ReactNode[];
  activeIndex: number;
  /** One label per node, shown under the rail. */
  labels?: readonly string[];
  /** Used instead of `labels` when only the two ends need naming. */
  edgeLabels?: readonly [string, string];
};

/** Kiosk selector rail — hairline track, circular nodes, active one lit. */
export const StepTrack = memo(function StepTrack({ title, nodes, activeIndex, labels, edgeLabels }: Props) {
  return (
    <div className="step-track">
      <p className="step-track-title">{title}</p>
      <div className="step-track-rail">
        {nodes.map((node, i) => (
          <span key={i} className={`step-node${i === activeIndex ? " is-active" : ""}`}>
            {node}
          </span>
        ))}
      </div>
      {labels ? (
        <div className="step-track-labels">
          {labels.map((label, i) => (
            <span key={label} className={`step-label${i === activeIndex ? " is-active" : ""}`}>
              {label}
            </span>
          ))}
        </div>
      ) : null}
      {edgeLabels ? (
        <div className="step-track-labels is-edges">
          <span className="step-label">{edgeLabels[0]}</span>
          <span className="step-label">{edgeLabels[1]}</span>
        </div>
      ) : null}
    </div>
  );
});

/** Cup outline used as a node glyph — scale 0.6 / 1 / 1.4 reads as small / regular / large. */
export const CupGlyph = memo(function CupGlyph({ scale }: { scale: number }) {
  const w = 5 + scale * 2;
  const h = 5 + scale * 2.5;
  return (
    <svg width={w + 4} height={h + 2} viewBox={`0 0 ${w + 4} ${h + 2}`} fill="none" aria-hidden="true">
      <path
        d={`M2 2 H${w + 2} L${w + 0.5} ${h} Q${w + 0.2} ${h + 1.4} ${w - 1} ${h + 1.4} H5 Q3.8 ${h + 1.4} 3.5 ${h} Z`}
        stroke="currentColor"
        strokeWidth="1"
        fill="none"
      />
      <path d={`M2 2 H${w + 2}`} stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
});
