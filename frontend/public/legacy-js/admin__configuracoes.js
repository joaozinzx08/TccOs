(function(){

               // ==========================================
        // CONFIGURAÇÕES
        // ==========================================
        var config = {
            tema: 'light',
            idioma: 'pt-BR',
            formatoData: 'DD/MM/YYYY',
            compacto: false,
            notificacoes: {
                novaOS: true,
                atualizacoes: true,
                prazos: true,
                urgentes: true,
                chat: true
            }
        };

        // ==========================================
        // TRADUÇÕES
        // ==========================================
        var TRADUCOES = {
            'pt-BR': {
                titulo: 'Configurações',
                tabGeral: 'Geral',
                tabNotif: 'Notificações',
                tabSeg: 'Segurança',
                tabSis: 'Sistema',
                aparencia: 'Aparência',
                aparenciaDesc: 'Escolha o tema da interface',
                claro: 'Claro',
                escuro: 'Escuro',
                sistema: 'Sistema',
                claroDesc: 'Fundo branco',
                escuroDesc: 'Fundo escuro',
                sistemaDesc: 'Automático',
                idiomaRegiao: 'Idioma e Região',
                idiomaRegiaoDesc: 'Configure suas preferências regionais',
                idioma: 'Idioma',
                formatoData: 'Formato de Data',
                densidade: 'Densidade',
                densidadeDesc: 'Ajuste o espaçamento dos elementos',
                modoCompacto: 'Modo Compacto',
                modoCompactoDesc: 'Reduz espaçamentos para exibir mais conteúdo'
            },
            'en-US': {
                titulo: 'Settings',
                tabGeral: 'General',
                tabNotif: 'Notifications',
                tabSeg: 'Security',
                tabSis: 'System',
                aparencia: 'Appearance',
                aparenciaDesc: 'Choose the interface theme',
                claro: 'Light',
                escuro: 'Dark',
                sistema: 'System',
                claroDesc: 'Light background',
                escuroDesc: 'Dark background',
                sistemaDesc: 'Automatic',
                idiomaRegiao: 'Language and Region',
                idiomaRegiaoDesc: 'Configure your regional preferences',
                idioma: 'Language',
                formatoData: 'Date Format',
                densidade: 'Density',
                densidadeDesc: 'Adjust element spacing',
                modoCompacto: 'Compact Mode',
                modoCompactoDesc: 'Reduces spacing to show more content'
            },
            'es-ES': {
                titulo: 'Configuración',
                tabGeral: 'General',
                tabNotif: 'Notificaciones',
                tabSeg: 'Seguridad',
                tabSis: 'Sistema',
                aparencia: 'Apariencia',
                aparenciaDesc: 'Elige el tema de la interfaz',
                claro: 'Claro',
                escuro: 'Oscuro',
                sistema: 'Sistema',
                claroDesc: 'Fondo blanco',
                escuroDesc: 'Fondo oscuro',
                sistemaDesc: 'Automático',
                idiomaRegiao: 'Idioma y Región',
                idiomaRegiaoDesc: 'Configura tus preferencias regionales',
                idioma: 'Idioma',
                formatoData: 'Formato de Fecha',
                densidade: 'Densidad',
                densidadeDesc: 'Ajusta el espaciado de los elementos',
                modoCompacto: 'Modo Compacto',
                modoCompactoDesc: 'Reduce el espaciado para mostrar más contenido'
            }
        };

        // ==========================================
        // CARREGAR CONFIG
        // ==========================================
        function carregarConfig() {
            try {
                var saved = localStorage.getItem('gestaoos_config');
                if (saved) {
                    var parsed = JSON.parse(saved);
                    config = Object.assign(config, parsed);
                    if (parsed.notificacoes) {
                        config.notificacoes = Object.assign(config.notificacoes, parsed.notificacoes);
                    }
                }
            } catch (e) {
                console.warn('Erro ao carregar config:', e);
            }
        }

        // ==========================================
        // SALVAR CONFIG
        // ==========================================
        function salvarConfig(key, value) {
            config[key] = value;
            try {
                localStorage.setItem('gestaoos_config', JSON.stringify(config));
            } catch (e) {}

            // Aplicar mudança na hora
            if (key === 'idioma') {
                aplicarIdioma();
                mostrarToast('[[icone:confirmar]] Idioma alterado', 'success');
            }
            if (key === 'formatoData') {
                aplicarFormatoData();
                mostrarToast('[[icone:confirmar]] Formato salvo', 'success');
            }
            if (key === 'compacto') {
                aplicarCompacto();
                mostrarToast(value ? '[[icone:confirmar]] Modo compacto ativado' : '[[icone:confirmar]] Modo normal ativado', 'success');
            }
        }

        function salvarNotif(key, value) {
            config.notificacoes[key] = value;
            try {
                localStorage.setItem('gestaoos_config', JSON.stringify(config));
            } catch (e) {}
            mostrarToast(value ? '[[icone:confirmar]] Notificação ativada' : '[[icone:notificacao]] Notificação desativada', 'success');
        }

        // ==========================================
        // APLICAR IDIOMA (traduz a página)
        // ==========================================
        function aplicarIdioma() {
            var t = TRADUCOES[config.idioma] || TRADUCOES['pt-BR'];

            // Título
            document.querySelector('.topbar-left h1').textContent = t.titulo;
            document.title = t.titulo + ' - Gestão OS';

            // Tabs
            var tabs = document.querySelectorAll('.settings-tab');
            if (tabs[0]) tabs[0].querySelector('span:not(.tab-icon)').textContent = t.tabGeral;
            if (tabs[1]) tabs[1].querySelector('span:not(.tab-icon)').textContent = t.tabNotif;
            if (tabs[2]) tabs[2].querySelector('span:not(.tab-icon)').textContent = t.tabSeg;
            if (tabs[3]) tabs[3].querySelector('span:not(.tab-icon)').textContent = t.tabSis;

            // Seção Aparência
            var s1 = document.querySelector('#panel-geral .settings-section:nth-child(1)');
            if (s1) {
                s1.querySelector('.settings-section-title').textContent = '[[icone:configuracoes]] ' + t.aparencia;
                s1.querySelector('.settings-section-subtitle').textContent = t.aparenciaDesc;
            }

            // Theme options
            var themeOpts = document.querySelectorAll('.theme-option');
            if (themeOpts[0]) {
                themeOpts[0].querySelector('.theme-option-label').textContent = t.claro;
                themeOpts[0].querySelector('.theme-option-hint').textContent = t.claroDesc;
            }
            if (themeOpts[1]) {
                themeOpts[1].querySelector('.theme-option-label').textContent = t.escuro;
                themeOpts[1].querySelector('.theme-option-hint').textContent = t.escuroDesc;
            }
            if (themeOpts[2]) {
                themeOpts[2].querySelector('.theme-option-label').textContent = t.sistema;
                themeOpts[2].querySelector('.theme-option-hint').textContent = t.sistemaDesc;
            }

            // Seção Idioma
            var s2 = document.querySelector('#panel-geral .settings-section:nth-child(2)');
            if (s2) {
                s2.querySelector('.settings-section-title').textContent = '[[icone:empresa]] ' + t.idiomaRegiao;
                s2.querySelector('.settings-section-subtitle').textContent = t.idiomaRegiaoDesc;
                var labels = s2.querySelectorAll('.setting-form-group label');
                if (labels[0]) labels[0].textContent = t.idioma;
                if (labels[1]) labels[1].textContent = t.formatoData;
            }

            // Seção Densidade
            var s3 = document.querySelector('#panel-geral .settings-section:nth-child(3)');
            if (s3) {
                s3.querySelector('.settings-section-title').textContent = '[[icone:caixa]] ' + t.densidade;
                s3.querySelector('.settings-section-subtitle').textContent = t.densidadeDesc;
                s3.querySelector('.setting-label').textContent = '[[icone:buscar]] ' + t.modoCompacto;
                s3.querySelector('.setting-description').textContent = t.modoCompactoDesc;
            }
        }

        // ==========================================
        // APLICAR FORMATO DE DATA (mostra preview)
        // ==========================================
        function aplicarFormatoData() {
            var agora = new Date();
            var dia = String(agora.getDate()).padStart(2, '0');
            var mes = String(agora.getMonth() + 1).padStart(2, '0');
            var ano = agora.getFullYear();
            var preview = '';

            if (config.formatoData === 'DD/MM/YYYY') {
                preview = dia + '/' + mes + '/' + ano;
            } else if (config.formatoData === 'MM/DD/YYYY') {
                preview = mes + '/' + dia + '/' + ano;
            } else if (config.formatoData === 'YYYY-MM-DD') {
                preview = ano + '-' + mes + '-' + dia;
            }

            // Mostrar preview embaixo do select
            var selectEl = document.getElementById('select-data');
            if (selectEl) {
                var parent = selectEl.parentElement;
                var previewEl = parent.querySelector('.date-preview');
                if (!previewEl) {
                    previewEl = document.createElement('small');
                    previewEl.className = 'date-preview';
                    previewEl.style.cssText = 'display:block; margin-top:6px; font-size:0.75rem; color:var(--text-muted);';
                    parent.appendChild(previewEl);
                }
                previewEl.textContent = '[[icone:visualizar]] Preview: ' + preview;
            }
        }

        // ==========================================
        // APLICAR MODO COMPACTO
        // ==========================================
        function aplicarCompacto() {
            if (config.compacto) {
                document.body.classList.add('modo-compacto');
            } else {
                document.body.classList.remove('modo-compacto');
            }
        }

        // ==========================================
        // APLICAR TODA A CONFIG
        // ==========================================
        function aplicarConfigUI() {
            // Tema
            document.querySelectorAll('.theme-option').forEach(function(opt) {
                opt.classList.remove('active');
                if (opt.dataset.themeValue === config.tema) {
                    opt.classList.add('active');
                }
            });

            // Idioma
            var langEl = document.getElementById('select-idioma');
            if (langEl) langEl.value = config.idioma || 'pt-BR';

            // Formato data
            var dataEl = document.getElementById('select-data');
            if (dataEl) dataEl.value = config.formatoData || 'DD/MM/YYYY';

            // Compacto
            var compactoEl = document.getElementById('toggle-compacto');
            if (compactoEl) compactoEl.checked = !!config.compacto;

            // Notificações
            var notifMap = {
                'notif-nova-os': 'novaOS',
                'notif-atualizacoes': 'atualizacoes',
                'notif-prazos': 'prazos',
                'notif-urgentes': 'urgentes',
                'notif-chat': 'chat'
            };
            Object.keys(notifMap).forEach(function(id) {
                var el = document.getElementById(id);
                if (el) el.checked = config.notificacoes[notifMap[id]] !== false;
            });

            // APLICAR TUDO DE VERDADE
            aplicarIdioma();
            aplicarFormatoData();
            aplicarCompacto();

            // Sessão
            atualizarInfoSessao();
        }

        // ==========================================
        // MUDAR TEMA
        // ==========================================
        function mudarTema(tema) {
            config.tema = tema;
            try {
                localStorage.setItem('gestaoos_config', JSON.stringify(config));
            } catch (e) {}

            document.querySelectorAll('.theme-option').forEach(function(opt) {
                opt.classList.remove('active');
                if (opt.dataset.themeValue === tema) {
                    opt.classList.add('active');
                }
            });

            if (tema === 'system') {
                var isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
                localStorage.setItem('theme', isDark ? 'dark' : 'light');
            } else {
                document.documentElement.setAttribute('data-theme', tema);
                localStorage.setItem('theme', tema);
            }

            var nomes = { 'light': 'Claro', 'dark': 'Escuro', 'system': 'Sistema' };
            mostrarToast('[[icone:confirmar]] Tema: ' + (nomes[tema] || tema), 'success');
        }

        // ==========================================
        // MUDAR TAB
        // ==========================================
        function mudarTab(tab, element) {
            document.querySelectorAll('.settings-tab').forEach(function(t) { t.classList.remove('active'); });
            element.classList.add('active');

            document.querySelectorAll('.settings-panel').forEach(function(p) { p.classList.remove('active'); });
            var panel = document.getElementById('panel-' + tab);
            if (panel) panel.classList.add('active');
        }

        // ==========================================
        // TOAST
        // ==========================================
        function mostrarToast(msg, tipo) {
            var old = document.querySelector('.toast-simple');
            if (old) old.remove();

            var toast = document.createElement('div');
            toast.className = 'toast-simple';
            toast.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:' + (tipo === 'error' ? '#dc2626' : '#059669') + ';color:#fff;padding:14px 28px;border-radius:10px;font-weight:600;font-size:0.875rem;box-shadow:0 10px 30px rgba(0,0,0,0.2);z-index:9999;';
            toast.textContent = msg;
            document.body.appendChild(toast);

            setTimeout(function() {
                toast.style.opacity = '0';
                toast.style.transition = 'opacity 0.3s';
                setTimeout(function() { toast.remove(); }, 300);
            }, 2000);
        }

        // ==========================================
        // INFO SESSÃO
        // ==========================================
        function atualizarInfoSessao() {
            var el = document.getElementById('sessao-info');
            if (!el) return;

            var ua = navigator.userAgent;
            var browser = 'Navegador';
            var os = '';

            if (ua.indexOf('Chrome') > -1) browser = 'Chrome';
            else if (ua.indexOf('Firefox') > -1) browser = 'Firefox';
            else if (ua.indexOf('Safari') > -1) browser = 'Safari';
            else if (ua.indexOf('Edge') > -1) browser = 'Edge';

            if (ua.indexOf('Windows') > -1) os = 'Windows';
            else if (ua.indexOf('Mac') > -1) os = 'macOS';
            else if (ua.indexOf('Linux') > -1) os = 'Linux';
            else if (ua.indexOf('Android') > -1) os = 'Android';
            else if (ua.indexOf('iPhone') > -1) os = 'iOS';

            el.textContent = browser + ' em ' + os + ' • ' + new Date().toLocaleTimeString('pt-BR');

            var bi = document.getElementById('browser-info');
            if (bi) bi.textContent = ua.substring(0, 60) + '...';
        }

        // ==========================================
        // LIMPAR CACHE
        // ==========================================
        function limparCache() {
            if (!confirm('Limpar dados temporários? Você permanecerá logado.')) return;

            var token = localStorage.getItem('token');
            var usuario = localStorage.getItem('usuario');
            var empresa = localStorage.getItem('empresa');
            var configSalva = localStorage.getItem('gestaoos_config');
            var theme = localStorage.getItem('theme');

            clearSession();

            if (token) localStorage.setItem('token', token);
            if (usuario) localStorage.setItem('usuario', usuario);
            if (empresa) localStorage.setItem('empresa', empresa);
            if (configSalva) localStorage.setItem('gestaoos_config', configSalva);
            if (theme) localStorage.setItem('theme', theme);

            mostrarToast('[[icone:confirmar]] Cache limpo', 'success');
        }

        // ==========================================
        // RESTAURAR PADRÕES
        // ==========================================
        function restaurarPadroes() {
            if (!confirm('Restaurar todas as preferências para o padrão?')) return;

            localStorage.removeItem('gestaoos_config');
            localStorage.removeItem('theme');

            config = {
                tema: 'light',
                idioma: 'pt-BR',
                formatoData: 'DD/MM/YYYY',
                compacto: false,
                notificacoes: {
                    novaOS: true,
                    atualizacoes: true,
                    prazos: true,
                    urgentes: true,
                    chat: true
                }
            };

            document.documentElement.setAttribute('data-theme', 'light');
            localStorage.setItem('theme', 'light');

            aplicarConfigUI();
            mostrarToast('[[icone:confirmar]] Preferências restauradas', 'success');
        }

        // ==========================================
        // VERIFICAR API
        // ==========================================
        function verificarAPI() {
            var el = document.getElementById('status-api');
            if (!el) return;

            window.legacyFetch('/api/status')
                .then(function(r) {
                    if (r.ok) {
                        el.innerHTML = '<span style="color:var(--success);">[[icone:status]] Online</span>';
                    } else {
                        throw new Error();
                    }
                })
                .catch(function() {
                    el.innerHTML = '<span style="color:var(--danger);">[[icone:status]] Offline</span>';
                });
        }

        // ==========================================
        // STORAGE
        // ==========================================
        function calcularStorage() {
            var total = 0;
            for (var key in localStorage) {
                if (localStorage.hasOwnProperty(key)) {
                    total += localStorage[key].length + key.length;
                }
            }
            var kb = (total / 1024).toFixed(2);
            var el = document.getElementById('storage-usage');
            if (el) el.textContent = kb + ' KB';
        }

        // ==========================================
        // LOGOUT
        // ==========================================
        function fazerLogout() {
            if (!confirm('Deseja sair da conta?')) return;
            clearSession();
            window.location.href = '../login.html';
        }

        // ==========================================
        // INICIALIZAÇÃO
        // ==========================================
        console.log('[[icone:estrela]] Configurações iniciando...');

        carregarConfig();

        // Carregar usuário
        try {
            var user = JSON.parse(localStorage.getItem('usuario') || '{}');
            if (user.nome) {
                document.getElementById('user-name').textContent = user.nome;
                var primeiro = user.nome.split(' ')[0];
                document.getElementById('sidebar-avatar').textContent = primeiro.charAt(0).toUpperCase();
                var roles = {
                    'administrador_principal': 'Admin Principal',
                    'administrador_setor': 'Admin de Setor',
                    'gestor': 'Gestor',
                    'colaborador': 'Colaborador'
                };
                document.getElementById('user-role').textContent = roles[user.role] || 'Admin';
            }
        } catch (e) {}

        // APLICAR CONFIG (agora aplica de verdade)
        aplicarConfigUI();

        verificarAPI();
        calcularStorage();

        // Logout
        var logoutBtn = document.getElementById('logout');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', function(e) {
                e.preventDefault();
                fazerLogout();
            });
        }

        // Menu mobile
        var mt = document.querySelector('.menu-toggle');
        var sb = document.querySelector('.sidebar');
        if (mt && sb) {
            mt.addEventListener('click', function() {
                sb.classList.toggle('show');
            });
        }

        // Fechar menu clicando fora
        document.addEventListener('click', function(e) {
            if (window.innerWidth > 768) return;
            if (sb && mt && !sb.contains(e.target) && !mt.contains(e.target)) {
                sb.classList.remove('show');
            }
        });

        console.log('[[icone:confirmar]] Configurações prontas!');
        
