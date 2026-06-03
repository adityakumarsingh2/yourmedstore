import { Lock, Mail, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AppNav from '../components/AppNav.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const demoAccounts = {
  Admin: {
    email: 'admin@yourmedstore.local',
    password: 'admin123'
  },
  User: {
    email: 'user@yourmedstore.local',
    password: 'user123'
  }
};

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [selectedRole, setSelectedRole] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  function selectDemoRole(role) {
    setSelectedRole(role);
    setEmail(demoAccounts[role].email);
    setPassword(demoAccounts[role].password);
    setError('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const session = await login(email, password);
      const requestedPath = location.state?.from?.pathname;
      const fallbackPath = session.user.role === 'Admin' ? '/admin' : '/marketplace';

      navigate(requestedPath || fallbackPath, { replace: true });
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <AppNav />
      <main className="mx-auto grid min-h-[calc(100vh-65px)] max-w-7xl items-center gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_430px] lg:px-8">
        <section className="max-w-2xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-md border border-teal-200 bg-teal-50 px-3 py-2 text-sm font-medium text-teal-800">
            <ShieldCheck size={16} aria-hidden="true" />
            Admin and User access
          </div>
          <h1 className="text-4xl font-semibold leading-tight text-slate-950 sm:text-5xl">
            Chemical inventory and quotation workspace
          </h1>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {['INR pricing', 'Unit-aware orders', 'Admin review'].map((label) => (
              <div key={label} className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-sm font-semibold text-slate-900">{label}</p>
                <div className="mt-4 h-2 rounded bg-slate-200">
                  <div className="h-2 w-2/3 rounded bg-amber-500" />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-md border border-slate-200 bg-white p-6 shadow-panel">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-slate-950">Sign in</h2>
            <p className="mt-1 text-sm text-slate-500">Enter registered credentials or choose a demo profile.</p>
          </div>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Email</span>
              <span className="relative block">
                <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="h-11 w-full rounded-md border border-slate-300 bg-white pl-10 pr-3 text-sm text-slate-900 outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
                />
              </span>
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Password</span>
              <span className="relative block">
                <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="h-11 w-full rounded-md border border-slate-300 bg-white pl-10 pr-3 text-sm text-slate-900 outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
                />
              </span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="rounded-md border border-slate-300 bg-slate-50 p-3 text-sm font-medium text-slate-700">
                <input
                  checked={selectedRole === 'Admin'}
                  className="mr-2 accent-teal-700"
                  name="role"
                  onChange={() => selectDemoRole('Admin')}
                  type="radio"
                />
                Admin
              </label>
              <label className="rounded-md border border-slate-300 bg-slate-50 p-3 text-sm font-medium text-slate-700">
                <input
                  checked={selectedRole === 'User'}
                  className="mr-2 accent-teal-700"
                  name="role"
                  onChange={() => selectDemoRole('User')}
                  type="radio"
                />
                User
              </label>
            </div>
            {error && (
              <div aria-live="polite" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700" role="alert">
                {error}
              </div>
            )}
            <button
              className="h-11 w-full rounded-md bg-teal-700 px-4 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? 'Signing in' : 'Sign in'}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}

export default LoginPage;
