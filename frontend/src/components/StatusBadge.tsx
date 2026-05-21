import type { ApplicationStatus } from '../api/types';

export const StatusBadge = ({ status }: { status: ApplicationStatus }) => {
  const map: Record<ApplicationStatus, string> = {
    pending: 'badge-pending',
    approved: 'badge-approved',
    rejected: 'badge-rejected',
    requires_info: 'badge-info',
  };
  const label: Record<ApplicationStatus, string> = {
    pending: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
    requires_info: 'Info Required',
  };
  return <span className={map[status]}>{label[status]}</span>;
};
