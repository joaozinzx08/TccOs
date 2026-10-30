(function(){

        // ==========================================
        // PROTEÇÃO
        // ==========================================
        const usuarioAtual = getUsuario();
        
        if (!protegerPagina(['administrador_principal', 'administrador_setor', 'gestor', 'colaborador'])) {
            throw new Error('Acesso negado');
        }

        const isGestor = usuarioAtual.role === 'gestor';
        const isColaborador = usuarioAtual.role === 'colaborador';
        const isAdmin = usuarioAtual.role === 'administrador_principal' || usuarioAtual.role === 'administrador_setor';

        // ==========================================
        // ESTADO
        // ==========================================
        let config = {
            tema: 'light',
            idioma: 'pt-BR',
            formatoData: 'DD/MM/YYYY',
            compacto: false,
            paginaInicial: 'dashboard',
            itensPorPagina: '20',
            ordenacao: 'recentes',
            notificacoes: {
                novaOS: true,
                atualizacoes: true,
                prazos: true,
                urgentes: true,
                chat: true,
                email: false
            }
        };

        // ==========================================
        // BREADCRUMB
        // ==========================================
        document.getElementById('breadcrumb-tipo').textContent = 
            isAdmin ? 'Admin' : (isGestor ? 'Gestor' : 'Colaborador');

        // ==========================================
        // MENU LATERAL DINÂMICO
        // ==========================================
        function renderizarMenuLateral() {
            const menu = document.getElementById('sidebar-menu');
            let html = '';

            if (isAdmin) {
                html = `
                    <li><a href="dashboard.html"><span class="menu-icon">[[icone:painel]]</span> Dashboard</a></li>
                    <li><a href="usuarios.html"><span class="menu-icon">[[icone:equipe]]</span> Usuários</a></li>
                    <li><a href="setores.html"><span class="menu-icon">[[icone:setores]]</span> Setores</a></li>
                    <li><a href="ordens.html"><span class="menu-icon">[[icone:ordens]]</span> Ordens</a></li>
                    <li><a href="kanban.html"><span class="menu-icon">[[icone:kanban]]</span> Kanban</a></li>
                    <li><a href="calendario.html"><span class="menu-icon">[[icone:calendario]]</span> Calendário</a></li>
                    <li><a href="relatorios.html"><span class="menu-icon">[[icone:grafico]]</span> Relatórios</a></li>
                    <li><a href="auditoria.html"><span class="menu-icon">[[icone:buscar]]</span> Auditoria</a></li>
                    <li class="divider"></li>
                    <li><a href="empresa.html"><span class="menu-icon">[[icone:empresa]]</span> Minha Empresa</a></li>
                    <li><a href="conhecimento.html"><span class="menu-icon">[[icone:conhecimento]]</span> Conhecimento</a></li>
                    <li><a href="chat.html"><span class="menu-icon">[[icone:chat]]</span> Chat</a></li>
                    <li class="divider"></li>
                    <li><a href="perfil.html"><span class="menu-icon">[[icone:usuario]]</span> Meu Perfil</a></li>
                    <li class="active"><a href="configuracoes.html"><span class="menu-icon">[[icone:configuracoes]]</span> Configurações</a></li>
                    <li><a href="#" id="logout"><span class="menu-icon">[[icone:sair]]</span> Sair</a></li>
                `;
            } else if (isGestor) {
                html = `
                    <li><a href="../gestor/dashboard.html"><span class="menu-icon">[[icone:painel]]</span> Dashboard</a></li>
                    <li><a href="../gestor/ordens.html"><span class="menu-icon">[[icone:ordens]]</span> Ordens</a></li>
                    <li><a href="../gestor/kanban.html"><span class="menu-icon">[[icone:kanban]]</span> Kanban</a></li>
                    <li><a href="../gestor/calendario.html"><span class="menu-icon">[[icone:calendario]]</span> Calendário</a></li>
                    <li><a href="../gestor/relatorios.html"><span class="menu-icon">[[icone:grafico]]</span> Relatórios</a></li>
                    <li class="divider"></li>
                    <li><a href="../gestor/chat.html"><span class="menu-icon">[[icone:chat]]</span> Chat</a></li>
                    <li><a href="../gestor/perfil.html"><span class="menu-icon">[[icone:usuario]]</span> Meu Perfil</a></li>
                    <li class="active"><a href="../gestor/configuracoes.html"><span class="menu-icon">[[icone:configuracoes]]</span> Configurações</a></li>
                    <li><a href="#" id="logout"><span class="menu-icon">[[icone:sair]]</span> Sair</a></li>
                `;
            } else {
                html = `
                    <li><a href="../colaborador/dashboard.html"><span class="menu-icon">[[icone:painel]]</span> Dashboard</a></li>
                    <li><a href="../colaborador/minhas-ordens.html"><span class="menu-icon">[[icone:ordens]]</span> Minhas Ordens</a></li>
                    <li><a href="../colaborador/minhas-ordens.html?acao=nova"><span class="menu-icon">[[icone:adicionar]]</span> Nova OS</a></li>
                    <li class="divider"></li>
                    <li><a href="../colaborador/chat.html"><span class="menu-icon">[[icone:chat]]</span> Chat</a></li>
                    <li><a href="../colaborador/perfil.html"><span class="menu-icon">[[icone:usuario]]</span> Meu Perfil</a></li>
                    <li class="active"><a href="../colaborador/configuracoes.html"><span class="menu-icon">[[icone:configuracoes]]</span> Configurações</a></li>
                    <li><a href="#" id="logout"><span class="menu-icon">[[icone:sair]]</span> Sair</a></li>
                `;
            }

            menu.innerHTML = html;

            const logoutBtn = document.getElementById('logout');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    logout();
                });
            }
        }

        // ==========================================
        // CARREGAR USUÁRIO
        // ==========================================
        function carregarInfoUsuario() {
            if (!usuarioAtual) return;
            const primeiroNome = usuarioAtual.nome.split(' ')[0];

            document.getElementById('user-name').textContent = usuarioAtual.nome;
            
            const roleLabels = {
                'administrador_principal': 'Admin Principal',
                'administrador_setor': 'Admin de Setor',
                'gestor': 'Gestor',
                'colaborador': 'Colaborador'
            };
            document.getElementById('user-role').textContent = roleLabels[usuarioAtual.role] || 'Admin';

            const avatarEl = document.getElementById('sidebar-avatar');
            if (usuarioAtual.avatar) {
                avatarEl.innerHTML = `<img src="${window.avatarURL(usuarioAtual.avatar)}" alt="Avatar">`;
            } else {
                avatarEl.textContent = primeiroNome.charAt(0).toUpperCase();
            }

            // Preview do avatar nas preferências
            const prefAvatar = document.getElementById('pref-avatar-preview');
            if (usuarioAtual.avatar) {
                prefAvatar.innerHTML = `<img src="${window.avatarURL(usuarioAtual.avatar)}" alt="Avatar">`;
            } else {
                prefAvatar.textContent = primeiroNome.charAt(0).toUpperCase();
            }
        }

        // ==========================================
        // CARREGAR CONFIGURAÇÕES
        // ==========================================
        function carregarConfiguracoes() {
            try {
                const saved = localStorage.getItem('gestaoos_config');
                if (saved) {
                    const parsed = JSON.parse(saved);
                    config = { ...config, ...parsed };
                    if (parsed.notificacoes) {
                        config.notificacoes = { ...config.notificacoes, ...parsed.notificacoes };
                    }
                }
            } catch (e) {
                console.warn('Erro ao carregar config:', e);
            }

            // Aplicar nas UIs
            aplicarConfigUI();
        }

        // ==========================================
        // APLICAR CONFIG NA UI
        // ==========================================
        function aplicarConfigUI() {
            // Tema
            const temaSalvo = localStorage.getItem('theme') || 'light';
            let temaAtivo = temaSalvo;
            
            // Verificar se tema é do sistema
            if (config.tema === 'system') {
                temaAtivo = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            }

            document.querySelectorAll('.theme-option').forEach(opt => {
                opt.classList.remove('active');
                if (opt.dataset.themeValue === config.tema) {
                    opt.classList.add('active');
                }
            });

            // Idioma
            document.getElementById('select-idioma').value = config.idioma || 'pt-BR';
            
            // Formato de Data
            document.getElementById('select-data').value = config.formatoData || 'DD/MM/YYYY';
            
            // Densidade
            document.getElementById('toggle-compacto').checked = !!config.compacto;

            // Notificações
            document.getElementById('notif-nova-os').checked = config.notificacoes.novaOS !== false;
            document.getElementById('notif-atualizacoes').checked = config.notificacoes.atualizacoes !== false;
            document.getElementById('notif-prazos').checked = config.notificacoes.prazos !== false;
            document.getElementById('notif-urgentes').checked = config.notificacoes.urgentes !== false;
            document.getElementById('notif-chat').checked = config.notificacoes.chat !== false;
            document.getElementById('notif-email').checked = !!config.notificacoes.email;

            // Preferências
            document.getElementById('select-pagina').value = config.paginaInicial || 'dashboard';
            document.getElementById('select-itens').value = config.itensPorPagina || '20';
            document.getElementById('select-ordem').value = config.ordenacao || 'recentes';

            // Sessão atual
            atualizarInfoSessao();
        }

        // ==========================================
        // MUDAR TAB
        // ==========================================
        function mudarTab(tab, element) {
            // Tabs
            document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
            element.classList.add('active');

            // Panels
            document.querySelectorAll('.settings-panel').forEach(p => p.classList.remove('active'));
            document.getElementById(`panel-${tab}`).classList.add('active');
        }

        // ==========================================
        // MUDAR TEMA
        // ==========================================
        function mudarTema(tema) {
            config.tema = tema;

            document.querySelectorAll('.theme-option').forEach(opt => {
                opt.classList.remove('active');
                if (opt.dataset.themeValue === tema) {
                    opt.classList.add('active');
                }
            });

            if (tema === 'system') {
                const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
                localStorage.setItem('theme', isDark ? 'dark' : 'light');
            } else {
                document.documentElement.setAttribute('data-theme', tema);
                localStorage.setItem('theme', tema);
            }

            salvarConfiguracoes();
            showToast(`[[icone:confirmar]] Tema alterado para "${tema}"`, 'success');
        }

        // ==========================================
        // SALVAR CONFIG
        // ==========================================
        function salvarConfig(key, value) {
            config[key] = value;
            salvarConfiguracoes();
            showToast('[[icone:confirmar]] Preferência salva', 'success');
        }

        function salvarConfigNotif(key, value) {
            config.notificacoes[key] = value;
            salvarConfiguracoes();
            showToast('[[icone:confirmar]] Notificação atualizada', 'success');
        }

        function salvarConfiguracoes() {
            try {
                localStorage.setItem('gestaoos_config', JSON.stringify(config));
            } catch (e) {
                console.warn('Erro ao salvar config:', e);
            }
        }

        // ==========================================
        // MODO SILENCIOSO
        // ==========================================
        function toggleSilencioso(ativo) {
            const aviso = document.getElementById('aviso-silencioso');
            aviso.style.display = ativo ? 'flex' : 'none';
            
            localStorage.setItem('gestaoos_silencioso', ativo ? 'true' : 'false');
            
            if (ativo) {
                showToast('[[icone:notificacao]] Modo silencioso ativado', 'info');
            } else {
                showToast('[[icone:notificacao]] Notificações reativadas', 'success');
            }
        }

        // ==========================================
        // INFO DA SESSÃO
        // ==========================================
        function atualizarInfoSessao() {
            const meta = document.getElementById('session-atual-meta');
            if (meta) {
                const ua = navigator.userAgent;
                let browser = 'Navegador';
                let os = '';

                if (ua.includes('Chrome')) browser = 'Chrome';
                else if (ua.includes('Firefox')) browser = 'Firefox';
                else if (ua.includes('Safari')) browser = 'Safari';
                else if (ua.includes('Edge')) browser = 'Edge';

                if (ua.includes('Windows')) os = 'Windows';
                else if (ua.includes('Mac')) os = 'macOS';
                else if (ua.includes('Linux')) os = 'Linux';
                else if (ua.includes('Android')) os = 'Android';
                else if (ua.includes('iPhone')) os = 'iOS';

                meta.textContent = `${browser} em ${os} • Início: ${new Date().toLocaleTimeString('pt-BR')}`;
            }

            // Info do sistema
            const browserInfo = document.getElementById('browser-info');
            if (browserInfo) {
                browserInfo.textContent = navigator.userAgent.substring(0, 60) + '...';
            }
        }

        // ==========================================
        // ENCERRAR SESSÕES
        // ==========================================
        async function encerrarOutrasSessoes() {
            try{await apiRequest('/sessoes',{method:'DELETE'});showToast('Outras sessões encerradas','success');}catch(e){showToast(e.message,'error');}
        }

        // ==========================================
        // RESTAURAR PADRÕES
        // ==========================================
        function restaurarPadroes() {
            if (!confirm('[[icone:alerta]] Restaurar todas as preferências para o padrão?\n\nSuas configurações personalizadas serão perdidas.')) {
                return;
            }

            localStorage.removeItem('gestaoos_config');
            localStorage.removeItem('gestaoos_silencioso');

            // Reset
            config = {
                tema: 'light',
                idioma: 'pt-BR',
                formatoData: 'DD/MM/YYYY',
                compacto: false,
                paginaInicial: 'dashboard',
                itensPorPagina: '20',
                ordenacao: 'recentes',
                notificacoes: {
                    novaOS: true,
                    atualizacoes: true,
                    prazos: true,
                    urgentes: true,
                    chat: true,
                    email: false
                }
            };

            document.documentElement.setAttribute('data-theme', 'light');
            localStorage.setItem('theme', 'light');

            aplicarConfigUI();
            showToast('[[icone:confirmar]] Preferências restauradas!', 'success');
        }

        // ==========================================
        // LIMPAR CACHE
        // ==========================================
        function limparCache() {
            if (!confirm('[[icone:excluir]] Limpar dados temporários?\n\nVocê permanecerá logado.')) {
                return;
            }

            // Preservar dados essenciais
            const token = localStorage.getItem('token');
            const usuario = localStorage.getItem('usuario');
            const empresa = localStorage.getItem('empresa');
            const config = localStorage.getItem('gestaoos_config');
            const theme = localStorage.getItem('theme');

            // Limpar
            clearSession();

            // Restaurar
            if (token) localStorage.setItem('token', token);
            if (usuario) localStorage.setItem('usuario', usuario);
            if (empresa) localStorage.setItem('empresa', empresa);
            if (config) localStorage.setItem('gestaoos_config', config);
            if (theme) localStorage.setItem('theme', theme);

            showToast('[[icone:confirmar]] Cache limpo com sucesso', 'success');
        }

        // ==========================================
        // EXPORTAR CONFIGURAÇÕES
        // ==========================================
        function exportarConfiguracoes() {
            const dados = {
                config: config,
                usuario: {
                    nome: usuarioAtual.nome,
                    email: usuarioAtual.email,
                    role: usuarioAtual.role
                },
                exportadoEm: new Date().toISOString()
            };

            const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `configuracoes-${new Date().toISOString().split('T')[0]}.json`;
            link.click();
            URL.revokeObjectURL(link.href);

            showToast('[[icone:confirmar]] Configurações exportadas!', 'success');
        }

        // ==========================================
        // VERIFICAR STATUS DA API
        // ==========================================
        async function verificarAPI() {
            const statusEl = document.getElementById('status-api');
            
            try {
                const response = await window.legacyFetch(`${API_BASE}/status`);
                
                if (response.ok) {
                    statusEl.innerHTML = `
                        <span style="width:8px; height:8px; border-radius:50%; background:var(--success); box-shadow:0 0 0 3px rgba(5,150,105,0.15);"></span>
                        <span style="color:var(--success);">Online</span>
                    `;
                } else {
                    throw new Error('Offline');
                }
            } catch (e) {
                statusEl.innerHTML = `
                    <span style="width:8px; height:8px; border-radius:50%; background:var(--danger);"></span>
                    <span style="color:var(--danger);">Offline</span>
                `;
            }
        }

        // ==========================================
        // CALCULAR USO DO STORAGE
        // ==========================================
        function calcularStorage() {
            let total = 0;
            for (let key in localStorage) {
                if (localStorage.hasOwnProperty(key)) {
                    total += localStorage[key].length + key.length;
                }
            }
            
            const kb = (total / 1024).toFixed(2);
            const el = document.getElementById('storage-usage');
            if (el) el.textContent = `${kb} KB`;
        }

        // ==========================================
        // NOTIFICAÇÕES
        // ==========================================
        async function carregarNotificacoes() {
            try {
                const data = await apiRequest('/notificacoes');
                const badge = document.getElementById('notificacoes-badge');
                if (badge) {
                    const naoLidas = data.naoLidas || 0;
                    badge.textContent = naoLidas;
                    badge.style.display = naoLidas > 0 ? 'inline-flex' : 'none';
                }
            } catch (error) {
                console.error('Erro ao carregar notificações:', error);
            }
        }

        // ==========================================
        // INICIALIZAÇÃO
        // ==========================================
        window.onLegacyReady( () => {
            renderizarMenuLateral();
            carregarInfoUsuario();
            carregarConfiguracoes();
            carregarNotificacoes();
            verificarAPI();
            calcularStorage();

            // Verificar modo silencioso
            const silencioso = localStorage.getItem('gestaoos_silencioso') === 'true';
            document.getElementById('notif-silencioso').checked = silencioso;
            if (silencioso) {
                document.getElementById('aviso-silencioso').style.display = 'flex';
            }

            // Listener para mudança de tema do sistema
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
                if (config.tema === 'system') {
                    document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
                    localStorage.setItem('theme', e.matches ? 'dark' : 'light');
                }
            });

            // Menu mobile
            const menuToggle = document.querySelector('.menu-toggle');
            const sidebar = document.querySelector('.sidebar');
            if (menuToggle && sidebar) {
                menuToggle.addEventListener('click', () => {
                    sidebar.classList.toggle('show');
                });
                document.addEventListener('click', (e) => {
                    if (window.innerWidth > 768) return;
                    if (!sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
                        sidebar.classList.remove('show');
                    }
                });
            }
        });
    
