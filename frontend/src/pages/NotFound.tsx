import { Link } from 'react-router-dom';

export const NotFound = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-brand-bg">
    <div className="text-6xl font-extrabold text-brand-navy">404</div>
    <p className="text-slate-500 mt-2">That page doesn't exist.</p>
    <Link to="/" className="btn-primary mt-6">Back to home</Link>
  </div>
);
