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

        // Ajustar menu para gestor/colaborador
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
            // Colaborador: manter só dashboard, minhas-ordens, chat, perfil, sair
            var permitidos = ['Dashboard', 'Minhas Ordens', 'Chat', 'Meu Perfil', 'Sair'];
            document.querySelectorAll('.sidebar-menu li').forEach(function(li) {
                var link = li.querySelector('a');
                if (!link) return;
                var texto = link.textContent.trim();
                if (!permitidos.some(function(p) { return texto.includes(p); })) {
                    li.remove();
                }
            });
            // Trocar link de dashboard para minhas-ordens (colaborador)
            document.querySelectorAll('.sidebar-menu a').forEach(function(a) {
                var texto = a.textContent.trim();
                if (texto.includes('Dashboard')) {
                    a.setAttribute('href', '../colaborador/dashboard.html');
                }
            });
        }

        // ==========================================
        // ESTADO
        // ==========================================
        var conversas = [];
        var usuarios = [];
        var conversaAtual = null;

        // ==========================================
        // USUÁRIO NA SIDEBAR
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
                avatarEl.innerHTML = '<img src="' + window.avatarURL(usuarioAtual.avatar) + '" alt="Avatar">';
            } else {
                avatarEl.textContent = primeiro.charAt(0).toUpperCase();
            }
        }

        // ==========================================
        // CARREGAR DADOS
        // ==========================================
        async function carregarDados() {
            try {
                usuarios = (await apiRequest('/usuarios')).filter(u => u.ativo).map(u => ({...u,email:u.email || ''}));
                const rows = await apiRequest('/chats');
                conversas = await Promise.all(rows.map(async c => ({...c,tipo:c.tipo==='empresa'?'grupo':'direto',participantes:c.tipo==='empresa'?usuarios.map(u=>u.id):c.participantes,mensagens:(await apiRequest('/chats/'+c.id+'/mensagens')).map(m=>({...m,lidaPor:m.lidaPor||[m.usuarioId]}))})));
                if (conversaAtual) { conversaAtual=conversas.find(c=>c.id===conversaAtual.id)||null; renderizarMensagens(); }
                renderizarConversas(); carregarNotificacoes();
            } catch(e) { showToast(e.message,'error'); }
        }

        function salvarConversas() { /* Persistência realizada pela API. */
        }

        // ==========================================
        // RENDERIZAR CONVERSAS
        // ==========================================
        function renderizarConversas() {
            var container = document.getElementById('chat-conversations');
            var search = document.getElementById('search-conv').value.toLowerCase().trim();

            document.getElementById('total-conv').textContent = conversas.length;

            if (conversas.length === 0) {
                container.innerHTML = '<div class="chat-empty" style="padding:40px 20px;"><span class="chat-empty-icon">[[icone:chat]]</span><h3>Nenhuma conversa</h3><p>Clique em [[icone:adicionar]] para iniciar</p></div>';
                return;
            }

            var filtradas = conversas.filter(function(c) {
                if (!search) return true;
                if (c.tipo === 'grupo') return c.nome.toLowerCase().includes(search);
                var outroId = c.participantes.find(function(p) { return p !== usuarioAtual.id; });
                var outro = usuarios.find(function(u) { return u.id === outroId; });
                return outro && (outro.nome.toLowerCase().includes(search) || outro.email.toLowerCase().includes(search));
            });

            // Ordenar: com mensagens primeiro
            filtradas.sort(function(a, b) {
                var lastA = a.mensagens.length > 0 ? new Date(a.mensagens[a.mensagens.length - 1].data) : new Date(a.criadoEm);
                var lastB = b.mensagens.length > 0 ? new Date(b.mensagens[b.mensagens.length - 1].data) : new Date(b.criadoEm);
                return lastB - lastA;
            });

            container.innerHTML = filtradas.map(function(c) { return criarItemConv(c); }).join('');
        }

        function criarItemConv(conv) {
            var isAtiva = conversaAtual && conversaAtual.id === conv.id;
            var lastMsg = conv.mensagens.length > 0 ? conv.mensagens[conv.mensagens.length - 1] : null;

            var nome, avatarHTML, avatarClass = '';
            if (conv.tipo === 'grupo') {
                nome = conv.nome;
                avatarClass = 'group';
                avatarHTML = '[[icone:equipe]]';
            } else {
                var outroId = conv.participantes.find(function(p) { return p !== usuarioAtual.id; });
                var outro = usuarios.find(function(u) { return u.id === outroId; });
                if (!outro) { nome = 'Usuário removido'; avatarHTML = '?'; }
                else {
                    nome = outro.nome;
                    avatarHTML = outro.avatar ? '<img src="' + window.avatarURL(outro.avatar) + '" alt="' + nome + '">' : nome.charAt(0).toUpperCase();
                }
            }

            var lastMsgHTML = '<em style="color:var(--text-muted);">Nenhuma mensagem</em>';
            var timeHTML = timeAgo(conv.criadoEm);

            if (lastMsg) {
                var sender = usuarios.find(function(u) { return u.id === lastMsg.usuarioId; });
                var isOwn = lastMsg.usuarioId === usuarioAtual.id;
                var senderName = isOwn ? 'Você' : (sender ? sender.nome.split(' ')[0] : '?');
                var preview = lastMsg.texto.length > 35 ? lastMsg.texto.substring(0, 35) + '...' : lastMsg.texto;
                lastMsgHTML = '<strong>' + senderName + ':</strong> ' + preview;
                timeHTML = timeAgo(lastMsg.data);
            }

            var unread = conv.mensagens.filter(function(m) {
                return m.usuarioId !== usuarioAtual.id && m.lidaPor.indexOf(usuarioAtual.id) === -1;
            }).length;

            return '<div class="chat-conversation-item ' + (isAtiva ? 'active' : '') + '" onclick="abrirConversa(\'' + conv.id + '\')">' +
                '<div class="chat-avatar ' + avatarClass + '">' + avatarHTML + '</div>' +
                '<div class="chat-conv-info">' +
                    '<div class="chat-conv-name"><span>' + nome + '</span><span class="chat-conv-time">' + timeHTML + '</span></div>' +
                    '<div class="chat-conv-last">' + lastMsgHTML + '</div>' +
                '</div>' +
                (unread > 0 ? '<span class="chat-unread-badge">' + unread + '</span>' : '') +
            '</div>';
        }

        // ==========================================
        // ABRIR CONVERSA
        // ==========================================
        function abrirConversa(id) {
            var conv = conversas.find(function(c) { return c.id === id; });
            if (!conv) return;
            conversaAtual = conv;

            apiRequest('/chats/'+id+'/leitura',{method:'PATCH'}).catch(e=>showToast(e.message,'error'));
            // Marcar como lida
            conv.mensagens.forEach(function(m) {
                if (m.lidaPor.indexOf(usuarioAtual.id) === -1) m.lidaPor.push(usuarioAtual.id);
            });
            salvarConversas();

            renderizarConversas();
            renderizarHeader();
            renderizarMensagens();

            document.getElementById('chat-input-container').style.display = 'block';
            document.getElementById('chat-header').style.display = 'flex';
            document.getElementById('chat-wrapper').classList.add('show-chat');

            setTimeout(function() { var i = document.getElementById('chat-input'); if (i) i.focus(); }, 300);
        }

        function renderizarHeader() {
            if (!conversaAtual) return;
            var conv = conversaAtual;
            var nome, avatarHTML, avatarClass = '', statusText = '';

            if (conv.tipo === 'grupo') {
                nome = conv.nome;
                avatarClass = 'group';
                avatarHTML = '[[icone:equipe]]';
                statusText = conv.participantes.length + ' participantes';
            } else {
                var outroId = conv.participantes.find(function(p) { return p !== usuarioAtual.id; });
                var outro = usuarios.find(function(u) { return u.id === outroId; });
                if (outro) {
                    nome = outro.nome;
                    avatarHTML = outro.avatar ? '<img src="' + window.avatarURL(outro.avatar) + '">' : nome.charAt(0).toUpperCase();
                    statusText = outro.email;
                } else { nome = 'Usuário removido'; avatarHTML = '?'; statusText = 'Indisponível'; }
            }

            var av = document.getElementById('chat-main-avatar');
            av.className = 'chat-main-avatar ' + avatarClass;
            av.innerHTML = avatarHTML;

            document.getElementById('chat-main-name').textContent = nome;
            document.getElementById('chat-main-status').textContent = statusText;
        }

        // ==========================================
        // RENDERIZAR MENSAGENS
        // ==========================================
        function renderizarMensagens() {
            var container = document.getElementById('chat-messages');

            if (!conversaAtual) {
                container.innerHTML = '<div class="chat-empty"><span class="chat-empty-icon">[[icone:chat]]</span><h3>Selecione uma conversa</h3></div>';
                return;
            }

            var msgs = conversaAtual.mensagens;
            if (msgs.length === 0) {
                container.innerHTML = '<div class="chat-empty"><span class="chat-empty-icon">[[icone:usuario]]</span><h3>Nenhuma mensagem ainda</h3><p>Diga olá para começar!</p></div>';
                return;
            }

            var html = '';
            var dataAtual = '';

            msgs.forEach(function(msg, index) {
                var dataMsg = new Date(msg.data);
                var dataStr = dataMsg.toLocaleDateString('pt-BR');

                if (dataStr !== dataAtual) {
                    dataAtual = dataStr;
                    html += '<div class="chat-date-separator"><span>' + formatarDataSep(dataMsg) + '</span></div>';
                }

                var anterior = index > 0 ? msgs[index - 1] : null;
                var isFirst = !anterior || anterior.usuarioId !== msg.usuarioId || (new Date(msg.data) - new Date(anterior.data)) > 5 * 60 * 1000;

                html += criarBolha(msg, isFirst);
            });

            container.innerHTML = html;
            setTimeout(function() { container.scrollTop = container.scrollHeight; }, 100);
        }

        function criarBolha(msg, isFirst) {
            var isOwn = msg.usuarioId === usuarioAtual.id;
            var sender = usuarios.find(function(u) { return u.id === msg.usuarioId; });

            var avatarHTML = '';
            if (!isOwn) {
                if (isFirst && sender) {
                    avatarHTML = sender.avatar ? '<img src="' + window.avatarURL(sender.avatar) + '">' : sender.nome.charAt(0).toUpperCase();
                }
            }

            var hora = new Date(msg.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            var statusHTML = '';
            if (isOwn) {
                var lidasPor = msg.lidaPor.filter(function(id) { return id !== usuarioAtual.id; }).length;
                var totalOutros = conversaAtual.participantes.filter(function(id) { return id !== usuarioAtual.id; }).length;
                var isRead = lidasPor >= totalOutros;
                statusHTML = '<span class="chat-msg-status ' + (isRead ? 'read' : '') + '">' + (isRead ? '✓✓' : '✓') + '</span>';
            }

            return '<div class="chat-msg-group ' + (isOwn ? 'own' : '') + '">' +
                (!isOwn ? '<div class="chat-msg-avatar ' + (isFirst ? '' : 'hidden') + '">' + avatarHTML + '</div>' : '') +
                '<div class="chat-bubble-wrapper">' +
                    (!isOwn && isFirst ? '<div class="chat-msg-sender">' + (sender ? sender.nome : 'Usuário') + '</div>' : '') +
                    '<div class="chat-bubble">' + escapeHTML(msg.texto) + '</div>' +
                    '<div class="chat-msg-meta"><span>' + hora + '</span>' + statusHTML + '</div>' +
                '</div>' +
            '</div>';
        }

        function escapeHTML(text) {
            var div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        function formatarDataSep(data) {
            var hoje = new Date();
            var ontem = new Date(); ontem.setDate(ontem.getDate() - 1);
            if (data.toDateString() === hoje.toDateString()) return 'Hoje';
            if (data.toDateString() === ontem.toDateString()) return 'Ontem';
            return data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });
        }

        // ==========================================
        // ENVIAR MENSAGEM
        // ==========================================
        async function enviarMensagem() {
            if (!conversaAtual) return;
            const input=document.getElementById('chat-input'),texto=input.value.trim(); if(!texto)return;
            try { await apiRequest('/chats/'+conversaAtual.id+'/mensagens',{method:'POST',body:JSON.stringify({texto})}); input.value='';input.style.height='auto';await carregarDados(); }
            catch(e){showToast(e.message,'error');}
        }

        function handleInputKeydown(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                enviarMensagem();
            }
        }

        function autoResize(el) {
            el.style.height = 'auto';
            el.style.height = Math.min(el.scrollHeight, 120) + 'px';
            document.getElementById('chat-send-btn').disabled = !el.value.trim();
        }

        function voltarConversas() {
            document.getElementById('chat-wrapper').classList.remove('show-chat');
        }

        // ==========================================
        // MODAL NOVA CONVERSA
        // ==========================================
        function abrirModalNovaConversa() {
            document.getElementById('modal-nova-conversa').style.display = 'flex';
            document.getElementById('search-user-new').value = '';
            renderizarUsuariosModal();
        }

        function fecharModalNovaConversa() {
            document.getElementById('modal-nova-conversa').style.display = 'none';
        }

        function renderizarUsuariosModal() {
            var container = document.getElementById('user-list-modal');
            var search = document.getElementById('search-user-new').value.toLowerCase().trim();

            var filtrados = usuarios.filter(function(u) { return u.id !== usuarioAtual.id; });
            if (search) {
                filtrados = filtrados.filter(function(u) {
                    return u.nome.toLowerCase().includes(search) || (u.email||'').toLowerCase().includes(search);
                });
            }

            if (filtrados.length === 0) {
                container.innerHTML = '<div class="chat-empty" style="padding:20px;"><p>Nenhum usuário encontrado</p></div>';
                return;
            }

            container.innerHTML = filtrados.map(function(u) {
                var av = u.avatar ? '<img src="' + window.avatarURL(u.avatar) + '">' : u.nome.charAt(0).toUpperCase();
                return '<div class="user-list-item" onclick="iniciarConversa(\'' + u.id + '\')">' +
                    '<div class="user-list-avatar">' + av + '</div>' +
                    '<div class="user-list-info">' +
                        '<div class="user-list-name">' + window.escapeHTML(u.nome) + '</div>' +
                        '<div class="user-list-email">' + window.escapeHTML(u.email) + '</div>' +
                    '</div>' +
                '</div>';
            }).join('');
        }

        async function iniciarConversa(outroId) {
            try { const c=await apiRequest('/chats',{method:'POST',body:JSON.stringify({usuarioId:outroId})});await carregarDados();fecharModalNovaConversa();abrirConversa(c.id); }
            catch(e){showToast(e.message,'error');}
        }

        async function carregarNotificacoes() {
            try {
                var d = await apiRequest('/notificacoes');
                var b = document.getElementById('notificacoes-badge');
                if (b) {
                    var n = d.naoLidas || 0;
                    b.textContent = n;
                    b.style.display = n > 0 ? 'inline-flex' : 'none';
                }
            } catch (e) {}
        }

        // ==========================================
        // INIT — EXECUTA DIRETO
        // ==========================================
        console.log('[[icone:estrela]] Chat iniciando...');

        carregarSidebar();
        carregarDados();
        setInterval(carregarDados, 5000);

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

        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') fecharModalNovaConversa();
        });

        document.getElementById('modal-nova-conversa').addEventListener('click', function(e) {
            if (e.target === this) fecharModalNovaConversa();
        });

        console.log('[[icone:confirmar]] Chat pronto!');
    
