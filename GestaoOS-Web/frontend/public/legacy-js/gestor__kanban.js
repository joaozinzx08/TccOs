(function(){

        // ==========================================
        // PROTEÇÃO E ROLE
        // ==========================================
        var usuarioAtual = getUsuario();
        var isAdmin = usuarioAtual.role === 'administrador_principal' || usuarioAtual.role === 'administrador_setor';
        var isGestor = usuarioAtual.role === 'gestor';

        if (!protegerPagina(['administrador_principal', 'administrador_setor', 'gestor'])) {
            throw new Error('Acesso negado');
        }

        document.getElementById('breadcrumb-tipo').textContent = isGestor ? 'Gestor' : 'Admin';

        // Ajustar menu para gestor
        if (isGestor) {
            document.querySelectorAll('.sidebar-menu a').forEach(function(a) {
                var href = a.getAttribute('href');
                if (href && !href.startsWith('http') && !href.startsWith('#') && !href.startsWith('../')) {
                    a.setAttribute('href', '../gestor/' + href);
                }
            });
            document.querySelectorAll('.sidebar-menu li').forEach(function(li) {
                var link = li.querySelector('a');
                if (!link) return;
                var texto = link.textContent.trim();
                if (['Usuários', 'Setores', 'Auditoria', 'Minha Empresa'].some(function(p) { return texto.includes(p); })) {
                    li.remove();
                }
            });
        }

        // ==========================================
        // ESTADO
        // ==========================================
        var ordens = [];
        var setores = [];
        var usuarios = [];
        var draggedId = null;

        var COLUNAS = ['Aberta', 'Encaminhada', 'Em atendimento', 'Aguardando informação', 'Concluída', 'Cancelada'];

        // ==========================================
        // USUÁRIO NA SIDEBAR
        // ==========================================
        function carregarInfoUsuario() {
            if (!usuarioAtual) return;
            var primeiroNome = usuarioAtual.nome.split(' ')[0];
            document.getElementById('user-name').textContent = usuarioAtual.nome;

            var roleLabels = {
                'administrador_principal': 'Admin Principal',
                'administrador_setor': 'Admin de Setor',
                'gestor': 'Gestor',
                'colaborador': 'Colaborador'
            };
            document.getElementById('user-role').textContent = roleLabels[usuarioAtual.role] || 'Admin';

            var avatarEl = document.getElementById('sidebar-avatar');
            if (usuarioAtual.avatar) {
                avatarEl.innerHTML = '<img src="' + window.avatarURL(usuarioAtual.avatar) + '" alt="Avatar">';
            } else {
                avatarEl.textContent = primeiroNome.charAt(0).toUpperCase();
            }
        }

        // ==========================================
        // CARREGAR DADOS (com auto-refresh funcional)
        // ==========================================
        async function carregarDados() {
            try {
                console.log('[[icone:atualizar]] Carregando kanban...');
                var token = localStorage.getItem('token');
                var headers = { 'Authorization': 'Bearer ' + token };

                var results = await Promise.allSettled([
                    window.legacyFetch('/api/ordens', { headers: headers }).then(function(r) { return r.json(); }),
                    window.legacyFetch('/api/setores', { headers: headers }).then(function(r) { return r.json(); }),
                    window.legacyFetch('/api/usuarios', { headers: headers }).then(function(r) { return r.json(); })
                ]);

                ordens = (results[0].status === 'fulfilled' ? results[0].value : []) || [];
                setores = (results[1].status === 'fulfilled' ? results[1].value : []) || [];
                usuarios = (results[2].status === 'fulfilled' ? results[2].value : []) || [];

                console.log('[[icone:ordens]] Ordens:', ordens.length, '| Setores:', setores.length);

                preencherSelectSetores();
                renderizarKanban();
                carregarNotificacoes();

            } catch (e) {
                console.error('[[icone:fechar]] Erro:', e);
                showToast('Erro ao carregar ordens', 'error');
            }
        }

        function preencherSelectSetores() {
            var select = document.getElementById('filter-setor');
            select.innerHTML = '<option value="">Todos os setores</option>';
            setores.filter(function(s) { return s.ativo !== false; }).forEach(function(s) {
                select.innerHTML += '<option value="' + s.id + '">' + window.escapeHTML(s.nome) + '</option>';
            });
        }

        function aplicarFiltros() { renderizarKanban(); }

        // ==========================================
        // RENDERIZAR KANBAN
        // ==========================================
        function renderizarKanban() {
            var search = document.getElementById('search-os').value.toLowerCase().trim();
            var prioridade = document.getElementById('filter-priority').value;
            var setorId = document.getElementById('filter-setor').value;

            var filtradas = ordens.filter(function(os) {
                var matchSearch = !search || 
                    (os.titulo || '').toLowerCase().includes(search) ||
                    (os.id || '').toLowerCase().includes(search);
                var matchPriority = !prioridade || os.prioridade === prioridade;
                var matchSetor = !setorId || os.setorResponsavelId === setorId;
                return matchSearch && matchPriority && matchSetor;
            });

            document.getElementById('info-resultados').textContent = 
                'Mostrando ' + filtradas.length + ' de ' + ordens.length + ' ordem(ns)';

            // Agrupar por status
            var porStatus = {};
            COLUNAS.forEach(function(s) { porStatus[s] = []; });
            filtradas.forEach(function(os) {
                var status = os.status || 'Aberta';
                if (porStatus[status]) porStatus[status].push(os);
                else porStatus['Aberta'].push(os);
            });

            // Renderizar cada coluna
            COLUNAS.forEach(function(status) {
                var body = document.querySelector('.kanban-column-body[data-status="' + status + '"]');
                var countEl = document.getElementById('count-' + status.replace(/\s+/g, '-'));
                
                var lista = porStatus[status] || [];
                if (countEl) countEl.textContent = lista.length;

                if (lista.length === 0) {
                    body.innerHTML = '<div class="kanban-empty"><span class="kanban-empty-icon">[[icone:pasta]]</span><span>Nenhuma OS</span></div>';
                } else {
                    var peso = { 'Urgente': 4, 'Alta': 3, 'Média': 2, 'Baixa': 1 };
                    lista.sort(function(a, b) {
                        var pA = peso[a.prioridade] || 0;
                        var pB = peso[b.prioridade] || 0;
                        if (pA !== pB) return pB - pA;
                        return new Date(b.dataAbertura) - new Date(a.dataAbertura);
                    });
                    body.innerHTML = lista.map(function(os) { return criarCardHTML(os); }).join('');
                }

                configurarDrop(body);
            });

            configurarDrag();
        }

        function criarCardHTML(os) {
            var setor = setores.find(function(s) { return s.id === os.setorResponsavelId; });
            var prioridade = os.prioridade || 'Média';
            var hoje = new Date();
            hoje.setHours(0, 0, 0, 0);

            var deadlineHTML = '';
            if (os.prazo && os.status !== 'Concluída' && os.status !== 'Cancelada') {
                var prazo = new Date(os.prazo);
                prazo.setHours(0, 0, 0, 0);
                var diff = Math.ceil((prazo - hoje) / (1000 * 60 * 60 * 24));
                var data = prazo.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

                if (diff < 0) deadlineHTML = '<span style="color:#dc2626;font-weight:700;">[[icone:alerta]] ' + Math.abs(diff) + 'd atraso</span>';
                else if (diff === 0) deadlineHTML = '<span style="color:#dc2626;font-weight:700;">[[icone:prioridade]] Hoje</span>';
                else if (diff <= 3) deadlineHTML = '<span style="color:#d97706;font-weight:600;">[[icone:relogio]] ' + diff + 'd</span>';
                else deadlineHTML = '<span>[[icone:calendario]] ' + data + '</span>';
            }

            var prioIcone = prioridade === 'Urgente' ? '[[icone:status]]' : prioridade === 'Alta' ? '[[icone:status]]' : prioridade === 'Média' ? '[[icone:status]]' : '[[icone:status]]';

            return '<div class="kanban-card" draggable="true" data-id="' + os.id + '" data-prioridade="' + prioridade + '" onclick="if(!this.classList.contains(\'dragging\')) window.location.href=\'ordens.html?id=' + os.id + '\'">' +
                '<div class="kanban-card-header">' +
                    '<span class="kanban-card-id">#' + shortId(os.id) + '</span>' +
                    '<span class="kanban-card-priority ' + prioridade + '">' + prioIcone + ' ' + prioridade + '</span>' +
                '</div>' +
                '<div class="kanban-card-title">' + (os.titulo || 'Sem título') + '</div>' +
                '<div class="kanban-card-meta">' +
                    '<span>[[icone:setores]] ' + (setor ? setor.nome : '—') + '</span>' +
                    (os.sigilo ? '<span>[[icone:cadeado]]</span>' : '') +
                    (os.anexos && os.anexos.length > 0 ? '<span>[[icone:anexo]] ' + os.anexos.length + '</span>' : '') +
                    deadlineHTML +
                '</div>' +
            '</div>';
        }

        // ==========================================
        // DRAG AND DROP
        // ==========================================
        function configurarDrag() {
            document.querySelectorAll('.kanban-card').forEach(function(card) {
                card.addEventListener('dragstart', function(e) {
                    draggedId = this.dataset.id;
                    this.classList.add('dragging');
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', draggedId);
                });

                card.addEventListener('dragend', function() {
                    this.classList.remove('dragging');
                    document.querySelectorAll('.kanban-column').forEach(function(c) { c.classList.remove('drag-over'); });
                    draggedId = null;
                });
            });
        }

        function configurarDrop(body) {
            body.addEventListener('dragover', function(e) {
                e.preventDefault();
                body.closest('.kanban-column').classList.add('drag-over');
            });

            body.addEventListener('dragleave', function(e) {
                if (!body.contains(e.relatedTarget)) {
                    body.closest('.kanban-column').classList.remove('drag-over');
                }
            });

            body.addEventListener('drop', async function(e) {
                e.preventDefault();
                e.stopPropagation();
                body.closest('.kanban-column').classList.remove('drag-over');

                var novoStatus = body.dataset.status;
                var id = e.dataTransfer.getData('text/plain');
                if (!id || !novoStatus) return;

                var os = ordens.find(function(o) { return o.id === id; });
                if (!os || os.status === novoStatus) return;

                var statusAnterior = os.status;
                os.status = novoStatus;
                renderizarKanban();

                try {
                    await apiRequest('/ordens/' + id, {
                        method: 'PUT',
                        body: JSON.stringify({ status: novoStatus })
                    });
                    mostrarToast('[[icone:confirmar]] OS #' + shortId(id) + ' → ' + novoStatus);
                } catch (error) {
                    os.status = statusAnterior;
                    renderizarKanban();
                    showToast('[[icone:fechar]] Erro ao mover OS', 'error');
                }
            });
        }

        var toastTimer = null;
        function mostrarToast(msg) {
            var t = document.getElementById('move-toast');
            t.textContent = msg;
            t.classList.add('show');
            if (toastTimer) clearTimeout(toastTimer);
            toastTimer = setTimeout(function() { t.classList.remove('show'); }, 2500);
        }

        // ==========================================
        // NOTIFICAÇÕES
        // ==========================================
        async function carregarNotificacoes() {
            try {
                var token = localStorage.getItem('token');
                var r = await window.legacyFetch('/api/notificacoes', {
                    headers: { 'Authorization': 'Bearer ' + token }
                });
                var d = await r.json();
                var b = document.getElementById('notificacoes-badge');
                if (b) {
                    var n = d.naoLidas || 0;
                    b.textContent = n;
                    b.style.display = n > 0 ? 'inline-flex' : 'none';
                }
            } catch (e) {}
        }

        // ==========================================
        // INIT - EXECUTA DIRETO
        // ==========================================
        console.log('[[icone:estrela]] Kanban iniciando...');

        carregarInfoUsuario();
        carregarDados();

        var logoutBtn = document.getElementById('logout');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', function(e) {
                e.preventDefault();
                clearSession();
                window.location.href = '../login.html';
            });
        }

        var mt = document.querySelector('.menu-toggle');
        var sb = document.querySelector('.sidebar');
        if (mt && sb) {
            mt.addEventListener('click', function() { sb.classList.toggle('show'); });
            document.addEventListener('click', function(e) {
                if (window.innerWidth > 768) return;
                if (!sb.contains(e.target) && !mt.contains(e.target)) sb.classList.remove('show');
            });
        }

        // ==========================================
        // AUTO-REFRESH A CADA 30 SEGUNDOS
        // ==========================================
        setInterval(function() {
            console.log('[[icone:atualizar]] Auto-refresh kanban...');
            carregarDados();
        }, 30000);

        console.log('[[icone:confirmar]] Kanban pronto!');
    
Object.assign(window,{...(typeof carregarInfoUsuario === 'function' ? {carregarInfoUsuario} : {}),...(typeof carregarDados === 'function' ? {carregarDados} : {}),...(typeof preencherSelectSetores === 'function' ? {preencherSelectSetores} : {}),...(typeof aplicarFiltros === 'function' ? {aplicarFiltros} : {}),...(typeof renderizarKanban === 'function' ? {renderizarKanban} : {}),...(typeof criarCardHTML === 'function' ? {criarCardHTML} : {}),...(typeof configurarDrag === 'function' ? {configurarDrag} : {}),...(typeof configurarDrop === 'function' ? {configurarDrop} : {}),...(typeof mostrarToast === 'function' ? {mostrarToast} : {}),...(typeof carregarNotificacoes === 'function' ? {carregarNotificacoes} : {})});
})();