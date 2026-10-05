(function(){

        // ==========================================
        // PROTEÇÃO E ROLE
        // ==========================================
        var usuario = getUsuario();
        var isGestor = usuario.role === 'gestor';
        var isColaborador = usuario.role === 'colaborador';

        if (!protegerPagina(['administrador_principal', 'administrador_setor', 'gestor'])) {
            throw new Error('Acesso negado');
        }

        document.getElementById('breadcrumb-tipo').textContent = isGestor ? 'Gestor' : 'Admin';

        // Ajustar menu conforme role
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
        var todasOrdens = [];
        var setores = [];
        var arquivosSelecionados = [];
        var filtroStatusAtual = 'todas';
        var osSelecionada = null;

        // ==========================================
        // USUÁRIO
        // ==========================================
        function carregarUsuario() {
            if (!usuario) return;
            var primeiroNome = usuario.nome.split(' ')[0];
            document.getElementById('user-name').textContent = usuario.nome;
            document.getElementById('user-role').textContent = isGestor ? 'Gestor' : 'Administrador';

            var avatarEl = document.getElementById('sidebar-avatar');
            if (usuario.avatar) {
                avatarEl.innerHTML = '<img src="' + window.avatarURL(usuario.avatar) + '">';
            } else {
                avatarEl.textContent = primeiroNome.charAt(0).toUpperCase();
            }
        }

        // ==========================================
        // CARREGAR DADOS (com auto-refresh funcional)
        // ==========================================
        async function carregarDados() {
            try {
                console.log('[[icone:atualizar]] Carregando ordens...');
                var token = localStorage.getItem('token');
                var headers = { 'Authorization': 'Bearer ' + token };

                var results = await Promise.allSettled([
                    window.legacyFetch('/api/ordens', { headers: headers }).then(function(r) { return r.json(); }),
                    window.legacyFetch('/api/setores', { headers: headers }).then(function(r) { return r.json(); })
                ]);

                todasOrdens = (results[0].status === 'fulfilled' ? results[0].value : []) || [];
                setores = (results[1].status === 'fulfilled' ? results[1].value : []) || [];

                console.log('[[icone:ordens]] Ordens:', todasOrdens.length, '| Setores:', setores.length);

                preencherSelectSetores();
                preencherSelectCategorias();
                renderizarOrdens();
                atualizarStats();
                carregarNotificacoes();

                // Verificar URL params
                var urlParams = new URLSearchParams(window.location.search);
                var idParam = urlParams.get('id');
                if (idParam) abrirDetalhes(idParam);

                var acaoParam = urlParams.get('acao');
                if (acaoParam === 'nova') abrirModalNovaOS();

                var filtroParam = urlParams.get('filtro');
                if (filtroParam) {
                    if (filtroParam === 'urgentes') document.querySelector('[data-filter="urgentes"]').click();
                    else if (filtroParam === 'atrasadas') document.querySelector('[data-filter="atrasadas"]').click();
                    else if (filtroParam === 'andamento') document.querySelector('[data-filter="Em atendimento"]').click();
                }

            } catch (error) {
                console.error('[[icone:fechar]] Erro:', error);
                showToast('Erro ao carregar ordens', 'error');
            }
        }

        // ==========================================
        // PREENCHER SELECTS
        // ==========================================
        function preencherSelectSetores() {
            var sf = document.getElementById('filter-setor');
            var sfo = document.getElementById('os-setor-responsavel');
            sf.innerHTML = '<option value="">Todos os setores</option>';
            sfo.innerHTML = '<option value="">Selecione...</option>';

            setores.filter(function(s) { return s.ativo !== false; }).forEach(function(s) {
                sf.innerHTML += '<option value="' + s.id + '">' + window.escapeHTML(s.nome) + '</option>';
                sfo.innerHTML += '<option value="' + s.id + '">' + window.escapeHTML(s.nome) + '</option>';
            });
        }

        function preencherSelectCategorias() {
            var select = document.getElementById('filter-categoria');
            var categorias = [];
            todasOrdens.forEach(function(o) {
                if (o.categoria && categorias.indexOf(o.categoria) === -1) categorias.push(o.categoria);
            });
            select.innerHTML = '<option value="">Todas as categorias</option>';
            categorias.forEach(function(cat) {
                select.innerHTML += '<option value="' + cat + '">' + cat + '</option>';
            });
        }

        // ==========================================
        // STATS
        // ==========================================
        function atualizarStats() {
            var total = todasOrdens.length;
            var abertas = todasOrdens.filter(function(o) { return o.status === 'Aberta'; }).length;
            var atendimento = todasOrdens.filter(function(o) { return o.status === 'Em atendimento'; }).length;
            var concluidas = todasOrdens.filter(function(o) { return o.status === 'Concluída'; }).length;
            var urgentes = todasOrdens.filter(function(o) { return o.prioridade === 'Urgente' && o.status !== 'Concluída'; }).length;
            var atrasadas = todasOrdens.filter(function(o) {
                return o.prazo && new Date(o.prazo) < new Date() && o.status !== 'Concluída' && o.status !== 'Cancelada';
            }).length;

            document.getElementById('count-todas').textContent = total;
            document.getElementById('count-abertas').textContent = abertas;
            document.getElementById('count-atendimento').textContent = atendimento;
            document.getElementById('count-concluidas').textContent = concluidas;
            document.getElementById('count-urgentes').textContent = urgentes;
            document.getElementById('count-atrasadas').textContent = atrasadas;
        }

        // ==========================================
        // FILTROS
        // ==========================================
        function filtrarPorStatus(status, element) {
            filtroStatusAtual = status;
            document.querySelectorAll('.stat-quick-card').forEach(function(c) { c.classList.remove('active'); });
            element.classList.add('active');
            aplicarFiltros();
        }

        function aplicarFiltros() { renderizarOrdens(); }

        function limparFiltros() {
            document.getElementById('search-os').value = '';
            document.getElementById('filter-status').value = '';
            document.getElementById('filter-priority').value = '';
            document.getElementById('filter-setor').value = '';
            document.getElementById('filter-categoria').value = '';
            filtroStatusAtual = 'todas';
            document.querySelectorAll('.stat-quick-card').forEach(function(c) { c.classList.remove('active'); });
            document.querySelector('[data-filter="todas"]').classList.add('active');
            renderizarOrdens();
        }

        // ==========================================
        // RENDERIZAR
        // ==========================================
        function renderizarOrdens() {
            var search = document.getElementById('search-os').value.toLowerCase().trim();
            var status = document.getElementById('filter-status').value;
            var prioridade = document.getElementById('filter-priority').value;
            var setorId = document.getElementById('filter-setor').value;
            var categoria = document.getElementById('filter-categoria').value;

            var filtradas = todasOrdens.filter(function(os) {
                var matchSearch = !search || (os.titulo || '').toLowerCase().includes(search) || (os.id || '').toLowerCase().includes(search);
                var matchStatus = !status || os.status === status;
                var matchPriority = !prioridade || os.prioridade === prioridade;
                var matchSetor = !setorId || os.setorResponsavelId === setorId;
                var matchCategoria = !categoria || os.categoria === categoria;
                return matchSearch && matchStatus && matchPriority && matchSetor && matchCategoria;
            });

            if (filtroStatusAtual !== 'todas') {
                if (filtroStatusAtual === 'urgentes') {
                    filtradas = filtradas.filter(function(o) { return o.prioridade === 'Urgente' && o.status !== 'Concluída'; });
                } else if (filtroStatusAtual === 'atrasadas') {
                    filtradas = filtradas.filter(function(o) {
                        return o.prazo && new Date(o.prazo) < new Date() && o.status !== 'Concluída' && o.status !== 'Cancelada';
                    });
                } else {
                    filtradas = filtradas.filter(function(o) { return o.status === filtroStatusAtual; });
                }
            }

            var peso = { 'Urgente': 4, 'Alta': 3, 'Média': 2, 'Baixa': 1 };
            filtradas.sort(function(a, b) {
                var pa = peso[a.prioridade] || 0;
                var pb = peso[b.prioridade] || 0;
                if (pa !== pb) return pb - pa;
                return new Date(b.dataAbertura) - new Date(a.dataAbertura);
            });

            var infoEl = document.getElementById('info-resultados');
            if (filtradas.length === 0) infoEl.textContent = 'Nenhum resultado';
            else infoEl.textContent = 'Mostrando ' + filtradas.length + ' de ' + todasOrdens.length + ' ordem(ns)';

            var tbody = document.getElementById('os-table-body');

            if (filtradas.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state"><span class="empty-icon">[[icone:pasta]]</span><h3>Nenhuma ordem encontrada</h3><p>Tente ajustar os filtros</p><button class="btn btn-primary" onclick="abrirModalNovaOS()" style="margin-top:12px;">[[icone:adicionar]] Criar OS</button></div></td></tr>';
                return;
            }

            tbody.innerHTML = filtradas.map(function(os) {
                var setor = setores.find(function(s) { return s.id === os.setorResponsavelId; });
                var statusClass = (os.status || 'Aberta').toLowerCase().replace(/\s+/g, '-').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                var prioridadeClass = (os.prioridade || 'Média').toLowerCase();

                var prazoHTML = '<span class="prazo-ok">—</span>';
                if (os.prazo) {
                    var dataPrazo = new Date(os.prazo);
                    var hoje = new Date();
                    var diffDias = Math.ceil((dataPrazo - hoje) / (1000 * 60 * 60 * 24));
                    var dataFormatada = dataPrazo.toLocaleDateString('pt-BR');

                    if (os.status === 'Concluída') prazoHTML = '<span class="prazo-concluido">[[icone:confirmar]] ' + dataFormatada + '</span>';
                    else if (diffDias < 0) prazoHTML = '<span class="prazo-danger">[[icone:alerta]] ' + Math.abs(diffDias) + 'd atraso</span>';
                    else if (diffDias === 0) prazoHTML = '<span class="prazo-danger">[[icone:prioridade]] Hoje</span>';
                    else if (diffDias <= 3) prazoHTML = '<span class="prazo-warning">[[icone:relogio]] ' + diffDias + 'd restantes</span>';
                    else prazoHTML = '<span class="prazo-ok">[[icone:calendario]] ' + dataFormatada + '</span>';
                }

                var prioridadeIcone = os.prioridade === 'Urgente' ? '[[icone:status]]' : os.prioridade === 'Alta' ? '[[icone:status]]' : os.prioridade === 'Média' ? '[[icone:status]]' : '[[icone:status]]';

                return '<tr onclick="abrirDetalhes(\'' + os.id + '\')">' +
                    '<td><span class="os-id-badge">#' + shortId(os.id) + '</span></td>' +
                    '<td class="os-titulo-cell">' +
                        '<span class="os-titulo-text">' + (os.titulo || 'Sem título') + '</span>' +
                        '<span class="os-categoria-text">' + (os.categoria || 'Sem categoria') + '</span>' +
                    '</td>' +
                    '<td>' + (setor ? setor.nome : '—') + '</td>' +
                    '<td><span class="priority-badge priority-' + prioridadeClass + '">' + prioridadeIcone + ' ' + (os.prioridade || 'Média') + '</span></td>' +
                    '<td><span class="os-status status-' + statusClass + '">' + (os.status || 'Aberta') + '</span></td>' +
                    '<td class="prazo-cell">' + prazoHTML + '</td>' +
                    '<td onclick="event.stopPropagation()"><div class="table-actions"><button class="action-btn" onclick="abrirDetalhes(\'' + os.id + '\')" title="Ver detalhes">[[icone:visualizar]]</button></div></td>' +
                '</tr>';
            }).join('');
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
        // MODAL NOVA OS
        // ==========================================
        function abrirModalNovaOS() {
            const url=new URL(location.href);if(url.searchParams.has('acao')){url.searchParams.delete('acao');history.replaceState(null,'',url.pathname+url.search);}
            document.getElementById('modal-os-title').textContent = '[[icone:adicionar]] Nova Ordem de Serviço';
            document.getElementById('os-form').reset();
            document.getElementById('os-id').value = '';
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

        document.getElementById('os-descricao').addEventListener('input', function(e) {
            document.getElementById('desc-char').textContent = e.target.value.length;
        });

        // ==========================================
        // UPLOAD
        // ==========================================
        document.getElementById('os-anexos').addEventListener('change', function(e) {
            var files = Array.from(e.target.files);
            files.forEach(function(file) {
                if (file.size > 5 * 1024 * 1024) { showToast(file.name + ' é maior que 5MB', 'warning'); return; }
                if (['image/jpeg', 'image/png', 'application/pdf'].indexOf(file.type) === -1) { showToast(file.name + ': tipo não permitido', 'warning'); return; }
                arquivosSelecionados.push(file);
            });
            renderizarArquivos();
            e.target.value = '';
        });

        function renderizarArquivos() {
            var container = document.getElementById('file-list');
            if (arquivosSelecionados.length === 0) { container.innerHTML = ''; return; }
            container.innerHTML = arquivosSelecionados.map(function(file, i) {
                var nome = file.name.length > 20 ? file.name.substring(0, 20) + '...' : file.name;
                return '<div class="file-item">[[icone:anexo]] ' + nome + ' <span class="remove" onclick="removerArquivo(' + i + ')">✕</span></div>';
            }).join('');
        }

        function removerArquivo(i) {
            arquivosSelecionados.splice(i, 1);
            renderizarArquivos();
        }

        // ==========================================
        // CRIAR OS
        // ==========================================
        document.getElementById('os-form').addEventListener('submit', async function(e) {
            e.preventDefault();

            var titulo = document.getElementById('os-titulo').value.trim();
            var descricao = document.getElementById('os-descricao').value.trim();
            var setorResponsavelId = document.getElementById('os-setor-responsavel').value;
            var categoria = document.getElementById('os-categoria').value;
            var subcategoria = document.getElementById('os-subcategoria').value.trim();
            var prioridade = document.getElementById('os-prioridade').value;
            var prazo = document.getElementById('os-prazo').value;
            var sigilo = document.getElementById('os-sigilo').checked;

            if (!titulo || titulo.length < 5) { showToast('Título deve ter no mínimo 5 caracteres', 'error'); return; }
            if (!descricao || descricao.length < 10) { showToast('Descrição deve ter no mínimo 10 caracteres', 'error'); return; }
            if (!setorResponsavelId) { showToast('Selecione um setor responsável', 'error'); return; }

            var formData = new FormData();
            formData.append('titulo', titulo);
            formData.append('descricao', descricao);
            formData.append('setorResponsavelId', setorResponsavelId);
            formData.append('categoria', categoria);
            formData.append('subcategoria', subcategoria);
            formData.append('prioridade', prioridade);
            formData.append('prazo', prazo);
            formData.append('sigilo', sigilo ? 'true' : 'false');

            arquivosSelecionados.forEach(function(file) { formData.append('anexos', file); });

            var btnSalvar = document.getElementById('btn-salvar-os');
            btnSalvar.disabled = true;
            btnSalvar.innerHTML = '[[icone:relogio]] Criando...';

            try {
                var token = localStorage.getItem('token');
                var response = await window.legacyFetch(API_BASE + '/ordens', {
                    method: 'POST',
                    headers: { 'Authorization': 'Bearer ' + token },
                    body: formData
                });
                var data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Erro ao criar OS');

                showToast('[[icone:confirmar]] OS criada com sucesso!', 'success');
                fecharModalNovaOS();
                carregarDados();
            } catch (error) {
                showToast(error.message, 'error');
            } finally {
                btnSalvar.disabled = false;
                btnSalvar.textContent = 'Criar Ordem de Serviço';
            }
        });

        // ==========================================
        // DETALHES
        // ==========================================
        async function abrirDetalhes(id) {
            try {osSelecionada=await apiRequest('/ordens/'+id);document.getElementById('detail-modal-title').textContent=osSelecionada.protocolo;document.getElementById('detail-modal').style.display='flex';document.body.style.overflow='hidden';renderizarDetalhes(osSelecionada.historico);document.querySelectorAll('.status-action-btn').forEach(b=>{b.disabled=!osSelecionada.podeGerenciar;});}
            catch(e){showToast(e.message,'error');}
        }

        function renderizarDetalhes(historico) {
            var os = osSelecionada;
            if (!os) return;

            var setor = setores.find(function(s) { return s.id === os.setorResponsavelId; });
            var statusClass = (os.status || 'Aberta').toLowerCase().replace(/\s+/g, '-').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            var prioridadeClass = (os.prioridade || 'Média').toLowerCase();

            var prazoInfo = 'Não definido';
            var prazoClass = 'empty';
            if (os.prazo) {
                var dataPrazo = new Date(os.prazo);
                var hoje = new Date();
                var diffDias = Math.ceil((dataPrazo - hoje) / (1000 * 60 * 60 * 24));
                prazoInfo = dataPrazo.toLocaleDateString('pt-BR');
                if (os.status === 'Concluída') prazoInfo += ' [[icone:confirmar]]';
                else if (diffDias < 0) prazoInfo += ' (' + Math.abs(diffDias) + ' dias de atraso)';
                else if (diffDias === 0) prazoInfo += ' (vence hoje)';
                else prazoInfo += ' (' + diffDias + ' dias restantes)';
                prazoClass = '';
            }

            var anexosHTML = '<span class="os-detail-value empty">Nenhum anexo</span>';
            if (os.anexos && os.anexos.length > 0) {
                anexosHTML = os.anexos.map(function(a) {
                    return '<div style="margin-top:4px;"><a href="#anexo" data-anexo="'+a.id+'" data-ordem="'+os.id+'" data-nome="'+window.escapeHTML(a.nome)+'" style="color:var(--primary);font-size:0.875rem;">[[icone:anexo]] '+window.escapeHTML(a.nome)+'</a></div>';
                }).join('');
            }

            var statusOptions = [
                { value: 'Aberta', label: '[[icone:email]] Aberta' },
                { value: 'Encaminhada', label: '[[icone:enviar]] Encaminhada' },
                { value: 'Em atendimento', label: '[[icone:prioridade]] Atendimento' },
                { value: 'Aguardando informação', label: '[[icone:bloquear]] Aguardando' },
                { value: 'Concluída', label: '[[icone:confirmar]] Concluída' },
                { value: 'Cancelada', label: '[[icone:fechar]] Cancelada' }
            ];

            var timelineHTML = '<div class="empty-state" style="padding:20px;"><p style="font-size:0.8125rem;">Nenhum histórico</p></div>';
            if (historico && historico.length > 0) {
                timelineHTML = '<div class="timeline">' + historico.map(function(h) {
                    return '<div class="timeline-item"><div class="timeline-dot"></div><div class="timeline-content"><div class="timeline-title">' + (h.acao || 'Ação') + '</div><div class="timeline-desc">' + (h.descricao || '') + '</div><div class="timeline-date">' + formatDate(h.data) + '</div></div></div>';
                }).join('') + '</div>';
            }

            var prioridadeIcone = os.prioridade === 'Urgente' ? '[[icone:status]]' : os.prioridade === 'Alta' ? '[[icone:status]]' : os.prioridade === 'Média' ? '[[icone:status]]' : '[[icone:status]]';

            document.getElementById('detail-content').innerHTML = 
                '<div class="os-detail">' +
                    '<div class="os-detail-header">' +
                        '<div class="os-detail-title-section">' +
                            '<div class="os-detail-id">#' + shortId(os.id) + '</div>' +
                            '<h3 class="os-detail-title">' + (os.titulo || 'Sem título') + '</h3>' +
                            '<div class="os-detail-meta-info">' +
                                '<span class="os-status status-' + statusClass + '">' + (os.status || 'Aberta') + '</span>' +
                                '<span class="priority-badge priority-' + prioridadeClass + '">' + prioridadeIcone + ' ' + (os.prioridade || 'Média') + '</span>' +
                                (os.sigilo ? '<span class="badge badge-warning">[[icone:cadeado]] Sigilosa</span>' : '') +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                    '<div class="os-detail-grid">' +
                        '<div class="os-detail-block"><span class="os-detail-label">[[icone:setores]] Setor Responsável</span><div class="os-detail-value ' + (setor ? '' : 'empty') + '">' + (setor ? setor.nome : 'Não definido') + '</div></div>' +
                        '<div class="os-detail-block"><span class="os-detail-label">[[icone:pasta]] Categoria</span><div class="os-detail-value ' + (os.categoria ? '' : 'empty') + '">' + (os.categoria || 'Sem categoria') + (os.subcategoria ? '<br><small style="color:var(--text-muted);">' + os.subcategoria + '</small>' : '') + '</div></div>' +
                        '<div class="os-detail-block"><span class="os-detail-label">[[icone:calendario]] Data de Abertura</span><div class="os-detail-value">' + formatDate(os.dataAbertura) + '</div></div>' +
                        '<div class="os-detail-block"><span class="os-detail-label">[[icone:relogio]] Prazo</span><div class="os-detail-value ' + prazoClass + '">' + prazoInfo + '</div></div>' +
                        (os.sigilo ? '<div class="os-detail-block"><span class="os-detail-label">[[icone:usuario]] Solicitante</span><div class="os-detail-value">[[icone:cadeado]] Sigiloso</div></div>' : '') +
                        '<div class="os-detail-block" style="grid-column: ' + (os.sigilo ? '2' : '1 / -1') + ';"><span class="os-detail-label">[[icone:anexo]] Anexos</span><div>' + anexosHTML + '</div></div>' +
                    '</div>' +
                    '<div><h4 style="font-size:0.9375rem; margin-bottom:12px;">[[icone:editar]] Descrição</h4><div class="os-detail-descricao">' + (os.descricao || 'Sem descrição') + '</div></div>' +
                    '<div class="os-detail-actions">' +
                        '<h4>[[icone:prioridade]] Atualizar Status</h4>' +
                        '<div class="status-actions">' + statusOptions.map(function(opt) {
                            return '<button class="status-action-btn ' + (os.status === opt.value ? 'active' : '') + '" onclick="atualizarStatus(\'' + os.id + '\', \'' + opt.value + '\', this)">' + opt.label + '</button>';
                        }).join('') + '</div>' +
                        '<div style="margin-top:16px;">' +
                            '<label style="font-size:0.8125rem; font-weight:600; color:var(--text-secondary); margin-bottom:6px; display:block;">[[icone:chat]] Adicionar Observação</label>' +
                            '<textarea id="observacao-input" placeholder="Adicione uma observação..." style="width:100%; padding:10px 14px; border:1px solid var(--gray-200); border-radius:var(--radius); font-family:var(--font); font-size:0.875rem; background:var(--bg); color:var(--text); resize:vertical; min-height:70px;"></textarea>' +
                            '<button class="btn btn-secondary btn-sm" onclick="adicionarObservacao(\'' + os.id + '\')" style="margin-top:8px;">[[icone:chat]] Adicionar</button>' +
                        '</div>' +
                    '</div>' +
                    '<div><h4 style="font-size:0.9375rem; margin-bottom:12px;">[[icone:documento]] Histórico</h4>' + timelineHTML + '</div>' +
                    '<div style="display:flex; gap:12px; justify-content:flex-end; padding-top:16px; border-top:1px solid var(--gray-200);"><button class="btn btn-secondary" onclick="fecharModalDetalhes()">Fechar</button></div>' +
                '</div>';
        }

        function fecharModalDetalhes() {
            document.getElementById('detail-modal').style.display = 'none';
            document.body.style.overflow = '';
        }

        // ==========================================
        // ATUALIZAR STATUS
        // ==========================================
        async function atualizarStatus(id, novoStatus, btnElement) {
            var labels = {
                'Aberta': 'Aberta',
                'Encaminhada': 'Encaminhada',
                'Em atendimento': 'Em Atendimento',
                'Aguardando informação': 'Aguardando Informação',
                'Concluída': 'Concluída',
                'Cancelada': 'Cancelada'
            };

            if (!confirm('Deseja alterar o status para "' + labels[novoStatus] + '"?')) return;

            var textoOriginal = btnElement.innerHTML;
            btnElement.disabled = true;
            btnElement.innerHTML = '[[icone:relogio]]...';

            try {
                await apiRequest('/ordens/' + id, {
                    method: 'PUT',
                    body: JSON.stringify({ status: novoStatus })
                });

                showToast('[[icone:confirmar]] Status alterado!', 'success');

                var os = todasOrdens.find(function(o) { return o.id === id; });
                if (os) os.status = novoStatus;
                if (osSelecionada && osSelecionada.id === id) osSelecionada.status = novoStatus;

                renderizarOrdens();
                atualizarStats();

                document.querySelectorAll('.status-action-btn').forEach(function(btn) { btn.classList.remove('active'); });
                btnElement.classList.add('active');
                btnElement.disabled = false;
                btnElement.innerHTML = textoOriginal;
            } catch (error) {
                showToast(error.message, 'error');
                btnElement.disabled = false;
                btnElement.innerHTML = textoOriginal;
            }
        }

        // ==========================================
        // OBSERVAÇÃO
        // ==========================================
        async function adicionarObservacao(id) {
            var input = document.getElementById('observacao-input');
            var observacao = input.value.trim();
            if (!observacao) { showToast('Digite uma observação', 'warning'); return; }

            try {
                await apiRequest('/ordens/' + id, {
                    method: 'PUT',
                    body: JSON.stringify({ observacao: observacao })
                });
                showToast('[[icone:confirmar]] Observação adicionada', 'success');
                input.value = '';
            } catch (error) {
                showToast(error.message, 'error');
            }
        }

        // ==========================================
        // MODAIS - ESC / CLIQUE FORA
        // ==========================================
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                if (document.getElementById('os-modal').style.display === 'flex') fecharModalNovaOS();
                if (document.getElementById('detail-modal').style.display === 'flex') fecharModalDetalhes();
            }
        });

        window.addEventListener('click', function(e) {
            var mo = document.getElementById('os-modal');
            var md = document.getElementById('detail-modal');
            if (e.target === mo) fecharModalNovaOS();
            if (e.target === md) fecharModalDetalhes();
        });

        // ==========================================
        // INICIALIZAÇÃO (executa direto)
        // ==========================================
        console.log('[[icone:estrela]] Ordens iniciando...');

        carregarUsuario();
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
            console.log('[[icone:atualizar]] Auto-refresh ordens...');
            carregarDados();
        }, 30000);

        console.log('[[icone:confirmar]] Ordens pronto!');
    
