export const Contact = () => (
  <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
    <div className="text-brand-green-dark font-semibold uppercase tracking-wider text-xs">Contact</div>
    <h1 className="text-4xl font-extrabold text-brand-navy mt-2">Get in touch with Koniza.</h1>
    <p className="mt-3 text-slate-600">
      Talk to us about onboarding, tier selection, or a custom enhancement. We respond within one business day.
    </p>

    <div className="grid md:grid-cols-2 gap-6 mt-10">
      <div className="card p-7">
        <div className="font-bold text-brand-navy">Office</div>
        <div className="text-slate-700 mt-2">
          ERF 6239, Samuel Shikomba Street<br />
          Windhoek, Namibia
        </div>
      </div>
      <div className="card p-7">
        <div className="font-bold text-brand-navy">Reach out</div>
        <ul className="mt-2 space-y-1 text-slate-700">
          <li>Phone: <a className="text-brand-green-dark font-semibold" href="tel:+264814657337">+264 81 465 7337</a></li>
          <li>Email: <a className="text-brand-green-dark font-semibold" href="mailto:it@konizanam.com">it@konizanam.com</a></li>
          <li>Hours: Mon–Fri, 08:00–17:00 CAT</li>
        </ul>
      </div>
    </div>

    <div className="mt-10 card p-7 border-l-4 border-brand-green bg-green-50/40">
      <div className="font-bold text-brand-navy">Ready to apply?</div>
      <p className="text-sm text-slate-700 mt-1">
        If you want to onboard your microlending business directly, you can submit your application online — it takes a few minutes.
      </p>
      <a href="/apply" className="btn-primary mt-3 inline-flex">Apply Online →</a>
    </div>
  </div>
);
