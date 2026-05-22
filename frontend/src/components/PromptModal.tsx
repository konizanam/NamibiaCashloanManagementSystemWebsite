import { useEffect, useState } from 'react';

interface Props {
  open: boolean;
  title: string;
  description?: string;
  label?: string;
  placeholder?: string;
  multiline?: boolean;
  required?: boolean;
  minLength?: number;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'danger';
  initialValue?: string;
  /** When provided, the input is shown. When omitted, this is a confirm dialog only. */
  withInput?: boolean;
  onClose: () => void;
  onSubmit: (value: string) => void | Promise<void>;
}

/**
 * Branded prompt / confirm modal. Replaces window.prompt and window.confirm so
 * inputs are styled, mobile-friendly, and submit on Enter.
 */
export const PromptModal = ({
  open,
  title,
  description,
  label,
  placeholder,
  multiline = false,
  required = false,
  minLength = 0,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  initialValue = '',
  withInput = true,
  onClose,
  onSubmit,
}: Props) => {
  const [value, setValue] = useState(initialValue);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setValue(initialValue);
      setBusy(false);
      setErr(null);
    }
  }, [open, initialValue]);

  if (!open) return null;

  const canConfirm = withInput
    ? (!required || value.trim().length >= Math.max(1, minLength))
    : true;

  const submit = async () => {
    if (!canConfirm) return;
    setBusy(true);
    setErr(null);
    try {
      await onSubmit(withInput ? value.trim() : '');
      onClose();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const confirmCls =
    variant === 'danger'
      ? 'inline-flex items-center justify-center px-5 py-2.5 rounded-lg font-semibold text-sm text-white bg-red-600 hover:bg-red-700 shadow-card disabled:opacity-50 disabled:cursor-not-allowed'
      : 'btn-primary';

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-start sm:items-center justify-center z-50 p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 my-8"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-brand-navy text-lg">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700" aria-label="Close">✕</button>
        </div>

        {description && <p className="text-sm text-slate-600 mb-4">{description}</p>}

        {withInput && (
          <div>
            {label && <label className="field-label">{label}{required && <span className="text-red-500 ml-1">*</span>}</label>}
            {multiline ? (
              <textarea
                autoFocus
                className="field-input"
                rows={4}
                placeholder={placeholder}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submit();
                }}
              />
            ) : (
              <input
                autoFocus
                type="text"
                className="field-input"
                placeholder={placeholder}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
              />
            )}
            {required && minLength > 0 && value.trim().length > 0 && value.trim().length < minLength && (
              <div className="field-error">Please provide at least {minLength} characters.</div>
            )}
          </div>
        )}

        {err && (
          <div className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">{err}</div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button className="btn-outline" onClick={onClose} disabled={busy}>{cancelLabel}</button>
          <button className={confirmCls} onClick={submit} disabled={busy || !canConfirm}>
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
