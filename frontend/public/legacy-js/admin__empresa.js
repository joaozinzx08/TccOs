(function(){

        // ==========================================
        // VARIÁVEL GLOBAL DO CÓDIGO
        // ==========================================
        var CODIGO_DA_EMPRESA = '';

        // ==========================================
        // CARREGAR A EMPRESA (FUNÇÃO SIMPLES)
        // ==========================================
        function carregarEmpresa() {
            console.log('[[icone:atualizar]] Buscando empresa...');
            
            var token = localStorage.getItem('token');
            console.log('Token existe?', !!token);

            window.legacyFetch('/api/empresa', {
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Content-Type': 'application/json'
                }
            })
            .then(function(r) {
                console.log('Status HTTP:', r.status);
                return r.json();
            })
            .then(function(data) {
                console.log('[[icone:caixa]] Dados recebidos:', data);

                // Guardar código
                CODIGO_DA_EMPRESA = data.codigo || '';

                // Atualizar a tela
                var codeEl = document.getElementById('empresa-code');
                if (codeEl) {
                    codeEl.textContent = CODIGO_DA_EMPRESA || 'Sem código';
                    console.log('[[icone:confirmar]] Código na tela:', CODIGO_DA_EMPRESA);
                }

                // Preencher informações
                var nomeEl = document.getElementById('info-nome');
                var emailEl = document.getElementById('info-email');
                var dataEl = document.getElementById('info-data');

                if (nomeEl) nomeEl.textContent = data.nome || '—';
                if (emailEl) emailEl.textContent = data.email || '—';
                if (dataEl) dataEl.textContent = data.dataCriacao ? formatDate(data.dataCriacao) : '—';

            })
            .catch(function(err) {
                console.error('[[icone:fechar]] Erro:', err);
                var codeEl = document.getElementById('empresa-code');
                if (codeEl) codeEl.textContent = 'Erro';
            });
        }

        // ==========================================
        // CARREGAR STATS
        // ==========================================
        function carregarStats() {
            var token = localStorage.getItem('token');
            var headers = { 'Authorization': 'Bearer ' + token };

            Promise.all([
                window.legacyFetch('/api/usuarios', { headers: headers }).then(r => r.json()).catch(() => []),
                window.legacyFetch('/api/setores', { headers: headers }).then(r => r.json()).catch(() => []),
                window.legacyFetch('/api/ordens', { headers: headers }).then(r => r.json()).catch(() => [])
            ]).then(function(results) {
                var usuarios = results[0] || [];
                var setores = results[1] || [];
                var ordens = results[2] || [];

                document.getElementById('stat-usuarios').textContent = usuarios.length;
                document.getElementById('stat-setores').textContent = setores.filter(s => s.ativo !== false).length;
                document.getElementById('stat-ordens').textContent = ordens.length;
                document.getElementById('stat-concluidas').textContent = ordens.filter(o => o.status === 'Concluída').length;
            });
        }

        // ==========================================
        // CARREGAR USUÁRIO NA SIDEBAR
        // ==========================================
        function carregarSidebar() {
            try {
                var user = JSON.parse(localStorage.getItem('usuario') || '{}');
                if (user.nome) {
                    document.getElementById('user-name').textContent = user.nome;
                    var primeiro = user.nome.split(' ')[0];
                    document.getElementById('sidebar-avatar').textContent = primeiro.charAt(0).toUpperCase();
                    
                    if (user.role === 'administrador_principal') {
                        document.getElementById('user-role').textContent = 'Admin Principal';
                    } else if (user.role === 'administrador_setor') {
                        document.getElementById('user-role').textContent = 'Admin de Setor';
                    }
                }
            } catch (e) {}
        }

        // ==========================================
        // COPIAR CÓDIGO
        // ==========================================
        function copiarCodigo() {
            if (!CODIGO_DA_EMPRESA) {
                alert('Código não disponível ainda');
                return;
            }
            navigator.clipboard.writeText(CODIGO_DA_EMPRESA).then(function() {
                alert('[[icone:confirmar]] Código copiado: ' + CODIGO_DA_EMPRESA);
            });
        }

        // ==========================================
        // RENOVAR CÓDIGO
        // ==========================================
        function renovarCodigo() {
            if (!confirm('Renovar o código da empresa? O código antigo será desativado.')) return;

            var token = localStorage.getItem('token');

            window.legacyFetch('/api/empresa/renovar-codigo', {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + token }
            })
            .then(r => r.json())
            .then(function(data) {
                if (data.codigo) {
                    CODIGO_DA_EMPRESA = data.codigo;
                    document.getElementById('empresa-code').textContent = data.codigo;
                    alert('[[icone:confirmar]] Novo código: ' + data.codigo);
                } else {
                    alert('Erro: ' + (data.error || 'desconhecido'));
                }
            })
            .catch(function(err) {
                alert('Erro: ' + err.message);
            });
        }

        // ==========================================
        // EXECUTA ASSIM QUE A PÁGINA CARREGAR
        // ==========================================
        carregarSidebar();
        carregarEmpresa();
        carregarStats();

        // Logout
        document.getElementById('logout').addEventListener('click', function(e) {
            e.preventDefault();
            clearSession();
            window.location.href = '../login.html';
        });
    
Object.assign(window,{...(typeof carregarEmpresa === 'function' ? {carregarEmpresa} : {}),...(typeof carregarStats === 'function' ? {carregarStats} : {}),...(typeof carregarSidebar === 'function' ? {carregarSidebar} : {}),...(typeof copiarCodigo === 'function' ? {copiarCodigo} : {}),...(typeof renovarCodigo === 'function' ? {renovarCodigo} : {})});
})();