import type { InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes, ReactNode } from 'react';

interface FieldShellProps {
  label: string;
  htmlFor?: string;
  help?: string;
  error?: string | null;
  required?: boolean;
  children: ReactNode;
}

export const FieldShell = ({ label, htmlFor, help, error, required, children }: FieldShellProps) => (
  <div>
    <label htmlFor={htmlFor} className="field-label">
      {label}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
    {children}
    {error ? <div className="field-error">{error}</div> : help ? <div className="field-help">{help}</div> : null}
  </div>
);

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  help?: string;
  error?: string | null;
}

export const TextField = ({ label, help, error, required, id, ...rest }: TextFieldProps) => {
  const inputId = id ?? rest.name;
  return (
    <FieldShell label={label} htmlFor={inputId} help={help} error={error} required={required}>
      <input id={inputId} required={required} {...rest} className={`field-input ${rest.className ?? ''}`} />
    </FieldShell>
  );
};

interface TextAreaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  help?: string;
  error?: string | null;
}

export const TextAreaField = ({ label, help, error, required, id, ...rest }: TextAreaFieldProps) => {
  const inputId = id ?? rest.name;
  return (
    <FieldShell label={label} htmlFor={inputId} help={help} error={error} required={required}>
      <textarea id={inputId} rows={3} required={required} {...rest} className={`field-input ${rest.className ?? ''}`} />
    </FieldShell>
  );
};

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  help?: string;
  error?: string | null;
  options: { value: string; label: string }[];
}

export const SelectField = ({ label, help, error, required, options, id, ...rest }: SelectFieldProps) => {
  const inputId = id ?? rest.name;
  return (
    <FieldShell label={label} htmlFor={inputId} help={help} error={error} required={required}>
      <select id={inputId} required={required} {...rest} className={`field-input ${rest.className ?? ''}`}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
};
