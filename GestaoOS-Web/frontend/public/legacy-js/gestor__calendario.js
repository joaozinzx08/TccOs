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
        var viewAtual = 'month';
        var dataAtual = new Date();

        var MESES = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
        var DIAS_SEMANA = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
        var DIAS_SEMANA_CURTO = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

        // ==========================================
        // USUÁRIO
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
        // CARREGAR DADOS (com Promise.allSettled)
        // ==========================================
        async function carregarDados() {
            try {
                console.log('[[icone:atualizar]] Carregando calendário...');
                var token = localStorage.getItem('token');
                var headers = { 'Authorization': 'Bearer ' + token };

                var results = await Promise.allSettled([
                    window.legacyFetch('/api/ordens', { headers: headers }).then(function(r) { return r.json(); }),
                    window.legacyFetch('/api/setores', { headers: headers }).then(function(r) { return r.json(); })
                ]);

                ordens = (results[0].status === 'fulfilled' ? results[0].value : []) || [];
                setores = (results[1].status === 'fulfilled' ? results[1].value : []) || [];

                console.log('[[icone:ordens]] Ordens:', ordens.length, '| Setores:', setores.length);

                preencherSelectSetores();
                renderizar();
                carregarNotificacoes();

            } catch (e) {
                console.error('[[icone:fechar]] Erro:', e);
                // Mesmo com erro, renderiza
                renderizar();
            }
        }

        function preencherSelectSetores() {
            var s = document.getElementById('filter-setor');
            s.innerHTML = '<option value="">Todos os setores</option>';
            setores.filter(function(x) { return x.ativo !== false; }).forEach(function(x) {
                s.innerHTML += '<option value="' + x.id + '">' + window.escapeHTML(x.nome) + '</option>';
            });
        }

        function aplicarFiltros() { renderizar(); }

        function getOrdensFiltradas() {
            var p = document.getElementById('filter-priority').value;
            var si = document.getElementById('filter-setor').value;
            return ordens.filter(function(os) {
                if (p && os.prioridade !== p) return false;
                if (si && os.setorResponsavelId !== si) return false;
                return true;
            });
        }

        // ==========================================
        // NAVEGAÇÃO
        // ==========================================
        function navegarAnterior() {
            if (viewAtual === 'month') dataAtual.setMonth(dataAtual.getMonth() - 1);
            else dataAtual.setDate(dataAtual.getDate() - 1);
            renderizar();
        }
        function navegarProximo() {
            if (viewAtual === 'month') dataAtual.setMonth(dataAtual.getMonth() + 1);
            else dataAtual.setDate(dataAtual.getDate() + 1);
            renderizar();
        }
        function irParaHoje() { dataAtual = new Date(); renderizar(); }
        function mudarView(v, btn) {
            viewAtual = v;
            document.querySelectorAll('.cal-view-btn').forEach(function(b) { b.classList.remove('active'); });
            btn.classList.add('active');
            renderizar();
        }

        // ==========================================
        // RENDER
        // ==========================================
        function renderizar() {
            if (viewAtual === 'month') renderizarMes();
            else renderizarDia();
            atualizarSidebar();
        }

        function renderizarMes() {
            var ano = dataAtual.getFullYear();
            var mes = dataAtual.getMonth();
            document.getElementById('cal-title').textContent = MESES[mes] + ' de ' + ano;

            var primeiroDia = new Date(ano, mes, 1).getDay();
            var ultimoDia = new Date(ano, mes + 1, 0).getDate();
            var ultimoAnterior = new Date(ano, mes, 0).getDate();
            var ordensFiltradas = getOrdensFiltradas();

            var html = '<div class="cal-month"><div class="cal-weekdays">';
            DIAS_SEMANA_CURTO.forEach(function(d) { html += '<div class="cal-weekday">' + d + '</div>'; });
            html += '</div><div class="cal-days">';

            for (var i = primeiroDia - 1; i >= 0; i--) {
                html += criarDiaHTML(new Date(ano, mes - 1, ultimoAnterior - i), false, ordensFiltradas);
            }
            for (var d = 1; d <= ultimoDia; d++) {
                html += criarDiaHTML(new Date(ano, mes, d), true, ordensFiltradas);
            }
            var restantes = (7 - ((primeiroDia + ultimoDia) % 7)) % 7;
            for (var d2 = 1; d2 <= restantes; d2++) {
                html += criarDiaHTML(new Date(ano, mes + 1, d2), false, ordensFiltradas);
            }

            html += '</div></div>';
            document.getElementById('cal-content').innerHTML = html;
        }

        function criarDiaHTML(data, isMes, ordensFiltradas) {
            var hoje = new Date(); hoje.setHours(0,0,0,0);
            var dc = new Date(data); dc.setHours(0,0,0,0);
            var isHoje = dc.getTime() === hoje.getTime();
            var dia = data.getDate();
            var dataStr = data.getFullYear() + '-' + String(data.getMonth()+1).padStart(2,'0') + '-' + String(dia).padStart(2,'0');

            var ordensDoDia = ordensFiltradas.filter(function(os) {
                if (!os.prazo) return false;
                var p = new Date(os.prazo); p.setHours(0,0,0,0);
                return p.getTime() === dc.getTime();
            });

            var temAtrasada = ordensDoDia.some(function(os) {
                var p = new Date(os.prazo); p.setHours(0,0,0,0);
                return p < hoje && os.status !== 'Concluída' && os.status !== 'Cancelada';
            });

            var classes = ['cal-day'];
            if (!isMes) classes.push('other-month');
            if (isHoje) classes.push('today');
            if (temAtrasada) classes.push('has-overdue');

            var eventos = ordensDoDia.slice(0, 3);
            var eventosHTML = eventos.map(function(os) {
                var c = os.prioridade || 'Média';
                if (os.status === 'Concluída') c = 'Concluída';
                var t = os.titulo.length > 18 ? os.titulo.substring(0,18)+'...' : os.titulo;
                return '<div class="cal-event ' + c + '" onclick="event.stopPropagation(); window.location.href=\'ordens.html?id=' + os.id + '\'" title="' + window.escapeHTML(os.titulo) + '">' + t + '</div>';
            }).join('');

            if (ordensDoDia.length > 3) {
                eventosHTML += '<div class="cal-event-more" onclick="event.stopPropagation(); abrirModalDia(\'' + dataStr + '\')">+' + (ordensDoDia.length - 3) + ' mais</div>';
            }

            var count = '';
            if (ordensDoDia.length > 0) {
                count = '<span class="cal-day-count ' + (temAtrasada ? 'overdue' : '') + '">' + ordensDoDia.length + '</span>';
            }

            return '<div class="' + classes.join(' ') + '" onclick="abrirModalDia(\'' + dataStr + '\')">' +
                '<div class="cal-day-header">' +
                    '<span class="cal-day-number">' + dia + '</span>' +
                    count +
                '</div>' +
                '<div class="cal-day-events">' + eventosHTML + '</div>' +
            '</div>';
        }

        function renderizarDia() {
            var ano = dataAtual.getFullYear();
            var mes = dataAtual.getMonth();
            var dia = dataAtual.getDate();
            var diaSemana = DIAS_SEMANA[dataAtual.getDay()];
            document.getElementById('cal-title').textContent = dia + ' de ' + MESES[mes] + ' de ' + ano;

            var ordensFiltradas = getOrdensFiltradas();
            var ordensDoDia = ordensFiltradas.filter(function(os) {
                if (!os.prazo) return false;
                var p = new Date(os.prazo);
                return p.getFullYear() === ano && p.getMonth() === mes && p.getDate() === dia;
            });

            var peso = { 'Urgente': 4, 'Alta': 3, 'Média': 2, 'Baixa': 1 };
            ordensDoDia.sort(function(a,b) { return (peso[b.prioridade]||0) - (peso[a.prioridade]||0); });

            var hoje = new Date(); hoje.setHours(0,0,0,0);

            var html = '<div class="cal-day-view"><div class="cal-day-view-header"><div>' +
                '<div class="cal-day-view-title">' + diaSemana + ', ' + dia + ' de ' + MESES[mes] + ' de ' + ano + '</div>' +
                '<div class="cal-day-view-subtitle">' + ordensDoDia.length + ' ordem(ns) com prazo neste dia</div>' +
            '</div></div>';

            if (ordensDoDia.length === 0) {
                html += '<div class="cal-empty"><span class="cal-empty-icon">[[icone:estrela]]</span><h3>Nenhuma OS com prazo neste dia</h3></div>';
            } else {
                html += '<div class="day-events-list">';
                ordensDoDia.forEach(function(os) {
                    var setor = setores.find(function(s) { return s.id === os.setorResponsavelId; });
                    var isConc = os.status === 'Concluída';
                    var isCanc = os.status === 'Cancelada';
                    var p = new Date(os.prazo); p.setHours(0,0,0,0);
                    var isAtr = p < hoje && !isConc && !isCanc;
                    var c = os.prioridade || 'Média';
                    if (isConc) c = 'Concluída';

                    html += '<div class="day-event-item ' + c + '" onclick="window.location.href=\'ordens.html?id=' + os.id + '\'">' +
                        '<div class="day-event-content">' +
                            '<div class="day-event-title">' +
                                '#' + shortId(os.id) + ' - ' + window.escapeHTML(os.titulo) +
                                (os.sigilo ? ' [[icone:cadeado]]' : '') +
                                (isAtr ? ' <span class="badge badge-danger" style="font-size:0.625rem;">ATRASADA</span>' : '') +
                                (isConc ? ' <span class="badge badge-success" style="font-size:0.625rem;">CONCLUÍDA</span>' : '') +
                            '</div>' +
                            '<div class="day-event-meta">' +
                                '<span>' + os.prioridade + '</span>' +
                                '<span>[[icone:setores]] ' + (setor ? setor.nome : '—') + '</span>' +
                                '<span>[[icone:painel]] ' + os.status + '</span>' +
                            '</div>' +
                        '</div>' +
                    '</div>';
                });
                html += '</div>';
            }
            html += '</div>';
            document.getElementById('cal-content').innerHTML = html;
        }

        // ==========================================
        // MODAL DIA
        // ==========================================
        function abrirModalDia(dataStr) {
            var partes = dataStr.split('-').map(Number);
            var ano = partes[0], mes = partes[1], dia = partes[2];
            var data = new Date(ano, mes - 1, dia);
            var diaSemana = DIAS_SEMANA[data.getDay()];

            document.getElementById('day-modal-title').textContent = diaSemana + ', ' + dia + ' de ' + MESES[mes - 1];

            var ordensFiltradas = getOrdensFiltradas();
            var doDia = ordensFiltradas.filter(function(os) {
                if (!os.prazo) return false;
                var p = new Date(os.prazo);
                return p.getFullYear() === ano && p.getMonth() === mes - 1 && p.getDate() === dia;
            });

            var c = document.getElementById('day-modal-events');
            if (doDia.length === 0) {
                c.innerHTML = '<div class="cal-empty" style="padding:30px;"><span class="cal-empty-icon">[[icone:pasta]]</span><h3>Nenhuma OS</h3></div>';
            } else {
                c.innerHTML = doDia.map(function(os) {
                    var setor = setores.find(function(s) { return s.id === os.setorResponsavelId; });
                    return '<div class="upcoming-item" onclick="window.location.href=\'ordens.html?id=' + os.id + '\'" style="padding:12px;">' +
                        '<div class="upcoming-info">' +
                            '<div class="upcoming-title">#' + shortId(os.id) + ' - ' + window.escapeHTML(os.titulo) + '</div>' +
                            '<div class="upcoming-meta">' + os.prioridade + ' · [[icone:setores]] ' + (setor ? setor.nome : '—') + ' · [[icone:painel]] ' + os.status + '</div>' +
                        '</div>' +
                    '</div>';
                }).join('');
            }

            document.getElementById('day-modal').style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }

        function fecharModalDia() {
            document.getElementById('day-modal').style.display = 'none';
            document.body.style.overflow = '';
        }

        // ==========================================
        // SIDEBAR INFO
        // ==========================================
        function atualizarSidebar() {
            var ano = dataAtual.getFullYear();
            var mes = dataAtual.getMonth();
            var ordensFiltradas = getOrdensFiltradas();
            var doMes = ordensFiltradas.filter(function(os) {
                if (!os.prazo) return false;
                var p = new Date(os.prazo);
                return p.getFullYear() === ano && p.getMonth() === mes;
            });

            var hoje = new Date(); hoje.setHours(0,0,0,0);

            document.getElementById('stat-total').textContent = doMes.length;
            document.getElementById('stat-urgentes').textContent = doMes.filter(function(o) { return o.prioridade === 'Urgente'; }).length;
            document.getElementById('stat-atrasadas').textContent = doMes.filter(function(o) {
                var p = new Date(o.prazo); p.setHours(0,0,0,0);
                return p < hoje && o.status !== 'Concluída' && o.status !== 'Cancelada';
            }).length;
            document.getElementById('stat-concluidas').textContent = doMes.filter(function(o) { return o.status === 'Concluída'; }).length;

            var proximos = ordensFiltradas
                .filter(function(os) {
                    if (!os.prazo) return false;
                    var p = new Date(os.prazo); p.setHours(0,0,0,0);
                    var diff = Math.ceil((p - hoje) / (1000*60*60*24));
                    return diff >= 0 && diff <= 7 && os.status !== 'Concluída' && os.status !== 'Cancelada';
                })
                .sort(function(a,b) { return new Date(a.prazo) - new Date(b.prazo); })
                .slice(0, 5);

            var ul = document.getElementById('upcoming-list');
            if (proximos.length === 0) {
                ul.innerHTML = '<div class="cal-empty" style="padding:20px 0;"><span style="font-size:1.5rem;">[[icone:estrela]]</span><p style="font-size:0.75rem; margin-top:4px;">Nenhum prazo próximo!</p></div>';
            } else {
                ul.innerHTML = proximos.map(function(os) {
                    var p = new Date(os.prazo);
                    var diff = Math.ceil((p - hoje) / (1000*60*60*24));
                    var c = '';
                    if (diff <= 1) c = 'danger';
                    else if (diff <= 3) c = 'warning';
                    var d = String(p.getDate()).padStart(2,'0');
                    var m = p.toLocaleDateString('pt-BR', { month: 'short' }).replace('.','');

                    return '<div class="upcoming-item" onclick="window.location.href=\'ordens.html?id=' + os.id + '\'">' +
                        '<div class="upcoming-date ' + c + '">' +
                            '<span class="upcoming-day">' + d + '</span>' +
                            '<span class="upcoming-month">' + m + '</span>' +
                        '</div>' +
                        '<div class="upcoming-info">' +
                            '<div class="upcoming-title">' + window.escapeHTML(os.titulo) + '</div>' +
                            '<div class="upcoming-meta">' + (diff === 0 ? '[[icone:prioridade]] Hoje' : diff === 1 ? '[[icone:alerta]] Amanhã' : '[[icone:calendario]] ' + diff + ' dias') + '</div>' +
                        '</div>' +
                    '</div>';
                }).join('');
            }
        }

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
        console.log('[[icone:estrela]] Calendário iniciando...');

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

        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') fecharModalDia();
            if (document.activeElement && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'SELECT') {
                if (e.key === 'ArrowLeft') navegarAnterior();
                if (e.key === 'ArrowRight') navegarProximo();
            }
        });

        document.getElementById('day-modal').addEventListener('click', function(e) {
            if (e.target.id === 'day-modal') fecharModalDia();
        });

        // ==========================================
        // AUTO-REFRESH A CADA 30 SEGUNDOS
        // ==========================================
        setInterval(function() {
            console.log('[[icone:atualizar]] Auto-refresh calendário...');
            carregarDados();
        }, 30000);

        console.log('[[icone:confirmar]] Calendário pronto!');
    
