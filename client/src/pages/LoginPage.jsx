import { useState } from 'react';
import { ArrowRight, Building2, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { DEMO_ACCOUNTS } from '../auth/demoAccounts';

export default function LoginPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function handleSelectQuickAccount(account) {
    setEmail(account.email);
    setPassword(account.password);
    setError('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const message = await signIn(email, password);
      if (message) setError(message);
    } catch (requestError) {
      console.error('Demo sign-in failed', requestError);
      setError('Demo sign-in could not be completed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F5F3EF] p-4">
      <section className="grid w-full max-w-3xl grid-cols-1 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xl md:grid-cols-2">
        <div className="flex flex-col justify-center bg-white p-6 sm:p-7">
          <div>
            <div className="mb-6 flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-stone-900" />
              <span className="text-lg font-bold tracking-tight text-stone-900">JanSuno AI</span>
            </div>

            <h1 className="mb-1 text-xl font-bold text-stone-900">
              Welcome back
            </h1>
            <p className="mb-6 text-xs text-stone-500">
              Sign in to the JanSuno AI demo workspace
            </p>

            {error && (
              <p role="alert" className="mb-4 rounded-xl border border-red-100 bg-red-50 p-3 text-xs text-red-700">
                {error}
              </p>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="block">
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-stone-500">
                  Email address
                </span>
                <span className="relative block">
                  <Mail aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                  <input
                    type="email"
                    autoComplete="username"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-lg border border-stone-200 bg-stone-50 py-2 pl-9 pr-3 text-xs text-stone-800 placeholder-stone-400 transition focus:border-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900"
                  />
                </span>
              </label>

              <label className="block">
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-stone-500">
                  Password
                </span>
                <span className="relative block">
                  <LockKeyhole aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                  <input
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your demo password"
                    className="w-full rounded-lg border border-stone-200 bg-stone-50 py-2 pl-9 pr-3 text-xs text-stone-800 placeholder-stone-400 transition focus:border-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900"
                  />
                </span>
              </label>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#2B231D] py-2.5 text-xs font-semibold text-white transition hover:bg-[#1C1612] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? 'Signing in…' : 'Sign in'}
                {!loading && <ArrowRight aria-hidden="true" size={14} />}
              </button>
            </form>
          </div>

        </div>

        <div className="flex flex-col justify-between border-t border-stone-200 bg-[#FAF8F5] p-6 sm:p-7 md:border-l md:border-t-0">
          <div>
            <div className="mb-4 flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-stone-500">
                <Building2 aria-hidden="true" className="h-4 w-4 text-stone-700" />
                Demo workspace
              </span>
              {import.meta.env.DEV && (
                <span className="rounded-full bg-stone-200/70 px-2.5 py-1 text-[10px] font-medium text-stone-700">
                  1-click preview
                </span>
              )}
            </div>

            <h2 className="mb-3 text-sm font-bold text-stone-900">Quick demo profiles</h2>

            {import.meta.env.DEV ? (
              <div className="space-y-2.5">
                {DEMO_ACCOUNTS.map((account) => (
                  <button
                    key={account.id}
                    type="button"
                    onClick={() => handleSelectQuickAccount(account)}
                    className="group w-full rounded-xl border border-stone-200 bg-white p-3 text-left shadow-sm transition-all duration-200 hover:border-stone-400 hover:shadow-md"
                  >
                    <span className="mb-0.5 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-bold text-stone-900">{account.name}</span>
                      <span className="rounded bg-stone-100 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-stone-600">
                        {account.role}
                      </span>
                    </span>
                    <span className="mb-1.5 block truncate font-mono text-[11px] text-stone-500">{account.email}</span>
                    <span className="flex items-center justify-between gap-2 border-t border-stone-100 pt-1.5 text-[11px] text-stone-500">
                      <span>Password: <strong className="font-medium text-stone-700">{account.password}</strong></span>
                      <span className="flex shrink-0 items-center font-medium text-stone-800">
                        Fill only
                      <ArrowRight aria-hidden="true" size={14} className="ml-1 transition-transform group-hover:translate-x-1" />
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="rounded-xl border border-stone-200 bg-white/70 p-4 text-xs text-stone-600">
                Demo profiles are available only when running the local development server.
              </p>
            )}
          </div>

        </div>
      </section>
    </main>
  );
}
