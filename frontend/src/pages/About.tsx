import { usePageMeta } from '../hooks/usePageMeta';

export const About = () => {
  usePageMeta({
    title: 'About NCLMS',
    description: 'Built by Koniza Information Technology for Namibian microlenders. End-to-end loan management, NAMFISA-aligned reporting, secure cloud hosting included.',
    canonicalPath: '/about',
  });
  return (
  <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
    <div className="text-brand-green-dark font-semibold uppercase tracking-wider text-xs">About NCLMS</div>
    <h1 className="text-4xl font-extrabold text-brand-navy mt-2">Built for Namibian microlenders.</h1>
    <p className="mt-4 text-slate-600 leading-relaxed text-lg">
      NCLMS is a loan management platform created by Koniza to help cash loan businesses across Namibia run
      compliant, efficient, and audit-ready operations — without expensive infrastructure or in-house IT.
    </p>

    <div className="grid md:grid-cols-2 gap-8 mt-12">
      <div className="card p-7">
        <div className="text-brand-green-dark font-semibold text-sm uppercase tracking-wider">Vision</div>
        <p className="mt-2 text-slate-700 leading-relaxed">
          Be the most trusted, NAMFISA-aligned loan management platform for the Namibian microlending industry —
          simple enough for one-branch lenders, robust enough for nationwide portfolios.
        </p>
      </div>
      <div className="card p-7">
        <div className="text-brand-navy font-semibold text-sm uppercase tracking-wider">What we deliver</div>
        <ul className="mt-3 space-y-2 text-slate-700">
          <li>→ End-to-end client and loan management</li>
          <li>→ Repayment scheduling and arrears tracking</li>
          <li>→ Auto-generated contracts and digital signatures</li>
          <li>→ Email notifications for approvals and reminders</li>
          <li>→ Role-based access and full audit trail</li>
          <li>→ Secure cloud hosting and ongoing updates</li>
        </ul>
      </div>
    </div>

    <div className="mt-12 card p-7 border-l-4 border-brand-amber bg-amber-50/40">
      <div className="font-semibold text-brand-navy">Compliance scope</div>
      <p className="mt-1 text-sm text-slate-700">
        NCLMS provides NAMFISA-aligned loan reporting only. It does not replace accounting, tax, or legal services.
        Compliance responsibility remains with the lender.
      </p>
    </div>
  </div>
  );
};