Object.assign(window,{...(typeof carregarConfig === 'function' ? {carregarConfig} : {}),...(typeof salvarConfig === 'function' ? {salvarConfig} : {}),...(typeof salvarNotif === 'function' ? {salvarNotif} : {}),...(typeof aplicarIdioma === 'function' ? {aplicarIdioma} : {}),...(typeof aplicarFormatoData === 'function' ? {aplicarFormatoData} : {}),...(typeof aplicarCompacto === 'function' ? {aplicarCompacto} : {}),...(typeof aplicarConfigUI === 'function' ? {aplicarConfigUI} : {}),...(typeof mudarTema === 'function' ? {mudarTema} : {}),...(typeof mudarTab === 'function' ? {mudarTab} : {}),...(typeof mostrarToast === 'function' ? {mostrarToast} : {}),...(typeof atualizarInfoSessao === 'function' ? {atualizarInfoSessao} : {}),...(typeof limparCache === 'function' ? {limparCache} : {}),...(typeof restaurarPadroes === 'function' ? {restaurarPadroes} : {}),...(typeof verificarAPI === 'function' ? {verificarAPI} : {}),...(typeof calcularStorage === 'function' ? {calcularStorage} : {}),...(typeof fazerLogout === 'function' ? {fazerLogout} : {})});
})();