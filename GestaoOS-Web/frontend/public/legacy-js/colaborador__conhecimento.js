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

        // Apenas admins e gestores podem criar/editar
        const podeEditar = isAdmin || isGestor;

        if (podeEditar) {
            document.getElementById('btn-novo-artigo').style.display = 'inline-flex';
        }

        document.getElementById('breadcrumb-tipo').textContent = 
            isAdmin ? 'Admin' : (isGestor ? 'Gestor' : 'Colaborador');

        // ==========================================
        // ESTADO
        // ==========================================
        let artigos = [];
        let usuarios = [];
        let filtroTipoAtual = 'todos';
        let viewAtual = 'grid';
        let artigoLido = null;

        // ==========================================
        // CORES DAS CATEGORIAS
        // ==========================================
        const CATEGORIAS = {
            'TI': { icon: '[[icone:computador]]', class: 'cat-ti' },
            'RH': { icon: '[[icone:equipe]]', class: 'cat-rh' },
            'Produção': { icon: '[[icone:setores]]', class: 'cat-producao' },
            'Manutenção': { icon: '[[icone:ferramenta]]', class: 'cat-manutencao' },
            'Qualidade': { icon: '[[icone:confirmar]]', class: 'cat-qualidade' },
            'Administração': { icon: '[[icone:ordens]]', class: 'cat-administracao' },
            'Outros': { icon: '[[icone:kanban]]', class: 'cat-outros' }
        };

        // ==========================================
        // MENU LATERAL
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
                    <li class="active"><a href="conhecimento.html"><span class="menu-icon">[[icone:conhecimento]]</span> Conhecimento</a></li>
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
                    <li class="active"><a href="../gestor/conhecimento.html"><span class="menu-icon">[[icone:conhecimento]]</span> Conhecimento</a></li>
                    <li><a href="../gestor/chat.html"><span class="menu-icon">[[icone:chat]]</span> Chat</a></li>
                    <li class="divider"></li>
                    <li><a href="../gestor/perfil.html"><span class="menu-icon">[[icone:usuario]]</span> Meu Perfil</a></li>
                    <li><a href="#" id="logout"><span class="menu-icon">[[icone:sair]]</span> Sair</a></li>
                `;
            } else {
                html = `
                    <li><a href="../colaborador/dashboard.html"><span class="menu-icon">[[icone:painel]]</span> Dashboard</a></li>
                    <li><a href="../colaborador/minhas-ordens.html"><span class="menu-icon">[[icone:ordens]]</span> Minhas Ordens</a></li>
                    <li><a href="../colaborador/minhas-ordens.html?acao=nova"><span class="menu-icon">[[icone:adicionar]]</span> Nova OS</a></li>
                    <li class="divider"></li>
                    <li class="active"><a href="../colaborador/conhecimento.html"><span class="menu-icon">[[icone:conhecimento]]</span> Conhecimento</a></li>
                    <li><a href="../colaborador/chat.html"><span class="menu-icon">[[icone:chat]]</span> Chat</a></li>
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
            try { artigos=await apiRequest('/conhecimento');usuarios=await apiRequest('/usuarios');renderizarArtigos();atualizarStats();carregarNotificacoes(); }
            catch(e){showToast(e.message,'error');}
        }

        // ==========================================
        // ARTIGOS PADRÃO
        // ==========================================
        function criarArtigosPadrao() { /* Não fabricar artigos nem indicadores. */
        }

        // ==========================================
        // SALVAR ARTIGOS
        // ==========================================
        function salvarArtigos() { /* Alterações persistem explicitamente na API. */
        }

        // ==========================================
        // ATUALIZAR STATS
        // ==========================================
        function atualizarStats() {
            const total = artigos.length;
            const fixados = artigos.filter(a => a.fixado).length;
            const meus = artigos.filter(a => a.autorId === usuarioAtual.id).length;
            
            // Recentes: últimos 7 dias
            const seteDias = new Date();
            seteDias.setDate(seteDias.getDate() - 7);
            const recentes = artigos.filter(a => new Date(a.criadoEm) >= seteDias).length;

            animarNumero('stat-total', total);
            animarNumero('stat-fixados', fixados);
            animarNumero('stat-meus', meus);
            animarNumero('stat-recentes', recentes);
        }

        // ==========================================
        // ANIMAR NÚMERO
        // ==========================================
        function animarNumero(elementId, valorFinal) {
            const el = document.getElementById(elementId);
            if (!el) return;

            const duracao = 600;
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

            document.querySelectorAll('.kb-stat-card').forEach(card => {
                card.classList.remove('active');
            });
            element.classList.add('active');

            aplicarFiltros();
        }

        // ==========================================
        // MUDAR VIEW
        // ==========================================
        function mudarView(view, btn) {
            viewAtual = view;

            document.querySelectorAll('.kb-view-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const grid = document.getElementById('kb-grid');
            grid.classList.toggle('list-view', view === 'list');
        }

        // ==========================================
        // APLICAR FILTROS
        // ==========================================
        function aplicarFiltros() {
            renderizarArtigos();
        }

        // ==========================================
        // RENDERIZAR ARTIGOS
        // ==========================================
        function renderizarArtigos() {
            const search = document.getElementById('search-kb').value.toLowerCase().trim();
            const categoria = document.getElementById('filter-categoria').value;
            const ordem = document.getElementById('filter-ordem').value;

            let filtrados = artigos.filter(a => {
                // Busca
                if (search) {
                    const matchTitulo = a.titulo.toLowerCase().includes(search);
                    const matchResumo = a.resumo.toLowerCase().includes(search);
                    const matchConteudo = (a.conteudo || '').toLowerCase().includes(search);
                    const matchTags = (a.tags || []).some(t => t.toLowerCase().includes(search));
                    
                    if (!matchTitulo && !matchResumo && !matchConteudo && !matchTags) return false;
                }

                // Categoria
                if (categoria && a.categoria !== categoria) return false;

                return true;
            });

            // Filtro por tipo (card)
            if (filtroTipoAtual !== 'todos') {
                if (filtroTipoAtual === 'fixados') {
                    filtrados = filtrados.filter(a => a.fixado);
                } else if (filtroTipoAtual === 'meus') {
                    filtrados = filtrados.filter(a => a.autorId === usuarioAtual.id);
                } else if (filtroTipoAtual === 'recentes') {
                    const seteDias = new Date();
                    seteDias.setDate(seteDias.getDate() - 7);
                    filtrados = filtrados.filter(a => new Date(a.criadoEm) >= seteDias);
                }
            }

            // Ordenar
            filtrados.sort((a, b) => {
                // Sempre: fixados primeiro
                if (a.fixado !== b.fixado) return a.fixado ? -1 : 1;

                switch (ordem) {
                    case 'recentes':
                        return new Date(b.criadoEm) - new Date(a.criadoEm);
                    case 'antigos':
                        return new Date(a.criadoEm) - new Date(b.criadoEm);
                    case 'visualizados':
                        return (b.visualizacoes || 0) - (a.visualizacoes || 0);
                    case 'uteis':
                        return (b.uteis || 0) - (a.uteis || 0);
                    case 'alfabetica':
                        return a.titulo.localeCompare(b.titulo);
                    default:
                        return 0;
                }
            });

            // Info
            const infoEl = document.getElementById('info-resultados');
            if (filtrados.length === 0) {
                infoEl.textContent = 'Nenhum resultado';
            } else {
                infoEl.textContent = `Mostrando ${filtrados.length} de ${artigos.length} artigo(s)`;
            }

            // Render
            const grid = document.getElementById('kb-grid');

            if (filtrados.length === 0) {
                grid.innerHTML = `
                    <div class="kb-empty">
                        <span class="kb-empty-icon">[[icone:conhecimento]]</span>
                        <h3>Nenhum artigo encontrado</h3>
                        <p>Tente ajustar os filtros ${podeEditar ? 'ou criar um novo artigo' : ''}</p>
                        ${podeEditar ? `
                            <button class="btn btn-primary" onclick="abrirModalEditar()" style="margin-top:12px;">
                                [[icone:adicionar]] Criar Artigo
                            </button>
                        ` : ''}
                    </div>
                `;
                return;
            }

            grid.innerHTML = filtrados.map(a => criarCardHTML(a)).join('');
        }

        // ==========================================
        // CRIAR CARD HTML
        // ==========================================
        function criarCardHTML(artigo) {
            const catInfo = CATEGORIAS[artigo.categoria] || CATEGORIAS['Outros'];
            const autor = usuarios.find(u => u.id === artigo.autorId);
            const autorNome = autor ? autor.nome : 'Sistema';
            const inicial = autorNome.charAt(0).toUpperCase();

            // Avatar do autor
            let avatarHTML = inicial;
            if (autor && autor.avatar) {
                avatarHTML = `<img src="${window.avatarURL(autor.avatar)}" alt="${autorNome}">`;
            }

            // Tags (máx 3)
            const tags = (artigo.tags || []).slice(0, 3);
            const maisTags = (artigo.tags || []).length - 3;

            return `
                <div class="kb-card ${artigo.fixado ? 'pinned' : ''}" onclick="abrirArtigo('${artigo.id}')">
                    <div class="kb-card-header">
                        <span class="kb-card-category ${catInfo.class}">
                            ${catInfo.icon} ${window.escapeHTML(artigo.categoria)}
                        </span>
                        ${artigo.fixado ? '<span class="kb-card-pin">[[icone:kanban]]</span>' : ''}
                    </div>

                    <h3 class="kb-card-title">${window.escapeHTML(artigo.titulo)}</h3>
                    <p class="kb-card-summary">${window.escapeHTML(artigo.resumo)}</p>

                    ${tags.length > 0 ? `
                        <div class="kb-card-tags">
                            ${tags.map(t => `<span class="kb-tag">#${t}</span>`).join('')}
                            ${maisTags > 0 ? `<span class="kb-tag">+${maisTags}</span>` : ''}
                        </div>
                    ` : ''}

                    <div class="kb-card-footer">
                        <div class="kb-card-footer-left">
                            <div class="kb-card-author-avatar">${avatarHTML}</div>
                            <span>${autorNome.split(' ')[0]}</span>
                        </div>
                        <div class="kb-card-footer-right">
                            <span class="kb-card-meta">[[icone:visualizar]] ${artigo.visualizacoes || 0}</span>
                            <span class="kb-card-meta">[[icone:confirmar]] ${artigo.uteis || 0}</span>
                        </div>
                    </div>
                </div>
            `;
        }

        // ==========================================
        // ABRIR ARTIGO
        // ==========================================
        function abrirArtigo(id) {
            const artigo = artigos.find(a => a.id === id);
            if (!artigo) return;

            artigoLido = artigo;

            // Incrementar visualizações
            artigo.visualizacoes = (artigo.visualizacoes || 0) + 1;
            apiRequest('/conhecimento/'+id+'/visualizacao',{method:'POST'}).catch(()=>{});
            salvarArtigos();

            const catInfo = CATEGORIAS[artigo.categoria] || CATEGORIAS['Outros'];
            const autor = usuarios.find(u => u.id === artigo.autorId);
            const autorNome = autor ? autor.nome : 'Sistema';

            const content = document.getElementById('read-content');
            content.innerHTML = `
                <div class="kb-read-header">
                    <button class="kb-read-close" onclick="fecharModalLer()">✕</button>
                    <span class="kb-read-category ${catInfo.class}">
                        ${catInfo.icon} ${window.escapeHTML(artigo.categoria)}
                    </span>
                    <h1 class="kb-read-title">
                        ${artigo.fixado ? '[[icone:kanban]] ' : ''}${window.escapeHTML(artigo.titulo)}
                    </h1>
                    <div class="kb-read-meta">
                        <span>[[icone:usuario]] ${autorNome}</span>
                        <span>[[icone:calendario]] ${formatDateShort(artigo.criadoEm)}</span>
                        <span>[[icone:visualizar]] ${artigo.visualizacoes} visualizações</span>
                        <span>[[icone:confirmar]] ${artigo.uteis || 0} úteis</span>
                    </div>
                </div>

                <div class="kb-read-body">
                    ${renderMarkdown(artigo.conteudo)}
                </div>

                ${(artigo.tags || []).length > 0 ? `
                    <div class="kb-read-tags">
                        ${artigo.tags.map(t => `<span class="kb-read-tag">#${t}</span>`).join('')}
                    </div>
                ` : ''}

                <div class="kb-read-footer">
                    <div class="kb-read-helpful">
                        <span>Este artigo foi útil?</span>
                        <button class="kb-helpful-btn" onclick="marcarUtil('${artigo.id}', true)">
                            [[icone:confirmar]] Sim
                        </button>
                        <button class="kb-helpful-btn" onclick="showToast('Obrigado pelo feedback!', 'info')">
                            [[icone:bloquear]] Não
                        </button>
                    </div>

                    ${podeEditar ? `
                        <div style="display:flex; gap:8px;">
                            <button class="btn btn-outline btn-sm" onclick="editarArtigo('${artigo.id}')">
                                [[icone:editar]] Editar
                            </button>
                            <button class="btn btn-danger btn-sm" onclick="confirmarExclusao('${artigo.id}')">
                                [[icone:excluir]] Excluir
                            </button>
                        </div>
                    ` : ''}
                </div>
            `;

            document.getElementById('modal-ler').style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }

        // ==========================================
        // RENDER MARKDOWN SIMPLES
        // ==========================================
        function renderMarkdown(texto) {
            if (!texto) return '';

            let html = texto;

            // Escapar HTML básico primeiro
            html = html.replace(/</g, '&lt;').replace(/>/g, '&gt;');

            // Blockquote
            html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');

            // Headers
            html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
            html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
            html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

            // Código inline
            html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

            // Negrito
            html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

            // Itálico
            html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

            // Listas (não ordenadas)
            html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
            html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

            // Listas ordenadas
            html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

            // Checkboxes
            html = html.replace(/\[ \]/g, '☐');
            html = html.replace(/\[x\]/gi, '[[icone:confirmar]]');

            // Parágrafos
            html = html.split('\n\n').map(p => {
                p = p.trim();
                if (!p) return '';
                if (p.startsWith('<h') || p.startsWith('<ul') || p.startsWith('<ol') || p.startsWith('<blockquote')) {
                    return p;
                }
                return `<p>${p.replace(/\n/g, '<br>')}</p>`;
            }).join('\n');

            return html;
        }

        // ==========================================
        // FECHAR MODAL LER
        // ==========================================
        function fecharModalLer() {
            document.getElementById('modal-ler').style.display = 'none';
            document.body.style.overflow = '';

            // Re-renderizar para atualizar contador
            renderizarArtigos();
            atualizarStats();
        }

        // ==========================================
        // MARCAR COMO ÚTIL
        // ==========================================
        async function marcarUtil(id,util) {
            try {await apiRequest('/conhecimento/'+id+'/util',{method:'POST'});await carregarDados();showToast('Obrigado pelo feedback!','success');}
            catch(e){showToast(e.message,'error');}
        }

        // ==========================================
        // MODAL EDITAR
        // ==========================================
        function abrirModalEditar(artigoId = null) {
            if (!podeEditar) {
                showToast('Você não tem permissão para criar artigos', 'error');
                return;
            }

            const form = document.getElementById('form-artigo');
            form.reset();
            document.getElementById('artigo-id').value = '';
            document.getElementById('resumo-char').textContent = '0';

            if (artigoId) {
                const artigo = artigos.find(a => a.id === artigoId);
                if (!artigo) return;

                document.getElementById('edit-modal-title').textContent = '[[icone:editar]] Editar Artigo';
                document.getElementById('artigo-id').value = artigo.id;
                document.getElementById('artigo-titulo').value = artigo.titulo;
                document.getElementById('artigo-categoria').value = artigo.categoria;
                document.getElementById('artigo-tags').value = (artigo.tags || []).join(', ');
                document.getElementById('artigo-resumo').value = artigo.resumo;
                document.getElementById('artigo-conteudo').value = artigo.conteudo;
                document.getElementById('artigo-fixado').checked = !!artigo.fixado;
                document.getElementById('resumo-char').textContent = artigo.resumo.length;
                document.getElementById('btn-salvar-artigo').textContent = 'Salvar Alterações';
            } else {
                document.getElementById('edit-modal-title').textContent = '[[icone:adicionar]] Novo Artigo';
                document.getElementById('btn-salvar-artigo').textContent = 'Criar Artigo';
            }

            document.getElementById('modal-editar').style.display = 'flex';
            document.body.style.overflow = 'hidden';

            setTimeout(() => document.getElementById('artigo-titulo').focus(), 100);
        }

        function fecharModalEditar() {
            document.getElementById('modal-editar').style.display = 'none';
            document.body.style.overflow = '';
        }

        // ==========================================
        // EDITAR ARTIGO
        // ==========================================
        function editarArtigo(id) {
            fecharModalLer();
            setTimeout(() => abrirModalEditar(id), 200);
        }

        // ==========================================
        // SUBMIT FORM
        // ==========================================
        document.getElementById('form-artigo').addEventListener('submit', async (e) => {
            e.preventDefault();
            const val=id=>document.getElementById(id).value.trim(),id=val('artigo-id');
            const body={titulo:val('artigo-titulo'),categoria:val('artigo-categoria'),tags:val('artigo-tags').split(',').map(t=>t.trim()).filter(Boolean),resumo:val('artigo-resumo'),conteudo:val('artigo-conteudo'),fixado:document.getElementById('artigo-fixado').checked};
            const btn=document.getElementById('btn-salvar-artigo');btn.disabled=true;
            try {await apiRequest('/conhecimento'+(id?'/'+id:''),{method:id?'PUT':'POST',body:JSON.stringify(body)});fecharModalEditar();await carregarDados();showToast('Artigo salvo','success');}
            catch(error){showToast(error.message,'error');}finally{btn.disabled=false;}
        });

        // ==========================================
        // CONFIRMAR EXCLUSÃO
        // ==========================================
        async function confirmarExclusao(id) {
            if(!confirm('Excluir este artigo?'))return;
            try{await apiRequest('/conhecimento/'+id,{method:'DELETE'});fecharModalLer();await carregarDados();showToast('Artigo excluído','success');}catch(e){showToast(e.message,'error');}
        }

        // ==========================================
        // CONTADOR DO RESUMO
        // ==========================================
        document.getElementById('artigo-resumo').addEventListener('input', function() {
            document.getElementById('resumo-char').textContent = this.value.length;
        });

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
        // FECHAR MODAIS (ESC)
        // ==========================================
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (document.getElementById('modal-ler').style.display === 'flex') fecharModalLer();
                if (document.getElementById('modal-editar').style.display === 'flex') fecharModalEditar();
            }
        });

        window.addEventListener('click', (e) => {
            const modalLer = document.getElementById('modal-ler');
            const modalEditar = document.getElementById('modal-editar');
            if (e.target === modalLer) fecharModalLer();
            if (e.target === modalEditar) fecharModalEditar();
        });

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
    
