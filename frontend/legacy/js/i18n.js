// ==========================================
// SISTEMA DE INTERNACIONALIZAÇÃO (i18n)
// ==========================================

const I18N = {
    // Idioma atual
    idiomaAtual: 'pt-BR',

    // ==========================================
    // TRADUÇÕES
    // ==========================================
    traducoes: {
        'pt-BR': {
            // MENU LATERAL
            'menu.dashboard': 'Dashboard',
            'menu.usuarios': 'Usuários',
            'menu.setores': 'Setores',
            'menu.ordens': 'Ordens',
            'menu.kanban': 'Kanban',
            'menu.calendario': 'Calendário',
            'menu.relatorios': 'Relatórios',
            'menu.auditoria': 'Auditoria',
            'menu.empresa': 'Minha Empresa',
            'menu.conhecimento': 'Conhecimento',
            'menu.chat': 'Chat',
            'menu.perfil': 'Meu Perfil',
            'menu.configuracoes': 'Configurações',
            'menu.sair': 'Sair',
            'menu.notificacoes': 'Notificações',

            // COMUM
            'comum.salvar': 'Salvar',
            'comum.cancelar': 'Cancelar',
            'comum.criar': 'Criar',
            'comum.editar': 'Editar',
            'comum.excluir': 'Excluir',
            'comum.voltar': 'Voltar',
            'comum.continuar': 'Continuar',
            'comum.buscar': 'Buscar',
            'comum.filtrar': 'Filtrar',
            'comum.limpar': 'Limpar',
            'comum.copiar': 'Copiar',
            'comum.compartilhar': 'Compartilhar',
            'comum.renovar': 'Renovar',
            'comum.ativo': 'Ativo',
            'comum.inativo': 'Inativo',
            'comum.total': 'Total',
            'comum.hoje': 'Hoje',
            'comum.ontem': 'Ontem',
            'comum.carregando': 'Carregando...',
            'comum.erro': 'Erro',
            'comum.sucesso': 'Sucesso',

            // PRIORIDADES
            'prioridade.baixa': 'Baixa',
            'prioridade.media': 'Média',
            'prioridade.alta': 'Alta',
            'prioridade.urgente': 'Urgente',

            // STATUS
            'status.aberta': 'Aberta',
            'status.encaminhada': 'Encaminhada',
            'status.emAtendimento': 'Em Atendimento',
            'status.aguardando': 'Aguardando Informação',
            'status.concluida': 'Concluída',
            'status.cancelada': 'Cancelada',

            // ORDENS
            'ordens.titulo': 'Título',
            'ordens.descricao': 'Descrição',
            'ordens.prioridade': 'Prioridade',
            'ordens.status': 'Status',
            'ordens.setor': 'Setor',
            'ordens.solicitante': 'Solicitante',
            'ordens.data': 'Data',
            'ordens.prazo': 'Prazo',
            'ordens.nova': 'Nova OS',
            'ordens.minhas': 'Minhas Ordens',

            // USUÁRIOS
            'usuarios.nome': 'Nome',
            'usuarios.email': 'E-mail',
            'usuarios.cargo': 'Cargo',
            'usuarios.setor': 'Setor',
            'usuarios.status': 'Status',
            'usuarios.novo': 'Novo Usuário',

            // SETORES
            'setores.nome': 'Nome',
            'setores.descricao': 'Descrição',
            'setores.novo': 'Novo Setor',
            'setores.gestores': 'Gestores',

            // EMPRESA
            'empresa.titulo': 'Minha Empresa',
            'empresa.codigo': 'Código da Empresa',
            'empresa.nome': 'Nome',
            'empresa.colaboradores': 'Colaboradores',
            'empresa.info': 'Informações da Empresa',
            'empresa.comoEntrar': 'Como Funcionários Entram',

            // CONFIGURAÇÕES
            'config.titulo': 'Configurações',
            'config.geral': 'Geral',
            'config.notificacoes': 'Notificações',
            'config.seguranca': 'Segurança',
            'config.sistema': 'Sistema',
            'config.aparencia': 'Aparência',
            'config.idioma': 'Idioma',
            'config.formatoData': 'Formato de Data',
            'config.densidade': 'Densidade',
            'config.modoCompacto': 'Modo Compacto',

            // DASHBOARD
            'dashboard.titulo': 'Dashboard',
            'dashboard.totalOS': 'Total OS',
            'dashboard.abertas': 'Abertas',
            'dashboard.emAtendimento': 'Em Atendimento',
            'dashboard.concluidas': 'Concluídas',
            'dashboard.urgentes': 'Urgentes',
            'dashboard.atrasadas': 'Atrasadas',

            // AÇÕES
            'acao.criarEmpresa': 'Criar Empresa',
            'acao.entrarEmpresa': 'Entrar em Empresa',
            'acao.login': 'Entrar',
            'acao.logout': 'Sair',
        },

        'en-US': {
            'menu.dashboard': 'Dashboard',
            'menu.usuarios': 'Users',
            'menu.setores': 'Departments',
            'menu.ordens': 'Orders',
            'menu.kanban': 'Kanban',
            'menu.calendario': 'Calendar',
            'menu.relatorios': 'Reports',
            'menu.auditoria': 'Audit',
            'menu.empresa': 'My Company',
            'menu.conhecimento': 'Knowledge',
            'menu.chat': 'Chat',
            'menu.perfil': 'My Profile',
            'menu.configuracoes': 'Settings',
            'menu.sair': 'Logout',
            'menu.notificacoes': 'Notifications',

            'comum.salvar': 'Save',
            'comum.cancelar': 'Cancel',
            'comum.criar': 'Create',
            'comum.editar': 'Edit',
            'comum.excluir': 'Delete',
            'comum.voltar': 'Back',
            'comum.continuar': 'Continue',
            'comum.buscar': 'Search',
            'comum.filtrar': 'Filter',
            'comum.limpar': 'Clear',
            'comum.copiar': 'Copy',
            'comum.compartilhar': 'Share',
            'comum.renovar': 'Renew',
            'comum.ativo': 'Active',
            'comum.inativo': 'Inactive',
            'comum.total': 'Total',
            'comum.hoje': 'Today',
            'comum.ontem': 'Yesterday',
            'comum.carregando': 'Loading...',
            'comum.erro': 'Error',
            'comum.sucesso': 'Success',

            'prioridade.baixa': 'Low',
            'prioridade.media': 'Medium',
            'prioridade.alta': 'High',
            'prioridade.urgente': 'Urgent',

            'status.aberta': 'Open',
            'status.encaminhada': 'Forwarded',
            'status.emAtendimento': 'In Progress',
            'status.aguardando': 'Awaiting Info',
            'status.concluida': 'Completed',
            'status.cancelada': 'Cancelled',

            'ordens.titulo': 'Title',
            'ordens.descricao': 'Description',
            'ordens.prioridade': 'Priority',
            'ordens.status': 'Status',
            'ordens.setor': 'Department',
            'ordens.solicitante': 'Requester',
            'ordens.data': 'Date',
            'ordens.prazo': 'Deadline',
            'ordens.nova': 'New Order',
            'ordens.minhas': 'My Orders',

            'usuarios.nome': 'Name',
            'usuarios.email': 'Email',
            'usuarios.cargo': 'Role',
            'usuarios.setor': 'Department',
            'usuarios.status': 'Status',
            'usuarios.novo': 'New User',

            'setores.nome': 'Name',
            'setores.descricao': 'Description',
            'setores.novo': 'New Department',
            'setores.gestores': 'Managers',

            'empresa.titulo': 'My Company',
            'empresa.codigo': 'Company Code',
            'empresa.nome': 'Name',
            'empresa.colaboradores': 'Employees',
            'empresa.info': 'Company Info',
            'empresa.comoEntrar': 'How Employees Join',

            'config.titulo': 'Settings',
            'config.geral': 'General',
            'config.notificacoes': 'Notifications',
            'config.seguranca': 'Security',
            'config.sistema': 'System',
            'config.aparencia': 'Appearance',
            'config.idioma': 'Language',
            'config.formatoData': 'Date Format',
            'config.densidade': 'Density',
            'config.modoCompacto': 'Compact Mode',

            'dashboard.titulo': 'Dashboard',
            'dashboard.totalOS': 'Total Orders',
            'dashboard.abertas': 'Open',
            'dashboard.emAtendimento': 'In Progress',
            'dashboard.concluidas': 'Completed',
            'dashboard.urgentes': 'Urgent',
            'dashboard.atrasadas': 'Overdue',

            'acao.criarEmpresa': 'Create Company',
            'acao.entrarEmpresa': 'Join Company',
            'acao.login': 'Login',
            'acao.logout': 'Logout',
        },

        'es-ES': {
            'menu.dashboard': 'Panel',
            'menu.usuarios': 'Usuarios',
            'menu.setores': 'Departamentos',
            'menu.ordens': 'Órdenes',
            'menu.kanban': 'Kanban',
            'menu.calendario': 'Calendario',
            'menu.relatorios': 'Informes',
            'menu.auditoria': 'Auditoría',
            'menu.empresa': 'Mi Empresa',
            'menu.conhecimento': 'Conocimiento',
            'menu.chat': 'Chat',
            'menu.perfil': 'Mi Perfil',
            'menu.configuracoes': 'Configuración',
            'menu.sair': 'Salir',
            'menu.notificacoes': 'Notificaciones',

            'comum.salvar': 'Guardar',
            'comum.cancelar': 'Cancelar',
            'comum.criar': 'Crear',
            'comum.editar': 'Editar',
            'comum.excluir': 'Eliminar',
            'comum.voltar': 'Volver',
            'comum.continuar': 'Continuar',
            'comum.buscar': 'Buscar',
            'comum.filtrar': 'Filtrar',
            'comum.limpar': 'Limpiar',
            'comum.copiar': 'Copiar',
            'comum.compartilhar': 'Compartir',
            'comum.renovar': 'Renovar',
            'comum.ativo': 'Activo',
            'comum.inativo': 'Inactivo',
            'comum.total': 'Total',
            'comum.hoje': 'Hoy',
            'comum.ontem': 'Ayer',
            'comum.carregando': 'Cargando...',
            'comum.erro': 'Error',
            'comum.sucesso': 'Éxito',

            'prioridade.baixa': 'Baja',
            'prioridade.media': 'Media',
            'prioridade.alta': 'Alta',
            'prioridade.urgente': 'Urgente',

            'status.aberta': 'Abierta',
            'status.encaminhada': 'Reenviada',
            'status.emAtendimento': 'En Progreso',
            'status.aguardando': 'Esperando Info',
            'status.concluida': 'Completada',
            'status.cancelada': 'Cancelada',

            'ordens.titulo': 'Título',
            'ordens.descricao': 'Descripción',
            'ordens.prioridade': 'Prioridad',
            'ordens.status': 'Estado',
            'ordens.setor': 'Departamento',
            'ordens.solicitante': 'Solicitante',
            'ordens.data': 'Fecha',
            'ordens.prazo': 'Plazo',
            'ordens.nova': 'Nueva Orden',
            'ordens.minhas': 'Mis Órdenes',

            'usuarios.nome': 'Nombre',
            'usuarios.email': 'Correo',
            'usuarios.cargo': 'Cargo',
            'usuarios.setor': 'Departamento',
            'usuarios.status': 'Estado',
            'usuarios.novo': 'Nuevo Usuario',

            'setores.nome': 'Nombre',
            'setores.descricao': 'Descripción',
            'setores.novo': 'Nuevo Departamento',
            'setores.gestores': 'Gestores',

            'empresa.titulo': 'Mi Empresa',
            'empresa.codigo': 'Código de Empresa',
            'empresa.nome': 'Nombre',
            'empresa.colaboradores': 'Empleados',
            'empresa.info': 'Información de Empresa',
            'empresa.comoEntrar': 'Cómo Ingresan los Empleados',

            'config.titulo': 'Configuración',
            'config.geral': 'General',
            'config.notificacoes': 'Notificaciones',
            'config.seguranca': 'Seguridad',
            'config.sistema': 'Sistema',
            'config.aparencia': 'Apariencia',
            'config.idioma': 'Idioma',
            'config.formatoData': 'Formato de Fecha',
            'config.densidade': 'Densidad',
            'config.modoCompacto': 'Modo Compacto',

            'dashboard.titulo': 'Panel',
            'dashboard.totalOS': 'Total Órdenes',
            'dashboard.abertas': 'Abiertas',
            'dashboard.emAtendimento': 'En Progreso',
            'dashboard.concluidas': 'Completadas',
            'dashboard.urgentes': 'Urgentes',
            'dashboard.atrasadas': 'Atrasadas',

            'acao.criarEmpresa': 'Crear Empresa',
            'acao.entrarEmpresa': 'Unirse a Empresa',
            'acao.login': 'Ingresar',
            'acao.logout': 'Salir',
        }
    },

    // ==========================================
    // TRADUZIR UMA CHAVE
    // ==========================================
    t: function(chave) {
        var traducoes = this.traducoes[this.idiomaAtual] || this.traducoes['pt-BR'];
        return traducoes[chave] || chave;
    },

    // ==========================================
    // CARREGAR IDIOMA SALVO
    // ==========================================
    carregar: function() {
        try {
            var config = JSON.parse(localStorage.getItem('gestaoos_config') || '{}');
            this.idiomaAtual = config.idioma || 'pt-BR';
        } catch (e) {
            this.idiomaAtual = 'pt-BR';
        }
        return this.idiomaAtual;
    },

    // ==========================================
    // DEFINIR IDIOMA
    // ==========================================
    definir: function(idioma) {
        this.idiomaAtual = idioma;
        try {
            var config = JSON.parse(localStorage.getItem('gestaoos_config') || '{}');
            config.idioma = idioma;
            localStorage.setItem('gestaoos_config', JSON.stringify(config));
        } catch (e) {}
        this.aplicar();
    },

    // ==========================================
    // APLICAR EM TODA A PÁGINA
    // Procura elementos com data-i18n="chave"
    // ==========================================
    aplicar: function() {
        var self = this;
        document.querySelectorAll('[data-i18n]').forEach(function(el) {
            var chave = el.getAttribute('data-i18n');
            var traducao = self.t(chave);

            // Se tem data-i18n-placeholder, aplica no placeholder
            if (el.hasAttribute('data-i18n-placeholder')) {
                el.placeholder = traducao;
            } else {
                el.textContent = traducao;
            }
        });

        // Atualizar atributo lang do HTML
        document.documentElement.setAttribute('lang', this.idiomaAtual);
    }
};

// Carregar idioma ao inicializar
I18N.carregar();

// Aplicar quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        I18N.aplicar();
    });
} else {
    I18N.aplicar();
}