import { Beaker, LayoutDashboard, LogIn, Store } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const links = [
  { to: '/login', label: 'Login', icon: LogIn },
  { to: '/marketplace', label: 'Marketplace', icon: Store },
  { to: '/admin', label: 'Admin', icon: LayoutDashboard }
];

function AppNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-md bg-teal-700 text-white">
            <Beaker size={21} aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">YourMedStore</p>
            <p className="text-xs text-slate-500">Chemical inventory</p>
          </div>
        </div>
        <nav className="flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 p-1">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                [
                  'inline-flex h-9 items-center gap-2 rounded px-3 text-sm font-medium transition',
                  isActive ? 'bg-white text-teal-800 shadow-sm' : 'text-slate-600 hover:bg-white hover:text-slate-900'
                ].join(' ')
              }
            >
              <Icon size={16} aria-hidden="true" />
              <span className="hidden sm:inline">{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}

export default AppNav;
