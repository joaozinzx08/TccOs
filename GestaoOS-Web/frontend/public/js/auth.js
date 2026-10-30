// ==========================================
// GESTÃO OS - MÓDULO DE AUTENTICAÇÃO
// ==========================================

// ==========================================
// VERIFICAR SE ESTÁ LOGADO
// ==========================================
function estaLogado() {
    return !!localStorage.getItem('token');
}

// ==========================================
// OBTER USUÁRIO LOGADO
// ==========================================
function getUsuario() {
    try {
        const user = localStorage.getItem('usuario');
        return user ? JSON.parse(user) : null;
    } catch {
        return null;
    }
}

// ==========================================
// OBTER EMPRESA LOGADA
// ==========================================
function getEmpresa() {
    try {
        const empresa = localStorage.getItem('empresa');
        return empresa ? JSON.parse(empresa) : null;
    } catch {
        return null;
    }
}

// ==========================================
// OBTER TOKEN
// ==========================================
function getToken() {
    return localStorage.getItem('token');
}

// ==========================================
// VERIFICAR PERMISSÃO POR ROLE
// ==========================================
function temRole(...rolesPermitidas) {
    const user = getUsuario();
    if (!user) return false;
    return rolesPermitidas.includes(user.role);
}

// ==========================================
// VERIFICAR SE É ADMIN
// ==========================================
function isAdmin() {
    return temRole('administrador_principal', 'administrador_setor');
}

// ==========================================
// VERIFICAR SE É ADMIN PRINCIPAL
// ==========================================
function isAdminPrincipal() {
    return temRole('administrador_principal');
}

// ==========================================
// VERIFICAR SE É GESTOR
// ==========================================
function isGestor() {
    return temRole('gestor');
}

// ==========================================
// VERIFICAR SE É COLABORADOR
// ==========================================
function isColaborador() {
    return temRole('colaborador');
}

// ==========================================
// PROTEÇÃO DE PÁGINAS
// Redireciona conforme necessidade
// ==========================================
function protegerPagina(rolesPermitidas = []) {
    // Não está logado
    if (!estaLogado()) {
        window.location.href = '../login.html';
        return false;
    }

    // Se roles foram especificadas, verificar
    if (rolesPermitidas.length > 0) {
        const user = getUsuario();
        if (!user || !rolesPermitidas.includes(user.role)) {
            // Redireciona para o dashboard correto
            redirecionarParaDashboard(user);
            return false;
        }
    }

    return true;
}

// ==========================================
// REDIRECIONAR PARA O DASHBOARD CORRETO
// ==========================================
function redirecionarParaDashboard(user = null) {
    if (!user) user = getUsuario();
    if (!user) {
        window.location.href = '../login.html';
        return;
    }

    const dashboards = {
        'administrador_principal': '../admin/dashboard.html',
        'administrador_setor': '../admin/dashboard.html',
        'gestor': '../gestor/dashboard.html',
        'colaborador': '../colaborador/dashboard.html'
    };

    window.location.href = dashboards[user.role] || '../login.html';
}

// ==========================================
// FAZER LOGOUT
// ==========================================
async function logout() { try { await apiRequest('/logout',{method:'POST'}); } finally { clearSession();window.location.href='/login.html'; } }

// ==========================================
// INICIALIZAÇÃO AUTOMÁTICA
// Preenche dados do usuário na sidebar
// ==========================================
function initUserInfo() {
    const user = getUsuario();

    if (!user) return;

    // Nome do usuário
    const userNameEl = document.getElementById('user-name');
    if (userNameEl) userNameEl.textContent = user.nome;

    // Role do usuário
    const userRoleEl = document.getElementById('user-role');
    if (userRoleEl) {
        const roles = {
            'administrador_principal': 'Administrador Principal',
            'administrador_setor': 'Administrador de Setor',
            'gestor': 'Gestor',
            'colaborador': 'Colaborador'
        };
        userRoleEl.textContent = roles[user.role] || user.role;
    }

    // Avatar
    const avatarEl = document.querySelector('.user-avatar');
    if (avatarEl && user.avatar) {
        avatarEl.innerHTML = `<img src="${window.avatarURL(user.avatar)}" alt="Avatar">`;
    }

    // Logout
    const logoutBtn = document.getElementById('logout');
    if (logoutBtn && !logoutBtn.dataset.bound) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
        logoutBtn.dataset.bound = 'true';
    }
}

// ==========================================
// INICIALIZAR AO CARREGAR
// ==========================================
window.onLegacyReady( () => {
    initUserInfo();
});