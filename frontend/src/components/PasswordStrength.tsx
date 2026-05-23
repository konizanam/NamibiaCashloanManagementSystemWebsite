export interface PasswordRule {
  key: string;
  label: string;
  test: (pw: string) => boolean;
}

export const PASSWORD_RULES: PasswordRule[] = [
  { key: 'length',  label: 'At least 8 characters',     test: (p) => p.length >= 8 },
  { key: 'upper',   label: 'One uppercase letter (A–Z)', test: (p) => /[A-Z]/.test(p) },
  { key: 'lower',   label: 'One lowercase letter (a–z)', test: (p) => /[a-z]/.test(p) },
  { key: 'digit',   label: 'One digit (0–9)',            test: (p) => /\d/.test(p) },
  { key: 'symbol',  label: 'One symbol (!@#$%, etc.)',   test: (p) => /[^A-Za-z0-9]/.test(p) },
  { key: 'noSpace', label: 'No spaces',                  test: (p) => p.length > 0 && !/\s/.test(p) },
];

export const isPasswordValid = (password: string): boolean =>
  PASSWORD_RULES.every((r) => r.test(password));

interface Props {
  password: string;
  /** When set, only renders if the user has typed at least one character. */
  hideUntilTyped?: boolean;
}

/**
 * Inline checklist that updates live as the user types. Used wherever a user
 * is setting or changing a password.
 */
export const PasswordStrength = ({ password, hideUntilTyped = true }: Props) => {
  if (hideUntilTyped && password.length === 0) return null;

  const results = PASSWORD_RULES.map((r) => ({ ...r, passed: r.test(password) }));
  const passedCount = results.filter((r) => r.passed).length;
  const total = results.length;
  const allOk = passedCount === total;

  return (
    <div className="mt-1">
      <div className="flex items-center gap-2 mb-2">
        <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-200 ${
              allOk ? 'bg-brand-green' : passedCount >= 4 ? 'bg-brand-amber' : 'bg-red-400'
            }`}
            style={{ width: `${(passedCount / total) * 100}%` }}
          />
        </div>
        <div className={`text-xs font-semibold ${allOk ? 'text-brand-green-dark' : 'text-slate-500'}`}>
          {passedCount}/{total}
        </div>
      </div>
      <ul className="text-xs space-y-1">
        {results.map((r) => (
          <li
            key={r.key}
            className={`flex items-center gap-1.5 ${r.passed ? 'text-brand-green-dark' : 'text-slate-500'}`}
          >
            {r.passed ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M4 12.5l5 5L20 6" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <circle cx="12" cy="12" r="9" />
              </svg>
            )}
            <span>{r.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};