Object.assign(window,{...(typeof renderizarMenuLateral === 'function' ? {renderizarMenuLateral} : {}),...(typeof carregarInfoUsuario === 'function' ? {carregarInfoUsuario} : {}),...(typeof carregarConfiguracoes === 'function' ? {carregarConfiguracoes} : {}),...(typeof aplicarConfigUI === 'function' ? {aplicarConfigUI} : {}),...(typeof mudarTab === 'function' ? {mudarTab} : {}),...(typeof mudarTema === 'function' ? {mudarTema} : {}),...(typeof salvarConfig === 'function' ? {salvarConfig} : {}),...(typeof salvarConfigNotif === 'function' ? {salvarConfigNotif} : {}),...(typeof salvarConfiguracoes === 'function' ? {salvarConfiguracoes} : {}),...(typeof toggleSilencioso === 'function' ? {toggleSilencioso} : {}),...(typeof atualizarInfoSessao === 'function' ? {atualizarInfoSessao} : {}),...(typeof encerrarOutrasSessoes === 'function' ? {encerrarOutrasSessoes} : {}),...(typeof restaurarPadroes === 'function' ? {restaurarPadroes} : {}),...(typeof limparCache === 'function' ? {limparCache} : {}),...(typeof exportarConfiguracoes === 'function' ? {exportarConfiguracoes} : {}),...(typeof verificarAPI === 'function' ? {verificarAPI} : {}),...(typeof calcularStorage === 'function' ? {calcularStorage} : {}),...(typeof carregarNotificacoes === 'function' ? {carregarNotificacoes} : {})});
})();