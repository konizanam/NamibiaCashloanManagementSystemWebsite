import { useEffect, useMemo, useRef, useState } from 'react';
import { NAMIBIA_CITIES } from '../constants/namibiaCities';

interface Props {
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  label?: string;
  placeholder?: string;
  name?: string;
}

const MIN_CHARS = 3;
const MAX_SUGGESTIONS = 8;

const norm = (s: string): string =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export const CityAutocomplete = ({
  value,
  onChange,
  required,
  label = 'City',
  placeholder = 'Start typing a Namibian city or town…',
  name = 'city',
}: Props) => {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputId = `city-${name}`;

  const matches = useMemo(() => {
    const q = norm(value.trim());
    if (q.length < MIN_CHARS) return [];
    return NAMIBIA_CITIES.filter((c) => norm(c).includes(q)).slice(0, MAX_SUGGESTIONS);
  }, [value]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const pick = (city: string) => {
    onChange(city);
    setOpen(false);
    setActive(0);
  };

  return (
    <div ref={wrapRef}>
      <label htmlFor={inputId} className="field-label">
        {label}{required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="relative">
        <input
          id={inputId}
          name={name}
          type="text"
          required={required}
          value={value}
          autoComplete="off"
          placeholder={placeholder}
          onChange={(e) => { onChange(e.target.value); setOpen(true); setActive(0); }}
          onFocus={() => { if (matches.length > 0) setOpen(true); }}
          onKeyDown={(e) => {
            if (!open || matches.length === 0) return;
            if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(i + 1, matches.length - 1)); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
            else if (e.key === 'Enter')   { e.preventDefault(); pick(matches[active]!); }
            else if (e.key === 'Escape')  { setOpen(false); }
          }}
          className="field-input"
        />
        {open && matches.length > 0 && (
          <ul
            role="listbox"
            className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-64 overflow-y-auto"
          >
            {matches.map((c, idx) => (
              <li
                key={c}
                role="option"
                aria-selected={idx === active}
                onMouseDown={(e) => { e.preventDefault(); pick(c); }}
                onMouseEnter={() => setActive(idx)}
                className={`px-3 py-2 text-sm cursor-pointer ${
                  idx === active ? 'bg-brand-green text-white' : 'hover:bg-slate-50'
                }`}
              >
                {c}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="field-help">
        {value.trim().length === 0
          ? 'Required.'
          : value.trim().length < MIN_CHARS
          ? `Type at least ${MIN_CHARS} characters to see suggestions.`
          : matches.length === 0
          ? "Not on our list? That's fine — your entry will be used as-is."
          : 'Pick a suggestion or keep typing.'}
      </div>
    </div>
  );
};
