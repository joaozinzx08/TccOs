(function(){

        // ==========================================
        // ELEMENTOS
        // ==========================================
        const form = document.getElementById('login-form');
        const emailInput = document.getElementById('email');
        const senhaInput = document.getElementById('senha');
        const btnLogin = document.getElementById('btn-login');
        const errorDiv = document.getElementById('error-message');
        const successDiv = document.getElementById('success-message');
        const toggleSenha = document.getElementById('toggle-senha');
        const rememberCheckbox = document.getElementById('remember');

        // ==========================================
        // MOSTRAR/OCULTAR SENHA
        // ==========================================
        toggleSenha.addEventListener('click', () => {
            const isPassword = senhaInput.type === 'password';
            senhaInput.type = isPassword ? 'text' : 'password';
            toggleSenha.textContent = isPassword ? '[[icone:ocultar]]' : '[[icone:visualizar]]';
            toggleSenha.setAttribute('aria-label', isPassword ? 'Ocultar senha' : 'Mostrar senha');
        });

        // ==========================================
        // MENSAGENS
        // ==========================================
        function mostrarErro(msg) {
            successDiv.classList.remove('show');
            errorDiv.textContent = msg;
            errorDiv.classList.add('show');
        }

        function mostrarSucesso(msg) {
            errorDiv.classList.remove('show');
            successDiv.textContent = msg;
            successDiv.classList.add('show');
        }

        function limparMensagens() {
            errorDiv.classList.remove('show');
            successDiv.classList.remove('show');
        }

        // ==========================================
        // CARREGAR E-MAIL SALVO (LEMBRAR-ME)
        // ==========================================
        const savedEmail = localStorage.getItem('remember_email');
        if (savedEmail) {
            emailInput.value = savedEmail;
            rememberCheckbox.checked = true;
            senhaInput.focus();
        }

        // ==========================================
        // VALIDAÇÃO EM TEMPO REAL
        // ==========================================
        emailInput.addEventListener('blur', () => {
            if (emailInput.value && !validarEmail(emailInput.value)) {
                emailInput.style.borderColor = 'var(--danger)';
            } else {
                emailInput.style.borderColor = '';
            }
        });

        emailInput.addEventListener('input', () => {
            emailInput.style.borderColor = '';
        });

        // ==========================================
        // SUBMIT DO FORMULÁRIO
        // ==========================================
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            limparMensagens();

            const email = emailInput.value.trim();
            const senha = senhaInput.value;

            // Validações
            if (!email) {
                mostrarErro('Por favor, informe seu e-mail');
                emailInput.focus();
                return;
            }

            if (!validarEmail(email)) {
                mostrarErro('Por favor, informe um e-mail válido');
                emailInput.focus();
                return;
            }

            if (!senha) {
                mostrarErro('Por favor, informe sua senha');
                senhaInput.focus();
                return;
            }

            if (senha.length < 8) {
                mostrarErro('A senha deve ter no mínimo 8 caracteres');
                senhaInput.focus();
                return;
            }

            // Estado de loading
            btnLogin.disabled = true;
            btnLogin.textContent = '[[icone:relogio]] Entrando...';

            try {
                const data = await apiRequest('/login', {
                    method: 'POST',
                    body: JSON.stringify({ email, senha })
                });

                // Salvar e-mail se "Lembrar-me" estiver marcado
                if (rememberCheckbox.checked) {
                    localStorage.setItem('remember_email', email);
                } else {
                    localStorage.removeItem('remember_email');
                }

                // Salvar dados de sessão
                localStorage.setItem('token', data.token);
                localStorage.setItem('usuario', JSON.stringify(data.usuario));
                localStorage.setItem('empresa', JSON.stringify(data.empresa));

                // Mostrar sucesso
                mostrarSucesso('[[icone:confirmar]] Login realizado! Redirecionando...');

                // Redirecionar conforme role
                setTimeout(() => {
                    const role = data.usuario.role;
                    const dashboards = {
                        'administrador_principal': 'admin/dashboard.html',
                        'administrador_setor': 'admin/dashboard.html',
                        'gestor': 'gestor/dashboard.html',
                        'colaborador': 'colaborador/dashboard.html'
                    };

                    window.location.href = dashboards[role] || 'index.html';
                }, 600);

            } catch (error) {
                console.error('Erro no login:', error);
                
                // Mensagens de erro amigáveis
                let mensagem = error.message;

                if (mensagem.includes('Credenciais inválidas')) {
                    mensagem = '[[icone:fechar]] E-mail ou senha incorretos. Tente novamente.';
                } else if (mensagem.includes('Empresa inativa')) {
                    mensagem = '[[icone:alerta]] A empresa está inativa. Entre em contato com o administrador.';
                } else if (mensagem.includes('conexão')) {
                    mensagem = '[[icone:caixa]] Erro de conexão. Verifique se o servidor está rodando.';
                }

                mostrarErro(mensagem);

                // Reabilitar botão
                btnLogin.disabled = false;
                btnLogin.textContent = 'Entrar';

                // Focar no campo com erro
                if (mensagem.includes('senha')) {
                    senhaInput.focus();
                    senhaInput.select();
                }
            }
        });

        // ==========================================
        // ENTER KEY
        // ==========================================
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !btnLogin.disabled) {
                if (document.activeElement === emailInput || document.activeElement === senhaInput) {
                    form.dispatchEvent(new Event('submit'));
                }
            }
        });

        // ==========================================
        // VERIFICAR SE JÁ ESTÁ LOGADO
        // ==========================================
        if (estaLogado()) {
            // Se já está logado, redirecionar
            const user = getUsuario();
            if (user) {
                const dashboards = {
                    'administrador_principal': 'admin/dashboard.html',
                    'administrador_setor': 'admin/dashboard.html',
                    'gestor': 'gestor/dashboard.html',
                    'colaborador': 'colaborador/dashboard.html'
                };

                if (dashboards[user.role]) {
                    mostrarSucesso('Você já está logado! Redirecionando...');
                    setTimeout(() => {
                        window.location.href = dashboards[user.role];
                    }, 800);
                }
            }
        }
    
Object.assign(window,{...(typeof mostrarErro === 'function' ? {mostrarErro} : {}),...(typeof mostrarSucesso === 'function' ? {mostrarSucesso} : {}),...(typeof limparMensagens === 'function' ? {limparMensagens} : {})});
})();