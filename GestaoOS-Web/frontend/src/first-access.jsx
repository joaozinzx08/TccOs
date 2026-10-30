import React, { useState } from 'react';
import { api, clearSession } from './api.js';
import './password-recovery.css';

export function FirstAccessPage({ user, ready }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  if (!ready) return null;
  if (!user) {
    location.replace('/login.html');
    return null;
  }
  if (!user.precisaTrocarSenha) {
    location.replace(user.role === 'gestor' ? '/gestor/dashboard.html' : '/admin/dashboard.html');
    return null;
  }

  async function submit(event) {
    event.preventDefault();
    setMessage('');
    if (password.length < 8) return setMessage('A nova senha precisa ter pelo menos 8 caracteres.');
    if (password !== confirmation) return setMessage('As senhas não coincidem.');
    if (password === currentPassword) return setMessage('Escolha uma senha diferente da temporária.');
    setSaving(true);
    try {
      await api('/perfil', {
        method: 'PATCH',
        body: JSON.stringify({ senhaAtual: currentPassword, novaSenha: password }),
      });
      clearSession();
      location.replace('/login.html?senha-atualizada=1');
    } catch (error) {
      setMessage(error.message);
      setSaving(false);
    }
  }

  return (
    <main className="recovery-page">
      <section className="recovery-card" aria-labelledby="first-access-title">
        <span className="recovery-icon">🔐</span>
        <p className="recovery-eyebrow">Primeiro acesso</p>
        <h1 id="first-access-title">Crie sua senha</h1>
        <p>Olá, {user.nome}. Antes de abrir o painel, troque a senha temporária criada pelo CEO.</p>
        <form onSubmit={submit} className="recovery-form">
          <label>Senha temporária<input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} autoComplete="current-password" required /></label>
          <label>Nova senha<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" minLength="8" required /></label>
          <label>Confirmar nova senha<input type="password" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} autoComplete="new-password" minLength="8" required /></label>
          {message && <p className="recovery-error" role="alert">{message}</p>}
          <button type="submit" disabled={saving}>{saving ? 'Salvando…' : 'Salvar nova senha'}</button>
        </form>
      </section>
    </main>
  );
}
