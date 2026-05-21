const Group = ({ title, items }: { title: string; items: string[] }) => (
  <div className="card p-6">
    <div className="font-bold text-brand-navy">{title}</div>
    <ul className="mt-3 space-y-1.5 text-sm text-slate-700">
      {items.map((i) => (
        <li key={i}>✓ {i}</li>
      ))}
    </ul>
  </div>
);

export const Features = () => (
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
    <div className="text-center">
      <div className="text-brand-green-dark font-semibold uppercase tracking-wider text-xs">Features</div>
      <h1 className="text-4xl font-extrabold text-brand-navy mt-2">Everything you need to run a compliant lending business.</h1>
    </div>

    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
      <Group title="Client &amp; Loan Management" items={[
        'Client registration and profiles',
        'Loan history and active loan tracking',
        'Loan creation, approval and status management',
        'Loan reason management',
      ]} />
      <Group title="Repayments &amp; Interest" items={[
        'Automated repayment schedules',
        'Interest configuration and calculation',
        'Arrears and outstanding balance tracking',
      ]} />
      <Group title="Contracts, Signatures &amp; Notifications" items={[
        'Auto-generated loan contracts',
        'Online contract signing',
        'Walk-in signature pad capture (optional)',
        'Email alerts for approvals, reminders, contracts',
      ]} />
      <Group title="User &amp; Role-Based Access" items={[
        'Role-based user management',
        'Permission levels per role',
        'Secure access control by function',
      ]} />
      <Group title="Compliance &amp; Audit" items={[
        'Loan-related NAMFISA reports',
        'Full audit trail of all activity',
        'Contracts and document tracking',
      ]} />
      <Group title="Infrastructure" items={[
        'Secure cloud hosting included',
        'Ongoing system maintenance and updates',
        'No on-premise hardware required',
      ]} />
    </div>
  </div>
);
