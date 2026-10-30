// ==========================================
// GESTÃO OS - MÓDULO DE API
// ==========================================

const API_BASE = 'http://localhost:3000/api';

// ==========================================
// REQUISIÇÃO GENÉRICA
// ==========================================
async function apiRequest(endpoint, options = {}) {
    const token = localStorage.getItem('token');

    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
        ...options,
        headers
    };

    try {
        const response = await fetch(`${API_BASE}${endpoint}`, config);

        // Se a resposta não tiver conteúdo (204)
        if (response.status === 204) {
            return null;
        }

        const data = await response.json();

        if (!response.ok) {
            // Token expirado ou inválido
            if (response.status === 401) {
                const publicPages = [
                    'login.html',
                    'criar-empresa.html',
                    'entrar-empresa.html',
                    'index.html',
                    'verificar-email.html'
                ];
                const currentPage = window.location.pathname.split('/').pop();

                if (!publicPages.includes(currentPage)) {
                    localStorage.clear();
                    window.location.href = '../login.html';
                    throw new Error('Sessão expirada. Faça login novamente.');
                }
            }

            throw new Error(data.error || 'Erro na requisição');
        }

        return data;

    } catch (error) {
        // Erros de rede
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            throw new Error('Erro de conexão. Verifique se o servidor está rodando.');
        }

        console.error('API Error:', error);
        throw error;
    }
}

// ==========================================
// UPLOAD DE ARQUIVOS (multipart/form-data)
// ==========================================
async function apiUpload(endpoint, formData) {
    const token = localStorage.getItem('token');

    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Erro no upload');
        }

        return data;

    } catch (error) {
        console.error('Upload Error:', error);
        throw error;
    }
}

// ==========================================
// VERIFICAR STATUS DO SERVIDOR
// ==========================================
async function verificarServidor() {
    try {
        const response = await fetch(`${API_BASE}/status`);
        return response.ok;
    } catch {
        return false;
    }
}