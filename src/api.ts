export interface IdentityUser {
  id: string;
  name: string;
  email: string;
  roles: string[];
  source: 'demo' | 'keycloak' | 'control-plane';
  status: 'active' | 'inactive';
}

export interface IdentityRole {
  code: string;
  description: string;
}

export interface IdentitySnapshot {
  authDisabled: boolean;
  issuer?: string | null;
  users: IdentityUser[];
  roles: IdentityRole[];
  permissions: string[];
}

export interface UsersPage {
  items: IdentityUser[];
  total: number;
  page: number;
  pageSize: number;
}

async function parseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `HTTP ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function fetchIdentity(): Promise<IdentitySnapshot> {
  const response = await fetch('/api/platform/identity');
  const data = await parseJson<IdentitySnapshot>(response);
  return {
    ...data,
    users: (data.users ?? []).map((u) => ({
      ...u,
      status: u.status ?? 'active',
    })),
  };
}

export async function fetchUsers(params: {
  q?: string;
  status?: 'active' | 'inactive' | 'all';
  page?: number;
  pageSize?: number;
}): Promise<UsersPage> {
  const qs = new URLSearchParams();
  if (params.q) qs.set('q', params.q);
  if (params.status) qs.set('status', params.status);
  if (params.page) qs.set('page', String(params.page));
  if (params.pageSize) qs.set('pageSize', String(params.pageSize));
  const response = await fetch(`/api/platform/identity/users?${qs.toString()}`);
  return parseJson(response);
}

export async function createUser(input: {
  name: string;
  email: string;
  roles?: string[];
}): Promise<IdentityUser> {
  const response = await fetch('/api/platform/identity/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return parseJson(response);
}

export async function updateUser(
  id: string,
  input: { name?: string; email?: string; roles?: string[]; status?: 'active' | 'inactive' },
): Promise<IdentityUser> {
  const response = await fetch(`/api/platform/identity/users/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return parseJson(response);
}

export async function deactivateUser(id: string): Promise<IdentityUser> {
  const response = await fetch(`/api/platform/identity/users/${id}/deactivate`, {
    method: 'POST',
  });
  return parseJson(response);
}

export async function assignUserRoles(id: string, roles: string[]): Promise<IdentityUser> {
  const response = await fetch(`/api/platform/identity/users/${id}/roles`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roles }),
  });
  return parseJson(response);
}

export async function fetchRoles(): Promise<IdentityRole[]> {
  const response = await fetch('/api/platform/identity/roles');
  return parseJson(response);
}

export async function fetchPermissions(): Promise<string[]> {
  const response = await fetch('/api/platform/identity/permissions');
  return parseJson(response);
}

export const DEMO_IDENTITY: IdentitySnapshot = {
  authDisabled: true,
  issuer: null,
  users: [
    {
      id: 'demo-admin',
      name: 'Administrador Demo',
      email: 'admin@demo.local',
      roles: ['platform:admin', 'finance:admin', 'procurement:admin'],
      source: 'demo',
      status: 'active',
    },
    {
      id: 'demo-finance',
      name: 'Analista Financeiro',
      email: 'financeiro@demo.local',
      roles: ['finance:read', 'finance:write', 'planning:read'],
      source: 'demo',
      status: 'active',
    },
    {
      id: 'demo-auditor',
      name: 'Auditor Interno',
      email: 'auditor@demo.local',
      roles: ['audit.read', 'transparency:read'],
      source: 'demo',
      status: 'active',
    },
  ],
  roles: [
    { code: 'platform:admin', description: 'Administração completa do tenant' },
    { code: 'finance:admin', description: 'Administração financeira' },
    { code: 'finance:read', description: 'Leitura financeira' },
    { code: 'procurement:admin', description: 'Administração de compras' },
    { code: 'planning:read', description: 'Leitura de planejamento' },
  ],
  permissions: [
    'core.read',
    'identity.read',
    'finance.read',
    'planning.read',
    'procurement.read',
    'contracts.read',
    'audit.read',
  ],
};
