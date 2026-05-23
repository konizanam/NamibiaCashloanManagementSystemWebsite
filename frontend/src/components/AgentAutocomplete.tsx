import { useEffect, useMemo, useRef, useState } from 'react';
import type { MarketingAgent } from '../api/types';

interface Props {
  agents: MarketingAgent[];
  /** Currently selected agent id, or empty for "no filter". */
  value: string;
  onChange: (agentId: string) => void;
  label?: string;
  placeholder?: string;
  name?: string;
}

const MIN_CHARS = 3;
const MAX_SUGGESTIONS = 8;

const norm = (s: string): string => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const displayName = (a: MarketingAgent): string => `${a.full_name} (${a.referral_code})`;

export const AgentAutocomplete = ({
  agents,
  value,
  onChange,
  label = 'Agent',
  placeholder = 'Type an agent name or referral code…',
  name = 'agent',
}: Props) => {
  const selected = useMemo(() => agents.find((a) => a.id === value) ?? null, [agents, value]);

  const [query, setQuery] = useState<string>(selected ? displayName(selected) : '');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputId = `agent-${name}`;

  // Keep query in sync if the selected agent is changed from the outside.
  useEffect(() => {
    setQuery(selected ? displayName(selected) : '');
  }, [selected]);

  const matches = useMemo(() => {
    const q = norm(query.trim());
    if (q.length < MIN_CHARS) return [];
    return agents
      .filter((a) => norm(a.full_name).includes(q) || norm(a.referral_code).includes(q))
      .slice(0, MAX_SUGGESTIONS);
  }, [agents, query]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const pick = (agent: MarketingAgent) => {
    onChange(agent.id);
    setQuery(displayName(agent));
    setOpen(false);
    setActive(0);
  };

  const clearFilter = () => {
    onChange('');
    setQuery('');
    setOpen(false);
  };

  const showHint = query.trim().length > 0 && query.trim().length < MIN_CHARS;

  return (
    <div ref={wrapRef} className="w-full sm:w-72">
      <label htmlFor={inputId} className="field-label">{label}</label>
      <div className="relative">
        <input
          id={inputId}
          name={name}
          type="text"
          value={query}
          autoComplete="off"
          placeholder={placeholder}
          onChange={(e) => {
            const v = e.target.value;
            setQuery(v);
            setOpen(true);
            setActive(0);
            if (v.trim().length === 0 && value) onChange('');
            if (value && selected && v !== displayName(selected)) onChange('');
          }}
          onFocus={() => { if (matches.length > 0) setOpen(true); }}
          onKeyDown={(e) => {
            if (!open || matches.length === 0) return;
            if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(i + 1, matches.length - 1)); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
            else if (e.key === 'Enter')   { e.preventDefault(); pick(matches[active]!); }
            else if (e.key === 'Escape')  { setOpen(false); }
          }}
          className="field-input pr-9"
        />
        {(query.length > 0 || value) && (
          <button
            type="button"
            onClick={clearFilter}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-sm w-6 h-6 inline-flex items-center justify-center"
            aria-label="Clear agent filter"
          >
            ✕
          </button>
        )}

        {/* The hint is positioned absolutely so it doesn't change the
            element's height and the filter row stays aligned. */}
        {showHint && (
          <div className="absolute left-0 top-full mt-1 text-xs text-slate-500">
            Type at least {MIN_CHARS} characters
          </div>
        )}

        {open && matches.length > 0 && (
          <ul
            role="listbox"
            className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-64 overflow-y-auto"
          >
            {matches.map((a, idx) => (
              <li
                key={a.id}
                role="option"
                aria-selected={idx === active}
                onMouseDown={(e) => { e.preventDefault(); pick(a); }}
                onMouseEnter={() => setActive(idx)}
                className={`px-3 py-2 text-sm cursor-pointer ${
                  idx === active ? 'bg-brand-green text-white' : 'hover:bg-slate-50'
                }`}
              >
                <div className="font-semibold">{a.full_name}</div>
                <div className={`text-xs ${idx === active ? 'text-white/80' : 'text-slate-500'}`}>
                  {a.referral_code} · {a.email}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
