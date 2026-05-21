interface Props {
  /** 'light' = used on dark backgrounds (wraps in a white card). 'dark' = plain. */
  variant?: 'light' | 'dark';
  className?: string;
  /** Padding around the logo when on a white card. */
  padded?: boolean;
}

/**
 * Renders the official NCLMS logo. Prefers /nclms-logo.png if you've placed
 * the brand asset there; falls back to /nclms-logo.svg otherwise.
 */
export const Logo = ({ variant = 'dark', className = 'h-14 w-auto', padded = true }: Props) => {
  const img = (
    <img
      src="/nclms-logo.png"
      onError={(e) => {
        const el = e.currentTarget;
        if (!el.src.endsWith('.svg')) el.src = '/nclms-logo.svg';
      }}
      alt="NCLMS — Namibia Cash Loan Management System"
      className={`block ${className}`}
    />
  );
  if (variant === 'light') {
    return (
      <div
        className={`inline-flex items-center bg-white rounded-lg shadow-sm ring-1 ring-black/5 ${
          padded ? 'px-3 py-1.5' : ''
        }`}
      >
        {img}
      </div>
    );
  }
  return img;
};