Object.assign(window,{...(typeof carregarInfoUsuario === 'function' ? {carregarInfoUsuario} : {}),...(typeof carregarDados === 'function' ? {carregarDados} : {}),...(typeof preencherSelectSetores === 'function' ? {preencherSelectSetores} : {}),...(typeof aplicarFiltros === 'function' ? {aplicarFiltros} : {}),...(typeof getOrdensFiltradas === 'function' ? {getOrdensFiltradas} : {}),...(typeof navegarAnterior === 'function' ? {navegarAnterior} : {}),...(typeof navegarProximo === 'function' ? {navegarProximo} : {}),...(typeof irParaHoje === 'function' ? {irParaHoje} : {}),...(typeof mudarView === 'function' ? {mudarView} : {}),...(typeof renderizar === 'function' ? {renderizar} : {}),...(typeof renderizarMes === 'function' ? {renderizarMes} : {}),...(typeof criarDiaHTML === 'function' ? {criarDiaHTML} : {}),...(typeof renderizarDia === 'function' ? {renderizarDia} : {}),...(typeof abrirModalDia === 'function' ? {abrirModalDia} : {}),...(typeof fecharModalDia === 'function' ? {fecharModalDia} : {}),...(typeof atualizarSidebar === 'function' ? {atualizarSidebar} : {}),...(typeof carregarNotificacoes === 'function' ? {carregarNotificacoes} : {})});
})();