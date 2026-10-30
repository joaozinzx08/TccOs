// ==========================================
// GESTÃO OS - UTILITÁRIOS
// ==========================================

// ==========================================
// FORMATAR DATA
// ==========================================
function formatDate(dateString) {
    if (!dateString) return '—';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '—';

        return date.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch {
        return '—';
    }
}

// ==========================================
// FORMATAR DATA CURTA (só dia/mês/ano)
// ==========================================
function formatDateShort(dateString) {
    if (!dateString) return '—';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR');
    } catch {
        return '—';
    }
}

// ==========================================
// TEMPO RELATIVO (há 5min, há 2h, etc)
// ==========================================
function timeAgo(dateString) {
    if (!dateString) return '—';
    try {
        const date = new Date(dateString);
        const agora = new Date();
        const diff = Math.floor((agora - date) / 1000); // segundos

        if (diff < 60) return 'agora mesmo';
        if (diff < 3600) return `há ${Math.floor(diff / 60)}min`;
        if (diff < 86400) return `há ${Math.floor(diff / 3600)}h`;
        if (diff < 604800) return `há ${Math.floor(diff / 86400)}d`;
        if (diff < 2592000) return `há ${Math.floor(diff / 604800)}sem`;

        return formatDateShort(dateString);
    } catch {
        return '—';
    }
}

// ==========================================
// SHOW TOAST (NOTIFICAÇÃO)
// ==========================================
function showToast(message, type = 'info') {
    // Container
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    // Cores e ícones
    const estilos = {
        success: { bg: '#059669', icon: '[[icone:confirmar]]' },
        error: { bg: '#dc2626', icon: '[[icone:fechar]]' },
        warning: { bg: '#d97706', icon: '[[icone:alerta]]' },
        info: { bg: '#2563eb', icon: '[[icone:informacao]]' }
    };

    const estilo = estilos[type] || estilos.info;

    // Criar toast
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.style.cssText = `
        padding: 14px 20px;
        border-radius: 10px;
        background: ${estilo.bg};
        color: #fff;
        font-weight: 500;
        font-size: 0.875rem;
        box-shadow: 0 10px 40px rgba(0,0,0,0.2);
        display: flex;
        align-items: center;
        gap: 12px;
        font-family: 'Inter', -apple-system, sans-serif;
        animation: slideInRight 0.3s ease;
        margin-bottom: 8px;
    `;

    toast.innerHTML = `
        <span style="font-size:1.1rem;">${estilo.icon}</span>
        <span>${message}</span>
    `;

    container.appendChild(toast);

    // Remover após 4 segundos
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// ==========================================
// COPIAR PARA ÁREA DE TRANSFERÊNCIA
// ==========================================
async function copiarTexto(texto) {
    try {
        await navigator.clipboard.writeText(texto);
        showToast('Copiado para a área de transferência!', 'success');
        return true;
    } catch {
        // Fallback para navegadores antigos
        try {
            const input = document.createElement('input');
            input.value = texto;
            document.body.appendChild(input);
            input.select();
            document.execCommand('copy');
            document.body.removeChild(input);
            showToast('Copiado!', 'success');
            return true;
        } catch {
            showToast('Não foi possível copiar', 'error');
            return false;
        }
    }
}

// ==========================================
// VALIDAR E-MAIL
// ==========================================
function validarEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

// ==========================================
// VALIDAR SENHA
// ==========================================
function validarSenha(senha) {
    return senha && senha.length >= 6;
}

// ==========================================
// GERAR ID CURTO
// ==========================================
function shortId(id) {
    if (!id) return '—';
    return id.substring(0, 8);
}

// ==========================================
// DEBOUNCE (para busca)
// ==========================================
function debounce(fn, delay = 300) {
    let timer;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}

// ==========================================
// TEMA CLARO/ESCURO
// ==========================================
function initTheme() {
    const themeToggle = document.getElementById('theme-toggle');
    if (!themeToggle) return;

    const currentTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);
    themeToggle.textContent = currentTheme === 'dark' ? '[[icone:sol]]' : '[[icone:lua]]';

    themeToggle.addEventListener('click', () => {
        const newTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        themeToggle.textContent = newTheme === 'dark' ? '[[icone:sol]]' : '[[icone:lua]]';
    });
}

// ==========================================
// MENU MOBILE (sidebar)
// ==========================================
function initMobileMenu() {
    const menuToggle = document.querySelector('.menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    if (!menuToggle || !sidebar) return;

    menuToggle.addEventListener('click', () => {
        sidebar.classList.toggle('show');
    });

    // Fechar ao clicar fora
    document.addEventListener('click', (e) => {
        if (window.innerWidth > 768) return;
        if (!sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
            sidebar.classList.remove('show');
        }
    });
}

// ==========================================
// MENU MOBILE (navbar pública)
// ==========================================
function initNavToggle() {
    const toggle = document.querySelector('.nav-toggle');
    const menu = document.querySelector('.nav-menu');
    if (!toggle || !menu) return;

    toggle.addEventListener('click', () => {
        menu.classList.toggle('open');
    });
}

// ==========================================
// MÁSCARA DE CÓDIGO DA EMPRESA
// Formato: GEST-XXXXXX
// ==========================================
function maskCodigoEmpresa(input) {
    let valor = input.value.toUpperCase().replace(/[^A-Z0-9]/g, '');

    if (valor.length > 4 && !valor.includes('-')) {
        valor = 'GEST-' + valor.substring(4);
    }

    if (!valor.startsWith('GEST')) {
        valor = 'GEST-' + valor;
    }

    valor = valor.substring(0, 11); // GEST-XXXXXX
    input.value = valor;
}

// ==========================================
// INICIALIZAÇÃO AUTOMÁTICA
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initMobileMenu();
    initNavToggle();
});

// ==========================================
// ESTILOS GLOBAIS PARA TOAST
// ==========================================
(function injectToastStyles() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
    `;
    document.head.appendChild(style);
})();