(function(){

        // ==========================================
        // PROTEÇÃO
        // ==========================================
        var usuarioAtual = getUsuario();

        if (!protegerPagina(['administrador_principal', 'administrador_setor'])) {
            throw new Error('Acesso negado');
        }

        var isAdminPrincipal = usuarioAtual.role === 'administrador_principal';

        // ==========================================
        // ESTADO
        // ==========================================
        var usuarios = [];
        var setores = [];
        var filtroTipoAtual = 'todos';
        var userParaDeletar = null;

        // ==========================================
        // USUÁRIO NA SIDEBAR
        // ==========================================
        function carregarInfoUsuario() {
            if (!usuarioAtual) return;
            var primeiroNome = usuarioAtual.nome.split(' ')[0];
            document.getElementById('user-name').textContent = usuarioAtual.nome;
            document.getElementById('user-role').textContent = isAdminPrincipal ? 'Admin Principal' : 'Admin de Setor';

            var avatarEl = document.getElementById('sidebar-avatar');
            if (usuarioAtual.avatar) {
                avatarEl.innerHTML = '<img src="' + window.avatarURL(usuarioAtual.avatar) + '" alt="Avatar">';
            } else {
                avatarEl.textContent = primeiroNome.charAt(0).toUpperCase();
            }
        }

        // ==========================================
        // CARREGAR DADOS
        // ==========================================
        async function carregarDados() {
            try {
                console.log('[[icone:atualizar]] Carregando usuários...');
                var token = localStorage.getItem('token');
                var headers = { 'Authorization': 'Bearer ' + token };

                var results = await Promise.allSettled([
                    window.legacyFetch('/api/usuarios?gestao=1', { headers: headers }).then(function(r) { return r.json(); }),
                    window.legacyFetch('/api/setores', { headers: headers }).then(function(r) { return r.json(); })
                ]);

                usuarios = (results[0].status === 'fulfilled' ? results[0].value : []) || [];
                setores = (results[1].status === 'fulfilled' ? results[1].value : []) || [];
                if (!isAdminPrincipal) setores = setores.filter(function(s) { return s.id === usuarioAtual.setorId; });

                console.log('[[icone:equipe]] Usuários:', usuarios.length, '| Setores:', setores.length);

                preencherSelectSetores();
                renderizarUsuarios();
                atualizarStats();
                carregarNotificacoes();

            } catch (e) {
                console.error('[[icone:fechar]] Erro:', e);
            }
        }

        // ==========================================
        // PREENCHER SELECTS
        // ==========================================
        function preencherSelectSetores() {
            var selectFiltro = document.getElementById('filter-setor');
            var selectForm = document.getElementById('user-setor');

            selectFiltro.innerHTML = '<option value="">Todos os setores</option>';
            selectForm.innerHTML = '<option value="">Sem setor</option>';

            setores.filter(function(s) { return s.ativo !== false; }).forEach(function(setor) {
                selectFiltro.innerHTML += '<option value="' + setor.id + '">' + window.escapeHTML(setor.nome) + '</option>';
                selectForm.innerHTML += '<option value="' + setor.id + '">' + window.escapeHTML(setor.nome) + '</option>';
            });
            if (!isAdminPrincipal) {
                selectForm.value = usuarioAtual.setorId;
                selectForm.disabled = true;
                document.querySelectorAll('#user-role-input option').forEach(function(option) {
                    option.disabled = !['gestor', 'colaborador'].includes(option.value);
                });
            }
        }

        // ==========================================
        // STATS
        // ==========================================
        function atualizarStats() {
            var total = usuarios.length;
            var admins = usuarios.filter(function(u) {
                return u.role === 'administrador_principal' || u.role === 'administrador_setor';
            }).length;
            var gestores = usuarios.filter(function(u) { return u.role === 'gestor'; }).length;
            var colaboradores = usuarios.filter(function(u) { return u.role === 'colaborador'; }).length;
            var inativos = usuarios.filter(function(u) { return u.ativo === false; }).length;

            document.getElementById('count-todos').textContent = total;
            document.getElementById('count-admins').textContent = admins;
            document.getElementById('count-gestores').textContent = gestores;
            document.getElementById('count-colaboradores').textContent = colaboradores;
            document.getElementById('count-inativos').textContent = inativos;
        }

        // ==========================================
        // FILTROS
        // ==========================================
        function filtrarPorTipo(tipo, element) {
            filtroTipoAtual = tipo;
            document.querySelectorAll('.stat-user-card').forEach(function(card) { card.classList.remove('active'); });
            element.classList.add('active');
            aplicarFiltros();
        }

        function aplicarFiltros() { renderizarUsuarios(); }

        function limparFiltros() {
            document.getElementById('search-user').value = '';
            document.getElementById('filter-role').value = '';
            document.getElementById('filter-setor').value = '';
            document.getElementById('filter-status').value = '';
            filtroTipoAtual = 'todos';

            document.querySelectorAll('.stat-user-card').forEach(function(card) { card.classList.remove('active'); });
            document.querySelector('[data-filter="todos"]').classList.add('active');
            renderizarUsuarios();
        }

        // ==========================================
        // RENDERIZAR USUÁRIOS
        // ==========================================
        function renderizarUsuarios() {
            var search = document.getElementById('search-user').value.toLowerCase().trim();
            var role = document.getElementById('filter-role').value;
            var setorId = document.getElementById('filter-setor').value;
            var status = document.getElementById('filter-status').value;

            var filtrados = usuarios.filter(function(u) {
                var matchSearch = !search || 
                    (u.nome || '').toLowerCase().includes(search) ||
                    (u.email || '').toLowerCase().includes(search);
                var matchRole = !role || u.role === role;
                var matchSetor = !setorId || u.setorId === setorId;
                var matchStatus = !status || 
                    (status === 'ativo' ? u.ativo !== false : u.ativo === false);
                return matchSearch && matchRole && matchSetor && matchStatus;
            });

            if (filtroTipoAtual !== 'todos') {
                if (filtroTipoAtual === 'administrador') {
                    filtrados = filtrados.filter(function(u) {
                        return u.role === 'administrador_principal' || u.role === 'administrador_setor';
                    });
                } else if (filtroTipoAtual === 'inativos') {
                    filtrados = filtrados.filter(function(u) { return u.ativo === false; });
                } else {
                    filtrados = filtrados.filter(function(u) { return u.role === filtroTipoAtual; });
                }
            }

            var rolePeso = { 'administrador_principal': 1, 'administrador_setor': 2, 'gestor': 3, 'colaborador': 4 };
            filtrados.sort(function(a, b) {
                var pesoA = rolePeso[a.role] || 99;
                var pesoB = rolePeso[b.role] || 99;
                if (pesoA !== pesoB) return pesoA - pesoB;
                return (a.nome || '').localeCompare(b.nome || '');
            });

            var infoEl = document.getElementById('info-resultados');
            infoEl.textContent = filtrados.length === 0 
                ? 'Nenhum resultado' 
                : 'Mostrando ' + filtrados.length + ' de ' + usuarios.length + ' usuário(s)';

            var tbody = document.getElementById('users-table-body');

            if (filtrados.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state"><span class="empty-icon">[[icone:equipe]]</span><h3>Nenhum usuário encontrado</h3><p>Tente ajustar os filtros</p><button class="btn btn-primary" onclick="abrirModalNovoUsuario()" style="margin-top:12px;">[[icone:adicionar]] Novo Usuário</button></div></td></tr>';
                return;
            }

            tbody.innerHTML = filtrados.map(function(user) {
                var setor = setores.find(function(s) { return s.id === user.setorId; });
                var inicial = (user.nome || '?').charAt(0).toUpperCase();
                var isAtivo = user.ativo !== false;
                var isMe = user.id === usuarioAtual.id;

                var roleLabels = {
                    'administrador_principal': '[[icone:estrela]] Admin Principal',
                    'administrador_setor': '[[icone:estrela]] Admin Setor',
                    'gestor': '[[icone:usuario]] Gestor',
                    'colaborador': '[[icone:usuario]] Colaborador'
                };
                var roleClasses = {
                    'administrador_principal': 'role-admin-principal',
                    'administrador_setor': 'role-admin-setor',
                    'gestor': 'role-gestor',
                    'colaborador': 'role-colaborador'
                };

                var podeEditar = isAdminPrincipal || (user.setorId === usuarioAtual.setorId && ['gestor', 'colaborador'].includes(user.role));
                var podeDeletar = !isMe;

                return '<tr>' +
                    '<td>' +
                        '<div class="user-cell">' +
                            '<div class="user-avatar-small">' + 
                                (user.avatar ? '<img src="' + window.avatarURL(user.avatar) + '" alt="' + window.escapeHTML(user.nome) + '">' : inicial) +
                            '</div>' +
                            '<div class="user-details">' +
                                '<span class="user-name-cell">' + window.escapeHTML(user.nome) + (isMe ? ' <span style="color:var(--primary);font-size:0.75rem;">(você)</span>' : '') + '</span>' +
                                '<span class="user-email-cell">' + window.escapeHTML(user.email) + '</span>' +
                            '</div>' +
                        '</div>' +
                    '</td>' +
                    '<td><span class="role-badge ' + (roleClasses[user.role] || '') + '">' + (roleLabels[user.role] || user.role) + '</span></td>' +
                    '<td>' + (setor ? '<span class="setor-tag">[[icone:setores]] ' + window.escapeHTML(setor.nome) + '</span>' : '<span class="setor-tag sem-setor">— Sem setor</span>') + '</td>' +
                    '<td><span class="status-indicator ' + (isAtivo ? 'ativo' : 'inativo') + '">' + (isAtivo ? 'Ativo' : 'Inativo') + '</span></td>' +
                    '<td style="font-size:0.8125rem;color:var(--text-muted);">' + (user.dataCriacao ? formatDateShort(user.dataCriacao) : '—') + '</td>' +
                    '<td><div class="table-actions">' +
                        (podeEditar ? '<button class="action-btn" onclick="abrirModalEditarUsuario(\'' + user.id + '\')" title="Editar">[[icone:editar]]</button>' : '') +
                        (podeDeletar ? '<button class="action-btn ' + (isAtivo ? 'danger' : 'success') + '" onclick="' + (isAtivo ? 'abrirModalDelete' : 'reativarUsuario') + '(\'' + user.id + '\')" title="' + (isAtivo ? 'Desativar' : 'Reativar') + '">' + (isAtivo ? '[[icone:bloquear]]' : '[[icone:confirmar]]') + '</button>' : '') +
                    '</div></td>' +
                '</tr>';
            }).join('');
        }

        // ==========================================
        // MODAL NOVO USUÁRIO
        // ==========================================
        function abrirModalNovoUsuario() {
            document.getElementById('modal-user-title').textContent = '[[icone:adicionar]] Novo Usuário';
            document.getElementById('user-form').reset();
            if (!isAdminPrincipal) {
                document.getElementById('user-setor').value = usuarioAtual.setorId;
                document.getElementById('user-role-input').value = 'colaborador';
            }
            document.getElementById('user-id').value = '';
            document.getElementById('avatar-preview').textContent = '?';
            document.getElementById('password-group').style.display = 'block';
            document.getElementById('password-hint').textContent = 'Mínimo 8 caracteres';
            document.getElementById('user-senha').required = true;
            document.getElementById('user-senha').placeholder = 'Mínimo 8 caracteres';
            document.getElementById('status-group').style.display = 'none';
            document.getElementById('btn-salvar-user').textContent = 'Criar Usuário';
            document.getElementById('user-modal').style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }

        // ==========================================
        // MODAL EDITAR USUÁRIO
        // ==========================================
        function abrirModalEditarUsuario(id) {
            var user = usuarios.find(function(u) { return u.id === id; });
            if (!user) return;

            document.getElementById('modal-user-title').textContent = '[[icone:editar]] Editar Usuário';
            document.getElementById('user-id').value = user.id;
            document.getElementById('user-nome').value = user.nome || '';
            document.getElementById('user-email').value = user.email || '';
            document.getElementById('user-role-input').value = user.role || 'colaborador';
            document.getElementById('user-setor').value = user.setorId || '';
            document.getElementById('user-status').value = user.ativo !== false ? 'true' : 'false';
            document.getElementById('user-senha').value = '';
            document.getElementById('user-senha').required = false;
            document.getElementById('user-senha').placeholder = 'Deixe em branco para não alterar';
            document.getElementById('password-hint').textContent = 'Deixe em branco para manter a senha atual';
            document.getElementById('status-group').style.display = 'block';
            document.getElementById('btn-salvar-user').textContent = 'Salvar Alterações';

            var preview = document.getElementById('avatar-preview');
            if (user.avatar) {
                preview.innerHTML = '<img src="' + window.avatarURL(user.avatar) + '" alt="' + window.escapeHTML(user.nome) + '">';
            } else {
                preview.textContent = (user.nome || '?').charAt(0).toUpperCase();
            }

            document.getElementById('user-modal').style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }

        function fecharModalUsuario() {
            document.getElementById('user-modal').style.display = 'none';
            document.body.style.overflow = '';
        }

        // ==========================================
        // TOGGLE SENHA
        // ==========================================
        document.getElementById('toggle-senha').addEventListener('click', function() {
            var input = document.getElementById('user-senha');
            var isPassword = input.type === 'password';
            input.type = isPassword ? 'text' : 'password';
            this.textContent = isPassword ? '[[icone:ocultar]]' : '[[icone:visualizar]]';
        });

        // ==========================================
        // PREVIEW AVATAR EM TEMPO REAL
        // ==========================================
        document.getElementById('user-nome').addEventListener('input', function() {
            var preview = document.getElementById('avatar-preview');
            if (preview.querySelector('img')) return;
            preview.textContent = this.value ? this.value.charAt(0).toUpperCase() : '?';
        });

        // ==========================================
        // SUBMIT FORM
        // ==========================================
        document.getElementById('user-form').addEventListener('submit', async function(e) {
            e.preventDefault();

            var id = document.getElementById('user-id').value;
            var nome = document.getElementById('user-nome').value.trim();
            var email = document.getElementById('user-email').value.trim();
            var senha = document.getElementById('user-senha').value;
            var role = document.getElementById('user-role-input').value;
            var setorId = document.getElementById('user-setor').value || null;
            var ativo = document.getElementById('user-status').value === 'true';

            if (!nome || nome.length < 2) { showToast('Nome muito curto', 'error'); return; }
            if (!email || !validarEmail(email)) { showToast('E-mail inválido', 'error'); return; }
            if (!id && (!senha || senha.length < 8)) { showToast('Senha deve ter no mínimo 8 caracteres', 'error'); return; }
            if (id && senha && senha.length < 8) { showToast('Nova senha muito curta', 'error'); return; }
            if ((role === 'gestor' || role === 'administrador_setor') && !setorId) {
                showToast('Gestores e Admins de Setor precisam estar em um setor', 'error');
                return;
            }

            var btnSalvar = document.getElementById('btn-salvar-user');
            btnSalvar.disabled = true;
            btnSalvar.innerHTML = '[[icone:relogio]] Salvando...';

            try {
                if (id) {
                    var body = { nome: nome, email: email, role: role, setorId: setorId, ativo: ativo };
                    if (senha) body.senha = senha;
                    await apiRequest('/usuarios/' + id, {
                        method: 'PUT',
                        body: JSON.stringify(body)
                    });
                    showToast('[[icone:confirmar]] Usuário atualizado!', 'success');
                } else {
                    await apiRequest('/usuarios', {
                        method: 'POST',
                        body: JSON.stringify({ nome: nome, email: email, senha: senha, role: role, setorId: setorId })
                    });
                    showToast('[[icone:confirmar]] Usuário criado!', 'success');
                }

                fecharModalUsuario();
                await carregarDados();

            } catch (error) {
                var msg = error.message;
                if (msg.includes('já está cadastrado') || msg.includes('duplicate')) msg = 'Este e-mail já está cadastrado';
                showToast(msg, 'error');
            } finally {
                btnSalvar.disabled = false;
                btnSalvar.textContent = id ? 'Salvar Alterações' : 'Criar Usuário';
            }
        });

        // ==========================================
        // MODAL DELETE
        // ==========================================
        function abrirModalDelete(id) {
            var user = usuarios.find(function(u) { return u.id === id; });
            if (!user) return;
            userParaDeletar = id;
            document.getElementById('delete-user-name').textContent = user.nome;
            document.getElementById('delete-modal').style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }

        function fecharModalDelete() {
            document.getElementById('delete-modal').style.display = 'none';
            document.body.style.overflow = '';
            userParaDeletar = null;
        }

        document.getElementById('btn-confirmar-delete').addEventListener('click', async function() {
            if (!userParaDeletar) return;
            var btn = this;
            btn.disabled = true;
            btn.innerHTML = '[[icone:relogio]] Desativando...';

            try {
                await apiRequest('/usuarios/' + userParaDeletar, {
                    method: 'PUT',
                    body: JSON.stringify({ ativo: false })
                });
                showToast('[[icone:confirmar]] Usuário desativado', 'success');
                fecharModalDelete();
                await carregarDados();
            } catch (error) {
                showToast(error.message, 'error');
            } finally {
                btn.disabled = false;
                btn.textContent = '[[icone:bloquear]] Desativar Usuário';
            }
        });

        // ==========================================
        // REATIVAR USUÁRIO
        // ==========================================
        async function reativarUsuario(id) {
            var user = usuarios.find(function(u) { return u.id === id; });
            if (!user) return;
            if (!confirm('Reativar o usuário "' + window.escapeHTML(user.nome) + '"?')) return;

            try {
                await apiRequest('/usuarios/' + id, {
                    method: 'PUT',
                    body: JSON.stringify({ ativo: true })
                });
                showToast('[[icone:confirmar]] Usuário reativado', 'success');
                await carregarDados();
            } catch (error) {
                showToast(error.message, 'error');
            }
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
        // FECHAR MODAIS
        // ==========================================
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                if (document.getElementById('user-modal').style.display === 'flex') fecharModalUsuario();
                if (document.getElementById('delete-modal').style.display === 'flex') fecharModalDelete();
            }
        });

        window.addEventListener('click', function(e) {
            var mu = document.getElementById('user-modal');
            var md = document.getElementById('delete-modal');
            if (e.target === mu) fecharModalUsuario();
            if (e.target === md) fecharModalDelete();
        });

        // ==========================================
        // INICIALIZAÇÃO (executa direto)
        // ==========================================
        console.log('[[icone:estrela]] Usuários iniciando...');

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
            console.log('[[icone:atualizar]] Auto-refresh usuários...');
            carregarDados();
        }, 30000);

        console.log('[[icone:confirmar]] Usuários pronto!');
    
