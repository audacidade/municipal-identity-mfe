export interface IdentityUser {
  id: string;
  name: string;
  email: string;
  roles: string[];
  source: 'demo' | 'keycloak' | 'control-plane';
}

export interface IdentitySnapshot {
  authDisabled: boolean;
  issuer?: string | null;
  users: IdentityUser[];
  roles: { code: string; description: string }[];
  permissions: string[];
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
    },
    {
      id: 'demo-finance',
      name: 'Analista Financeiro',
      email: 'financeiro@demo.local',
      roles: ['finance:read', 'finance:write', 'planning:read'],
      source: 'demo',
    },
    {
      id: 'demo-auditor',
      name: 'Auditor Interno',
      email: 'auditor@demo.local',
      roles: ['audit.read', 'transparency:read'],
      source: 'demo',
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
