import { useCallback, useEffect, useState } from 'react';
import { KeyRound, Shield, Users } from 'lucide-react';
import { DEMO_IDENTITY, fetchIdentity, type IdentitySnapshot } from './api';
import './styles.css';

type Tab = 'users' | 'roles' | 'permissions';

export default function IdentityApp() {
  const [data, setData] = useState<IdentitySnapshot>(DEMO_IDENTITY);
  const [tab, setTab] = useState<Tab>('users');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const snapshot = await fetchIdentity();
      setData(snapshot);
    } catch {
      setData(DEMO_IDENTITY);
      setError('API de identidade indisponível — exibindo usuários demo (AUTH_DISABLED).');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="min-h-screen bg-surface-muted p-4 lg:p-8">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">P02 — Identidade</p>
        <h1 className="text-xl font-bold text-slate-900 lg:text-2xl">Acesso e Governança</h1>
        <p className="mt-1 text-sm text-slate-500">
          Usuários, papéis e permissões {data.authDisabled ? '(modo AUTH_DISABLED / demo)' : '(Keycloak)'}
        </p>
      </header>

      {error ? (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{error}</div>
      ) : null}

      <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-slate-600">
          AUTH_DISABLED={String(data.authDisabled)}
        </span>
        {data.issuer ? (
          <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-slate-600">issuer={data.issuer}</span>
        ) : null}
      </div>

      <nav className="mb-6 flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1 w-fit">
        {(
          [
            { id: 'users' as const, label: `Usuários (${data.users.length})`, icon: Users },
            { id: 'roles' as const, label: `Papéis (${data.roles.length})`, icon: Shield },
            { id: 'permissions' as const, label: `Permissões (${data.permissions.length})`, icon: KeyRound },
          ] as const
        ).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 h-8 text-xs font-medium ${
              tab === id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </nav>

      {tab === 'users' ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">E-mail</th>
                <th className="px-4 py-3">Papéis</th>
                <th className="px-4 py-3">Origem</th>
              </tr>
            </thead>
            <tbody>
              {data.users.map((user) => (
                <tr key={user.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-900">{user.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">{user.email}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {user.roles.map((role) => (
                        <span key={role} className="rounded bg-brand-50 px-1.5 py-0.5 font-mono text-[10px] text-brand-700">
                          {role}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs uppercase text-slate-500">{user.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {tab === 'roles' ? (
        <ul className="space-y-2">
          {data.roles.map((role) => (
            <li key={role.code} className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-card">
              <p className="font-mono text-sm font-semibold text-slate-900">{role.code}</p>
              <p className="text-sm text-slate-500">{role.description}</p>
            </li>
          ))}
        </ul>
      ) : null}

      {tab === 'permissions' ? (
        <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-5 shadow-card">
          {data.permissions.map((permission) => (
            <span key={permission} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 font-mono text-xs text-slate-700">
              {permission}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