Object.assign(window,{...(typeof carregarInfoUsuario === 'function' ? {carregarInfoUsuario} : {}),...(typeof carregarDados === 'function' ? {carregarDados} : {}),...(typeof preencherSelectSetores === 'function' ? {preencherSelectSetores} : {}),...(typeof atualizarStats === 'function' ? {atualizarStats} : {}),...(typeof filtrarPorTipo === 'function' ? {filtrarPorTipo} : {}),...(typeof aplicarFiltros === 'function' ? {aplicarFiltros} : {}),...(typeof limparFiltros === 'function' ? {limparFiltros} : {}),...(typeof renderizarUsuarios === 'function' ? {renderizarUsuarios} : {}),...(typeof abrirModalNovoUsuario === 'function' ? {abrirModalNovoUsuario} : {}),...(typeof abrirModalEditarUsuario === 'function' ? {abrirModalEditarUsuario} : {}),...(typeof fecharModalUsuario === 'function' ? {fecharModalUsuario} : {}),...(typeof abrirModalDelete === 'function' ? {abrirModalDelete} : {}),...(typeof fecharModalDelete === 'function' ? {fecharModalDelete} : {}),...(typeof reativarUsuario === 'function' ? {reativarUsuario} : {}),...(typeof carregarNotificacoes === 'function' ? {carregarNotificacoes} : {})});
})();