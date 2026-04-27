import clsx from 'clsx';

type Variant =
  | 'default'
  | 'pending'
  | 'assigned'
  | 'closed'
  | 'deleted'
  | 'active'
  | 'scheduled'
  | 'completed'
  | 'cancelled'
  | 'no_show';

const variantClasses: Record<Variant, string> = {
  default: 'bg-gray-100 text-gray-700',
  pending: 'bg-yellow-100 text-yellow-800',
  assigned: 'bg-blue-100 text-blue-800',
  closed: 'bg-gray-200 text-gray-600',
  deleted: 'bg-red-100 text-red-700',
  active: 'bg-green-100 text-green-800',
  scheduled: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-600',
  no_show: 'bg-orange-100 text-orange-700',
};

interface BadgeProps {
  label: string;
  variant?: Variant;
  className?: string;
}

export function Badge({ label, variant = 'default', className }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
        variantClasses[variant],
        className,
      )}
    >
      {label}
    </span>
  );
}

/** Maps a string status value to a Badge variant */
export function statusToBadgeVariant(status: string): Variant {
  return (status.toLowerCase() as Variant) in variantClasses
    ? (status.toLowerCase() as Variant)
    : 'default';
}
