(function(){

        // ==========================================
        // PROTEÇÃO DA PÁGINA
        // ==========================================
        if (!protegerPagina(['colaborador'])) {
            throw new Error('Acesso negado');
        }

        const usuario = getUsuario();

        // ==========================================
        // ESTADO
        // ==========================================
        let minhasOrdens = [];
        let setores = [];
        let arquivosSelecionados = [];
        let filtroStatusAtual = 'todas';
        let osSelecionada = null;

        // ==========================================
        // CARREGAR USUÁRIO
        // ==========================================
        function carregarUsuario() {
            if (!usuario) return;
            const primeiroNome = usuario.nome.split(' ')[0];

            document.getElementById('user-name').textContent = usuario.nome;
            document.getElementById('user-role').textContent = 'Colaborador';

            const avatarEl = document.getElementById('sidebar-avatar');
            if (usuario.avatar) {
                avatarEl.innerHTML = `<img src="${window.avatarURL(usuario.avatar)}" alt="Avatar">`;
            } else {
                avatarEl.textContent = primeiroNome.charAt(0).toUpperCase();
            }
        }

        // ==========================================
        // CARREGAR DADOS
        // ==========================================
        async function carregarDados() {
            try {
                const [ordens, setoresData] = await Promise.all([
                    apiRequest('/ordens'), // Backend já filtra apenas ordens do usuário
                    apiRequest('/setores')
                ]);

                minhasOrdens = ordens || [];
                setores = setoresData || [];

                preencherSelectSetores();
                renderizarOrdens();
                atualizarStats();
                carregarNotificacoes();

                // Verificar URL params
                const urlParams = new URLSearchParams(window.location.search);
                const idParam = urlParams.get('id');
                const acaoParam = urlParams.get('acao');

                if (idParam) {
                    abrirDetalhes(idParam);
                }

                if (acaoParam === 'nova') {
                    abrirModalNovaOS();
                }

                const filtroParam = urlParams.get('filtro');
                if (filtroParam === 'andamento') {
                    document.querySelector('[data-filter="Em atendimento"]').click();
                }

            } catch (error) {
                console.error('Erro ao carregar dados:', error);
                showToast('Erro ao carregar suas ordens', 'error');
            }
        }

        // ==========================================
        // PREENCHER SELECTS
        // ==========================================
        function preencherSelectSetores() {
            const selectFiltro = document.getElementById('filter-setor');
            const selectForm = document.getElementById('os-setor-responsavel');

            selectFiltro.innerHTML = '<option value="">Todos os setores</option>';
            selectForm.innerHTML = '<option value="">Selecione...</option>';

            setores.filter(s => s.ativo !== false).forEach(setor => {
                selectFiltro.innerHTML += `<option value="${setor.id}">${window.escapeHTML(setor.nome)}</option>`;
                selectForm.innerHTML += `<option value="${setor.id}">${window.escapeHTML(setor.nome)}</option>`;
            });
        }

        // ==========================================
        // ATUALIZAR STATS
        // ==========================================
        function atualizarStats() {
            const total = minhasOrdens.length;
            const abertas = minhasOrdens.filter(o => o.status === 'Aberta').length;
            const atendimento = minhasOrdens.filter(o => o.status === 'Em atendimento').length;
            const concluidas = minhasOrdens.filter(o => o.status === 'Concluída').length;
            const canceladas = minhasOrdens.filter(o => o.status === 'Cancelada').length;

            document.getElementById('count-todas').textContent = total;
            document.getElementById('count-abertas').textContent = abertas;
            document.getElementById('count-atendimento').textContent = atendimento;
            document.getElementById('count-concluidas').textContent = concluidas;
            document.getElementById('count-canceladas').textContent = canceladas;
        }

        // ==========================================
        // FILTRAR POR STATUS
        // ==========================================
        function filtrarPorStatus(status, element) {
            filtroStatusAtual = status;

            document.querySelectorAll('.stat-quick-card').forEach(card => {
                card.classList.remove('active');
            });
            element.classList.add('active');

            aplicarFiltros();
        }

        // ==========================================
        // APLICAR FILTROS
        // ==========================================
        function aplicarFiltros() {
            renderizarOrdens();
        }

        // ==========================================
        // LIMPAR FILTROS
        // ==========================================
        function limparFiltros() {
            document.getElementById('search-os').value = '';
            document.getElementById('filter-status').value = '';
            document.getElementById('filter-priority').value = '';
            document.getElementById('filter-setor').value = '';
            filtroStatusAtual = 'todas';

            document.querySelectorAll('.stat-quick-card').forEach(card => {
                card.classList.remove('active');
            });
            document.querySelector('[data-filter="todas"]').classList.add('active');

            renderizarOrdens();
        }

        // ==========================================
        // RENDERIZAR ORDENS
        // ==========================================
        function renderizarOrdens() {
            const search = document.getElementById('search-os').value.toLowerCase().trim();
            const status = document.getElementById('filter-status').value;
            const prioridade = document.getElementById('filter-priority').value;
            const setorId = document.getElementById('filter-setor').value;

            // Filtrar
            let filtradas = minhasOrdens.filter(os => {
                const matchSearch = !search || 
                    (os.titulo || '').toLowerCase().includes(search) ||
                    (os.id || '').toLowerCase().includes(search);
                const matchStatus = !status || os.status === status;
                const matchPriority = !prioridade || os.prioridade === prioridade;
                const matchSetor = !setorId || os.setorResponsavelId === setorId;

                return matchSearch && matchStatus && matchPriority && matchSetor;
            });

            // Filtro dos cards
            if (filtroStatusAtual !== 'todas') {
                filtradas = filtradas.filter(o => o.status === filtroStatusAtual);
            }

            // Ordenar: mais recentes primeiro
            filtradas.sort((a, b) => new Date(b.dataAbertura) - new Date(a.dataAbertura));

            // Info
            const infoEl = document.getElementById('info-resultados');
            if (filtradas.length === 0) {
                infoEl.textContent = 'Nenhum resultado';
            } else {
                infoEl.textContent = `Mostrando ${filtradas.length} de ${minhasOrdens.length} ordem(ns)`;
            }

            // Renderizar
            const container = document.getElementById('os-cards-grid');

            if (filtradas.length === 0) {
                container.innerHTML = `
                    <div class="empty-state" style="grid-column: 1 / -1;">
                        <span class="empty-icon">[[icone:pasta]]</span>
                        <h3>${minhasOrdens.length === 0 ? 'Você ainda não abriu nenhuma OS' : 'Nenhuma ordem encontrada'}</h3>
                        <p>${minhasOrdens.length === 0 ? 'Clique em "Nova OS" para abrir sua primeira solicitação' : 'Tente ajustar os filtros'}</p>
                        ${minhasOrdens.length === 0 ? `
                            <button class="btn btn-primary" onclick="abrirModalNovaOS()" style="margin-top:12px;">
                                [[icone:adicionar]] Criar Primeira OS
                            </button>
                        ` : ''}
                    </div>
                `;
                return;
            }

            container.innerHTML = filtradas.map(os => {
                const setor = setores.find(s => s.id === os.setorResponsavelId);
                const statusClass = (os.status || 'Aberta')
                    .toLowerCase()
                    .replace(/\s+/g, '-')
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '');
                const prioridadeClass = (os.prioridade || 'Média').toLowerCase();

                return `
                    <div class="os-card status-${statusClass}" onclick="abrirDetalhes('${os.id}')">
                        ${os.sigilo ? '<div class="sigilo-indicator" title="Solicitação Sigilosa">[[icone:cadeado]]</div>' : ''}
                        
                        <div class="os-card-header">
                            <span class="os-card-id">#${shortId(os.id)}</span>
                            <span class="os-status status-${statusClass}">${os.status || 'Aberta'}</span>
                        </div>

                        <h3 class="os-card-title">${os.titulo || 'Sem título'}</h3>
                        <p class="os-card-desc">${os.descricao || 'Sem descrição'}</p>

                        <div class="os-card-meta">
                            <span class="priority-${prioridadeClass}">
                                ${os.prioridade === 'Urgente' ? '[[icone:status]]' : 
                                  os.prioridade === 'Alta' ? '[[icone:status]]' : 
                                  os.prioridade === 'Média' ? '[[icone:status]]' : '[[icone:status]]'}
                                ${os.prioridade || 'Média'}
                            </span>
                            <span>[[icone:calendario]] ${timeAgo(os.dataAbertura)}</span>
                            ${os.prazo ? `<span>[[icone:relogio]] ${formatDateShort(os.prazo)}</span>` : ''}
                        </div>

                        <div class="os-card-footer">
                            <span class="os-card-setor">
                                [[icone:setores]] ${setor ? setor.nome : 'Sem setor'}
                            </span>
                            <span style="color:var(--primary); font-size:0.8125rem; font-weight:600;">
                                Ver detalhes →
                            </span>
                        </div>
                    </div>
                `;
            }).join('');
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
        // MODAL - NOVA OS
        // ==========================================
        function abrirModalNovaOS() {
            const url=new URL(location.href);if(url.searchParams.has('acao')){url.searchParams.delete('acao');history.replaceState(null,'',url.pathname+url.search);}
            document.getElementById('os-form').reset();
            document.getElementById('file-list').innerHTML = '';
            arquivosSelecionados = [];
            document.getElementById('desc-char').textContent = '0';

            document.getElementById('os-modal').style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }

        function fecharModalNovaOS() {
            document.getElementById('os-modal').style.display = 'none';
            document.body.style.overflow = '';
        }

        // Contador
        document.getElementById('os-descricao').addEventListener('input', (e) => {
            document.getElementById('desc-char').textContent = e.target.value.length;
        });

        // ==========================================
        // UPLOAD
        // ==========================================
        document.getElementById('os-anexos').addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            
            files.forEach(file => {
                if (file.size > 5 * 1024 * 1024) {
                    showToast(`${file.name} é maior que 5MB`, 'warning');
                    return;
                }
                const tiposPermitidos = ['image/jpeg', 'image/png', 'application/pdf'];
                if (!tiposPermitidos.includes(file.type)) {
                    showToast(`${file.name}: tipo não permitido`, 'warning');
                    return;
                }
                arquivosSelecionados.push(file);
            });

            renderizarArquivos();
            e.target.value = '';
        });

        function renderizarArquivos() {
            const container = document.getElementById('file-list');
            if (arquivosSelecionados.length === 0) {
                container.innerHTML = '';
                return;
            }

            container.innerHTML = arquivosSelecionados.map((file, index) => `
                <div class="file-item">
                    [[icone:anexo]] ${file.name.length > 20 ? file.name.substring(0, 20) + '...' : file.name}
                    <span class="remove" onclick="removerArquivo(${index})">✕</span>
                </div>
            `).join('');
        }

        function removerArquivo(index) {
            arquivosSelecionados.splice(index, 1);
            renderizarArquivos();
        }

        // ==========================================
        // CRIAR OS
        // ==========================================
        document.getElementById('os-form').addEventListener('submit', async (e) => {
            e.preventDefault();

            const titulo = document.getElementById('os-titulo').value.trim();
            const descricao = document.getElementById('os-descricao').value.trim();
            const setorResponsavelId = document.getElementById('os-setor-responsavel').value;
            const categoria = document.getElementById('os-categoria').value;
            const subcategoria = document.getElementById('os-subcategoria').value.trim();
            const prioridade = document.getElementById('os-prioridade').value;
            const sigilo = document.getElementById('os-sigilo').checked;

            if (!titulo || titulo.length < 5) {
                showToast('Título deve ter no mínimo 5 caracteres', 'error');
                return;
            }
            if (!descricao || descricao.length < 10) {
                showToast('Descrição deve ter no mínimo 10 caracteres', 'error');
                return;
            }
            if (!setorResponsavelId) {
                showToast('Selecione um setor responsável', 'error');
                return;
            }

            const formData = new FormData();
            formData.append('titulo', titulo);
            formData.append('descricao', descricao);
            formData.append('setorResponsavelId', setorResponsavelId);
            formData.append('categoria', categoria);
            formData.append('subcategoria', subcategoria);
            formData.append('prioridade', prioridade);
            formData.append('sigilo', sigilo ? 'true' : 'false');

            arquivosSelecionados.forEach(file => {
                formData.append('anexos', file);
            });

            const btnSalvar = document.getElementById('btn-salvar-os');
            btnSalvar.disabled = true;
            btnSalvar.innerHTML = '[[icone:relogio]] Criando...';

            try {
                const token = localStorage.getItem('token');
                const response = await window.legacyFetch(`${API_BASE}/ordens`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formData
                });

                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Erro ao criar OS');

                showToast('[[icone:confirmar]] Ordem de serviço criada com sucesso!', 'success');
                fecharModalNovaOS();

                // Recarregar
                const ordens = await apiRequest('/ordens');
                minhasOrdens = ordens || [];
                renderizarOrdens();
                atualizarStats();

            } catch (error) {
                console.error('Erro ao criar OS:', error);
                showToast(error.message, 'error');
            } finally {
                btnSalvar.disabled = false;
                btnSalvar.textContent = 'Criar Ordem de Serviço';
            }
        });

        // ==========================================
        // MODAL - DETALHES
        // ==========================================
        async function abrirDetalhes(id) {
            osSelecionada = await apiRequest('/ordens/'+id);
            if (!osSelecionada) return;

            document.getElementById('detail-modal-title').textContent = `OS #${shortId(id)}`;
            document.getElementById('detail-modal').style.display = 'flex';
            document.body.style.overflow = 'hidden';

            renderizarDetalhes();
        }

        function renderizarDetalhes() {
            const os = osSelecionada;
            if (!os) return;

            const setor = setores.find(s => s.id === os.setorResponsavelId);
            const statusClass = (os.status || 'Aberta')
                .toLowerCase()
                .replace(/\s+/g, '-')
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '');
            const prioridadeClass = (os.prioridade || 'Média').toLowerCase();

            // Prazo
            let prazoInfo = 'Não definido';
            let prazoClass = 'empty';
            if (os.prazo) {
                const dataPrazo = new Date(os.prazo);
                const hoje = new Date();
                const diffDias = Math.ceil((dataPrazo - hoje) / (1000 * 60 * 60 * 24));
                prazoInfo = dataPrazo.toLocaleDateString('pt-BR');

                if (os.status === 'Concluída') {
                    prazoInfo += ' [[icone:confirmar]]';
                } else if (diffDias < 0) {
                    prazoInfo += ` (${Math.abs(diffDias)} dia(s) de atraso)`;
                } else if (diffDias === 0) {
                    prazoInfo += ' (vence hoje)';
                } else {
                    prazoInfo += ` (${diffDias} dia${diffDias !== 1 ? 's' : ''} restantes)`;
                }
                prazoClass = '';
            }

            // Anexos
            let anexosHTML = '<span class="os-detail-value empty">Nenhum anexo</span>';
            if (os.anexos && os.anexos.length > 0) {
                anexosHTML = os.anexos.map(a => `
                    <div style="margin-top:4px;">
                        <a href="#anexo" data-ordem="${os.id}" data-anexo="${a.id}" data-nome="${window.escapeHTML(a.nome)}" style="color:var(--primary); font-size:0.875rem;">
                            [[icone:anexo]] ${window.escapeHTML(a.nome)}
                        </a>
                    </div>
                `).join('');
            }

            // Pode cancelar?
            const podeCancelar = os.status === 'Aberta';

            // Botão de cancelamento
            const cancelarHTML = podeCancelar ? `
                <div style="padding-top:16px; border-top:1px solid var(--gray-200);">
                    <div class="cancel-warning">
                        <span>[[icone:alerta]]</span>
                        <div>
                            <strong>Cancelar solicitação</strong>
                            <div style="margin-top:4px; font-size:0.75rem; opacity:0.9;">
                                Você pode cancelar esta OS enquanto ela não foi concluída. Esta ação não pode ser desfeita.
                            </div>
                        </div>
                    </div>
                    <button 
                        class="btn btn-danger" 
                        onclick="cancelarOS('${os.id}')"
                        style="margin-top:12px; width:100%;"
                    >
                        [[icone:fechar]] Cancelar esta OS
                    </button>
                </div>
            ` : '';

            document.getElementById('detail-content').innerHTML = `
                <div class="os-detail">

                    <div class="os-detail-header">
                        <div class="os-detail-id">#${shortId(os.id)}</div>
                        <h3 class="os-detail-title">${os.titulo || 'Sem título'}</h3>
                        <div class="os-detail-meta-info">
                            <span class="os-status status-${statusClass}">${os.status || 'Aberta'}</span>
                            <span class="priority-badge priority-${prioridadeClass}">
                                ${os.prioridade === 'Urgente' ? '[[icone:status]]' : 
                                  os.prioridade === 'Alta' ? '[[icone:status]]' : 
                                  os.prioridade === 'Média' ? '[[icone:status]]' : '[[icone:status]]'}
                                ${os.prioridade || 'Média'}
                            </span>
                            ${os.sigilo ? '<span class="badge badge-warning">[[icone:cadeado]] Sigilosa</span>' : ''}
                        </div>
                    </div>

                    <div class="os-detail-grid">
                        <div class="os-detail-block">
                            <span class="os-detail-label">[[icone:setores]] Setor Responsável</span>
                            <div class="os-detail-value ${setor ? '' : 'empty'}">
                                ${setor ? setor.nome : 'Não definido'}
                            </div>
                        </div>

                        <div class="os-detail-block">
                            <span class="os-detail-label">[[icone:pasta]] Categoria</span>
                            <div class="os-detail-value ${os.categoria ? '' : 'empty'}">
                                ${os.categoria || 'Sem categoria'}
                                ${os.subcategoria ? `<br><small style="color:var(--text-muted);">${os.subcategoria}</small>` : ''}
                            </div>
                        </div>

                        <div class="os-detail-block">
                            <span class="os-detail-label">[[icone:calendario]] Data de Abertura</span>
                            <div class="os-detail-value">${formatDate(os.dataAbertura)}</div>
                        </div>

                        <div class="os-detail-block">
                            <span class="os-detail-label">[[icone:relogio]] Prazo</span>
                            <div class="os-detail-value ${prazoClass}">${prazoInfo}</div>
                        </div>

                        <div class="os-detail-block" style="grid-column: 1 / -1;">
                            <span class="os-detail-label">[[icone:anexo]] Anexos</span>
                            <div>${anexosHTML}</div>
                        </div>
                    </div>

                    <div>
                        <h4 style="font-size:0.9375rem; margin-bottom:12px; display:flex; align-items:center; gap:8px;">
                            [[icone:editar]] Descrição
                        </h4>
                        <div class="os-detail-descricao">${os.descricao || 'Sem descrição'}</div>
                    </div>

                    <div><h4 style="font-size:0.9375rem; margin-bottom:12px;">[[icone:documento]] Histórico</h4><div class="timeline">${(os.historico||[]).map(h=>'<div class="timeline-item"><div class="timeline-content"><div class="timeline-title">'+window.escapeHTML(h.acao)+'</div><div class="timeline-desc">'+window.escapeHTML(h.descricao)+'</div><div class="timeline-date">'+formatDate(h.data)+'</div></div></div>').join('')}</div></div>
                    <div class="form-group"><label for="comentario-colaborador">[[icone:chat]] Adicionar Observação</label><textarea id="comentario-colaborador" rows="3"></textarea><button class="btn btn-secondary btn-sm" onclick="comentarOrdem('${os.id}')">[[icone:chat]] Adicionar</button></div>
                    ${cancelarHTML}

                    <div style="display:flex; justify-content:flex-end; padding-top:8px;">
                        <button class="btn btn-secondary" onclick="fecharModalDetalhes()">Fechar</button>
                    </div>

                </div>
            `;
        }

        async function comentarOrdem(id) {
            const input=document.getElementById('comentario-colaborador');
            try{await apiRequest('/ordens/'+id+'/comentarios',{method:'POST',body:JSON.stringify({descricao:input.value})});await abrirDetalhes(id);}catch(e){showToast(e.message,'error');}
        }
        function fecharModalDetalhes() {
            document.getElementById('detail-modal').style.display = 'none';
            document.body.style.overflow = '';
        }

        // ==========================================
        // CANCELAR OS
        // ==========================================
        async function cancelarOS(id) {
            if (!confirm('Tem certeza que deseja CANCELAR esta ordem de serviço?\n\nEsta ação não pode ser desfeita.')) {
                return;
            }

            try {
                await apiRequest(`/ordens/${id}`, {
                    method: 'PUT',
                    body: JSON.stringify({ status: 'Cancelada' })
                });

                showToast('[[icone:confirmar]] OS cancelada com sucesso', 'success');

                // Atualizar local
                const os = minhasOrdens.find(o => o.id === id);
                if (os) os.status = 'Cancelada';

                renderizarOrdens();
                atualizarStats();
                fecharModalDetalhes();

            } catch (error) {
                console.error('Erro ao cancelar OS:', error);
                showToast(error.message, 'error');
            }
        }

        // ==========================================
        // FECHAR MODAIS
        // ==========================================
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (document.getElementById('os-modal').style.display === 'flex') {
                    fecharModalNovaOS();
                }
                if (document.getElementById('detail-modal').style.display === 'flex') {
                    fecharModalDetalhes();
                }
            }
        });

        window.addEventListener('click', (e) => {
            const modalOS = document.getElementById('os-modal');
            const modalDetail = document.getElementById('detail-modal');
            if (e.target === modalOS) fecharModalNovaOS();
            if (e.target === modalDetail) fecharModalDetalhes();
        });

        // ==========================================
        // INICIALIZAÇÃO
        // ==========================================
        window.onLegacyReady( () => {
            carregarUsuario();
            carregarDados();

            // Logout
            document.getElementById('logout').addEventListener('click', (e) => {
                e.preventDefault();
                logout();
            });

            // Nova OS (menu)
            document.getElementById('btn-nova-os-menu').addEventListener('click', (e) => {
                e.preventDefault();
                abrirModalNovaOS();
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
    
Object.assign(window,{...(typeof carregarUsuario === 'function' ? {carregarUsuario} : {}),...(typeof carregarDados === 'function' ? {carregarDados} : {}),...(typeof preencherSelectSetores === 'function' ? {preencherSelectSetores} : {}),...(typeof atualizarStats === 'function' ? {atualizarStats} : {}),...(typeof filtrarPorStatus === 'function' ? {filtrarPorStatus} : {}),...(typeof aplicarFiltros === 'function' ? {aplicarFiltros} : {}),...(typeof limparFiltros === 'function' ? {limparFiltros} : {}),...(typeof renderizarOrdens === 'function' ? {renderizarOrdens} : {}),...(typeof carregarNotificacoes === 'function' ? {carregarNotificacoes} : {}),...(typeof abrirModalNovaOS === 'function' ? {abrirModalNovaOS} : {}),...(typeof fecharModalNovaOS === 'function' ? {fecharModalNovaOS} : {}),...(typeof renderizarArquivos === 'function' ? {renderizarArquivos} : {}),...(typeof removerArquivo === 'function' ? {removerArquivo} : {}),...(typeof abrirDetalhes === 'function' ? {abrirDetalhes} : {}),...(typeof renderizarDetalhes === 'function' ? {renderizarDetalhes} : {}),...(typeof comentarOrdem === 'function' ? {comentarOrdem} : {}),...(typeof fecharModalDetalhes === 'function' ? {fecharModalDetalhes} : {}),...(typeof cancelarOS === 'function' ? {cancelarOS} : {})});
})();