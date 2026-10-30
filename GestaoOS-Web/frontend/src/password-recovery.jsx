import React, { useEffect, useRef, useState } from 'react';
import { api, clearSession } from './api.js';
import './password-recovery.css';

const STORAGE = 'gestaoos.password-recovery';
const post = (endpoint, body) =>
  api('/auth/' + endpoint, { method: 'POST', body: JSON.stringify(body) });
const readReceipt = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE) || 'null');
  } catch {
    return null;
  }
};
const saveReceipt = (value) => {
  try {
    value ? localStorage.setItem(STORAGE, JSON.stringify(value)) : localStorage.removeItem(STORAGE);
  } catch {}
};

// Anchor to a monotonic clock, not the computer's wall clock. After reopening
// or resuming the tab, synchronize again with the server using the receipt.
function useCountdown(timing) {
  const [seconds, setSeconds] = useState(null);
  useEffect(() => {
    if (!timing) {
      setSeconds(null);
      return;
    }
    const deadline = performance.now() + Math.max(0, timing.expiresAt - timing.serverNow);
    const tick = () => setSeconds(Math.max(0, Math.ceil((deadline - performance.now()) / 1000)));
    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [timing]);
  return seconds;
}
function Countdown({ seconds }) {
  return (
    <div className="recovery-timer-block">
      <p>O link expira em:</p>
      <output
        className="recovery-timer"
        role="timer"
        aria-label="Tempo restante para redefinir a senha"
      >
        {seconds === null
          ? '—:—'
          : `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`}
      </output>
    </div>
  );
}
function Brand() {
  return (
    <div className="auth-brand">
      <img src="/assets/logo.png" alt="Gestão OS" width="40" height="40" />
      <h1>Gestão OS</h1>
    </div>
  );
}
function ErrorMessage({ message }) {
  return message ? (
    <p className="error-message show" role="alert">
      {message}
    </p>
  ) : null;
}

export function PasswordRecovery() {
  const [stage, setStage] = useState('closed');
  const [data, setData] = useState(null);
  const [timing, setTiming] = useState(null);
  const [error, setError] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [source, setSource] = useState(null);
  const busy = useRef(false);
  const title = useRef(null);
  const trigger = useRef(null);
  const seconds = useCountdown(timing);
  const expired = seconds === 0;
  const inProfile = /\/(admin|gestor|colaborador)\//.test(location.pathname);

  async function send(from) {
    if (busy.current) return;
    busy.current = true;
    setSource(from);
    setError('');
    setStage('sending');
    setTiming(null);
    try {
      const result = await post(
        from.profile ? 'esqueci-senha/perfil' : 'esqueci-senha',
        from.profile ? {} : from,
      );
      const stored = {
        receipt: result.receipt,
        maskedEmail: result.maskedEmail,
        scope: location.pathname,
      };
      saveReceipt(stored);
      setData(stored);
      setTiming(result);
      setStage('sent');
    } catch (e) {
      setError(e.message);
      setStage('error');
    } finally {
      busy.current = false;
    }
  }
  async function sync(stored) {
    setSyncing(true);
    setError('');
    try {
      setTiming(await post('recuperacao-status', { receipt: stored.receipt }));
    } catch (e) {
      setError(e.message);
      setTiming(null);
    } finally {
      setSyncing(false);
    }
  }
  useEffect(() => {
    const open = (event) => {
      trigger.current = document.activeElement;
      send(event.detail);
    };
    window.addEventListener('gestao-password-recovery', open);
    const stored = readReceipt();
    if (stored?.receipt && stored.scope === location.pathname) {
      setData(stored);
      setStage('sent');
      sync(stored);
    }
    return () => window.removeEventListener('gestao-password-recovery', open);
  }, []);
  useEffect(() => {
    if (stage === 'closed') return;
    document.body.dataset.recoveryOpen = 'true';
    const original = document.querySelector(
      inProfile ? '.app-container' : 'body > .auth-container:not(.recovery-root)',
    );
    if (original) original.inert = true;
    title.current?.focus();
    return () => {
      delete document.body.dataset.recoveryOpen;
      if (original) original.inert = false;
    };
  }, [stage, inProfile]);
  useEffect(() => {
    if (stage !== 'sent' || !data) return;
    const resume = () => {
      if (!document.hidden) sync(data);
    };
    document.addEventListener('visibilitychange', resume);
    window.addEventListener('pageshow', resume);
    return () => {
      document.removeEventListener('visibilitychange', resume);
      window.removeEventListener('pageshow', resume);
    };
  }, [stage, data]);
  function close() {
    saveReceipt(null);
    setStage('closed');
    setData(null);
    setTiming(null);
    setError('');
    setTimeout(() => trigger.current?.focus(), 0);
  }
  function retry() {
    if (source) send(source);
    else if (inProfile) send({ profile: true });
    else {
      close();
      document.getElementById('email')?.focus();
    }
  }
  if (stage === 'closed') return null;
  return (
    <div className={inProfile ? 'recovery-overlay' : 'auth-container recovery-root'}>
      <section
        className="auth-card recovery-card"
        role={inProfile ? 'dialog' : undefined}
        aria-modal={inProfile || undefined}
        aria-labelledby="recovery-heading"
        onKeyDown={(e) => {
          if (e.key === 'Escape' && !busy.current) close();
          if (e.key === 'Tab' && inProfile) {
            const nodes = [...e.currentTarget.querySelectorAll('button:not(:disabled), a[href]')];
            const first = nodes[0],
              last = nodes.at(-1);
            if (
              e.shiftKey &&
              (document.activeElement === first || document.activeElement === title.current)
            ) {
              e.preventDefault();
              last?.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
              e.preventDefault();
              first?.focus();
            }
          }
        }}
      >
        <Brand />
        <div className="auth-header">
          <h2 id="recovery-heading" ref={title} tabIndex="-1">
            {stage === 'sending'
              ? 'Enviando redefinição'
              : expired
                ? 'O link de redefinição expirou'
                : stage === 'error'
                  ? 'Não foi possível enviar'
                  : 'Redefinição de senha'}
          </h2>
        </div>
        {stage === 'sending' && <p role="status">Enviando o link para o seu e-mail…</p>}
        {stage === 'sent' && (
          <>
            {expired ? (
              <p role="status">Solicite um novo link para continuar.</p>
            ) : (
              <>
                <p>
                  Enviamos um link de redefinição de senha para o e-mail{' '}
                  <strong>{data?.maskedEmail}</strong> informado.
                </p>
                <p className="recovery-note">
                  O envio depende de os dados corresponderem a uma conta ativa.
                </p>
                <Countdown seconds={syncing ? null : seconds} />
                <p className="recovery-note">Verifique também sua caixa de spam.</p>
              </>
            )}
          </>
        )}
        <ErrorMessage message={error} />
        {stage === 'sent' && error && (
          <button
            className="btn btn-secondary btn-block"
            disabled={syncing}
            onClick={() => sync(data)}
          >
            Conferir prazo novamente
          </button>
        )}
        {(expired || stage === 'error') && (
          <button className="btn btn-primary btn-block" onClick={retry}>
            Solicitar novo link
          </button>
        )}
        <button
          type="button"
          className="btn btn-secondary btn-block recovery-back"
          disabled={stage === 'sending'}
          onClick={close}
        >
          {inProfile ? 'Voltar ao perfil' : 'Voltar ao login'}
        </button>
      </section>
    </div>
  );
}

export function ResetPasswordPage() {
  const completed = useRef(false);
  const [credentials, setCredentials] = useState(() => {
    const params = new URLSearchParams(location.hash.slice(1));
    return { id: params.get('id'), token: params.get('token') };
  });
  const [stage, setStage] = useState('loading');
  const [timing, setTiming] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const seconds = useCountdown(timing);
  useEffect(() => {
    const change = () => {
      const params = new URLSearchParams(location.hash.slice(1));
      completed.current = false;
      setError('');
      setTiming(null);
      setStage('loading');
      setCredentials({ id: params.get('id'), token: params.get('token') });
    };
    window.addEventListener('hashchange', change);
    return () => window.removeEventListener('hashchange', change);
  }, []);
  useEffect(() => {
    document.title = 'Redefinir senha - Gestão OS';
    document.body.className = 'auth-page';
    let active = true;
    async function validate() {
      if (completed.current || !active) return;
      try {
        const result = await post('validar-redefinicao', credentials);
        if (!active || completed.current) return;
        setTiming(result);
        setStage('form');
      } catch (e) {
        if (!active || completed.current) return;
        setError(e.message);
        setStage('invalid');
      }
    }
    validate();
    const resume = () => {
      if (!document.hidden) validate();
    };
    document.addEventListener('visibilitychange', resume);
    return () => {
      active = false;
      document.removeEventListener('visibilitychange', resume);
    };
  }, [credentials]);
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    const novaSenha = form.get('novaSenha'),
      confirmarSenha = form.get('confirmarSenha');
    if (novaSenha !== confirmarSenha) {
      setError('As senhas não coincidem.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await post('redefinir-senha', { ...credentials, novaSenha, confirmarSenha });
      completed.current = true;
      saveReceipt(null);
      clearSession();
      history.replaceState(null, '', location.pathname);
      setStage('success');
      setTiming(null);
    } catch (e) {
      setError(e.message);
      if (e.message.includes('link')) setStage('invalid');
    } finally {
      setBusy(false);
    }
  }
  const expired = seconds === 0 && stage !== 'success';
  return (
    <main className="auth-container">
      <section className="auth-card recovery-card">
        <Brand />
        <div className="auth-header">
          <h2>
            {stage === 'success'
              ? 'Senha redefinida'
              : expired
                ? 'O link de redefinição expirou'
                : 'Redefinir senha'}
          </h2>
        </div>
        {stage === 'loading' && <p role="status">Verificando seu link…</p>}
        {stage === 'success' ? (
          <p role="status">
            Sua senha foi alterada e as sessões anteriores foram encerradas. Faça login novamente.
          </p>
        ) : expired ? (
          <p>Solicite um novo link para continuar.</p>
        ) : (
          stage === 'form' && (
            <>
              <Countdown seconds={seconds} />
              <form onSubmit={submit}>
                <div className="form-group">
                  <label htmlFor="reset-password">Nova senha</label>
                  <input
                    id="reset-password"
                    name="novaSenha"
                    type="password"
                    autoComplete="new-password"
                    minLength="8"
                    maxLength="128"
                    required
                    placeholder="De 8 a 128 caracteres"
                    disabled={busy}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="reset-confirm">Confirmar nova senha</label>
                  <input
                    id="reset-confirm"
                    name="confirmarSenha"
                    type="password"
                    autoComplete="new-password"
                    minLength="8"
                    maxLength="128"
                    required
                    disabled={busy}
                  />
                </div>
                <button className="btn btn-primary btn-block" disabled={busy}>
                  {busy ? 'Redefinindo…' : 'Redefinir senha'}
                </button>
              </form>
            </>
          )
        )}
        <ErrorMessage message={error} />
        <a
          className="btn btn-secondary btn-block recovery-back"
          href="/login.html"
          onClick={() => saveReceipt(null)}
        >
          {stage === 'success' ? 'Fazer login' : 'Voltar ao login'}
        </a>
      </section>
    </main>
  );
}
