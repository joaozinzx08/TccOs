(function(){

        // ==========================================
        // PROTEÇÃO E ROLE
        // ==========================================
        var usuarioAtual = getUsuario();
        var isAdmin = usuarioAtual.role === 'administrador_principal' || usuarioAtual.role === 'administrador_setor';
        var isGestor = usuarioAtual.role === 'gestor';
        var isColaborador = usuarioAtual.role === 'colaborador';

        if (!protegerPagina(['administrador_principal', 'administrador_setor', 'gestor', 'colaborador'])) {
            throw new Error('Acesso negado');
        }

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
        } else if (isColaborador) {
            document.querySelectorAll('.sidebar-menu a').forEach(function(a) {
                var href = a.getAttribute('href');
                if (href && !href.startsWith('http') && !href.startsWith('#') && !href.startsWith('../')) {
                    a.setAttribute('href', '../colaborador/' + href);
                }
            });
            var permitidos = ['Dashboard', 'Minhas Ordens', 'Chat', 'Meu Perfil', 'Sair'];
            document.querySelectorAll('.sidebar-menu li').forEach(function(li) {
                var link = li.querySelector('a');
                if (!link) return;
                var texto = link.textContent.trim();
                if (!permitidos.some(function(p) { return texto.includes(p); })) {
                    li.remove();
                }
            });
            document.querySelectorAll('.sidebar-menu a').forEach(function(a) {
                var texto = a.textContent.trim();
                if (texto.includes('Dashboard')) a.setAttribute('href', '../colaborador/dashboard.html');
            });
        }

        // ==========================================
        // CARREGAR SIDEBAR
        // ==========================================
        function carregarSidebar() {
            if (!usuarioAtual) return;
            var primeiro = usuarioAtual.nome.split(' ')[0];
            document.getElementById('user-name').textContent = usuarioAtual.nome;
            var roles = {
                'administrador_principal': 'Admin Principal',
                'administrador_setor': 'Admin de Setor',
                'gestor': 'Gestor',
                'colaborador': 'Colaborador'
            };
            document.getElementById('user-role').textContent = roles[usuarioAtual.role] || 'Admin';

            var avatarEl = document.getElementById('sidebar-avatar');
            if (usuarioAtual.avatar) {
                avatarEl.innerHTML = '<img src="' + window.avatarURL(usuarioAtual.avatar) + '">';
            } else {
                avatarEl.textContent = primeiro.charAt(0).toUpperCase();
            }
        }

        // ==========================================
        // CARREGAR PERFIL
        // ==========================================
        function carregarPerfil() {
            console.log('[[icone:atualizar]] Carregando perfil...');
            var token = localStorage.getItem('token');

            window.legacyFetch('/api/perfil', {
                headers: { 'Authorization': 'Bearer ' + token }
            })
            .then(function(r) { return r.json(); })
            .then(function(data) {
                console.log('[[icone:caixa]] Perfil:', data);
                renderizarPerfil(data);
                carregarStats(data.id);
            })
            .catch(function(err) {
                console.error('[[icone:fechar]] Erro:', err);
                // Fallback: usar dados do localStorage
                var user = JSON.parse(localStorage.getItem('usuario') || '{}');
                renderizarPerfil(user);
            });
        }

        // ==========================================
        // RENDERIZAR PERFIL
        // ==========================================
        function renderizarPerfil(data) {
            var nome = data.nome || 'Usuário';
            var primeiro = nome.split(' ')[0];
            var inicial = primeiro.charAt(0).toUpperCase();

            // Avatar
            var avatarBig = document.getElementById('profile-avatar');
            if (data.avatar) {
                avatarBig.innerHTML = '<img src="' + window.avatarURL(data.avatar) + '">';
            } else {
                avatarBig.textContent = inicial;
            }

            // Nome + Role
            var roles = {
                'administrador_principal': '[[icone:estrela]] Admin Principal',
                'administrador_setor': '[[icone:estrela]] Admin de Setor',
                'gestor': '[[icone:usuario]] Gestor',
                'colaborador': '[[icone:usuario]] Colaborador'
            };
            document.getElementById('profile-name').innerHTML = 
                nome + ' <span class="profile-hero-role-badge">' + (roles[data.role] || 'Admin') + '</span>';

            // Email
            document.getElementById('profile-email').innerHTML = 
                '<span>[[icone:email]]</span><span>' + (data.email || '—') + '</span>' +
                (data.emailVerificado ? '<span class="verified-badge">[[icone:confirmar]] Verificado</span>' : '');

            // Info
            var empresa = JSON.parse(localStorage.getItem('empresa') || '{}');
            document.getElementById('info-empresa').textContent = empresa.nome || '—';
            document.getElementById('info-cargo').textContent = roles[data.role] || '—';
            document.getElementById('info-data').textContent = data.dataCriacao ? formatDate(data.dataCriacao) : '—';
            document.getElementById('info-email').textContent = data.email || '—';

            // Setor
            if (data.setorId) {
                var token = localStorage.getItem('token');
                window.legacyFetch('/api/setores', {
                    headers: { 'Authorization': 'Bearer ' + token }
                })
                .then(function(r) { return r.json(); })
                .then(function(setores) {
                    var setor = (setores || []).find(function(s) { return s.id === data.setorId; });
                    document.getElementById('info-setor').textContent = setor ? setor.nome : 'Sem setor';
                })
                .catch(function() {
                    document.getElementById('info-setor').textContent = 'Sem setor';
                });
            } else {
                document.getElementById('info-setor').textContent = 'Sem setor';
            }

            // Modal editar
            document.getElementById('edit-nome').value = data.nome || '';
            document.getElementById('edit-email').value = data.email || '';
        }

        // ==========================================
        // CARREGAR STATS
        // ==========================================
        function carregarStats(userId) {
            var token = localStorage.getItem('token');
            window.legacyFetch('/api/ordens', {
                headers: { 'Authorization': 'Bearer ' + token }
            })
            .then(function(r) { return r.json(); })
            .then(function(ordens) {
                ordens = ordens || [];
                var minhas = ordens.filter(function(o) { return o.solicitanteId === userId; });

                document.getElementById('stat-total').textContent = minhas.length;
                document.getElementById('stat-andamento').textContent = minhas.filter(function(o) { 
                    return o.status === 'Em atendimento' || o.status === 'Encaminhada'; 
                }).length;
                document.getElementById('stat-concluidas').textContent = minhas.filter(function(o) { 
                    return o.status === 'Concluída'; 
                }).length;
                document.getElementById('stat-urgentes').textContent = minhas.filter(function(o) { 
                    return o.prioridade === 'Urgente' && o.status !== 'Concluída' && o.status !== 'Cancelada'; 
                }).length;

                // Stats detalhadas
                var abertas = minhas.filter(function(o) { return o.status === 'Aberta'; }).length;
                var canceladas = minhas.filter(function(o) { return o.status === 'Cancelada'; }).length;
                var concluidas = minhas.filter(function(o) { return o.status === 'Concluída'; }).length;
                var taxa = minhas.length > 0 ? Math.round((concluidas / minhas.length) * 100) : 0;

                // Tempo médio
                var concluidasComData = minhas.filter(function(o) { return o.status === 'Concluída' && o.dataConclusao; });
                var tempoMedio = 0;
                if (concluidasComData.length > 0) {
                    var soma = concluidasComData.reduce(function(acc, o) {
                        return acc + (new Date(o.dataConclusao) - new Date(o.dataAbertura)) / (1000 * 60 * 60 * 24);
                    }, 0);
                    tempoMedio = Math.round((soma / concluidasComData.length) * 10) / 10;
                }

                document.getElementById('my-stats-list').innerHTML = 
                    '<div class="activity-item">' +
                        '<div class="activity-dot"></div>' +
                        '<div class="activity-content">' +
                            '<div class="activity-title">[[icone:email]] Abertas</div>' +
                            '<div class="activity-desc">Aguardando atendimento</div>' +
                        '</div>' +
                        '<div style="font-weight:800; color:var(--primary); font-size:1.125rem;">' + abertas + '</div>' +
                    '</div>' +
                    '<div class="activity-item">' +
                        '<div class="activity-dot success"></div>' +
                        '<div class="activity-content">' +
                            '<div class="activity-title">[[icone:painel]] Taxa de Conclusão</div>' +
                            '<div class="activity-desc">Das suas ordens abertas</div>' +
                        '</div>' +
                        '<div style="font-weight:800; color:' + (taxa >= 70 ? 'var(--success)' : taxa >= 40 ? 'var(--warning)' : 'var(--danger)') + '; font-size:1.125rem;">' + taxa + '%</div>' +
                    '</div>' +
                    '<div class="activity-item">' +
                        '<div class="activity-dot warning"></div>' +
                        '<div class="activity-content">' +
                            '<div class="activity-title">[[icone:relogio]] Tempo Médio</div>' +
                            '<div class="activity-desc">Para conclusão das suas OS</div>' +
                        '</div>' +
                        '<div style="font-weight:800; color:var(--text); font-size:1.125rem;">' + tempoMedio + 'd</div>' +
                    '</div>' +
                    '<div class="activity-item">' +
                        '<div class="activity-dot danger"></div>' +
                        '<div class="activity-content">' +
                            '<div class="activity-title">[[icone:fechar]] Canceladas</div>' +
                            '<div class="activity-desc">Ordens canceladas</div>' +
                        '</div>' +
                        '<div style="font-weight:800; color:var(--text-muted); font-size:1.125rem;">' + canceladas + '</div>' +
                    '</div>';

                // Atividades recentes
                renderizarAtividades(minhas);
            })
            .catch(function(err) {
                console.error('Erro stats:', err);
            });
        }

        // ==========================================
        // ATIVIDADES RECENTES
        // ==========================================
        function renderizarAtividades(minhas) {
            var container = document.getElementById('activity-list');
            var recentes = minhas.sort(function(a, b) {
                return new Date(b.dataAbertura) - new Date(a.dataAbertura);
            }).slice(0, 8);

            if (recentes.length === 0) {
                container.innerHTML = '<div class="profile-empty"><span class="profile-empty-icon">[[icone:pasta]]</span><p>Nenhuma atividade recente</p></div>';
                return;
            }

            container.innerHTML = recentes.map(function(os) {
                var dotClass = '';
                if (os.status === 'Concluída') dotClass = 'success';
                else if (os.prioridade === 'Urgente') dotClass = 'danger';
                else if (os.status === 'Em atendimento') dotClass = 'warning';

                return '<div class="activity-item">' +
                    '<div class="activity-dot ' + dotClass + '"></div>' +
                    '<div class="activity-content">' +
                        '<div class="activity-title">#' + shortId(os.id) + ' - ' + (os.titulo || 'Sem título') + '</div>' +
                        '<div class="activity-desc">' + os.status + ' · ' + os.prioridade + '</div>' +
                        '<div class="activity-time">[[icone:relogio]] ' + timeAgo(os.dataAbertura) + '</div>' +
                    '</div>' +
                '</div>';
            }).join('');
        }

        // ==========================================
        // AVATAR UPLOAD
        // ==========================================
        document.getElementById('avatar-input').addEventListener('change', function(e) {
            var file = e.target.files[0];
            if (!file) return;

            if (file.size > 5 * 1024 * 1024) { alert('Máximo 5MB'); return; }
            if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { alert('Formato inválido'); return; }

            // Preview
            var reader = new FileReader();
            reader.onload = function(ev) {
                document.getElementById('profile-avatar').innerHTML = '<img src="' + ev.target.result + '">';
            };
            reader.readAsDataURL(file);

            // Upload
            var formData = new FormData();
            formData.append('avatar', file);
            var token = localStorage.getItem('token');

            window.legacyFetch('/api/perfil/avatar', {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + token },
                body: formData
            })
            .then(function(r) { return r.json(); })
            .then(function(data) {
                if (data.avatar) {
                    // Atualizar localStorage
                    var user = JSON.parse(localStorage.getItem('usuario') || '{}');
                    user.avatar = data.avatar;
                    localStorage.setItem('usuario', JSON.stringify(user));
                    alert('[[icone:confirmar]] Avatar atualizado!');
                    location.reload();
                } else {
                    alert('Erro: ' + (data.error || 'desconhecido'));
                }
            })
            .catch(function(err) {
                alert('Erro: ' + err.message);
            });
        });

        // ==========================================
        // MODAL EDITAR
        // ==========================================
        function abrirModalEditar() {
            document.getElementById('modal-editar').style.display = 'flex';
        }
        function fecharModalEditar() {
            document.getElementById('modal-editar').style.display = 'none';
        }

        function salvarPerfil() {
            var nome = document.getElementById('edit-nome').value.trim();
            if (!nome || nome.length < 2) { alert('Nome muito curto'); return; }

            var btn = document.getElementById('btn-salvar-perfil');
            btn.disabled = true;
            btn.textContent = '[[icone:relogio]]...';

            var token = localStorage.getItem('token');
            window.legacyFetch('/api/perfil', {
                method: 'PUT',
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ nome: nome })
            })
            .then(function(r) { return r.json(); })
            .then(function(data) {
                if (data.error) {
                    alert('Erro: ' + data.error);
                } else {
                    // Atualizar localStorage
                    var user = JSON.parse(localStorage.getItem('usuario') || '{}');
                    user.nome = nome;
                    localStorage.setItem('usuario', JSON.stringify(user));
                    alert('[[icone:confirmar]] Perfil atualizado!');
                    location.reload();
                }
            })
            .catch(function(err) { alert('Erro: ' + err.message); })
            .finally(function() {
                btn.disabled = false;
                btn.textContent = 'Salvar';
            });
        }

        // ==========================================
        // MODAL SENHA
        // ==========================================
        function abrirModalSenha() {
            document.getElementById('senha-atual').value = '';
            document.getElementById('senha-nova').value = '';
            document.getElementById('senha-confirmar').value = '';
            document.getElementById('modal-senha').style.display = 'flex';
        }
        function fecharModalSenha() {
            document.getElementById('modal-senha').style.display = 'none';
        }

        function togglePwd(id, btn) {
            var input = document.getElementById(id);
            var isPwd = input.type === 'password';
            input.type = isPwd ? 'text' : 'password';
            btn.textContent = isPwd ? '[[icone:ocultar]]' : '[[icone:visualizar]]';
        }

        function salvarSenha() {
            var atual = document.getElementById('senha-atual').value;
            var nova = document.getElementById('senha-nova').value;
            var confirmar = document.getElementById('senha-confirmar').value;

            if (!atual) { alert('Digite a senha atual'); return; }
            if (!nova || nova.length < 8) { alert('Nova senha deve ter no mínimo 8 caracteres'); return; }
            if (nova !== confirmar) { alert('As senhas não coincidem'); return; }
            if (atual === nova) { alert('A nova senha deve ser diferente'); return; }

            var btn = document.getElementById('btn-salvar-senha');
            btn.disabled = true;
            btn.textContent = '[[icone:relogio]]...';

            var token = localStorage.getItem('token');
            window.legacyFetch('/api/perfil', {
                method: 'PUT',
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ senhaAtual: atual, novaSenha: nova })
            })
            .then(function(r) { return r.json(); })
            .then(function(data) {
                if (data.error) {
                    alert('Erro: ' + data.error);
                } else {
                    alert('[[icone:confirmar]] Senha alterada!');
                    fecharModalSenha();
                }
            })
            .catch(function(err) { alert('Erro: ' + err.message); })
            .finally(function() {
                btn.disabled = false;
                btn.textContent = 'Alterar Senha';
            });
        }

        // ==========================================
        // NOTIFICAÇÕES
        // ==========================================
        function carregarNotificacoes() {
            var token = localStorage.getItem('token');
            window.legacyFetch('/api/notificacoes', {
                headers: { 'Authorization': 'Bearer ' + token }
            })
            .then(function(r) { return r.json(); })
            .then(function(d) {
                var b = document.getElementById('notificacoes-badge');
                if (b) {
                    var n = d.naoLidas || 0;
                    b.textContent = n;
                    b.style.display = n > 0 ? 'inline-flex' : 'none';
                }
            })
            .catch(function() {});
        }

        // ==========================================
        // INIT
        // ==========================================
        console.log('[[icone:estrela]] Perfil iniciando...');

        carregarSidebar();
        carregarPerfil();
        carregarNotificacoes();

        document.getElementById('logout').addEventListener('click', function(e) {
            e.preventDefault();
            clearSession();
            window.location.href = '../login.html';
        });

        var mt = document.querySelector('.menu-toggle');
        var sb = document.querySelector('.sidebar');
        if (mt && sb) {
            mt.addEventListener('click', function() { sb.classList.toggle('show'); });
            document.addEventListener('click', function(e) {
                if (window.innerWidth > 768) return;
                if (!sb.contains(e.target) && !mt.contains(e.target)) sb.classList.remove('show');
            });
        }

        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                fecharModalEditar();
                fecharModalSenha();
            }
        });

        document.getElementById('modal-editar').addEventListener('click', function(e) {
            if (e.target === this) fecharModalEditar();
        });
        document.getElementById('modal-senha').addEventListener('click', function(e) {
            if (e.target === this) fecharModalSenha();
        });

        console.log('[[icone:confirmar]] Perfil pronto!');
    
Object.assign(window,{...(typeof carregarSidebar === 'function' ? {carregarSidebar} : {}),...(typeof carregarPerfil === 'function' ? {carregarPerfil} : {}),...(typeof renderizarPerfil === 'function' ? {renderizarPerfil} : {}),...(typeof carregarStats === 'function' ? {carregarStats} : {}),...(typeof renderizarAtividades === 'function' ? {renderizarAtividades} : {}),...(typeof abrirModalEditar === 'function' ? {abrirModalEditar} : {}),...(typeof fecharModalEditar === 'function' ? {fecharModalEditar} : {}),...(typeof salvarPerfil === 'function' ? {salvarPerfil} : {}),...(typeof abrirModalSenha === 'function' ? {abrirModalSenha} : {}),...(typeof fecharModalSenha === 'function' ? {fecharModalSenha} : {}),...(typeof togglePwd === 'function' ? {togglePwd} : {}),...(typeof salvarSenha === 'function' ? {salvarSenha} : {}),...(typeof carregarNotificacoes === 'function' ? {carregarNotificacoes} : {})});
})();