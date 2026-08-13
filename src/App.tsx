import { useCallback, useEffect, useMemo, useState } from 'react';
import { KeyRound, Pencil, Plus, Shield, UserMinus, Users } from 'lucide-react';
import {
  DEMO_IDENTITY,
  assignUserRoles,
  createUser,
  deactivateUser,
  fetchIdentity,
  fetchPermissions,
  fetchRoles,
  fetchUsers,
  updateUser,
  type IdentityRole,
  type IdentityUser,
} from './api';
import './styles.css';

type Tab = 'users' | 'roles' | 'permissions';

const fieldClass =
  'mt-1.5 block w-full h-10 px-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500';
const labelClass = 'text-xs font-semibold text-slate-600 uppercase tracking-wider';
const primaryBtnClass =
  'h-9 px-4 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-lg transition-colors inline-flex items-center gap-2 disabled:opacity-50';
const ghostBtnClass =
  'h-8 px-2.5 text-xs font-medium rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1.5 disabled:opacity-50';

const PAGE_SIZE = 5;

export default function IdentityApp() {
  const [tab, setTab] = useState<Tab>('users');
  const [authDisabled, setAuthDisabled] = useState(true);
  const [issuer, setIssuer] = useState<string | null>(null);
  const [roles, setRoles] = useState<IdentityRole[]>(DEMO_IDENTITY.roles);
  const [permissions, setPermissions] = useState<string[]>(DEMO_IDENTITY.permissions);
  const [users, setUsers] = useState<IdentityUser[]>(DEMO_IDENTITY.users);
  const [total, setTotal] = useState(DEMO_IDENTITY.users.length);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [createRoles, setCreateRoles] = useState<string[]>([]);
  const [editing, setEditing] = useState<IdentityUser | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRoles, setEditRoles] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const loadMeta = useCallback(async () => {
    try {
      const snapshot = await fetchIdentity();
      setAuthDisabled(snapshot.authDisabled);
      setIssuer(snapshot.issuer ?? null);
      setRoles(snapshot.roles);
      setPermissions(snapshot.permissions);
      setError(null);
    } catch {
      setAuthDisabled(DEMO_IDENTITY.authDisabled);
      setIssuer(null);
      setRoles(DEMO_IDENTITY.roles);
      setPermissions(DEMO_IDENTITY.permissions);
      setError('API de identidade indisponível — usando catálogo demo (AUTH_DISABLED).');
    }
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      const result = await fetchUsers({
        q: q.trim() || undefined,
        status: statusFilter,
        page,
        pageSize: PAGE_SIZE,
      });
      setUsers(result.items);
      setTotal(result.total);
      setError(null);
    } catch {
      const filtered = DEMO_IDENTITY.users.filter((u) => {
        if (statusFilter !== 'all' && u.status !== statusFilter) return false;
        if (!q.trim()) return true;
        const needle = q.trim().toLowerCase();
        return (
          u.name.toLowerCase().includes(needle) ||
          u.email.toLowerCase().includes(needle) ||
          u.roles.some((r) => r.toLowerCase().includes(needle))
        );
      });
      const start = (page - 1) * PAGE_SIZE;
      setUsers(filtered.slice(start, start + PAGE_SIZE));
      setTotal(filtered.length);
    }
  }, [page, q, statusFilter]);

  useEffect(() => {
    loadMeta();
  }, [loadMeta]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    if (tab !== 'roles' && tab !== 'permissions') return;
    Promise.all([fetchRoles().catch(() => null), fetchPermissions().catch(() => null)]).then(
      ([nextRoles, nextPermissions]) => {
        if (nextRoles) setRoles(nextRoles);
        if (nextPermissions) setPermissions(nextPermissions);
      },
    );
  }, [tab]);

  const roleOptions = useMemo(() => roles.map((r) => r.code), [roles]);

  function toggleRole(list: string[], code: string): string[] {
    return list.includes(code) ? list.filter((r) => r !== code) : [...list, code];
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await createUser({ name: name.trim(), email: email.trim(), roles: createRoles });
      setName('');
      setEmail('');
      setCreateRoles([]);
      setPage(1);
      setMessage('Usuário criado.');
      await loadUsers();
      await loadMeta();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao criar usuário');
    } finally {
      setBusy(false);
    }
  }

  function startEdit(user: IdentityUser) {
    setEditing(user);
    setEditName(user.name);
    setEditEmail(user.email);
    setEditRoles([...user.roles]);
    setMessage(null);
    setError(null);
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await updateUser(editing.id, {
        name: editName.trim(),
        email: editEmail.trim(),
      });
      await assignUserRoles(editing.id, editRoles);
      setEditing(null);
      setMessage('Usuário atualizado.');
      await loadUsers();
      await loadMeta();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao editar usuário');
    } finally {
      setBusy(false);
    }
  }

  async function handleDeactivate(user: IdentityUser) {
    if (user.status === 'inactive') return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await deactivateUser(user.id);
      if (editing?.id === user.id) setEditing(null);
      setMessage(`Usuário ${user.email} desativado.`);
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao desativar usuário');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-surface-muted p-4 lg:p-8">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">P02 — Identidade</p>
        <h1 className="text-xl font-bold text-slate-900 lg:text-2xl">Acesso e Governança</h1>
        <p className="mt-1 text-sm text-slate-500">
          Usuários, papéis e permissões {authDisabled ? '(modo AUTH_DISABLED / demo)' : '(Keycloak)'}
        </p>
      </header>

      {error ? (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800" role="alert">
          {error}
        </div>
      ) : null}
      {message ? (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {message}
        </div>
      ) : null}

      <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-slate-600">
          AUTH_DISABLED={String(authDisabled)}
        </span>
        {issuer ? (
          <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-slate-600">issuer={issuer}</span>
        ) : null}
      </div>

      <nav className="mb-6 flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1 w-fit">
        {(
          [
            { id: 'users' as const, label: `Usuários (${total})`, icon: Users },
            { id: 'roles' as const, label: `Papéis (${roles.length})`, icon: Shield },
            { id: 'permissions' as const, label: `Permissões (${permissions.length})`, icon: KeyRound },
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
        <div className="space-y-6">
          <form
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-card space-y-4"
            onSubmit={handleCreate}
            aria-label="Criar usuário"
          >
            <h2 className="text-sm font-semibold text-slate-800 inline-flex items-center gap-2">
              <Plus className="h-4 w-4 text-brand-600" />
              Novo usuário
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                <span className={labelClass}>Nome</span>
                <input className={fieldClass} value={name} onChange={(e) => setName(e.target.value)} required />
              </label>
              <label>
                <span className={labelClass}>E-mail</span>
                <input
                  type="email"
                  className={fieldClass}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </label>
            </div>
            <fieldset>
              <legend className={labelClass}>Papéis iniciais</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {roleOptions.map((code) => (
                  <label
                    key={code}
                    className={`cursor-pointer rounded-md border px-2 py-1 font-mono text-[11px] ${
                      createRoles.includes(code)
                        ? 'border-brand-300 bg-brand-50 text-brand-700'
                        : 'border-slate-200 bg-slate-50 text-slate-600'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={createRoles.includes(code)}
                      onChange={() => setCreateRoles((prev) => toggleRole(prev, code))}
                    />
                    {code}
                  </label>
                ))}
              </div>
            </fieldset>
            <button type="submit" className={primaryBtnClass} disabled={busy}>
              <Plus className="h-4 w-4" />
              Criar usuário
            </button>
          </form>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
            <div className="flex flex-wrap gap-3">
              <label className="min-w-[200px] flex-1">
                <span className={labelClass}>Buscar</span>
                <input
                  className={fieldClass}
                  value={q}
                  onChange={(e) => {
                    setPage(1);
                    setQ(e.target.value);
                  }}
                  placeholder="Nome, e-mail ou papel"
                />
              </label>
              <label>
                <span className={labelClass}>Status</span>
                <select
                  className={fieldClass}
                  value={statusFilter}
                  onChange={(e) => {
                    setPage(1);
                    setStatusFilter(e.target.value as 'all' | 'active' | 'inactive');
                  }}
                >
                  <option value="all">Todos</option>
                  <option value="active">Ativos</option>
                  <option value="inactive">Inativos</option>
                </select>
              </label>
            </div>
          </div>

          {editing ? (
            <form
              className="rounded-xl border border-brand-200 bg-brand-50/40 p-5 shadow-card space-y-4"
              onSubmit={handleSaveEdit}
              aria-label="Editar usuário"
            >
              <h2 className="text-sm font-semibold text-slate-800 inline-flex items-center gap-2">
                <Pencil className="h-4 w-4 text-brand-600" />
                Editar {editing.email}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <label>
                  <span className={labelClass}>Nome</span>
                  <input className={fieldClass} value={editName} onChange={(e) => setEditName(e.target.value)} required />
                </label>
                <label>
                  <span className={labelClass}>E-mail</span>
                  <input
                    type="email"
                    className={fieldClass}
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    required
                  />
                </label>
              </div>
              <fieldset>
                <legend className={labelClass}>Atribuir papéis</legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {roleOptions.map((code) => (
                    <label
                      key={code}
                      className={`cursor-pointer rounded-md border px-2 py-1 font-mono text-[11px] ${
                        editRoles.includes(code)
                          ? 'border-brand-300 bg-brand-50 text-brand-700'
                          : 'border-slate-200 bg-white text-slate-600'
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={editRoles.includes(code)}
                        onChange={() => setEditRoles((prev) => toggleRole(prev, code))}
                      />
                      {code}
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="flex flex-wrap gap-2">
                <button type="submit" className={primaryBtnClass} disabled={busy}>
                  Salvar alterações
                </button>
                <button type="button" className={ghostBtnClass} onClick={() => setEditing(null)}>
                  Cancelar
                </button>
              </div>
            </form>
          ) : null}

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Nome</th>
                  <th className="px-4 py-3">E-mail</th>
                  <th className="px-4 py-3">Papéis</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">
                      Nenhum usuário encontrado.
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="border-t border-slate-100">
                      <td className="px-4 py-3 font-medium text-slate-900">{user.name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">{user.email}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {user.roles.map((role) => (
                            <span
                              key={role}
                              className="rounded bg-brand-50 px-1.5 py-0.5 font-mono text-[10px] text-brand-700"
                            >
                              {role}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase ${
                            user.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {user.status === 'active' ? 'ativo' : 'inativo'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          <button type="button" className={ghostBtnClass} onClick={() => startEdit(user)} disabled={busy}>
                            <Pencil className="h-3.5 w-3.5" />
                            Editar
                          </button>
                          <button
                            type="button"
                            className={ghostBtnClass}
                            onClick={() => handleDeactivate(user)}
                            disabled={busy || user.status === 'inactive'}
                          >
                            <UserMinus className="h-3.5 w-3.5" />
                            Desativar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
              <span>
                Página {page} de {totalPages} · {total} usuário(s)
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  className={ghostBtnClass}
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Anterior
                </button>
                <button
                  type="button"
                  className={ghostBtnClass}
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Próxima
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {tab === 'roles' ? (
        <ul className="space-y-2">
          {roles.map((role) => (
            <li key={role.code} className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-card">
              <p className="font-mono text-sm font-semibold text-slate-900">{role.code}</p>
              <p className="text-sm text-slate-500">{role.description}</p>
            </li>
          ))}
        </ul>
      ) : null}

      {tab === 'permissions' ? (
        <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-5 shadow-card">
          {permissions.map((permission) => (
            <span
              key={permission}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 font-mono text-xs text-slate-700"
            >
              {permission}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
