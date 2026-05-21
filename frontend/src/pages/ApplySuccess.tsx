import { Link, useLocation } from 'react-router-dom';

export const ApplySuccess = () => {
  const loc = useLocation();
  const state = loc.state as { id?: string } | null;
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
      <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
          <path d="M4 12.5l5 5L20 6" stroke="#15803d" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h1 className="text-3xl md:text-4xl font-extrabold text-brand-navy mt-5">Application received.</h1>
      <p className="text-slate-600 mt-3">
        Thank you. Our team will review your documents and respond by email. This typically takes 1–2 business days.
      </p>
      {state?.id && (
        <div className="mt-6 inline-block card px-5 py-3 text-sm">
          <span className="text-slate-500">Reference</span>{' '}
          <span className="font-mono font-semibold text-brand-navy">{state.id}</span>
        </div>
      )}
      <div className="mt-8">
        <Link to="/" className="btn-outline">← Back to home</Link>
      </div>
    </div>
  );
};
