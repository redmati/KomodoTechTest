import { useAuth } from '../../hooks/useAuth';

export function TopBar() {
  const { user, logout, isLoggingOut } = useAuth();

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
      <div />
      <div className="flex items-center gap-4">
        {user && (
          <span className="text-sm text-gray-600">
            {user.fullName}
            <span className="ml-1 text-xs text-gray-400">({user.role})</span>
          </span>
        )}
        <button
          onClick={() => logout()}
          disabled={isLoggingOut}
          className="text-sm text-primary-600 hover:text-primary-800 font-medium disabled:opacity-50"
        >
          {isLoggingOut ? 'Signing out…' : 'Sign out'}
        </button>
      </div>
    </header>
  );
}
