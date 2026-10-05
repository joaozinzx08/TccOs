(function(){

        // ==========================================
        // PROTEÇÃO
        // ==========================================
        const usuarioAtual = getUsuario();

        if (!protegerPagina(['administrador_principal', 'administrador_setor'])) {
            throw new Error('Acesso negado');
        }

        const isAdminPrincipal = usuarioAtual.role === 'administrador_principal';

        // ==========================================
        // ESTADO
        // ==========================================
        let setores = [];
        let usuarios = [];
        let ordens = [];
        let filtroTipoAtual = 'todos';
        let setorParaDeletar = null;

        // ==========================================
        // ICONES POR SETOR (baseado no nome)
        // ==========================================
        const ICONES_SETOR = {
            'RH': '[[icone:equipe]]',
            'Recursos Humanos': '[[icone:equipe]]',
            'Administração': '[[icone:ordens]]',
            'Documentação Técnica': '[[icone:pasta]]',
            'Produção': '[[icone:setores]]',
            'Controle de Qualidade': '[[icone:confirmar]]',
            'Qualidade': '[[icone:confirmar]]',
            'TI / Sistemas': '[[icone:computador]]',
            'TI': '[[icone:computador]]',
            'Sistemas': '[[icone:computador]]',
            'Manutenção': '[[icone:ferramenta]]',
            'Financeiro': '[[icone:caixa]]',
            'Compras': '[[icone:caixa]]',
            'Logística': '[[icone:caixa]]',
            'Marketing': '[[icone:notificacao]]',
            'Vendas': '[[icone:caixa]]',
            'Atendimento': '[[icone:caixa]]',
            'Suporte': '[[icone:ferramenta]]',
            'Jurídico': '[[icone:seguranca]]',
            'Segurança': '[[icone:cadeado]]'
        };

        function getIconeSetor(nome) {
            if (!nome) return '[[icone:setores]]';
            
            // Busca exata
            if (ICONES_SETOR[nome]) return ICONES_SETOR[nome];
            
            // Busca parcial
            for (const [key, icon] of Object.entries(ICONES_SETOR)) {
                if (nome.toLowerCase().includes(key.toLowerCase())) {
                    return icon;
                }
            }
            
            return '[[icone:setores]]';
        }

        // ==========================================
        // CARREGAR USUÁRIO
        // ==========================================
        function carregarInfoUsuario() {
    // Busca direto do localStorage (mais garantido)
    var user = null;
    try {
        user = JSON.parse(localStorage.getItem('usuario') || '{}');
    } catch (e) {
        user = {};
    }

    console.log('[[icone:usuario]] Carregando usuário:', user);

    // Se não tem nome, tenta pegar do usuarioAtual
    if (!user || !user.nome) {
        user = usuarioAtual || {};
    }

    // Nome
    var nomeEl = document.getElementById('user-name');
    if (nomeEl && user.nome) {
        nomeEl.textContent = user.nome;
    }

    // Role
    var roleEl = document.getElementById('user-role');
    if (roleEl) {
        var roleLabels = {
            'administrador_principal': 'Admin Principal',
            'administrador_setor': 'Admin de Setor',
            'gestor': 'Gestor',
            'colaborador': 'Colaborador'
        };
        roleEl.textContent = roleLabels[user.role] || 'Admin';
    }

    // Avatar
    var avatarEl = document.getElementById('sidebar-avatar');
    if (avatarEl) {
        if (user.avatar) {
            // Tem avatar customizado
            avatarEl.innerHTML = '<img src="' + window.avatarURL(user.avatar) + '" alt="Avatar" style="width:100%;height:100%;object-fit:cover;">';
        } else if (user.nome) {
            // Gera a partir do nome
            var inicial = user.nome.trim().charAt(0).toUpperCase();
            avatarEl.textContent = inicial;
            avatarEl.innerHTML = inicial; // força atualizar
        } else {
            // Fallback
            avatarEl.textContent = '[[icone:usuario]]';
        }
    }
}

        // ==========================================
        // CARREGAR DADOS
        // ==========================================
        async function carregarDados() {
            try {
                const [setoresData, usuariosData, ordensData] = await Promise.all([
                    apiRequest('/setores'),
                    apiRequest('/usuarios'),
                    apiRequest('/ordens')
                ]);

                setores = setoresData || [];
                usuarios = usuariosData || [];
                ordens = ordensData || [];

                renderizarSetores();
                atualizarStats();
                carregarNotificacoes();

            } catch (error) {
                console.error('Erro ao carregar dados:', error);
                showToast('Erro ao carregar setores', 'error');
            }
        }

        // ==========================================
        // BUSCAR GESTORES DO SETOR
        // ==========================================
        function getGestoresDoSetor(setorId) {
            return usuarios.filter(u => 
                u.setorId === setorId && 
                (u.role === 'gestor' || u.role === 'administrador_setor') &&
                u.ativo !== false
            );
        }

        // ==========================================
        // CONTAR OS DO SETOR
        // ==========================================
        function contarOSDoSetor(setorId) {
            return ordens.filter(o => o.setorResponsavelId === setorId).length;
        }

        // ==========================================
        // ATUALIZAR STATS
        // ==========================================
        function atualizarStats() {
            const total = setores.length;
            const ativos = setores.filter(s => s.ativo !== false).length;
            const inativos = total - ativos;
            const comGestor = setores.filter(s => getGestoresDoSetor(s.id).length > 0).length;

            document.getElementById('count-todos').textContent = total;
            document.getElementById('count-ativos').textContent = ativos;
            document.getElementById('count-inativos').textContent = inativos;
            document.getElementById('count-com-gestor').textContent = comGestor;
        }

        // ==========================================
        // FILTRAR POR TIPO
        // ==========================================
        function filtrarPorTipo(tipo, element) {
            filtroTipoAtual = tipo;

            document.querySelectorAll('.stat-setor-card').forEach(card => {
                card.classList.remove('active');
            });
            element.classList.add('active');

            aplicarFiltros();
        }

        // ==========================================
        // APLICAR FILTROS
        // ==========================================
        function aplicarFiltros() {
            renderizarSetores();
        }

        // ==========================================
        // LIMPAR FILTROS
        // ==========================================
        function limparFiltros() {
            document.getElementById('search-setor').value = '';
            document.getElementById('filter-status').value = '';
            document.getElementById('filter-gestor').value = '';
            filtroTipoAtual = 'todos';

            document.querySelectorAll('.stat-setor-card').forEach(card => {
                card.classList.remove('active');
            });
            document.querySelector('[data-filter="todos"]').classList.add('active');

            renderizarSetores();
        }

        // ==========================================
        // RENDERIZAR SETORES
        // ==========================================
        function renderizarSetores() {
            const search = document.getElementById('search-setor').value.toLowerCase().trim();
            const status = document.getElementById('filter-status').value;
            const gestorFiltro = document.getElementById('filter-gestor').value;

            let filtrados = setores.filter(s => {
                const matchSearch = !search || 
                    (s.nome || '').toLowerCase().includes(search) ||
                    (s.descricao || '').toLowerCase().includes(search);

                const matchStatus = !status || 
                    (status === 'ativo' ? s.ativo !== false : s.ativo === false);

                const gestores = getGestoresDoSetor(s.id);
                const matchGestor = !gestorFiltro || 
                    (gestorFiltro === 'com-gestor' ? gestores.length > 0 : gestores.length === 0);

                return matchSearch && matchStatus && matchGestor;
            });

            // Filtro dos cards
            if (filtroTipoAtual !== 'todos') {
                if (filtroTipoAtual === 'ativos') {
                    filtrados = filtrados.filter(s => s.ativo !== false);
                } else if (filtroTipoAtual === 'inativos') {
                    filtrados = filtrados.filter(s => s.ativo === false);
                } else if (filtroTipoAtual === 'com-gestor') {
                    filtrados = filtrados.filter(s => getGestoresDoSetor(s.id).length > 0);
                }
            }

            // Ordenar: ativos primeiro, depois alfabético
            filtrados.sort((a, b) => {
                const aAtivo = a.ativo !== false;
                const bAtivo = b.ativo !== false;
                if (aAtivo !== bAtivo) return aAtivo ? -1 : 1;
                return (a.nome || '').localeCompare(b.nome || '');
            });

            // Info
            const infoEl = document.getElementById('info-resultados');
            if (filtrados.length === 0) {
                infoEl.textContent = 'Nenhum resultado';
            } else {
                infoEl.textContent = `Mostrando ${filtrados.length} de ${setores.length} setor(es)`;
            }

            // Renderizar
            const grid = document.getElementById('setores-grid');

            if (filtrados.length === 0) {
                grid.innerHTML = `
                    <div class="empty-grid">
                        <div class="empty-state">
                            <span class="empty-icon">[[icone:setores]]</span>
                            <h3>Nenhum setor encontrado</h3>
                            <p>Tente ajustar os filtros ou criar um novo setor</p>
                            <button class="btn btn-primary" onclick="abrirModalNovoSetor()" style="margin-top:12px;">
                                [[icone:adicionar]] Novo Setor
                            </button>
                        </div>
                    </div>
                `;
                return;
            }

            grid.innerHTML = filtrados.map(setor => {
                const isAtivo = setor.ativo !== false;
                const gestores = getGestoresDoSetor(setor.id);
                const totalOS = contarOSDoSetor(setor.id);
                const icone = getIconeSetor(setor.nome);

                // Avatares dos gestores (máx 4)
                let gestoresHTML = '';
                if (gestores.length === 0) {
                    gestoresHTML = `
                        <div class="gestor-info">
                            [[icone:alerta]] <strong>Sem gestor</strong><br>
                            <span style="font-size:0.6875rem;">Nenhum responsável atribuído</span>
                        </div>
                    `;
                } else {
                    const avatarsHTML = gestores.slice(0, 4).map(g => {
                        const inicial = (g.nome || '?').charAt(0).toUpperCase();
                        const primeiroNome = g.nome.split(' ')[0];
                        if (g.avatar) {
                            return `<div class="gestor-avatar" title="${window.escapeHTML(g.nome)}">
                                <img src="${window.avatarURL(g.avatar)}" alt="${window.escapeHTML(g.nome)}">
                            </div>`;
                        }
                        return `<div class="gestor-avatar" title="${window.escapeHTML(g.nome)}">${inicial}</div>`;
                    }).join('');

                    const maisHTML = gestores.length > 4 
                        ? `<div class="gestor-avatar mais" title="+${gestores.length - 4} gestor(es)">+${gestores.length - 4}</div>` 
                        : '';

                    gestoresHTML = `
                        <div class="gestor-avatars">
                            ${avatarsHTML}
                            ${maisHTML}
                        </div>
                        <div class="gestor-info">
                            <strong>${gestores.length}</strong> gestor${gestores.length !== 1 ? 'es' : ''}<br>
                            <span style="font-size:0.6875rem;">${gestores[0].nome.split(' ')[0]}${gestores.length > 1 ? ' e outros' : ''}</span>
                        </div>
                    `;
                }

                return `
                    <div class="setor-card ${isAtivo ? '' : 'inativo'}">
                        <div class="setor-card-header">
                            <div class="setor-card-icon">${icone}</div>
                            <div class="setor-card-status ${isAtivo ? 'ativo' : 'inativo'}">
                                ${isAtivo ? 'Ativo' : 'Inativo'}
                            </div>
                        </div>

                        <h3 class="setor-card-title">${window.escapeHTML(setor.nome)}</h3>
                        <p class="setor-card-desc ${setor.descricao ? '' : 'empty'}">
                            ${setor.descricao || 'Sem descrição'}
                        </p>

                        <div class="setor-gestores">
                            ${gestoresHTML}
                        </div>

                        <div style="display:flex; gap:16px; margin-bottom:12px; font-size:0.75rem; color:var(--text-muted);">
                            <span>[[icone:ordens]] <strong style="color:var(--text);">${totalOS}</strong> OS</span>
                            <span>[[icone:calendario]] Criado ${setor.dataCriacao ? timeAgo(setor.dataCriacao) : '—'}</span>
                        </div>

                        <div class="setor-card-actions">
                            <button 
                                class="setor-action-btn" 
                                onclick="abrirModalEditarSetor('${setor.id}')"
                                title="Editar setor"
                            >
                                [[icone:editar]] Editar
                            </button>
                            <button 
                                class="setor-action-btn ${isAtivo ? 'danger' : 'success'}" 
                                onclick="${isAtivo ? `abrirModalDelete('${setor.id}')` : `reativarSetor('${setor.id}')`}"
                                title="${isAtivo ? 'Desativar' : 'Reativar'}"
                            >
                                ${isAtivo ? '[[icone:bloquear]] Desativar' : '[[icone:confirmar]] Reativar'}
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
        }

        // ==========================================
        // ABRIR MODAL NOVO SETOR
        // ==========================================
        function abrirModalNovoSetor() {
            document.getElementById('modal-setor-title').textContent = '[[icone:adicionar]] Novo Setor';
            document.getElementById('setor-form').reset();
            document.getElementById('setor-id').value = '';
            document.getElementById('desc-char').textContent = '0';
            document.getElementById('status-group').style.display = 'none';
            document.getElementById('btn-salvar-setor').textContent = 'Criar Setor';

            document.getElementById('setor-modal').style.display = 'flex';
            document.body.style.overflow = 'hidden';

            setTimeout(() => document.getElementById('setor-nome').focus(), 100);
        }

        // ==========================================
        // ABRIR MODAL EDITAR SETOR
        // ==========================================
        function abrirModalEditarSetor(id) {
            const setor = setores.find(s => s.id === id);
            if (!setor) return;

            document.getElementById('modal-setor-title').textContent = '[[icone:editar]] Editar Setor';
            document.getElementById('setor-id').value = setor.id;
            document.getElementById('setor-nome').value = setor.nome || '';
            document.getElementById('setor-descricao').value = setor.descricao || '';
            document.getElementById('setor-status').value = setor.ativo !== false ? 'true' : 'false';
            document.getElementById('desc-char').textContent = (setor.descricao || '').length;
            document.getElementById('status-group').style.display = 'block';
            document.getElementById('btn-salvar-setor').textContent = 'Salvar Alterações';

            document.getElementById('setor-modal').style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }

        // ==========================================
        // FECHAR MODAL
        // ==========================================
        function fecharModalSetor() {
            document.getElementById('setor-modal').style.display = 'none';
            document.body.style.overflow = '';
        }

        // ==========================================
        // CONTADOR DE CARACTERES
        // ==========================================
        document.getElementById('setor-descricao').addEventListener('input', (e) => {
            document.getElementById('desc-char').textContent = e.target.value.length;
        });

        // ==========================================
        // SUBMIT DO FORMULÁRIO
        // ==========================================
        document.getElementById('setor-form').addEventListener('submit', async (e) => {
            e.preventDefault();

            const id = document.getElementById('setor-id').value;
            const nome = document.getElementById('setor-nome').value.trim();
            const descricao = document.getElementById('setor-descricao').value.trim();
            const ativo = document.getElementById('setor-status').value === 'true';

            // Validações
            if (!nome || nome.length < 2) {
                showToast('Nome do setor deve ter no mínimo 2 caracteres', 'error');
                return;
            }

            // Verificar duplicidade (case-insensitive)
            const duplicado = setores.find(s => 
                s.id !== id && 
                s.nome.toLowerCase() === nome.toLowerCase()
            );

            if (duplicado) {
                showToast(`Já existe um setor com o nome "${nome}"`, 'error');
                return;
            }

            const btnSalvar = document.getElementById('btn-salvar-setor');
            btnSalvar.disabled = true;
            btnSalvar.innerHTML = '[[icone:relogio]] Salvando...';

            try {
                if (id) {
                    // Editar
                    await apiRequest(`/setores/${id}`, {
                        method: 'PUT',
                        body: JSON.stringify({ nome, descricao, ativo })
                    });

                    showToast('[[icone:confirmar]] Setor atualizado com sucesso!', 'success');
                } else {
                    // Criar
                    await apiRequest('/setores', {
                        method: 'POST',
                        body: JSON.stringify({ nome, descricao })
                    });

                    showToast('[[icone:confirmar]] Setor criado com sucesso!', 'success');
                }

                fecharModalSetor();
                await carregarDados();

            } catch (error) {
                console.error('Erro ao salvar setor:', error);
                showToast(error.message, 'error');
            } finally {
                btnSalvar.disabled = false;
                btnSalvar.textContent = id ? 'Salvar Alterações' : 'Criar Setor';
            }
        });

        // ==========================================
        // ABRIR MODAL DELETE
        // ==========================================
        function abrirModalDelete(id) {
            const setor = setores.find(s => s.id === id);
            if (!setor) return;

            setorParaDeletar = id;
            document.getElementById('delete-setor-name').textContent = setor.nome;
            document.getElementById('delete-modal').style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }

        function fecharModalDelete() {
            document.getElementById('delete-modal').style.display = 'none';
            document.body.style.overflow = '';
            setorParaDeletar = null;
        }

        // ==========================================
        // CONFIRMAR DESATIVAÇÃO
        // ==========================================
        document.getElementById('btn-confirmar-delete').addEventListener('click', async () => {
            if (!setorParaDeletar) return;

            const btn = document.getElementById('btn-confirmar-delete');
            btn.disabled = true;
            btn.innerHTML = '[[icone:relogio]] Desativando...';

            try {
                await apiRequest(`/setores/${setorParaDeletar}`, {
                    method: 'PUT',
                    body: JSON.stringify({ ativo: false })
                });

                showToast('[[icone:confirmar]] Setor desativado com sucesso', 'success');
                fecharModalDelete();
                await carregarDados();

            } catch (error) {
                console.error('Erro ao desativar:', error);
                showToast(error.message, 'error');
            } finally {
                btn.disabled = false;
                btn.textContent = '[[icone:bloquear]] Desativar Setor';
            }
        });

        // ==========================================
        // REATIVAR SETOR
        // ==========================================
        async function reativarSetor(id) {
            const setor = setores.find(s => s.id === id);
            if (!setor) return;

            if (!confirm(`Reativar o setor "${window.escapeHTML(setor.nome)}"?`)) return;

            try {
                await apiRequest(`/setores/${id}`, {
                    method: 'PUT',
                    body: JSON.stringify({ ativo: true })
                });

                showToast('[[icone:confirmar]] Setor reativado com sucesso', 'success');
                await carregarDados();

            } catch (error) {
                console.error('Erro ao reativar:', error);
                showToast(error.message, 'error');
            }
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
        // FECHAR MODAIS
        // ==========================================
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (document.getElementById('setor-modal').style.display === 'flex') {
                    fecharModalSetor();
                }
                if (document.getElementById('delete-modal').style.display === 'flex') {
                    fecharModalDelete();
                }
            }
        });

        window.addEventListener('click', (e) => {
            const modalSetor = document.getElementById('setor-modal');
            const modalDelete = document.getElementById('delete-modal');
            if (e.target === modalSetor) fecharModalSetor();
            if (e.target === modalDelete) fecharModalDelete();
        });

        // ==========================================
        // INICIALIZAÇÃO
        // ==========================================
        window.onLegacyReady( () => {
    carregarInfoUsuario();
    carregarDados();

    document.getElementById('logout').addEventListener('click', (e) => {
        e.preventDefault();
        logout();
    });

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
    
Object.assign(window,{...(typeof getIconeSetor === 'function' ? {getIconeSetor} : {}),...(typeof carregarInfoUsuario === 'function' ? {carregarInfoUsuario} : {}),...(typeof carregarDados === 'function' ? {carregarDados} : {}),...(typeof getGestoresDoSetor === 'function' ? {getGestoresDoSetor} : {}),...(typeof contarOSDoSetor === 'function' ? {contarOSDoSetor} : {}),...(typeof atualizarStats === 'function' ? {atualizarStats} : {}),...(typeof filtrarPorTipo === 'function' ? {filtrarPorTipo} : {}),...(typeof aplicarFiltros === 'function' ? {aplicarFiltros} : {}),...(typeof limparFiltros === 'function' ? {limparFiltros} : {}),...(typeof renderizarSetores === 'function' ? {renderizarSetores} : {}),...(typeof abrirModalNovoSetor === 'function' ? {abrirModalNovoSetor} : {}),...(typeof abrirModalEditarSetor === 'function' ? {abrirModalEditarSetor} : {}),...(typeof fecharModalSetor === 'function' ? {fecharModalSetor} : {}),...(typeof abrirModalDelete === 'function' ? {abrirModalDelete} : {}),...(typeof fecharModalDelete === 'function' ? {fecharModalDelete} : {}),...(typeof reativarSetor === 'function' ? {reativarSetor} : {}),...(typeof carregarNotificacoes === 'function' ? {carregarNotificacoes} : {})});
})();