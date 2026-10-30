(function(){

        // ==========================================
        // ELEMENTOS
        // ==========================================
        const codigoInput = document.getElementById('codigo');
        const nomeInput = document.getElementById('nome');
        const emailInput = document.getElementById('email');
        const senhaInput = document.getElementById('senha');
        const senha2Input = document.getElementById('senha2');
        const btnEntrar = document.getElementById('btn-entrar');
        const btnEntrarTexto = document.getElementById('btn-entrar-texto');
        const msgErro = document.getElementById('msg-erro');
        const msgSucesso = document.getElementById('msg-sucesso');
        const toggleSenha = document.getElementById('toggle-senha');
        const toggleSenha2 = document.getElementById('toggle-senha2');
        const passwordStrength = document.getElementById('password-strength');
        const strengthFill = document.getElementById('strength-fill');
        const strengthText = document.getElementById('strength-text');
        const senhaMatch = document.getElementById('senha-match');

        // ==========================================
        // MÁSCARA DO CÓDIGO
        // ==========================================
        codigoInput.addEventListener('input', function(e) {
            let valor = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');

            // Remover GEST- se já tem
            if (valor.startsWith('GEST')) {
                valor = valor.substring(4);
            }

            // Limitar ao tamanho máximo do código
            valor = valor.substring(0, 20);

            // Formatar
            e.target.value = valor ? 'GEST-' + valor : '';

            // Validar
            const completo = /^GEST-[A-Z0-9]{6,20}$/.test(e.target.value);
            if (completo) {
                e.target.classList.add('valid');
            } else {
                e.target.classList.remove('valid');
            }
        });

        // ==========================================
        // TOGGLE SENHA
        // ==========================================
        toggleSenha.addEventListener('click', function() {
            const isPassword = senhaInput.type === 'password';
            senhaInput.type = isPassword ? 'text' : 'password';
            this.textContent = isPassword ? '[[icone:ocultar]]' : '[[icone:visualizar]]';
        });

        toggleSenha2.addEventListener('click', function() {
            const isPassword = senha2Input.type === 'password';
            senha2Input.type = isPassword ? 'text' : 'password';
            this.textContent = isPassword ? '[[icone:ocultar]]' : '[[icone:visualizar]]';
        });

        // ==========================================
        // FORÇA DA SENHA
        // ==========================================
        senhaInput.addEventListener('input', function() {
            const senha = this.value;

            if (senha.length === 0) {
                passwordStrength.classList.remove('show');
                return;
            }

            passwordStrength.classList.add('show');

            let forca = 0;

            if (senha.length >= 6) forca++;
            if (senha.length >= 10) forca++;
            if (/[A-Z]/.test(senha) && /[a-z]/.test(senha)) forca++;
            if (/[0-9]/.test(senha)) forca++;
            if (/[^A-Za-z0-9]/.test(senha)) forca++;

            strengthFill.classList.remove('fraca', 'media', 'forte');
            strengthText.classList.remove('fraca', 'media', 'forte');

            if (forca <= 2) {
                strengthFill.classList.add('fraca');
                strengthText.classList.add('fraca');
                strengthText.textContent = '[[icone:status]] Senha fraca';
            } else if (forca <= 3) {
                strengthFill.classList.add('media');
                strengthText.classList.add('media');
                strengthText.textContent = '[[icone:status]] Senha média';
            } else {
                strengthFill.classList.add('forte');
                strengthText.classList.add('forte');
                strengthText.textContent = '[[icone:status]] Senha forte';
            }
        });

        // ==========================================
        // VERIFICAR SE AS SENHAS COINCIDEM
        // ==========================================
        senha2Input.addEventListener('input', function() {
            const s1 = senhaInput.value;
            const s2 = this.value;

            if (!s2) {
                senhaMatch.style.display = 'none';
                return;
            }

            senhaMatch.style.display = 'block';

            if (s1 === s2) {
                senhaMatch.style.color = 'var(--success)';
                senhaMatch.textContent = '[[icone:confirmar]] As senhas coincidem';
            } else {
                senhaMatch.style.color = 'var(--danger)';
                senhaMatch.textContent = '[[icone:fechar]] As senhas não coincidem';
            }
        });

        // ==========================================
        // MENSAGENS
        // ==========================================
        function mostrarErro(msg) {
            msgSucesso.classList.remove('show');
            msgErro.textContent = msg;
            msgErro.classList.add('show');
            msgErro.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        function mostrarSucesso(msg) {
            msgErro.classList.remove('show');
            msgSucesso.innerHTML = msg;
            msgSucesso.classList.add('show');
        }

        // ==========================================
        // ENTRAR NA EMPRESA
        // ==========================================
        function entrarEmpresa() {
            console.log('[[icone:estrela]] entrarEmpresa() chamada');

            msgErro.classList.remove('show');
            msgSucesso.classList.remove('show');

            const codigo = codigoInput.value.trim().toUpperCase();
            const nome = nomeInput.value.trim();
            const email = emailInput.value.trim();
            const senha = senhaInput.value;
            const senha2 = senha2Input.value;

            // ===== VALIDAÇÕES =====
            if (!codigo) {
                mostrarErro('[[icone:alerta]] Informe o código da empresa');
                codigoInput.focus();
                return;
            }

            if (!/^GEST-[A-Z0-9]{6,20}$/.test(codigo)) {
                mostrarErro('[[icone:alerta]] Código inválido. Cole o código completo fornecido pela empresa');
                codigoInput.focus();
                return;
            }

            if (!nome || nome.length < 3) {
                mostrarErro('[[icone:alerta]] Informe seu nome completo (mínimo 3 caracteres)');
                nomeInput.focus();
                return;
            }

            if (!email) {
                mostrarErro('[[icone:alerta]] Informe um e-mail');
                emailInput.focus();
                return;
            }

            if (!validarEmail(email)) {
                mostrarErro('[[icone:alerta]] Formato de e-mail inválido');
                emailInput.focus();
                return;
            }

            if (!senha) {
                mostrarErro('[[icone:alerta]] Informe uma senha');
                senhaInput.focus();
                return;
            }

            if (senha.length < 8) {
                mostrarErro('[[icone:alerta]] A senha deve ter no mínimo 8 caracteres');
                senhaInput.focus();
                return;
            }

            if (senha !== senha2) {
                mostrarErro('[[icone:alerta]] As senhas não coincidem');
                senha2Input.focus();
                return;
            }

            // ===== LOADING =====
            btnEntrar.disabled = true;
            btnEntrarTexto.innerHTML = '<span class="loading-spinner"></span>Entrando na empresa...';

            // ===== API =====
            apiRequest('/empresas/entrar', {
                method: 'POST',
                body: JSON.stringify({
                    codigo: codigo,
                    nome: nome,
                    email: email,
                    senha: senha
                })
            })
            .then(function(response) {
                

                // Salvar sessão
                localStorage.setItem('token', response.token);
                localStorage.setItem('usuario', JSON.stringify(response.usuario));
                localStorage.setItem('empresa', JSON.stringify(response.empresa));

                // Mostrar sucesso
                mostrarSucesso(
                    '[[icone:estrela]] <strong>Bem-vindo(a), ' + response.usuario.nome.split(' ')[0] + '!</strong><br><br>' +
                    'Você entrou na empresa:<br>' +
                    '<strong style="font-size: 1.1rem; color: var(--success);">' + window.escapeHTML(response.empresa.nome) + '</strong><br><br>' +
                    '[[icone:relogio]] Redirecionando para seu dashboard...'
                );

                // Desabilitar interação
                codigoInput.disabled = true;
                nomeInput.disabled = true;
                emailInput.disabled = true;
                senhaInput.disabled = true;
                senha2Input.disabled = true;

                // Redirecionar
                setTimeout(function() {
                    window.location.href = 'colaborador/dashboard.html';
                }, 2500);
            })
            .catch(function(error) {
                console.error('[[icone:fechar]] Erro:', error);

                let mensagem = error.message || 'Erro ao entrar na empresa';

                if (mensagem.includes('não encontrada') || mensagem.includes('inativa')) {
                    mensagem = '[[icone:alerta]] Código da empresa não encontrado. Verifique com o administrador.';
                    codigoInput.focus();
                    codigoInput.select();
                } else if (mensagem.includes('já está cadastrado')) {
                    mensagem = '[[icone:alerta]] Este e-mail já está cadastrado. Faça login ou use outro e-mail.';
                    emailInput.focus();
                } else if (mensagem.includes('conexão') || mensagem.includes('fetch')) {
                    mensagem = '[[icone:caixa]] Erro de conexão. Verifique se o servidor está rodando.';
                }

                mostrarErro(mensagem);

                btnEntrar.disabled = false;
                btnEntrarTexto.innerHTML = '[[icone:sair]] Entrar na Empresa';
            });
        }

        // ==========================================
        // ENTER PARA ENVIAR
        // ==========================================
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !btnEntrar.disabled) {
                const activeEl = document.activeElement;
                if (activeEl && activeEl.tagName === 'INPUT') {
                    entrarEmpresa();
                }
            }
        });

        // ==========================================
        // VERIFICAR SE JÁ ESTÁ LOGADO
        // ==========================================
        if (estaLogado()) {
            const user = getUsuario();
            if (user) {
                const dashboards = {
                    'administrador_principal': 'admin/dashboard.html',
                    'administrador_setor': 'admin/dashboard.html',
                    'gestor': 'gestor/dashboard.html',
                    'colaborador': 'colaborador/dashboard.html'
                };
                if (dashboards[user.role]) {
                    window.location.href = dashboards[user.role];
                }
            }
        }

        console.log('[[icone:confirmar]] entrar-empresa.html carregado com sucesso!');
    
Object.assign(window,{...(typeof mostrarErro === 'function' ? {mostrarErro} : {}),...(typeof mostrarSucesso === 'function' ? {mostrarSucesso} : {}),...(typeof entrarEmpresa === 'function' ? {entrarEmpresa} : {})});
})();