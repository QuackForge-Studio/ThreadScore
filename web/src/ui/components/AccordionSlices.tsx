import { useState } from 'react';

type Slice = {
  title: string;
  desc: string;
  chip: string;
  img: string;
};

export default function AccordionSlices({ slices }: { slices: Slice[] }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="accordion">
      {slices.map((s, i) => (
        <div
          key={i}
          className={`accordion-slice${open === i ? ' expanded' : ''}`}
          onClick={() => setOpen(open === i ? null : i)}
          role="button"
          tabIndex={0}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setOpen(open === i ? null : i); }}
        >
          <div className="slice-img" style={{ backgroundImage: `url(${s.img})` }} />
          <div className="slice-overlay" />
          <div className="slice-body">
            <span className="slice-chip">{s.chip}</span>
            <h3>{s.title}</h3>
            <p>{s.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
