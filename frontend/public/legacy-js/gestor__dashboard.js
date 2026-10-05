(function(){

        // ==========================================
        // PROTEÇÃO DA PÁGINA
        // ==========================================
        if (!protegerPagina(['gestor'])) {
            throw new Error('Acesso negado');
        }

        // ==========================================
        // ESTADO
        // ==========================================
        let chartStatus = null;
        let chartPrioridade = null;
        let cachedOrdens = [];

        // ==========================================
        // DATA ATUAL
        // ==========================================
        function atualizarDataAtual() {
            const data = new Date();
            const opcoes = { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            };
            const dataFormatada = data.toLocaleDateString('pt-BR', opcoes);
            document.getElementById('current-date').textContent = 
                dataFormatada.charAt(0).toUpperCase() + dataFormatada.slice(1);
        }

        // ==========================================
        // CARREGAR USUÁRIO
        // ==========================================
        function carregarUsuario() {
            const usuario = getUsuario();
            if (!usuario) return;

            const primeiroNome = usuario.nome.split(' ')[0];
            
            document.getElementById('welcome-title').textContent = 
                `Olá, ${primeiroNome}! [[icone:usuario]]`;
            
            document.getElementById('welcome-subtitle').textContent = 
                'Aqui está o resumo das ordens do seu setor';

            // Avatar
            const avatarEl = document.getElementById('sidebar-avatar');
            if (usuario.avatar) {
                avatarEl.innerHTML = `<img src="${window.avatarURL(usuario.avatar)}" alt="Avatar">`;
            } else {
                avatarEl.textContent = primeiroNome.charAt(0).toUpperCase();
            }
        }

        // ==========================================
        // CARREGAR SETOR
        // ==========================================
        async function carregarSetor() {
            try {
                const usuario = getUsuario();
                if (!usuario || !usuario.setorId) {
                    document.getElementById('setor-nome').textContent = '[[icone:alerta]] Sem setor';
                    document.getElementById('setor-desc').textContent = 
                        'Você não está vinculado a um setor. Contate o administrador.';
                    return;
                }

                // Buscar dados do setor
                const setores = await apiRequest('/setores');
                const meuSetor = setores.find(s => s.id === usuario.setorId);
                
                if (meuSetor) {
                    document.getElementById('setor-nome').textContent = 
                        `[[icone:setores]] ${window.escapeHTML(meuSetor.nome)}`;
                    document.getElementById('setor-desc').textContent = 
                        meuSetor.descricao || 'Gerenciando ordens de serviço do setor';
                }
            } catch (error) {
                console.error('Erro ao carregar setor:', error);
            }
        }

        // ==========================================
        // CARREGAR DASHBOARD
        // ==========================================
        async function carregarDashboard() {
            try {
                const data = await apiRequest('/dashboard');
                
                // ===== STATS =====
                animarNumero('total-os', data.stats.total || 0);
                animarNumero('abertas-os', data.stats.abertas || 0);
                animarNumero('atendimento-os', data.stats.emAtendimento || 0);
                animarNumero('concluidas-os', data.stats.concluidas || 0);
                animarNumero('urgentes-os', data.stats.urgentes || 0);
                animarNumero('atrasadas-os', data.stats.atrasadas || 0);

                // ===== CARD DO SETOR =====
                const pendentes = (data.stats.abertas || 0) + (data.stats.emAtendimento || 0);
                document.getElementById('setor-total').textContent = data.stats.total || 0;
                document.getElementById('setor-pendentes').textContent = pendentes;

                // ===== GRÁFICOS =====
                atualizarGraficos(data.charts);

                // ===== ORDENS =====
                await carregarOrdens(data.ultimasOS);

                // ===== NOTIFICAÇÕES =====
                carregarNotificacoes();

            } catch (error) {
                console.error('Erro ao carregar dashboard:', error);
                showToast('Erro ao carregar dados do dashboard', 'error');
            }
        }

        // ==========================================
        // ANIMAR NÚMEROS
        // ==========================================
        function animarNumero(elementId, valorFinal) {
            const el = document.getElementById(elementId);
            if (!el) return;

            const duracao = 800;
            const inicio = performance.now();
            const valorInicial = 0;

            function animar(tempo) {
                const progresso = Math.min((tempo - inicio) / duracao, 1);
                const valorAtual = Math.floor(valorInicial + (valorFinal - valorInicial) * progresso);
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
        // ATUALIZAR GRÁFICOS
        // ==========================================
        function atualizarGraficos(charts) {
            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            const gridColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';
            const textColor = isDark ? '#94a3b8' : '#475569';

            // ===== GRÁFICO DE STATUS =====
            if (chartStatus) chartStatus.destroy();
            const ctxStatus = document.getElementById('chart-status').getContext('2d');
            const statusData = charts.porStatus || [];
            
            const statusColors = {
                'Aberta': '#3b82f6',
                'Encaminhada': '#f59e0b',
                'Em atendimento': '#8b5cf6',
                'Aguardando informação': '#ef4444',
                'Concluída': '#10b981',
                'Cancelada': '#6b7280'
            };
            
            const statusLabels = statusData.length > 0 ? statusData.map(d => d.label) : ['Sem dados'];
            const statusValues = statusData.length > 0 ? statusData.map(d => d.value) : [0];
            const statusColorsArr = statusLabels.map(label => statusColors[label] || '#6b7280');

            chartStatus = new Chart(ctxStatus, {
                type: 'doughnut',
                data: {
                    labels: statusLabels,
                    datasets: [{
                        data: statusValues,
                        backgroundColor: statusColorsArr,
                        borderWidth: 0,
                        hoverOffset: 8
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '65%',
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                usePointStyle: true,
                                pointStyle: 'circle',
                                padding: 12,
                                color: textColor,
                                font: { size: 11 }
                            }
                        }
                    }
                }
            });

            // ===== GRÁFICO DE PRIORIDADE =====
            // Contar por prioridade das ordens carregadas
            if (chartPrioridade) chartPrioridade.destroy();
            const ctxPrioridade = document.getElementById('chart-prioridade').getContext('2d');
            
            const prioridadeCount = {
                'Baixa': 0,
                'Média': 0,
                'Alta': 0,
                'Urgente': 0
            };
            
            cachedOrdens.forEach(os => {
                if (prioridadeCount[os.prioridade] !== undefined) {
                    prioridadeCount[os.prioridade]++;
                }
            });

            chartPrioridade = new Chart(ctxPrioridade, {
                type: 'bar',
                data: {
                    labels: Object.keys(prioridadeCount),
                    datasets: [{
                        label: 'OS por Prioridade',
                        data: Object.values(prioridadeCount),
                        backgroundColor: [
                            'rgba(16, 185, 129, 0.75)',
                            'rgba(245, 158, 11, 0.75)',
                            'rgba(249, 115, 22, 0.75)',
                            'rgba(239, 68, 68, 0.75)'
                        ],
                        borderColor: [
                            'rgba(16, 185, 129, 1)',
                            'rgba(245, 158, 11, 1)',
                            'rgba(249, 115, 22, 1)',
                            'rgba(239, 68, 68, 1)'
                        ],
                        borderWidth: 2,
                        borderRadius: 8,
                        borderSkipped: false
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                stepSize: 1,
                                color: textColor,
                                font: { size: 11 }
                            },
                            grid: { color: gridColor, drawBorder: false }
                        },
                        x: {
                            ticks: {
                                color: textColor,
                                font: { size: 11 }
                            },
                            grid: { display: false }
                        }
                    }
                }
            });
        }

        // ==========================================
        // CARREGAR ORDENS
        // ==========================================
        async function carregarOrdens(ultimasOS) {
            try {
                // Buscar todas as ordens do setor
                const ordens = await apiRequest('/ordens');
                cachedOrdens = ordens || [];

                // Re-renderizar gráfico de prioridade com dados completos
                const charts = await apiRequest('/dashboard');
                atualizarGraficos(charts.charts);

                // Mostrar ordens urgentes + recentes
                atualizarListaOrdens();

            } catch (error) {
                console.error('Erro ao carregar ordens:', error);
            }
        }

        // ==========================================
        // ATUALIZAR LISTA DE ORDENS
        // ==========================================
        function atualizarListaOrdens() {
            const container = document.getElementById('urgent-os-list');

            if (!cachedOrdens || cachedOrdens.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <span class="empty-icon">[[icone:pasta]]</span>
                        <h3>Nenhuma ordem no setor</h3>
                        <p>Aguardando novas solicitações</p>
                    </div>
                `;
                return;
            }

            // Priorizar: urgentes primeiro, depois as mais recentes
            const ordenadas = [...cachedOrdens].sort((a, b) => {
                const prioridadePeso = { 'Urgente': 4, 'Alta': 3, 'Média': 2, 'Baixa': 1 };
                const pesoA = prioridadePeso[a.prioridade] || 0;
                const pesoB = prioridadePeso[b.prioridade] || 0;
                
                if (pesoA !== pesoB) return pesoB - pesoA;
                
                // Se mesma prioridade, ordenar por data (mais recente primeiro)
                return new Date(b.dataAbertura) - new Date(a.dataAbertura);
            });

            // Pegar as 5 primeiras
            const top5 = ordenadas.slice(0, 5);

            container.innerHTML = top5.map(os => {
                const prioridadeClass = (os.prioridade || 'Média').toLowerCase();
                const isUrgente = os.prioridade === 'Urgente';
                const isAtrasada = os.prazo && new Date(os.prazo) < new Date() && 
                                   os.status !== 'Concluída' && os.status !== 'Cancelada';
                
                // Cor da borda lateral
                let borderColor = 'var(--primary)';
                if (isUrgente) borderColor = 'var(--danger)';
                else if (isAtrasada) borderColor = 'var(--warning)';
                else if (os.status === 'Concluída') borderColor = 'var(--success)';

                return `
                    <div class="urgent-os-item" 
                         style="border-left-color: ${borderColor};"
                         onclick="verOS('${os.id}')">
                        <div class="urgent-os-header">
                            <span class="urgent-os-title">#${shortId(os.id)} - ${os.titulo || 'Sem título'}</span>
                            ${isUrgente ? '<span class="badge badge-danger" style="font-size:0.65rem;">URGENTE</span>' : ''}
                            ${isAtrasada && !isUrgente ? '<span class="badge badge-warning" style="font-size:0.65rem;">ATRASADA</span>' : ''}
                        </div>
                        <div class="urgent-os-meta">
                            <span class="priority-${prioridadeClass}">[[icone:status]] ${os.prioridade || 'Média'}</span>
                            <span>[[icone:relogio]] ${timeAgo(os.dataAbertura)}</span>
                            <span>[[icone:localizacao]] ${os.status || 'Aberta'}</span>
                        </div>
                    </div>
                `;
            }).join('');
        }

        // ==========================================
        // VER OS
        // ==========================================
        function verOS(id) {
            // Redirecionar para página de ordens com o ID
            window.location.href = `ordens.html?id=${id}`;
        }

        // ==========================================
        // CARREGAR NOTIFICAÇÕES
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

                // Atualizar timeline de atividades
                atualizarTimeline(data.notificacoes || []);

            } catch (error) {
                console.error('Erro ao carregar notificações:', error);
            }
        }

        // ==========================================
        // ATUALIZAR TIMELINE
        // ==========================================
        function atualizarTimeline(notificacoes) {
            const container = document.getElementById('activity-timeline');

            if (!notificacoes || notificacoes.length === 0) {
                // Fallback: usar as OS recentes como atividade
                if (cachedOrdens && cachedOrdens.length > 0) {
                    const recentes = cachedOrdens.slice(0, 5);
                    container.innerHTML = recentes.map(os => {
                        const status = (os.status || 'Aberta').toLowerCase();
                        let tipo = 'primary';
                        if (status.includes('concluí')) tipo = 'success';
                        else if (status.includes('atendimento')) tipo = 'warning';
                        else if (status.includes('aguardando') || status.includes('cancel')) tipo = 'danger';

                        return `
                            <div class="activity-item-timeline">
                                <div class="activity-dot-timeline ${tipo}"></div>
                                <div class="activity-content-timeline">
                                    <div class="activity-title-timeline">OS #${shortId(os.id)}</div>
                                    <div class="activity-desc-timeline">${os.titulo || 'Sem título'}</div>
                                    <div class="activity-time-timeline">[[icone:relogio]] ${timeAgo(os.dataAbertura)}</div>
                                </div>
                            </div>
                        `;
                    }).join('');
                } else {
                    container.innerHTML = `
                        <div class="empty-state">
                            <span class="empty-icon">[[icone:pasta]]</span>
                            <h3>Nenhuma atividade</h3>
                            <p>As ações aparecerão aqui</p>
                        </div>
                    `;
                }
                return;
            }

            const items = notificacoes.slice(0, 6);

            container.innerHTML = items.map(notif => {
                let tipo = 'primary';
                const titulo = (notif.titulo || '').toLowerCase();
                
                if (titulo.includes('concluí')) tipo = 'success';
                else if (titulo.includes('atras') || titulo.includes('urgent')) tipo = 'danger';
                else if (titulo.includes('nova') || titulo.includes('criad')) tipo = 'warning';

                return `
                    <div class="activity-item-timeline">
                        <div class="activity-dot-timeline ${tipo}"></div>
                        <div class="activity-content-timeline">
                            <div class="activity-title-timeline">${notif.titulo || 'Notificação'}</div>
                            <div class="activity-desc-timeline">${notif.mensagem || ''}</div>
                            <div class="activity-time-timeline">[[icone:relogio]] ${timeAgo(notif.data)}</div>
                        </div>
                    </div>
                `;
            }).join('');
        }

        // ==========================================
        // INICIALIZAÇÃO
        // ==========================================
        window.onLegacyReady( () => {
            // Data
            atualizarDataAtual();

            // Usuário
            carregarUsuario();

            // Setor
            carregarSetor();

            // Dashboard
            carregarDashboard();

            // Logout
            const logoutBtn = document.getElementById('logout');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    logout();
                });
            }

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

        // ==========================================
        // RECARREGAR GRÁFICOS AO MUDAR TEMA
        // ==========================================
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            const observer = new MutationObserver(() => {
                apiRequest('/dashboard').then(data => {
                    atualizarGraficos(data.charts);
                }).catch(() => {});
            });

            observer.observe(document.documentElement, {
                attributes: true,
                attributeFilter: ['data-theme']
            });
        }
    
Object.assign(window,{...(typeof atualizarDataAtual === 'function' ? {atualizarDataAtual} : {}),...(typeof carregarUsuario === 'function' ? {carregarUsuario} : {}),...(typeof carregarSetor === 'function' ? {carregarSetor} : {}),...(typeof carregarDashboard === 'function' ? {carregarDashboard} : {}),...(typeof animarNumero === 'function' ? {animarNumero} : {}),...(typeof atualizarGraficos === 'function' ? {atualizarGraficos} : {}),...(typeof carregarOrdens === 'function' ? {carregarOrdens} : {}),...(typeof atualizarListaOrdens === 'function' ? {atualizarListaOrdens} : {}),...(typeof verOS === 'function' ? {verOS} : {}),...(typeof carregarNotificacoes === 'function' ? {carregarNotificacoes} : {}),...(typeof atualizarTimeline === 'function' ? {atualizarTimeline} : {})});
})();