Object.assign(window,{...(typeof carregarUsuario === 'function' ? {carregarUsuario} : {}),...(typeof carregarDados === 'function' ? {carregarDados} : {}),...(typeof preencherSelectSetores === 'function' ? {preencherSelectSetores} : {}),...(typeof preencherSelectCategorias === 'function' ? {preencherSelectCategorias} : {}),...(typeof atualizarStats === 'function' ? {atualizarStats} : {}),...(typeof filtrarPorStatus === 'function' ? {filtrarPorStatus} : {}),...(typeof aplicarFiltros === 'function' ? {aplicarFiltros} : {}),...(typeof limparFiltros === 'function' ? {limparFiltros} : {}),...(typeof renderizarOrdens === 'function' ? {renderizarOrdens} : {}),...(typeof carregarNotificacoes === 'function' ? {carregarNotificacoes} : {}),...(typeof abrirModalNovaOS === 'function' ? {abrirModalNovaOS} : {}),...(typeof fecharModalNovaOS === 'function' ? {fecharModalNovaOS} : {}),...(typeof renderizarArquivos === 'function' ? {renderizarArquivos} : {}),...(typeof removerArquivo === 'function' ? {removerArquivo} : {}),...(typeof abrirDetalhes === 'function' ? {abrirDetalhes} : {}),...(typeof renderizarDetalhes === 'function' ? {renderizarDetalhes} : {}),...(typeof fecharModalDetalhes === 'function' ? {fecharModalDetalhes} : {}),...(typeof atualizarStatus === 'function' ? {atualizarStatus} : {}),...(typeof adicionarObservacao === 'function' ? {adicionarObservacao} : {})});
})();