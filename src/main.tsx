import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import IdentityApp from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <IdentityApp />
  </StrictMode>,
);
