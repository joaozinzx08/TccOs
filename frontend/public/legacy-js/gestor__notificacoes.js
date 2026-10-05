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

        document.getElementById('breadcrumb-tipo').textContent = 
            isAdmin ? 'Admin' : (isGestor ? 'Gestor' : 'Colaborador');

        // ==========================================
        // ESTADO
        // ==========================================
        let notificacoes = [];
        let filtroTipoAtual = 'todas';
        let ordens = []; // Para linkar com OS

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
                    <li><a href="configuracoes.html"><span class="menu-icon">[[icone:configuracoes]]</span> Configurações</a></li>
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
                    <li><a href="../gestor/conhecimento.html"><span class="menu-icon">[[icone:conhecimento]]</span> Conhecimento</a></li>
                    <li><a href="../gestor/chat.html"><span class="menu-icon">[[icone:chat]]</span> Chat</a></li>
                    <li class="divider"></li>
                    <li><a href="../gestor/perfil.html"><span class="menu-icon">[[icone:usuario]]</span> Meu Perfil</a></li>
                    <li><a href="../gestor/configuracoes.html"><span class="menu-icon">[[icone:configuracoes]]</span> Configurações</a></li>
                    <li><a href="#" id="logout"><span class="menu-icon">[[icone:sair]]</span> Sair</a></li>
                `;
            } else {
                html = `
                    <li><a href="../colaborador/dashboard.html"><span class="menu-icon">[[icone:painel]]</span> Dashboard</a></li>
                    <li><a href="../colaborador/minhas-ordens.html"><span class="menu-icon">[[icone:ordens]]</span> Minhas Ordens</a></li>
                    <li><a href="../colaborador/minhas-ordens.html?acao=nova"><span class="menu-icon">[[icone:adicionar]]</span> Nova OS</a></li>
                    <li class="divider"></li>
                    <li><a href="../colaborador/conhecimento.html"><span class="menu-icon">[[icone:conhecimento]]</span> Conhecimento</a></li>
                    <li><a href="../colaborador/chat.html"><span class="menu-icon">[[icone:chat]]</span> Chat</a></li>
                    <li class="active"><a href="../colaborador/notificacoes.html"><span class="menu-icon">[[icone:notificacao]]</span> Notificações</a></li>
                    <li><a href="../colaborador/perfil.html"><span class="menu-icon">[[icone:usuario]]</span> Meu Perfil</a></li>
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
        }

        // ==========================================
        // CARREGAR DADOS
        // ==========================================
        async function carregarDados() {
            try {const [n,o]=await Promise.all([apiRequest('/notificacoes'),apiRequest('/ordens')]);notificacoes=n.notificacoes.map(n=>({...n,osId:n.ordemId}));ordens=o;renderizarNotificacoes();atualizarStats();}catch(e){showToast(e.message,'error');}
        }

        // ==========================================
        // NOTIFICAÇÕES DE EXEMPLO
        // ==========================================
        function criarNotificacoesExemplo() { /* Somente notificações reais. */
        }

        // ==========================================
        // CLASSIFICAR TIPO DE NOTIFICAÇÃO
        // ==========================================
        function classificarNotificacao(notif) {
            if (notif.tipo) return notif.tipo;
            
            const titulo = (notif.titulo || '').toLowerCase();
            
            if (titulo.includes('urgente')) return 'urgente';
            if (titulo.includes('concluí')) return 'concluida';
            if (titulo.includes('prazo')) return 'prazo';
            if (titulo.includes('status')) return 'status';
            if (titulo.includes('nova os')) return 'nova-os';
            if (titulo.includes('chat') || titulo.includes('mensagem')) return 'chat';
            
            return 'sistema';
        }

        // ==========================================
        // ÍCONE POR TIPO
        // ==========================================
        function getIconeNotificacao(tipo) {
            const icones = {
                'nova-os': '[[icone:ordens]]',
                'status': '[[icone:atualizar]]',
                'urgente': '[[icone:status]]',
                'prazo': '[[icone:relogio]]',
                'concluida': '[[icone:confirmar]]',
                'chat': '[[icone:chat]]',
                'sistema': '[[icone:configuracoes]]'
            };
            return icones[tipo] || '[[icone:notificacao]]';
        }

        // ==========================================
        // ATUALIZAR STATS
        // ==========================================
        function atualizarStats() {
            const total = notificacoes.length;
            const naoLidas = notificacoes.filter(n => !n.lida).length;
            const lidas = notificacoes.filter(n => n.lida).length;
            
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);
            const notifHoje = notificacoes.filter(n => {
                const data = new Date(n.data);
                return data >= hoje;
            }).length;

            animarNumero('stat-total', total);
            animarNumero('stat-nao-lidas', naoLidas);
            animarNumero('stat-hoje', notifHoje);
            animarNumero('stat-lidas', lidas);

            // Mostrar/esconder botão "marcar todas"
            const btnMarcar = document.getElementById('btn-marcar-todas');
            if (btnMarcar) {
                btnMarcar.style.display = naoLidas > 0 ? 'inline-flex' : 'none';
            }
        }

        // ==========================================
        // ANIMAR NÚMERO
        // ==========================================
        function animarNumero(elementId, valorFinal) {
            const el = document.getElementById(elementId);
            if (!el) return;

            const duracao = 500;
            const inicio = performance.now();

            function animar(tempo) {
                const progresso = Math.min((tempo - inicio) / duracao, 1);
                const valorAtual = Math.floor(valorFinal * progresso);
                el.textContent = valorAtual;

                if (progresso < 1) {
                    requestAnimationFrame(animar);
                } else {
                    el.textContent = valorFinal;
                }
            }

            requestAnimationFrame(animar);
        }

        // ==========================================
        // FILTRAR POR TIPO
        // ==========================================
        function filtrarPorTipo(tipo, element) {
            filtroTipoAtual = tipo;

            document.querySelectorAll('.notif-stat-card').forEach(card => {
                card.classList.remove('active');
            });
            element.classList.add('active');

            aplicarFiltros();
        }

        // ==========================================
        // APLICAR FILTROS
        // ==========================================
        function aplicarFiltros() {
            renderizarNotificacoes();
        }

        // ==========================================
        // RENDERIZAR NOTIFICAÇÕES
        // ==========================================
        function renderizarNotificacoes() {
            const search = document.getElementById('search-notif').value.toLowerCase().trim();
            const tipo = document.getElementById('filter-tipo').value;

            let filtradas = notificacoes.filter(n => {
                // Busca
                if (search) {
                    const matchTitulo = (n.titulo || '').toLowerCase().includes(search);
                    const matchMensagem = (n.mensagem || '').toLowerCase().includes(search);
                    if (!matchTitulo && !matchMensagem) return false;
                }

                // Tipo
                if (tipo && classificarNotificacao(n) !== tipo) return false;

                return true;
            });

            // Filtro dos cards
            if (filtroTipoAtual !== 'todas') {
                if (filtroTipoAtual === 'nao-lidas') {
                    filtradas = filtradas.filter(n => !n.lida);
                } else if (filtroTipoAtual === 'lidas') {
                    filtradas = filtradas.filter(n => n.lida);
                } else if (filtroTipoAtual === 'hoje') {
                    const hoje = new Date();
                    hoje.setHours(0, 0, 0, 0);
                    filtradas = filtradas.filter(n => new Date(n.data) >= hoje);
                }
            }

            // Ordenar: mais recentes primeiro
            filtradas.sort((a, b) => new Date(b.data) - new Date(a.data));

            // Info
            const infoEl = document.getElementById('info-resultados');
            if (filtradas.length === 0) {
                infoEl.textContent = 'Nenhum resultado';
            } else {
                infoEl.textContent = `Mostrando ${filtradas.length} de ${notificacoes.length} notificação(ões)`;
            }

            // Footer
            const footer = document.getElementById('notif-footer');
            const footerInfo = document.getElementById('footer-info');
            
            if (filtradas.length > 0) {
                footer.style.display = 'flex';
                const naoLidasFiltradas = filtradas.filter(n => !n.lida).length;
                footerInfo.textContent = naoLidasFiltradas > 0 
                    ? `${naoLidasFiltradas} não lida(s) · ${filtradas.length} total`
                    : `${filtradas.length} notificação(ões) · Todas lidas`;
            } else {
                footer.style.display = 'none';
            }

            // Render
            const container = document.getElementById('notif-list');

            if (filtradas.length === 0) {
                container.innerHTML = `
                    <div class="notif-empty">
                        <span class="notif-empty-icon">[[icone:notificacao]]</span>
                        <h3>Nenhuma notificação encontrada</h3>
                        <p>${search || tipo ? 'Tente ajustar os filtros' : 'Você está em dia com suas notificações!'}</p>
                        ${(search || tipo || filtroTipoAtual !== 'todas') ? `
                            <button class="btn btn-outline" onclick="limparFiltros()">
                                [[icone:atualizar]] Limpar filtros
                            </button>
                        ` : ''}
                    </div>
                `;
                return;
            }

            container.innerHTML = filtradas.map(n => criarItemHTML(n)).join('');
        }

        // ==========================================
        // CRIAR ITEM HTML
        // ==========================================
        function criarItemHTML(notif) {
            const tipo = classificarNotificacao(notif);
            const icone = getIconeNotificacao(tipo);
            const isUnread = !notif.lida;

            // Detectar OS para linkar
            let osLinkHTML = '';
            if (notif.osId) {
                const osExiste = ordens.some(o => o.id === notif.osId);
                if (osExiste) {
                    osLinkHTML = `
                        <button class="notif-link" onclick="event.stopPropagation(); irParaOS('${notif.osId}')">
                            [[icone:link]] Ver OS
                        </button>
                    `;
                }
            } else {
                // Tentar extrair ID da mensagem
                const match = (notif.mensagem || '').match(/#([a-f0-9]{8})/i);
                if (match) {
                    const osId = match[1];
                    osLinkHTML = `
                        <button class="notif-link" onclick="event.stopPropagation(); irParaOS('${osId}')">
                            [[icone:link]] Ver OS
                        </button>
                    `;
                }
            }

            return `
                <div class="notif-item ${isUnread ? 'unread' : ''}" onclick="abrirNotificacao('${notif.id}')">
                    <div class="notif-icon-wrapper">
                        <div class="notif-icon ${tipo}">
                            ${icone}
                        </div>
                        ${isUnread ? '<span class="notif-unread-dot"></span>' : ''}
                    </div>

                    <div class="notif-content">
                        <div class="notif-header-row">
                            <h3 class="notif-title">${notif.titulo || 'Notificação'}</h3>
                            <span class="notif-time">[[icone:relogio]] ${timeAgo(notif.data)}</span>
                        </div>

                        <div class="notif-message">${notif.mensagem || ''}</div>

                        ${osLinkHTML ? `
                            <div class="notif-meta">
                                ${osLinkHTML}
                            </div>
                        ` : ''}
                    </div>

                    <div class="notif-actions">
                        ${isUnread ? `
                            <button 
                                class="notif-action-btn" 
                                title="Marcar como lida"
                                onclick="event.stopPropagation(); toggleLida('${notif.id}')"
                            >
                                [[icone:confirmar]]
                            </button>
                        ` : `
                            <button 
                                class="notif-action-btn" 
                                title="Marcar como não lida"
                                onclick="event.stopPropagation(); toggleLida('${notif.id}')"
                            >
                                [[icone:status]]
                            </button>
                        `}
                        <button 
                            class="notif-action-btn danger" 
                            title="Excluir"
                            onclick="event.stopPropagation(); excluirNotificacao('${notif.id}')"
                        >
                            [[icone:excluir]]
                        </button>
                    </div>
                </div>
            `;
        }

        // ==========================================
        // ABRIR NOTIFICAÇÃO
        // ==========================================
        async function abrirNotificacao(id) {
            const n=notificacoes.find(n=>n.id===id);if(!n)return;
            try{await apiRequest('/notificacoes/'+id,{method:'PATCH',body:JSON.stringify({lida:true})});if(n.osId)irParaOS(n.osId);else await carregarDados();}catch(e){showToast(e.message,'error');}
        }

        // ==========================================
        // IR PARA OS
        // ==========================================
        function irParaOS(osId) {
            let baseUrl = 'ordens.html';
            
            if (isColaborador) {
                baseUrl = 'minhas-ordens.html';
            }
            
            window.location.href = `${baseUrl}?id=${osId}`;
        }

        // ==========================================
        // TOGGLE LIDA/NÃO LIDA
        // ==========================================
        async function toggleLida(id) {
            const n=notificacoes.find(n=>n.id===id);if(!n)return;
            try{await apiRequest('/notificacoes/'+id,{method:'PATCH',body:JSON.stringify({lida:!n.lida})});await carregarDados();}catch(e){showToast(e.message,'error');}
        }

        // ==========================================
        // MARCAR TODAS COMO LIDAS
        // ==========================================
        async function marcarTodasComoLidas() {
            try{await apiRequest('/notificacoes',{method:'PATCH'});await carregarDados();showToast('Notificações marcadas como lidas','success');}catch(e){showToast(e.message,'error');}
        }

        // ==========================================
        // EXCLUIR NOTIFICAÇÃO
        // ==========================================
        async function excluirNotificacao(id) {
            if(!confirm('Excluir esta notificação?'))return;
            try{await apiRequest('/notificacoes/'+id,{method:'DELETE'});await carregarDados();}catch(e){showToast(e.message,'error');}
        }

        // ==========================================
        // LIMPAR FILTROS
        // ==========================================
        function limparFiltros() {
            document.getElementById('search-notif').value = '';
            document.getElementById('filter-tipo').value = '';
            filtroTipoAtual = 'todas';

            document.querySelectorAll('.notif-stat-card').forEach(card => {
                card.classList.remove('active');
            });
            document.querySelector('[data-filter="todas"]').classList.add('active');

            renderizarNotificacoes();
        }

        // ==========================================
        // SALVAR NOTIFICAÇÕES (localStorage)
        // ==========================================
        function salvarNotificacoes() { /* Estado no servidor. */
        }

        // ==========================================
        // INICIALIZAÇÃO
        // ==========================================
        window.onLegacyReady( () => {
            renderizarMenuLateral();
            carregarInfoUsuario();
            carregarDados();

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
    
Object.assign(window,{...(typeof renderizarMenuLateral === 'function' ? {renderizarMenuLateral} : {}),...(typeof carregarInfoUsuario === 'function' ? {carregarInfoUsuario} : {}),...(typeof carregarDados === 'function' ? {carregarDados} : {}),...(typeof criarNotificacoesExemplo === 'function' ? {criarNotificacoesExemplo} : {}),...(typeof classificarNotificacao === 'function' ? {classificarNotificacao} : {}),...(typeof getIconeNotificacao === 'function' ? {getIconeNotificacao} : {}),...(typeof atualizarStats === 'function' ? {atualizarStats} : {}),...(typeof animarNumero === 'function' ? {animarNumero} : {}),...(typeof filtrarPorTipo === 'function' ? {filtrarPorTipo} : {}),...(typeof aplicarFiltros === 'function' ? {aplicarFiltros} : {}),...(typeof renderizarNotificacoes === 'function' ? {renderizarNotificacoes} : {}),...(typeof criarItemHTML === 'function' ? {criarItemHTML} : {}),...(typeof abrirNotificacao === 'function' ? {abrirNotificacao} : {}),...(typeof irParaOS === 'function' ? {irParaOS} : {}),...(typeof toggleLida === 'function' ? {toggleLida} : {}),...(typeof marcarTodasComoLidas === 'function' ? {marcarTodasComoLidas} : {}),...(typeof excluirNotificacao === 'function' ? {excluirNotificacao} : {}),...(typeof limparFiltros === 'function' ? {limparFiltros} : {}),...(typeof salvarNotificacoes === 'function' ? {salvarNotificacoes} : {})});
})();