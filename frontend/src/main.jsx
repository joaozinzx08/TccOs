import React, { createContext, useContext, useEffect, useLayoutEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { api, clearSession } from './api.js';
import { installBridge, loadScript, prepareLegacy, finishLegacy } from './legacy-bridge.js';
import manifest from './manifest.json';
const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);
const pages = import.meta.glob('./pages/*.jsx');
function dashboard(role) {
  return `/${role === 'colaborador' ? 'colaborador' : role === 'gestor' ? 'gestor' : 'admin'}/dashboard.html`;
}
function AuthProvider({ children }) {
  const [user, setUser] = useState(null),
    [ready, setReady] = useState(false);
  useEffect(() => {
    let active = true;
    const expired = () => {
      setUser(null);
      if (/\/(admin|gestor|colaborador)\//.test(location.pathname)) location.replace('/login.html');
    };
    window.addEventListener('session-expired', expired);
    if (localStorage.getItem('token'))
      api('/perfil')
        .then((u) => {
          if (active) {
            localStorage.setItem('usuario', JSON.stringify(u));
            setUser(u);
          }
        })
        .catch(() => clearSession())
        .finally(() => active && setReady(true));
    else setReady(true);
    return () => {
      active = false;
      window.removeEventListener('session-expired', expired);
    };
  }, []);
  const login = (data) => {
    localStorage.setItem('token', data.token);
    localStorage.setItem('usuario', JSON.stringify(data.usuario));
    localStorage.setItem('empresa', JSON.stringify(data.empresa));
    setUser(data.usuario);
  };
  return <AuthContext.Provider value={{ user, ready, login }}>{children}</AuthContext.Provider>;
}
function ProtectedRoute({ entry, children }) {
  const { user, ready } = useAuth();
  if (entry.protected && !ready) return null;
  if (entry.protected && !user) {
    location.replace('/login.html');
    return null;
  }
  if (entry.protected) {
    const folder = location.pathname.split('/')[1],
      allowed =
        user.role === 'colaborador'
          ? folder === 'colaborador'
          : user.role === 'gestor'
            ? folder === 'gestor'
            : folder === 'admin';
    if (!allowed) {
      location.replace(dashboard(user.role));
      return null;
    }
  }
  return children;
}
function LegacyPage({ page }) {
  const { login } = useAuth();
  useLayoutEffect(() => {
    document.title = page.metadata.title;
    document.body.className = page.metadata.bodyClass;
  }, [page]);
  useEffect(() => {
    let alive = true;
    async function boot() {
      installBridge({ login, dashboard });
      for (const src of ['/js/icones.js', '/js/i18n.js', '/js/utils.js', '/js/auth.js']) await loadScript(src);
      await prepareLegacy(page.metadata.key);
      if (!alive) return;
      await loadScript(page.metadata.script);
      await finishLegacy(page.metadata.key);
      window.dispatchEvent(new Event('gestao-ready'));
    }
    boot().catch((error) => {
      console.error(error);
      window.showToast?.(error.message, 'error');
    });
    return () => {
      alive = false;
    };
  }, [page]);
  return (
    <>
      {page.metadata.styles.map((css, i) => (
        <style key={i}>{css}</style>
      ))}
      <page.default />
    </>
  );
}
function App() {
  const route =
    location.pathname === '/'
      ? '/index.html'
      : location.pathname.endsWith('.html')
        ? location.pathname
        : location.pathname + '.html';
  const entry = manifest[route];
  const [page, setPage] = useState(null);
  useEffect(() => {
    if (!entry) {
      location.replace('/index.html');
      return;
    }
    pages[`./pages/${entry.file}.jsx`]().then(setPage);
  }, []);
  if (!page) return null;
  return (
    <ProtectedRoute entry={entry}>
      <LegacyPage page={page} />
    </ProtectedRoute>
  );
}
class ErrorBoundary extends React.Component {
  state = { error: null };
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    return this.state.error ? (
      <main className="auth-container">
        <div className="auth-card">
          <h1>Gestão OS</h1>
          <p role="alert">Não foi possível carregar esta tela. Atualize a página.</p>
          <a href="/index.html">Voltar ao início</a>
        </div>
      </main>
    ) : (
      this.props.children
    );
  }
}
createRoot(document.body).render(
  <ErrorBoundary>
    <AuthProvider>
      <App />
    </AuthProvider>
  </ErrorBoundary>,
);
