export function clearSession() {
  for (const key of [
    'token',
    'usuario',
    'empresa',
    'gestaoos.token',
    'gestaoos_conversas',
    'gestaoos_conhecimento',
    'gestaoos_notificacoes',
  ])
    localStorage.removeItem(key);
  window.dispatchEvent(new Event('session-expired'));
}
export async function request(endpoint, options = {}) {
  const headers = new Headers(options.headers || {}),
    token = localStorage.getItem('token');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type'))
    headers.set('Content-Type', 'application/json');
  const response = await fetch(endpoint.startsWith('/api') ? endpoint : '/api' + endpoint, {
    ...options,
    headers,
  });
  if (response.status === 401 && localStorage.getItem('token')) clearSession();
  return response;
}
export async function api(endpoint, options = {}) {
  const response = await request(endpoint, options);
  const data = response.status === 204 ? null : await response.json();
  if (!response.ok) {
    const e = new Error(data?.error || 'Erro na requisição');
    e.status = response.status;
    e.code = data?.code;
    throw e;
  }
  return data;
}
export async function download(endpoint, filename) {
  const response = await request(endpoint);
  if (!response.ok) {
    let d = await response.json();
    throw Error(d.error || 'Download indisponível');
  }
  const url = URL.createObjectURL(await response.blob()),
    a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