Object.assign(window,{...(typeof renderizarMenuLateral === 'function' ? {renderizarMenuLateral} : {}),...(typeof carregarInfoUsuario === 'function' ? {carregarInfoUsuario} : {}),...(typeof carregarDados === 'function' ? {carregarDados} : {}),...(typeof criarArtigosPadrao === 'function' ? {criarArtigosPadrao} : {}),...(typeof salvarArtigos === 'function' ? {salvarArtigos} : {}),...(typeof atualizarStats === 'function' ? {atualizarStats} : {}),...(typeof animarNumero === 'function' ? {animarNumero} : {}),...(typeof filtrarPorTipo === 'function' ? {filtrarPorTipo} : {}),...(typeof mudarView === 'function' ? {mudarView} : {}),...(typeof aplicarFiltros === 'function' ? {aplicarFiltros} : {}),...(typeof renderizarArtigos === 'function' ? {renderizarArtigos} : {}),...(typeof criarCardHTML === 'function' ? {criarCardHTML} : {}),...(typeof abrirArtigo === 'function' ? {abrirArtigo} : {}),...(typeof renderMarkdown === 'function' ? {renderMarkdown} : {}),...(typeof fecharModalLer === 'function' ? {fecharModalLer} : {}),...(typeof marcarUtil === 'function' ? {marcarUtil} : {}),...(typeof abrirModalEditar === 'function' ? {abrirModalEditar} : {}),...(typeof fecharModalEditar === 'function' ? {fecharModalEditar} : {}),...(typeof editarArtigo === 'function' ? {editarArtigo} : {}),...(typeof confirmarExclusao === 'function' ? {confirmarExclusao} : {}),...(typeof carregarNotificacoes === 'function' ? {carregarNotificacoes} : {})});
})();