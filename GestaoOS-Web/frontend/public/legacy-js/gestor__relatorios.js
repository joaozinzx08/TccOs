(function(){

        // ==========================================
        // PROTEÇÃO E ROLE
        // ==========================================
        const usuarioAtual = getUsuario();
        const isAdmin = usuarioAtual.role === 'administrador_principal' || usuarioAtual.role === 'administrador_setor';
        const isGestor = usuarioAtual.role === 'gestor';

        if (!protegerPagina(['administrador_principal', 'administrador_setor', 'gestor'])) {
            throw new Error('Acesso negado');
        }

        document.getElementById('breadcrumb-tipo').textContent = isGestor ? 'Gestor' : 'Admin';

        // Ajustar menu para gestor
        if (isGestor) {
            document.querySelectorAll('.sidebar-menu a').forEach(a => {
                const href = a.getAttribute('href');
                if (href && !href.startsWith('http') && !href.startsWith('#') && !href.startsWith('../')) {
                    a.setAttribute('href', '../gestor/' + href);
                }
            });
            document.querySelectorAll('.sidebar-menu li').forEach(li => {
                const link = li.querySelector('a');
                if (!link) return;
                const texto = link.textContent.trim();
                const proibidos = ['Usuários', 'Setores', 'Auditoria', 'Minha Empresa'];
                if (proibidos.some(p => texto.includes(p))) li.remove();
            });
        }

        // ==========================================
        // ESTADO
        // ==========================================
        let ordens = [];
        let setores = [];
        let usuarios = [];
        let periodoAtual = '30d';
        let chartEvolucao = null;
        let chartStatus = null;
        let chartPrioridade = null;
        let chartCategoria = null;
        let chartSetor = null;

        // ==========================================
        // USUÁRIO
        // ==========================================
        function carregarInfoUsuario() {
            if (!usuarioAtual) return;
            const primeiroNome = usuarioAtual.nome.split(' ')[0];
            document.getElementById('user-name').textContent = usuarioAtual.nome;
            const roleLabels = {
                'administrador_principal': 'Admin Principal',
                'administrador_setor': 'Admin de Setor',
                'gestor': 'Gestor'
            };
            document.getElementById('user-role').textContent = roleLabels[usuarioAtual.role] || 'Admin';

            const avatarEl = document.getElementById('sidebar-avatar');
            if (usuarioAtual.avatar) {
                avatarEl.innerHTML = `<img src="${window.avatarURL(usuarioAtual.avatar)}" alt="Avatar">`;
            } else {
                avatarEl.textContent = primeiroNome.charAt(0).toUpperCase();
            }
        }

        // ==========================================
        // DADOS
        // ==========================================
        async function carregarDados() {
            try {
                const [o, s, u] = await Promise.all([
                    apiRequest('/ordens'),
                    apiRequest('/setores'),
                    apiRequest('/usuarios').catch(() => [])
                ]);
                ordens = o || [];
                setores = s || [];
                usuarios = u || [];

                preencherSelectSetores();
                atualizarRelatorios();
                carregarNotificacoes();
            } catch (e) {
                console.error(e);
                showToast('Erro ao carregar dados', 'error');
            }
        }

        function preencherSelectSetores() {
            const s = document.getElementById('filter-setor');
            s.innerHTML = '<option value="">Todos os setores</option>';
            setores.filter(x => x.ativo !== false).forEach(x => {
                s.innerHTML += `<option value="${x.id}">${window.escapeHTML(x.nome)}</option>`;
            });
        }

        // ==========================================
        // FILTRO PERÍODO
        // ==========================================
        function mudarPeriodo(p, btn) {
            periodoAtual = p;
            document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const labels = {
                '7d': 'Últimos 7 dias',
                '30d': 'Últimos 30 dias',
                '90d': 'Últimos 90 dias',
                '365d': 'Último ano',
                'todos': 'Todo o período'
            };
            document.getElementById('evolucao-badge').textContent = labels[p] || '';

            atualizarRelatorios();
        }

        function aplicarFiltros() { atualizarRelatorios(); }

        function filtrarOrdens() {
            const setorId = document.getElementById('filter-setor').value;
            let filtradas = ordens.filter(os => {
                if (setorId && os.setorResponsavelId !== setorId) return false;
                return true;
            });

            if (periodoAtual !== 'todos') {
                const agora = new Date();
                const limite = new Date();
                if (periodoAtual === '7d') limite.setDate(agora.getDate() - 7);
                else if (periodoAtual === '30d') limite.setDate(agora.getDate() - 30);
                else if (periodoAtual === '90d') limite.setDate(agora.getDate() - 90);
                else if (periodoAtual === '365d') limite.setDate(agora.getDate() - 365);

                filtradas = filtradas.filter(os => new Date(os.dataAbertura) >= limite);
            }
            return filtradas;
        }

        // ==========================================
        // RELATÓRIOS
        // ==========================================
        function atualizarRelatorios() {
            const f = filtrarOrdens();
            atualizarStats(f);
            atualizarGraficos(f);
            atualizarTabelaSetores(f);
            atualizarTabelaColaboradores(f);
            window._ordensFiltradas = f;
        }

        function atualizarStats(f) {
            const total = f.length;
            const concluidas = f.filter(o => o.status === 'Concluída').length;
            const andamento = f.filter(o => o.status === 'Em atendimento' || o.status === 'Encaminhada').length;

            const hoje = new Date(); hoje.setHours(0,0,0,0);
            const atrasadas = f.filter(o => {
                if (!o.prazo) return false;
                const p = new Date(o.prazo); p.setHours(0,0,0,0);
                return p < hoje && o.status !== 'Concluída' && o.status !== 'Cancelada';
            }).length;

            animar('stat-total', total);
            animar('stat-concluidas', concluidas);
            animar('stat-andamento', andamento);
            animar('stat-atrasadas', atrasadas);

            const taxa = total > 0 ? Math.round((concluidas / total) * 100) : 0;
            const taxaAtr = total > 0 ? Math.round((atrasadas / total) * 100) : 0;

            document.getElementById('stat-concluidas-comp').textContent = `[[icone:grafico]] ${taxa}% do total`;
            document.getElementById('stat-andamento-comp').textContent = `${total > 0 ? Math.round((andamento/total)*100) : 0}% em andamento`;

            const el = document.getElementById('stat-atrasadas-comp');
            if (taxaAtr === 0) {
                el.className = 'report-stat-comparison positive';
                el.textContent = '[[icone:estrela]] Nenhuma atrasada!';
            } else {
                el.className = 'report-stat-comparison negative';
                el.textContent = `[[icone:grafico]] ${taxaAtr}% em atraso`;
            }
        }

        function animar(id, v) {
            const el = document.getElementById(id);
            if (!el) return;
            const dur = 700;
            const ini = performance.now();
            function a(t) {
                const p = Math.min((t - ini) / dur, 1);
                el.textContent = Math.floor(v * p);
                if (p < 1) requestAnimationFrame(a);
                else el.textContent = v;
            }
            requestAnimationFrame(a);
        }

        // ==========================================
        // GRÁFICOS
        // ==========================================
        function getTheme() {
            const d = document.documentElement.getAttribute('data-theme') === 'dark';
            return {
                grid: d ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                text: d ? '#94a3b8' : '#475569',
                bg: d ? '#1e293b' : '#fff',
                border: d ? '#334155' : '#e2e8f0'
            };
        }

        function atualizarGraficos(f) {
            const c = getTheme();
            atualizarChartEvolucao(f, c);
            atualizarChartStatus(f, c);
            atualizarChartPrioridade(f, c);
            atualizarChartCategoria(f, c);
            atualizarChartSetor(f, c);
        }

        function atualizarChartEvolucao(f, c) {
            if (chartEvolucao) chartEvolucao.destroy();

            let numPontos = 30;
            if (periodoAtual === '7d') numPontos = 7;
            else if (periodoAtual === '90d') numPontos = 13;
            else if (periodoAtual === '365d') numPontos = 12;

            const labels = [], abertas = [], concluidas = [];
            const hoje = new Date(); hoje.setHours(0,0,0,0);

            if (periodoAtual === '365d') {
                for (let i = 11; i >= 0; i--) {
                    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
                    const m = d.toLocaleDateString('pt-BR', { month: 'short' });
                    labels.push(m.charAt(0).toUpperCase() + m.slice(1));
                    const ini = new Date(d.getFullYear(), d.getMonth(), 1);
                    const fim = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
                    abertas.push(f.filter(o => { const x = new Date(o.dataAbertura); return x >= ini && x <= fim; }).length);
                    concluidas.push(f.filter(o => { if (!o.dataConclusao) return false; const x = new Date(o.dataConclusao); return x >= ini && x <= fim; }).length);
                }
            } else if (periodoAtual === '90d') {
                for (let i = 12; i >= 0; i--) {
                    const fim = new Date(hoje); fim.setDate(hoje.getDate() - (i * 7)); fim.setHours(23,59,59,999);
                    const ini = new Date(fim); ini.setDate(fim.getDate() - 6); ini.setHours(0,0,0,0);
                    labels.push(`${ini.getDate()}/${ini.getMonth()+1}`);
                    abertas.push(f.filter(o => { const x = new Date(o.dataAbertura); return x >= ini && x <= fim; }).length);
                    concluidas.push(f.filter(o => { if (!o.dataConclusao) return false; const x = new Date(o.dataConclusao); return x >= ini && x <= fim; }).length);
                }
            } else {
                for (let i = numPontos - 1; i >= 0; i--) {
                    const d = new Date(hoje); d.setDate(hoje.getDate() - i);
                    const fim = new Date(d); fim.setHours(23,59,59,999);
                    labels.push(d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }));
                    abertas.push(f.filter(o => { const x = new Date(o.dataAbertura); return x >= d && x <= fim; }).length);
                    concluidas.push(f.filter(o => { if (!o.dataConclusao) return false; const x = new Date(o.dataConclusao); return x >= d && x <= fim; }).length);
                }
            }

            const ctx = document.getElementById('chart-evolucao').getContext('2d');
            chartEvolucao = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [
                        { label: 'Abertas', data: abertas, borderColor: '#2563eb', backgroundColor: 'rgba(37,99,235,0.1)', borderWidth: 3, fill: true, tension: 0.4, pointBackgroundColor: '#2563eb', pointBorderColor: '#fff', pointBorderWidth: 2, pointRadius: 4 },
                        { label: 'Concluídas', data: concluidas, borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)', borderWidth: 3, fill: true, tension: 0.4, pointBackgroundColor: '#10b981', pointBorderColor: '#fff', pointBorderWidth: 2, pointRadius: 4 }
                    ]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    interaction: { mode: 'index', intersect: false },
                    plugins: {
                        legend: { position: 'top', align: 'end', labels: { usePointStyle: true, pointStyle: 'circle', padding: 16, color: c.text, font: { size: 12, weight: '600' } } },
                        tooltip: { backgroundColor: c.bg, titleColor: c.text, bodyColor: c.text, borderColor: c.border, borderWidth: 1, padding: 12, cornerRadius: 8 }
                    },
                    scales: {
                        y: { beginAtZero: true, ticks: { stepSize: 1, color: c.text, font: { size: 11 } }, grid: { color: c.grid, drawBorder: false } },
                        x: { ticks: { color: c.text, font: { size: 11 }, maxRotation: 45, minRotation: 0 }, grid: { display: false } }
                    }
                }
            });
        }

        function atualizarChartStatus(f, c) {
            if (chartStatus) chartStatus.destroy();
            const count = {};
            f.forEach(o => { count[o.status] = (count[o.status] || 0) + 1; });

            const colors = { 'Aberta': '#3b82f6', 'Encaminhada': '#f59e0b', 'Em atendimento': '#8b5cf6', 'Aguardando informação': '#ef4444', 'Concluída': '#10b981', 'Cancelada': '#6b7280' };
            const labels = Object.keys(count);
            const values = Object.values(count);
            const bg = labels.map(l => colors[l] || '#6b7280');

            const ctx = document.getElementById('chart-status').getContext('2d');
            chartStatus = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: labels.length > 0 ? labels : ['Sem dados'],
                    datasets: [{ data: values.length > 0 ? values : [1], backgroundColor: bg.length > 0 ? bg : ['#e2e8f0'], borderWidth: 0, hoverOffset: 8 }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false, cutout: '65%',
                    plugins: {
                        legend: { position: 'bottom', labels: { usePointStyle: true, pointStyle: 'circle', padding: 12, color: c.text, font: { size: 11 } } },
                        tooltip: { backgroundColor: c.bg, titleColor: c.text, bodyColor: c.text, borderColor: c.border, borderWidth: 1, padding: 12, cornerRadius: 8 }
                    }
                }
            });
        }

        function atualizarChartPrioridade(f, c) {
            if (chartPrioridade) chartPrioridade.destroy();
            const count = { 'Urgente': 0, 'Alta': 0, 'Média': 0, 'Baixa': 0 };
            f.forEach(o => { if (count[o.prioridade] !== undefined) count[o.prioridade]++; });

            const ctx = document.getElementById('chart-prioridade').getContext('2d');
            chartPrioridade = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: Object.keys(count),
                    datasets: [{
                        data: Object.values(count),
                        backgroundColor: ['rgba(239,68,68,0.75)', 'rgba(249,115,22,0.75)', 'rgba(245,158,11,0.75)', 'rgba(16,185,129,0.75)'],
                        borderColor: ['rgba(239,68,68,1)', 'rgba(249,115,22,1)', 'rgba(245,158,11,1)', 'rgba(16,185,129,1)'],
                        borderWidth: 2, borderRadius: 8, borderSkipped: false
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: { backgroundColor: c.bg, titleColor: c.text, bodyColor: c.text, borderColor: c.border, borderWidth: 1, padding: 12, cornerRadius: 8 }
                    },
                    scales: {
                        y: { beginAtZero: true, ticks: { stepSize: 1, color: c.text, font: { size: 11 } }, grid: { color: c.grid, drawBorder: false } },
                        x: { ticks: { color: c.text, font: { size: 11 } }, grid: { display: false } }
                    }
                }
            });
        }

        function atualizarChartCategoria(f, c) {
            if (chartCategoria) chartCategoria.destroy();
            const count = {};
            f.forEach(o => { const x = o.categoria || 'Sem categoria'; count[x] = (count[x] || 0) + 1; });

            const labels = Object.keys(count);
            const values = Object.values(count);

            const ctx = document.getElementById('chart-categoria').getContext('2d');
            chartCategoria = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels.length > 0 ? labels : ['Sem dados'],
                    datasets: [{ data: values.length > 0 ? values : [0], backgroundColor: 'rgba(37,99,235,0.75)', borderColor: 'rgba(37,99,235,1)', borderWidth: 2, borderRadius: 8, borderSkipped: false }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false, indexAxis: 'y',
                    plugins: {
                        legend: { display: false },
                        tooltip: { backgroundColor: c.bg, titleColor: c.text, bodyColor: c.text, borderColor: c.border, borderWidth: 1, padding: 12, cornerRadius: 8 }
                    },
                    scales: {
                        x: { beginAtZero: true, ticks: { stepSize: 1, color: c.text, font: { size: 11 } }, grid: { color: c.grid, drawBorder: false } },
                        y: { ticks: { color: c.text, font: { size: 11 } }, grid: { display: false } }
                    }
                }
            });
        }

        function atualizarChartSetor(f, c) {
            if (chartSetor) chartSetor.destroy();
            const count = {};
            f.forEach(o => {
                const s = setores.find(x => x.id === o.setorResponsavelId);
                const n = s ? s.nome : 'Sem setor';
                count[n] = (count[n] || 0) + 1;
            });

            const labels = Object.keys(count);
            const values = Object.values(count);

            const ctx = document.getElementById('chart-setor').getContext('2d');
            chartSetor = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels.length > 0 ? labels : ['Sem dados'],
                    datasets: [{ data: values.length > 0 ? values : [0], backgroundColor: 'rgba(16,185,129,0.75)', borderColor: 'rgba(16,185,129,1)', borderWidth: 2, borderRadius: 8, borderSkipped: false }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: { backgroundColor: c.bg, titleColor: c.text, bodyColor: c.text, borderColor: c.border, borderWidth: 1, padding: 12, cornerRadius: 8 }
                    },
                    scales: {
                        y: { beginAtZero: true, ticks: { stepSize: 1, color: c.text, font: { size: 11 } }, grid: { color: c.grid, drawBorder: false } },
                        x: { ticks: { color: c.text, font: { size: 11 } }, grid: { display: false } }
                    }
                }
            });
        }

        // ==========================================
        // TABELAS
        // ==========================================
        function atualizarTabelaSetores(f) {
            const tbody = document.getElementById('performance-table-body');
            const hoje = new Date(); hoje.setHours(0,0,0,0);

            const dados = setores.map(s => {
                const os = f.filter(o => o.setorResponsavelId === s.id);
                const total = os.length;
                const concluidas = os.filter(o => o.status === 'Concluída').length;
                const andamento = os.filter(o => o.status === 'Em atendimento' || o.status === 'Encaminhada').length;
                const atrasadas = os.filter(o => {
                    if (!o.prazo) return false;
                    const p = new Date(o.prazo); p.setHours(0,0,0,0);
                    return p < hoje && o.status !== 'Concluída' && o.status !== 'Cancelada';
                }).length;
                const taxa = total > 0 ? Math.round((concluidas / total) * 100) : 0;
                return { s, total, concluidas, andamento, atrasadas, taxa };
            });

            dados.sort((a, b) => b.total - a.total);

            if (dados.length === 0 || dados.every(d => d.total === 0)) {
                tbody.innerHTML = `<tr><td colspan="6"><div class="report-empty"><span class="report-empty-icon">[[icone:pasta]]</span><h3>Nenhum dado no período</h3></div></td></tr>`;
                return;
            }

            tbody.innerHTML = dados.filter(d => d.total > 0).map(d => {
                let cls = 'success';
                if (d.taxa < 40) cls = 'danger';
                else if (d.taxa < 70) cls = 'warning';
                return `
                    <tr>
                        <td><strong>${window.escapeHTML(d.s.nome)}</strong></td>
                        <td style="text-align:center; font-weight:700;">${d.total}</td>
                        <td style="text-align:center; color:var(--success); font-weight:700;">${d.concluidas}</td>
                        <td style="text-align:center; color:var(--warning); font-weight:700;">${d.andamento}</td>
                        <td style="text-align:center; color:${d.atrasadas > 0 ? 'var(--danger)' : 'var(--text-muted)'}; font-weight:700;">${d.atrasadas}</td>
                        <td>
                            <div class="performance-bar">
                                <div class="performance-bar-track">
                                    <div class="performance-bar-fill ${cls}" style="width: ${d.taxa}%;"></div>
                                </div>
                                <span class="performance-bar-value">${d.taxa}%</span>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
        }

        function atualizarTabelaColaboradores(f) {
            const tbody = document.getElementById('performance-colab-body');
            const dados = usuarios.map(u => {
                const os = f.filter(o => o.solicitanteId === u.id);
                const total = os.length;
                const concluidas = os.filter(o => o.status === 'Concluída').length;
                const andamento = os.filter(o => o.status === 'Em atendimento' || o.status === 'Encaminhada').length;
                const setor = setores.find(s => s.id === u.setorId);
                return { u, setor, total, concluidas, andamento };
            }).filter(d => d.total > 0);

            dados.sort((a, b) => b.total - a.total);
            const top = dados.slice(0, 10);

            if (top.length === 0) {
                tbody.innerHTML = `<tr><td colspan="5"><div class="report-empty"><span class="report-empty-icon">[[icone:pasta]]</span><h3>Nenhum dado no período</h3></div></td></tr>`;
                return;
            }

            tbody.innerHTML = top.map((d, i) => {
                const ini = (d.u.nome || '?').charAt(0).toUpperCase();
                const med = i === 0 ? '[[icone:estrela]]' : i === 1 ? '[[icone:estrela]]' : i === 2 ? '[[icone:estrela]]' : '';
                let av = ini;
                if (d.u.avatar) av = `<img src="${window.avatarURL(d.u.avatar)}" style="width:100%;height:100%;object-fit:cover;">`;

                return `
                    <tr>
                        <td>
                            <div style="display:flex; align-items:center; gap:10px;">
                                <div style="width:36px; height:36px; border-radius:50%; background:var(--gradient-primary); color:#fff; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:0.8125rem; flex-shrink:0; overflow:hidden;">${av}</div>
                                <div>
                                    <div style="font-weight:600;">${window.escapeHTML(d.u.nome)} ${med}</div>
                                    <div style="font-size:0.75rem; color:var(--text-muted);">${window.escapeHTML(d.u.email)}</div>
                                </div>
                            </div>
                        </td>
                        <td>${d.setor ? `<span class="badge badge-primary">${window.escapeHTML(d.setor.nome)}</span>` : `<span class="badge badge-gray">Sem setor</span>`}</td>
                        <td style="text-align:center; font-weight:700; color:var(--primary);">${d.total}</td>
                        <td style="text-align:center; font-weight:700; color:var(--success);">${d.concluidas}</td>
                        <td style="text-align:center; font-weight:700; color:var(--warning);">${d.andamento}</td>
                    </tr>
                `;
            }).join('');
        }

        // ==========================================
        // EXPORTAR
        // ==========================================
        function exportarCSV() {
            const f = window._ordensFiltradas || [];
            if (f.length === 0) { showToast('Nenhum dado para exportar', 'warning'); return; }

            const headers = ['ID','Título','Status','Prioridade','Categoria','Subcategoria','Setor','Solicitante','Data Abertura','Prazo','Data Conclusão'];
            const rows = f.map(os => {
                const s = setores.find(x => x.id === os.setorResponsavelId);
                const u = usuarios.find(x => x.id === os.solicitanteId);
                return [
                    shortId(os.id), os.titulo || '', os.status || '', os.prioridade || '',
                    os.categoria || '', os.subcategoria || '',
                    s ? s.nome : '', os.sigilo ? 'Sigiloso' : (u ? u.nome : ''),
                    os.dataAbertura ? new Date(os.dataAbertura).toLocaleString('pt-BR') : '',
                    os.prazo ? new Date(os.prazo).toLocaleString('pt-BR') : '',
                    os.dataConclusao ? new Date(os.dataConclusao).toLocaleString('pt-BR') : ''
                ];
            });

            const csv = [headers.join(';'), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';'))].join('\n');
            const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `relatorio-os-${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            URL.revokeObjectURL(a.href);
            showToast('[[icone:confirmar]] Relatório exportado!', 'success');
        }

        function exportarPDF() {
            showToast('[[icone:ideia]] Use "Salvar como PDF" na janela de impressão', 'info');
            setTimeout(() => window.print(), 500);
        }

        async function carregarNotificacoes() {
            try {
                const d = await apiRequest('/notificacoes');
                const b = document.getElementById('notificacoes-badge');
                if (b) {
                    const n = d.naoLidas || 0;
                    b.textContent = n;
                    b.style.display = n > 0 ? 'inline-flex' : 'none';
                }
            } catch (e) {}
        }

        // ==========================================
        // INIT
        // ==========================================
        window.onLegacyReady( () => {
            carregarInfoUsuario();
            carregarDados();

            document.getElementById('logout').addEventListener('click', e => { e.preventDefault(); logout(); });

            const mt = document.querySelector('.menu-toggle');
            const sb = document.querySelector('.sidebar');
            if (mt && sb) {
                mt.addEventListener('click', () => sb.classList.toggle('show'));
                document.addEventListener('click', e => {
                    if (window.innerWidth > 768) return;
                    if (!sb.contains(e.target) && !mt.contains(e.target)) sb.classList.remove('show');
                });
            }

            // Atualizar gráficos ao trocar tema
            const observer = new MutationObserver(() => atualizarRelatorios());
            observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
        });
    
Object.assign(window,{...(typeof carregarInfoUsuario === 'function' ? {carregarInfoUsuario} : {}),...(typeof carregarDados === 'function' ? {carregarDados} : {}),...(typeof preencherSelectSetores === 'function' ? {preencherSelectSetores} : {}),...(typeof mudarPeriodo === 'function' ? {mudarPeriodo} : {}),...(typeof aplicarFiltros === 'function' ? {aplicarFiltros} : {}),...(typeof filtrarOrdens === 'function' ? {filtrarOrdens} : {}),...(typeof atualizarRelatorios === 'function' ? {atualizarRelatorios} : {}),...(typeof atualizarStats === 'function' ? {atualizarStats} : {}),...(typeof animar === 'function' ? {animar} : {}),...(typeof getTheme === 'function' ? {getTheme} : {}),...(typeof atualizarGraficos === 'function' ? {atualizarGraficos} : {}),...(typeof atualizarChartEvolucao === 'function' ? {atualizarChartEvolucao} : {}),...(typeof atualizarChartStatus === 'function' ? {atualizarChartStatus} : {}),...(typeof atualizarChartPrioridade === 'function' ? {atualizarChartPrioridade} : {}),...(typeof atualizarChartCategoria === 'function' ? {atualizarChartCategoria} : {}),...(typeof atualizarChartSetor === 'function' ? {atualizarChartSetor} : {}),...(typeof atualizarTabelaSetores === 'function' ? {atualizarTabelaSetores} : {}),...(typeof atualizarTabelaColaboradores === 'function' ? {atualizarTabelaColaboradores} : {}),...(typeof exportarCSV === 'function' ? {exportarCSV} : {}),...(typeof exportarPDF === 'function' ? {exportarPDF} : {}),...(typeof carregarNotificacoes === 'function' ? {carregarNotificacoes} : {})});
})();