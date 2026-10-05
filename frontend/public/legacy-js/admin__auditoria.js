(function(){

        // ==========================================
        // PROTEÇÃO
        // ==========================================
        const usuarioAtual = getUsuario();

        if (!protegerPagina(['administrador_principal', 'administrador_setor'])) {
            throw new Error('Acesso negado');
        }

        // ==========================================
        // ESTADO
        // ==========================================
        let auditoria = [];
        let usuarios = [];
        let filtroTipoAtual = 'todas';
        let paginaAtual = 1;
        const ITEMS_POR_PAGINA = 20;

        // ==========================================
        // USUÁRIO
        // ==========================================
        function carregarInfoUsuario() {
            if (!usuarioAtual) return;
            const primeiroNome = usuarioAtual.nome.split(' ')[0];
            document.getElementById('user-name').textContent = usuarioAtual.nome;
            const roleLabels = {
                'administrador_principal': 'Admin Principal',
                'administrador_setor': 'Admin de Setor'
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
        // DADOS
        // ==========================================
        async function carregarDados() {
            try {
                const [a, u] = await Promise.all([
                    apiRequest('/auditoria'),
                    apiRequest('/usuarios').catch(() => [])
                ]);
                auditoria = a || [];
                usuarios = u || [];

                preencherSelectUsuarios();
                atualizarStats();
                renderizarAuditoria();
                carregarNotificacoes();
            } catch (e) {
                console.error(e);
                showToast('Erro ao carregar auditoria', 'error');
            }
        }

        function preencherSelectUsuarios() {
            const s = document.getElementById('filter-usuario');
            s.innerHTML = '<option value="">Todos os usuários</option>';
            s.innerHTML += '<option value="sistema">Sistema</option>';
            usuarios.forEach(u => {
                s.innerHTML += `<option value="${u.id}">${window.escapeHTML(u.nome)}</option>`;
            });
        }

        // ==========================================
        // CLASSIFICAR AÇÃO
        // ==========================================
        function classificarAcao(acao) {
            if (!acao) return 'other';
            const a = acao.toLowerCase();
            if (a.includes('criou') || a.includes('criad') || a.includes('novo') || a.includes('entrou')) return 'create';
            if (a.includes('atualizou') || a.includes('alterou') || a.includes('renovou')) return 'update';
            if (a.includes('removeu') || a.includes('excluiu') || a.includes('deletou')) return 'delete';
            if (a.includes('login') || a.includes('acessou') || a.includes('saiu')) return 'login';
            if (a.includes('status') || a.includes('observação') || a.includes('movida')) return 'status';
            return 'other';
        }

        function getIconeAcao(tipo) {
            const icones = {
                'create': '[[icone:adicionar]]',
                'update': '[[icone:editar]]',
                'delete': '[[icone:excluir]]',
                'login': '[[icone:cadeado]]',
                'status': '[[icone:alvo]]',
                'other': '[[icone:kanban]]'
            };
            return icones[tipo] || '[[icone:kanban]]';
        }

        // ==========================================
        // STATS
        // ==========================================
        function atualizarStats() {
            const total = auditoria.length;
            let criacoes = 0, alteracoes = 0, exclusoes = 0;

            auditoria.forEach(item => {
                const tipo = classificarAcao(item.acao);
                if (tipo === 'create') criacoes++;
                else if (tipo === 'update') alteracoes++;
                else if (tipo === 'delete') exclusoes++;
            });

            animar('stat-total', total);
            animar('stat-criacoes', criacoes);
            animar('stat-alteracoes', alteracoes);
            animar('stat-exclusoes', exclusoes);
        }

        function animar(id, v) {
            const el = document.getElementById(id);
            if (!el) return;
            const dur = 600;
            const ini = performance.now();
            function a(t) {
                const p = Math.min((t - ini) / dur, 1);
                el.textContent = Math.floor(v * p);
                if (p < 1) requestAnimationFrame(a);
                else el.textContent = v;
            }
            requestAnimationFrame(a);
        }

        // ==========================================
        // FILTROS
        // ==========================================
        function filtrarPorTipo(tipo, element) {
            filtroTipoAtual = tipo;
            document.querySelectorAll('.audit-stat-card').forEach(c => c.classList.remove('active'));
            element.classList.add('active');
            paginaAtual = 1;
            renderizarAuditoria();
        }

        function aplicarFiltros() {
            paginaAtual = 1;
            renderizarAuditoria();
        }

        function limparFiltros() {
            document.getElementById('search-audit').value = '';
            document.getElementById('filter-acao').value = '';
            document.getElementById('filter-usuario').value = '';
            document.getElementById('filter-data').value = '';
            filtroTipoAtual = 'todas';

            document.querySelectorAll('.audit-stat-card').forEach(c => c.classList.remove('active'));
            document.querySelector('[data-filter="todas"]').classList.add('active');

            paginaAtual = 1;
            renderizarAuditoria();
        }

        function filtrarAuditoria() {
            const search = document.getElementById('search-audit').value.toLowerCase().trim();
            const acaoFiltro = document.getElementById('filter-acao').value;
            const usuarioFiltro = document.getElementById('filter-usuario').value;
            const dataFiltro = document.getElementById('filter-data').value;

            let filtradas = auditoria.filter(item => {
                let matchSearch = true;
                if (search) {
                    const u = usuarios.find(x => x.id === item.usuarioId);
                    const nome = u ? u.nome.toLowerCase() : 'sistema';
                    const detalhes = (item.detalhes || '').toLowerCase();
                    const acao = (item.acao || '').toLowerCase();
                    matchSearch = nome.includes(search) || detalhes.includes(search) || acao.includes(search);
                }

                const matchAcao = !acaoFiltro || item.acao === acaoFiltro;

                let matchUsuario = true;
                if (usuarioFiltro) {
                    if (usuarioFiltro === 'sistema') matchUsuario = !item.usuarioId;
                    else matchUsuario = item.usuarioId === usuarioFiltro;
                }

                let matchData = true;
                if (dataFiltro && item.data) {
                    matchData = item.data.split('T')[0] === dataFiltro;
                }

                return matchSearch && matchAcao && matchUsuario && matchData;
            });

            if (filtroTipoAtual !== 'todas') {
                const map = { 'criacao': 'create', 'alteracao': 'update', 'exclusao': 'delete' };
                const tipo = map[filtroTipoAtual];
                filtradas = filtradas.filter(i => classificarAcao(i.acao) === tipo);
            }

            return filtradas;
        }

        // ==========================================
        // RENDERIZAR
        // ==========================================
        function renderizarAuditoria() {
            const filtradas = filtrarAuditoria();
            const container = document.getElementById('audit-list');
            const footer = document.getElementById('audit-footer');
            const info = document.getElementById('info-resultados');

            if (filtradas.length === 0) {
                info.textContent = 'Nenhum resultado';
                container.innerHTML = `
                    <div class="audit-empty">
                        <span class="audit-empty-icon">[[icone:buscar]]</span>
                        <h3>Nenhum registro encontrado</h3>
                        <p>Tente ajustar os filtros ou período</p>
                    </div>
                `;
                footer.style.display = 'none';
                return;
            }

            info.textContent = `Mostrando ${Math.min(paginaAtual * ITEMS_POR_PAGINA, filtradas.length)} de ${filtradas.length} registro(s)`;

            const fim = paginaAtual * ITEMS_POR_PAGINA;
            const paraMostrar = filtradas.slice(0, fim);

            container.innerHTML = paraMostrar.map(i => criarItemHTML(i)).join('');

            footer.style.display = 'flex';
            document.getElementById('footer-info').textContent = `Exibindo ${paraMostrar.length} de ${filtradas.length} registro(s)`;

            const btn = document.getElementById('btn-load-more');
            if (fim >= filtradas.length) btn.style.display = 'none';
            else {
                btn.style.display = 'block';
                btn.textContent = `Carregar mais (${filtradas.length - fim} restantes)`;
            }
        }

        function criarItemHTML(item) {
            const u = usuarios.find(x => x.id === item.usuarioId);
            const tipo = classificarAcao(item.acao);
            const icone = getIconeAcao(tipo);

            let avatarHTML = '[[icone:caixa]]';
            let nome = 'Sistema';
            let email = 'Ação automática';

            if (u) {
                nome = u.nome;
                email = u.email;
                const ini = (u.nome || '?').charAt(0).toUpperCase();
                avatarHTML = u.avatar 
                    ? `<img src="${window.avatarURL(u.avatar)}" alt="${window.escapeHTML(u.nome)}">` 
                    : ini;
            }

            let osLink = '';
            const match = (item.detalhes || '').match(/#([a-f0-9]{8})/i);
            if (match) {
                osLink = `<button class="audit-os-link" onclick="window.location.href='ordens.html?id=${match[1]}'">[[icone:link]] Ver OS</button>`;
            }

            const classes = {
                'create': 'action-create',
                'update': 'action-update',
                'delete': 'action-delete',
                'login': 'action-login',
                'status': 'action-status',
                'other': 'action-other'
            };

            return `
                <div class="audit-item">
                    <div class="audit-avatar-col">
                        <div class="audit-avatar ${u ? '' : 'system'}">${avatarHTML}</div>
                    </div>
                    <div class="audit-content">
                        <div class="audit-header">
                            <span class="audit-action-badge ${classes[tipo]}">${icone} ${item.acao || 'Ação'}</span>
                            <span class="audit-date">[[icone:relogio]] ${formatDate(item.data)}</span>
                        </div>
                        <div class="audit-user-name">
                            ${nome}
                            <span class="audit-user-email">${email}</span>
                        </div>
                        ${item.detalhes ? `<div class="audit-details">${window.escapeHTML(item.detalhes)}</div>` : ''}
                        ${osLink ? `<div class="audit-meta">${osLink}</div>` : ''}
                    </div>
                </div>
            `;
        }

        function carregarMais() {
            paginaAtual++;
            renderizarAuditoria();
        }

        // ==========================================
        // EXPORTAR
        // ==========================================
        function exportarLog() {
            const f = filtrarAuditoria();
            if (f.length === 0) { showToast('Nenhum dado para exportar', 'warning'); return; }

            const headers = ['Data/Hora', 'Usuário', 'E-mail', 'Ação', 'Detalhes'];
            const rows = f.map(item => {
                const u = usuarios.find(x => x.id === item.usuarioId);
                return [
                    item.data ? new Date(item.data).toLocaleString('pt-BR') : '',
                    u ? u.nome : 'Sistema',
                    u ? u.email : '',
                    item.acao || '',
                    item.detalhes || ''
                ];
            });

            const csv = [headers.join(';'), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';'))].join('\n');
            const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `auditoria-${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            URL.revokeObjectURL(a.href);
            showToast('[[icone:confirmar]] Log exportado!', 'success');
        }

        // ==========================================
        // NOTIFICAÇÕES
        // ==========================================
        async function carregarNotificacoes() {
            try {
                const d = await apiRequest('/notificacoes');
                const b = document.getElementById('notificacoes-badge');
                if (b) {
                    const n = d.naoLidas || 0;
                    b.textContent = n;
                    b.style.display = n > 0 ? 'inline-flex' : 'none';
                }
            } catch (e) {}
        }

        // ==========================================
        // INIT
        // ==========================================
        window.onLegacyReady( () => {
            carregarInfoUsuario();
            carregarDados();

            document.getElementById('logout').addEventListener('click', e => { e.preventDefault(); logout(); });

            const mt = document.querySelector('.menu-toggle');
            const sb = document.querySelector('.sidebar');
            if (mt && sb) {
                mt.addEventListener('click', () => sb.classList.toggle('show'));
                document.addEventListener('click', e => {
                    if (window.innerWidth > 768) return;
                    if (!sb.contains(e.target) && !mt.contains(e.target)) sb.classList.remove('show');
                });
            }
        });
    
Object.assign(window,{...(typeof carregarInfoUsuario === 'function' ? {carregarInfoUsuario} : {}),...(typeof carregarDados === 'function' ? {carregarDados} : {}),...(typeof preencherSelectUsuarios === 'function' ? {preencherSelectUsuarios} : {}),...(typeof classificarAcao === 'function' ? {classificarAcao} : {}),...(typeof getIconeAcao === 'function' ? {getIconeAcao} : {}),...(typeof atualizarStats === 'function' ? {atualizarStats} : {}),...(typeof animar === 'function' ? {animar} : {}),...(typeof filtrarPorTipo === 'function' ? {filtrarPorTipo} : {}),...(typeof aplicarFiltros === 'function' ? {aplicarFiltros} : {}),...(typeof limparFiltros === 'function' ? {limparFiltros} : {}),...(typeof filtrarAuditoria === 'function' ? {filtrarAuditoria} : {}),...(typeof renderizarAuditoria === 'function' ? {renderizarAuditoria} : {}),...(typeof criarItemHTML === 'function' ? {criarItemHTML} : {}),...(typeof carregarMais === 'function' ? {carregarMais} : {}),...(typeof exportarLog === 'function' ? {exportarLog} : {}),...(typeof carregarNotificacoes === 'function' ? {carregarNotificacoes} : {})});
})();