(function(){

      // ==========================================
      // PROTEÇÃO DA PÁGINA
      // ==========================================
      if (!protegerPagina(['administrador_principal', 'administrador_setor'])) {
        throw new Error('Acesso negado');
      }

      // ==========================================
      // ESTADO
      // ==========================================
      let chartSetor = null;
      let chartStatus = null;
      let chartCategoria = null;

      // ==========================================
      // COPIAR CÓDIGO DA EMPRESA
      // ==========================================
      function copiarCodigo() {
        const code = document.getElementById('empresa-code').textContent;
        if (!code || code === 'GEST-XXXXXX') {
          showToast('Aguarde o carregamento do código...', 'warning');
          return;
        }
        copiarTexto(code);
      }

      // ==========================================
      // DATA ATUAL
      // ==========================================
      function atualizarDataAtual() {
        const data = new Date();
        const opcoes = {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        };
        const dataFormatada = data.toLocaleDateString('pt-BR', opcoes);
        document.getElementById('current-date').textContent =
          dataFormatada.charAt(0).toUpperCase() + dataFormatada.slice(1);
      }

      // ==========================================
      // CARREGAR EMPRESA
      // ==========================================
      async function carregarEmpresa() {
        try {
          const empresa = await apiRequest('/empresa');

          const codeEl = document.getElementById('empresa-code');
          const nomeEl = document.getElementById('empresa-nome');

          if (codeEl) codeEl.textContent = empresa.codigo || 'GEST-XXXXXX';
          if (nomeEl) nomeEl.textContent = empresa.nome || 'Sem nome';
        } catch (error) {
          console.error('Erro ao carregar empresa:', error);
        }
      }

      // ==========================================
      // CARREGAR USUÁRIO
      // ==========================================
      function carregarUsuario() {
        const usuario = getUsuario();
        if (!usuario) return;

        const primeiroNome = usuario.nome.split(' ')[0];

        document.getElementById('welcome-title').textContent = `Olá, ${primeiroNome}! [[icone:usuario]]`;

        document.getElementById('welcome-subtitle').textContent =
          'Aqui está o resumo da sua empresa hoje';

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
          animarNumero('urgentes-os', data.stats.urgentes || 0);
          animarNumero('atrasadas-os', data.stats.atrasadas || 0);

          // ===== GRÁFICOS =====
          atualizarGraficos(data.charts);

          // ===== ÚLTIMAS OS =====
          atualizarUltimasOS(data.ultimasOS);

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
        // ===== CORES DO TEMA =====
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const gridColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';
        const textColor = isDark ? '#94a3b8' : '#475569';

        // ===== GRÁFICO DE SETOR =====
        if (chartSetor) chartSetor.destroy();
        const ctxSetor = document.getElementById('chart-setor').getContext('2d');
        const setorData = charts.porSetor || [];

        chartSetor = new Chart(ctxSetor, {
          type: 'bar',
          data: {
            labels: setorData.length > 0 ? setorData.map((d) => d.label) : ['Sem dados'],
            datasets: [
              {
                label: 'OS por Setor',
                data: setorData.length > 0 ? setorData.map((d) => d.value) : [0],
                backgroundColor: 'rgba(37, 99, 235, 0.75)',
                borderColor: 'rgba(37, 99, 235, 1)',
                borderWidth: 2,
                borderRadius: 8,
                borderSkipped: false,
              },
            ],
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
                cornerRadius: 8,
              },
            },
            scales: {
              y: {
                beginAtZero: true,
                ticks: {
                  stepSize: 1,
                  color: textColor,
                  font: { size: 11 },
                },
                grid: { color: gridColor, drawBorder: false },
              },
              x: {
                ticks: {
                  color: textColor,
                  font: { size: 11 },
                },
                grid: { display: false },
              },
            },
          },
        });

        // ===== GRÁFICO DE STATUS =====
        if (chartStatus) chartStatus.destroy();
        const ctxStatus = document.getElementById('chart-status').getContext('2d');
        const statusData = charts.porStatus || [];

        const statusColors = {
          Aberta: '#3b82f6',
          Encaminhada: '#f59e0b',
          'Em atendimento': '#8b5cf6',
          'Aguardando informação': '#ef4444',
          Concluída: '#10b981',
          Cancelada: '#6b7280',
        };

        const statusLabels = statusData.length > 0 ? statusData.map((d) => d.label) : ['Sem dados'];
        const statusValues = statusData.length > 0 ? statusData.map((d) => d.value) : [0];
        const statusColorsArr = statusLabels.map((label) => statusColors[label] || '#6b7280');

        chartStatus = new Chart(ctxStatus, {
          type: 'doughnut',
          data: {
            labels: statusLabels,
            datasets: [
              {
                data: statusValues,
                backgroundColor: statusColorsArr,
                borderWidth: 0,
                hoverOffset: 8,
              },
            ],
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
                  padding: 14,
                  color: textColor,
                  font: { size: 12 },
                },
              },
              tooltip: {
                backgroundColor: isDark ? '#1e293b' : '#fff',
                titleColor: isDark ? '#f1f5f9' : '#0f172a',
                bodyColor: isDark ? '#94a3b8' : '#475569',
                borderColor: isDark ? '#334155' : '#e2e8f0',
                borderWidth: 1,
                padding: 12,
                cornerRadius: 8,
              },
            },
          },
        });

        // ===== GRÁFICO DE CATEGORIA =====
        if (chartCategoria) chartCategoria.destroy();
        const ctxCategoria = document.getElementById('chart-categoria').getContext('2d');
        const catData = charts.porCategoria || [];

        chartCategoria = new Chart(ctxCategoria, {
          type: 'bar',
          data: {
            labels: catData.length > 0 ? catData.map((d) => d.label) : ['Sem dados'],
            datasets: [
              {
                label: 'OS por Categoria',
                data: catData.length > 0 ? catData.map((d) => d.value) : [0],
                backgroundColor: 'rgba(16, 185, 129, 0.75)',
                borderColor: 'rgba(16, 185, 129, 1)',
                borderWidth: 2,
                borderRadius: 8,
                borderSkipped: false,
              },
            ],
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
                cornerRadius: 8,
              },
            },
            scales: {
              y: {
                beginAtZero: true,
                ticks: {
                  stepSize: 1,
                  color: textColor,
                  font: { size: 11 },
                },
                grid: { color: gridColor, drawBorder: false },
              },
              x: {
                ticks: {
                  color: textColor,
                  font: { size: 11 },
                },
                grid: { display: false },
              },
            },
          },
        });
      }

      // ==========================================
      // ATUALIZAR ÚLTIMAS OS
      // ==========================================
      function atualizarUltimasOS(ordens) {
        const container = document.getElementById('recent-os-list');

        if (!ordens || ordens.length === 0) {
          container.innerHTML = `
                    <div class="empty-state">
                        <span class="empty-icon">[[icone:pasta]]</span>
                        <h3>Nenhuma OS recente</h3>
                        <p>Comece criando sua primeira ordem de serviço</p>
                    </div>
                `;
          return;
        }

        container.innerHTML = ordens
          .map((os) => {
            const statusClass = (os.status || 'Aberta').toLowerCase().replace(/\s+/g, '-');
            const prioridadeClass = (os.prioridade || 'Média').toLowerCase();

            return `
                    <div class="os-item" onclick="window.location.href='ordens.html'" style="cursor:pointer;">
                        <div class="os-header">
                            <span class="os-id">#${shortId(os.id)}</span>
                            <span class="os-status status-${statusClass}">${os.status || 'Aberta'}</span>
                        </div>
                        <h4 class="os-title">${os.titulo || 'Sem título'}</h4>
                        <div class="os-meta">
                            <span>Prioridade: <span class="priority-${prioridadeClass}">${os.prioridade || 'Média'}</span></span>
                            <span>[[icone:calendario]] ${timeAgo(os.dataAbertura)}</span>
                        </div>
                    </div>
                `;
          })
          .join('');
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

          // Atualizar timeline de atividades com as notificações
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
          // Tentar carregar auditoria como fallback
          carregarAuditoriaTimeline();
          return;
        }

        const items = notificacoes.slice(0, 6);

        container.innerHTML = items
          .map((notif) => {
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
          })
          .join('');
      }

      // ==========================================
      // CARREGAR AUDITORIA (FALLBACK)
      // ==========================================
      async function carregarAuditoriaTimeline() {
        try {
          const auditoria = await apiRequest('/auditoria');
          const container = document.getElementById('activity-timeline');

          if (!auditoria || auditoria.length === 0) {
            container.innerHTML = `
                        <div class="empty-state">
                            <span class="empty-icon">[[icone:pasta]]</span>
                            <h3>Nenhuma atividade</h3>
                            <p>As ações aparecerão aqui</p>
                        </div>
                    `;
            return;
          }

          const items = auditoria.slice(0, 6);

          container.innerHTML = items
            .map((log) => {
              let tipo = 'primary';
              const acao = (log.acao || '').toLowerCase();

              if (acao.includes('criou')) tipo = 'success';
              else if (acao.includes('removeu') || acao.includes('excluiu')) tipo = 'danger';
              else if (acao.includes('atualizou') || acao.includes('alterou')) tipo = 'warning';

              return `
                        <div class="activity-item-timeline">
                            <div class="activity-dot-timeline ${tipo}"></div>
                            <div class="activity-content-timeline">
                                <div class="activity-title-timeline">${log.acao || 'Ação'}</div>
                                <div class="activity-desc-timeline">${log.detalhes || ''}</div>
                                <div class="activity-time-timeline">[[icone:relogio]] ${timeAgo(log.data)}</div>
                            </div>
                        </div>
                    `;
            })
            .join('');
        } catch (error) {
          console.error('Erro ao carregar auditoria:', error);
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

        // Empresa
        carregarEmpresa();

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

          // Fechar ao clicar fora
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
          // Recarregar gráficos com as cores do tema atual
          apiRequest('/dashboard')
            .then((data) => {
              atualizarGraficos(data.charts);
            })
            .catch(() => {});
        });

        observer.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ['data-theme'],
        });
      }
    
Object.assign(window,{...(typeof copiarCodigo === 'function' ? {copiarCodigo} : {}),...(typeof atualizarDataAtual === 'function' ? {atualizarDataAtual} : {}),...(typeof carregarEmpresa === 'function' ? {carregarEmpresa} : {}),...(typeof carregarUsuario === 'function' ? {carregarUsuario} : {}),...(typeof carregarDashboard === 'function' ? {carregarDashboard} : {}),...(typeof animarNumero === 'function' ? {animarNumero} : {}),...(typeof animar === 'function' ? {animar} : {}),...(typeof atualizarGraficos === 'function' ? {atualizarGraficos} : {}),...(typeof atualizarUltimasOS === 'function' ? {atualizarUltimasOS} : {}),...(typeof carregarNotificacoes === 'function' ? {carregarNotificacoes} : {}),...(typeof atualizarTimeline === 'function' ? {atualizarTimeline} : {}),...(typeof carregarAuditoriaTimeline === 'function' ? {carregarAuditoriaTimeline} : {})});
})();