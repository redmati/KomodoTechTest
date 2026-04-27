import { NavLink } from 'react-router-dom';
import clsx from 'clsx';

const navItems = [
  { to: '/referrals', label: 'Referrals', icon: '📋' },
  { to: '/case-profiles', label: 'Case Profiles', icon: '👤' },
  { to: '/calendar', label: 'Calendar', icon: '📅' },
];

export function Sidebar() {
  return (
    <aside className="w-56 min-h-screen bg-primary-800 text-white flex flex-col shrink-0">
      <div className="px-4 py-5 border-b border-primary-700">
        <span className="text-xs font-semibold uppercase tracking-widest text-primary-300">
          RedMati Counsel
        </span>
      </div>

      <nav className="flex-1 py-4 space-y-1 px-2">
        {navItems.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary-600 text-white'
                  : 'text-primary-200 hover:bg-primary-700 hover:text-white',
              )
            }
          >
            <span>{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