Object.assign(window,{...(typeof carregarSidebar === 'function' ? {carregarSidebar} : {}),...(typeof carregarDados === 'function' ? {carregarDados} : {}),...(typeof salvarConversas === 'function' ? {salvarConversas} : {}),...(typeof renderizarConversas === 'function' ? {renderizarConversas} : {}),...(typeof criarItemConv === 'function' ? {criarItemConv} : {}),...(typeof abrirConversa === 'function' ? {abrirConversa} : {}),...(typeof renderizarHeader === 'function' ? {renderizarHeader} : {}),...(typeof renderizarMensagens === 'function' ? {renderizarMensagens} : {}),...(typeof criarBolha === 'function' ? {criarBolha} : {}),...(typeof escapeHTML === 'function' ? {escapeHTML} : {}),...(typeof formatarDataSep === 'function' ? {formatarDataSep} : {}),...(typeof enviarMensagem === 'function' ? {enviarMensagem} : {}),...(typeof handleInputKeydown === 'function' ? {handleInputKeydown} : {}),...(typeof autoResize === 'function' ? {autoResize} : {}),...(typeof voltarConversas === 'function' ? {voltarConversas} : {}),...(typeof abrirModalNovaConversa === 'function' ? {abrirModalNovaConversa} : {}),...(typeof fecharModalNovaConversa === 'function' ? {fecharModalNovaConversa} : {}),...(typeof renderizarUsuariosModal === 'function' ? {renderizarUsuariosModal} : {}),...(typeof iniciarConversa === 'function' ? {iniciarConversa} : {}),...(typeof carregarNotificacoes === 'function' ? {carregarNotificacoes} : {})});
})();