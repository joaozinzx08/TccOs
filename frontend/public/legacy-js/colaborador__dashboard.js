(function(){

        // ==========================================
        // PROTEÇÃO DA PÁGINA
        // ==========================================
        if (!protegerPagina(['colaborador'])) {
            throw new Error('Acesso negado');
        }

        // ==========================================
        // ESTADO
        // ==========================================
        let chartStatus = null;
        let chartEvolucao = null;
        let minhasOrdens = [];

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
            
            document.getElementById('welcome-greeting').textContent = 
                `[[icone:usuario]] Olá, ${primeiroNome}!`;
            
            document.getElementById('welcome-subtitle').textContent = 
                'Aqui está o resumo das suas ordens de serviço';

            // Avatar
            const avatarEl = document.getElementById('sidebar-avatar');
            if (usuario.avatar) {
                avatarEl.innerHTML = `<img src="${window.avatarURL(usuario.avatar)}" alt="Avatar">`;
            } else {
                avatarEl.textContent = primeiroNome.charAt(0).toUpperCase();
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

                // ===== GRÁFICOS =====
                atualizarGraficos(data.charts);

                // ===== MINHAS ORDENS =====
                await carregarMinhasOrdens();

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

            function animar(tempo) {
                const progresso = Math.min((tempo - inicio) / duracao, 1);
                const valorAtual = Math.floor(valorFinal * progresso);
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

            // ===== GRÁFICO DE STATUS (DONUT) =====
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

            // ===== GRÁFICO DE EVOLUÇÃO (LINHA) =====
            if (chartEvolucao) chartEvolucao.destroy();
            const ctxEvolucao = document.getElementById('chart-evolucao').getContext('2d');

            // Agrupar ordens por mês (últimos 6 meses)
            const meses = [];
            const contagem = [];
            
            for (let i = 5; i >= 0; i--) {
                const data = new Date();
                data.setMonth(data.getMonth() - i);
                const mesNome = data.toLocaleDateString('pt-BR', { month: 'short' });
                meses.push(mesNome.charAt(0).toUpperCase() + mesNome.slice(1));
                contagem.push(0);
            }

            // Contar ordens por mês
            minhasOrdens.forEach(os => {
                const dataOS = new Date(os.dataAbertura);
                const agora = new Date();
                const diffMeses = (agora.getFullYear() - dataOS.getFullYear()) * 12 + 
                                  (agora.getMonth() - dataOS.getMonth());
                
                if (diffMeses >= 0 && diffMeses < 6) {
                    contagem[5 - diffMeses]++;
                }
            });

            chartEvolucao = new Chart(ctxEvolucao, {
                type: 'line',
                data: {
                    labels: meses,
                    datasets: [{
                        label: 'Ordens abertas',
                        data: contagem,
                        borderColor: '#2563eb',
                        backgroundColor: 'rgba(37, 99, 235, 0.1)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: '#2563eb',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        pointRadius: 5,
                        pointHoverRadius: 7
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            backgroundColor: isDark ? '#1e293b' : '#fff',
                            titleColor: isDark ? '#f1f5f9' : '#0f172a',
                            bodyColor: isDark ? '#94a3b8' : '#475569',
                            borderColor: isDark ? '#334155' : '#e2e8f0',
                            borderWidth: 1,
                            padding: 12,
                            cornerRadius: 8
                        }
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
        // CARREGAR MINHAS ORDENS
        // ==========================================
        async function carregarMinhasOrdens() {
            try {
                const ordens = await apiRequest('/ordens');
                minhasOrdens = ordens || [];

                // Recalcular gráfico de evolução
                const data = await apiRequest('/dashboard');
                atualizarGraficos(data.charts);

                // Atualizar lista
                atualizarListaMinhasOS();

                // Atualizar prazos
                atualizarPrazos();

            } catch (error) {
                console.error('Erro ao carregar ordens:', error);
            }
        }

        // ==========================================
        // LISTA DE MINHAS OS
        // ==========================================
        function atualizarListaMinhasOS() {
            const container = document.getElementById('minhas-os-list');

            if (!minhasOrdens || minhasOrdens.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <span class="empty-icon">[[icone:pasta]]</span>
                        <h3>Você ainda não abriu nenhuma OS</h3>
                        <p>Clique em "Nova Ordem de Serviço" para começar</p>
                        <button class="btn btn-primary" onclick="window.location.href='minhas-ordens.html?acao=nova'" style="margin-top:12px;">
                            [[icone:adicionar]] Criar Primeira OS
                        </button>
                    </div>
                `;
                return;
            }

            // Ordenar por data (mais recente primeiro)
            const ordenadas = [...minhasOrdens].sort((a, b) => 
                new Date(b.dataAbertura) - new Date(a.dataAbertura)
            );

            // Pegar as 5 primeiras
            const top5 = ordenadas.slice(0, 5);

            container.innerHTML = top5.map(os => {
                const statusClass = (os.status || 'Aberta').toLowerCase()
                    .replace(/\s+/g, '-')
                    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                const prioridadeClass = (os.prioridade || 'Média').toLowerCase();
                
                return `
                    <div class="os-card-item status-${statusClass}" onclick="verOS('${os.id}')">
                        <div class="os-card-header">
                            <span class="os-card-id">#${shortId(os.id)}</span>
                            <span class="os-status status-${statusClass}">${os.status || 'Aberta'}</span>
                        </div>
                        <div class="os-card-title">${os.titulo || 'Sem título'}</div>
                        <div class="os-card-meta">
                            <span class="priority-${prioridadeClass}">[[icone:status]] ${os.prioridade || 'Média'}</span>
                            <span>[[icone:calendario]] ${timeAgo(os.dataAbertura)}</span>
                        </div>
                    </div>
                `;
            }).join('');
        }

        // ==========================================
        // PRÓXIMOS PRAZOS
        // ==========================================
        function atualizarPrazos() {
            const container = document.getElementById('deadline-list');

            // Filtrar apenas OS com prazo e que não estejam concluídas/canceladas
            const comPrazo = minhasOrdens.filter(os => 
                os.prazo && 
                os.status !== 'Concluída' && 
                os.status !== 'Cancelada'
            );

            if (comPrazo.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <span class="empty-icon">[[icone:estrela]]</span>
                        <h3>Nenhum prazo pendente</h3>
                        <p>Você está em dia!</p>
                    </div>
                `;
                return;
            }

            // Ordenar por prazo (mais próximo primeiro)
            const ordenadas = comPrazo.sort((a, b) => 
                new Date(a.prazo) - new Date(b.prazo)
            );

            // Pegar as 5 primeiras
            const top5 = ordenadas.slice(0, 5);

            container.innerHTML = top5.map(os => {
                const dataPrazo = new Date(os.prazo);
                const hoje = new Date();
                const diffDias = Math.ceil((dataPrazo - hoje) / (1000 * 60 * 60 * 24));
                
                let classe = '';
                let label = '';
                
                if (diffDias < 0) {
                    classe = 'urgent';
                    label = `[[icone:alerta]] Atrasada há ${Math.abs(diffDias)} dia${Math.abs(diffDias) !== 1 ? 's' : ''}`;
                } else if (diffDias === 0) {
                    classe = 'urgent';
                    label = '[[icone:prioridade]] Vence hoje!';
                } else if (diffDias === 1) {
                    classe = 'warning';
                    label = '[[icone:alerta]] Vence amanhã';
                } else if (diffDias <= 3) {
                    classe = 'warning';
                    label = `[[icone:relogio]] Vence em ${diffDias} dias`;
                } else {
                    label = `[[icone:calendario]] Vence em ${diffDias} dias`;
                }

                const dia = dataPrazo.getDate().toString().padStart(2, '0');
                const mes = dataPrazo.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');

                return `
                    <div class="deadline-item" onclick="verOS('${os.id}')">
                        <div class="deadline-date ${classe}">
                            <span class="deadline-day">${dia}</span>
                            <span class="deadline-month">${mes}</span>
                        </div>
                        <div class="deadline-info">
                            <div class="deadline-title">${os.titulo || 'Sem título'}</div>
                            <div class="deadline-label">${label}</div>
                        </div>
                    </div>
                `;
            }).join('');
        }

        // ==========================================
        // VER OS
        // ==========================================
        function verOS(id) {
            window.location.href = `minhas-ordens.html?id=${id}`;
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
            } catch (error) {
                console.error('Erro ao carregar notificações:', error);
            }
        }

        // ==========================================
        // INICIALIZAÇÃO
        // ==========================================
        window.onLegacyReady( () => {
            // Data
            atualizarDataAtual();

            // Usuário
            carregarUsuario();

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

            // Nova OS (menu)
            const btnNovaOS = document.getElementById('btn-nova-os-menu');
            if (btnNovaOS) {
                btnNovaOS.addEventListener('click', (e) => {
                    e.preventDefault();
                    window.location.href = 'minhas-ordens.html?acao=nova';
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
    
Object.assign(window,{...(typeof atualizarDataAtual === 'function' ? {atualizarDataAtual} : {}),...(typeof carregarUsuario === 'function' ? {carregarUsuario} : {}),...(typeof carregarDashboard === 'function' ? {carregarDashboard} : {}),...(typeof animarNumero === 'function' ? {animarNumero} : {}),...(typeof atualizarGraficos === 'function' ? {atualizarGraficos} : {}),...(typeof carregarMinhasOrdens === 'function' ? {carregarMinhasOrdens} : {}),...(typeof atualizarListaMinhasOS === 'function' ? {atualizarListaMinhasOS} : {}),...(typeof atualizarPrazos === 'function' ? {atualizarPrazos} : {}),...(typeof verOS === 'function' ? {verOS} : {}),...(typeof carregarNotificacoes === 'function' ? {carregarNotificacoes} : {})});
})();