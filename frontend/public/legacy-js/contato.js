(function(){

        // ==========================================
        // ELEMENTOS
        // ==========================================
        const form = document.getElementById('contact-form');
        const nomeInput = document.getElementById('nome');
        const emailInput = document.getElementById('email');
        const assuntoInput = document.getElementById('assunto');
        const mensagemInput = document.getElementById('mensagem');
        const btnEnviar = document.getElementById('btn-enviar');
        const successBox = document.getElementById('success-box');
        const charCount = document.getElementById('char-count');

        // ==========================================
        // CONTADOR DE CARACTERES
        // ==========================================
        mensagemInput.addEventListener('input', () => {
            charCount.textContent = mensagemInput.value.length;
        });

        // ==========================================
        // LIMPAR ERRO AO DIGITAR
        // ==========================================
        function limparErro(input) {
            input.classList.remove('error');
            const errorEl = document.querySelector(`[data-error="${input.name}"]`);
            if (errorEl) errorEl.classList.remove('show');
        }

        [nomeInput, emailInput, assuntoInput, mensagemInput].forEach(input => {
            input.addEventListener('input', () => limparErro(input));
            input.addEventListener('change', () => limparErro(input));
        });

        // ==========================================
        // MOSTRAR ERRO
        // ==========================================
        function mostrarErro(input, mensagem) {
            input.classList.add('error');
            const errorEl = document.querySelector(`[data-error="${input.name}"]`);
            if (errorEl) {
                if (mensagem) errorEl.textContent = mensagem;
                errorEl.classList.add('show');
            }
        }

        // ==========================================
        // VALIDAÇÃO
        // ==========================================
        function validar() {
            let valido = true;

            // Nome
            if (!nomeInput.value.trim() || nomeInput.value.trim().length < 3) {
                mostrarErro(nomeInput, 'Informe seu nome completo (mínimo 3 caracteres)');
                valido = false;
            }

            // E-mail
            if (!emailInput.value.trim() || !validarEmail(emailInput.value.trim())) {
                mostrarErro(emailInput, 'Informe um e-mail válido');
                valido = false;
            }

            // Assunto
            if (!assuntoInput.value) {
                mostrarErro(assuntoInput, 'Selecione um assunto');
                valido = false;
            }

            // Mensagem
            if (!mensagemInput.value.trim() || mensagemInput.value.trim().length < 10) {
                mostrarErro(mensagemInput, 'Digite sua mensagem (mínimo 10 caracteres)');
                valido = false;
            }

            return valido;
        }

        // ==========================================
        // SUBMIT
        // ==========================================
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            successBox.classList.remove('show');

            if (!validar()) {
                // Focar no primeiro campo com erro
                const primeiroErro = form.querySelector('.error');
                if (primeiroErro) primeiroErro.focus();
                return;
            }

            // Loading
            btnEnviar.disabled = true;
            btnEnviar.innerHTML = '<span class="loading-spinner"></span>Enviando...';

            try {
                const dados = {
                    nome: nomeInput.value.trim(),
                    email: emailInput.value.trim(),
                    assunto: assuntoInput.value,
                    mensagem: mensagemInput.value.trim(),
                    data: new Date().toISOString(),
                    origem: 'formulario_contato'
                };

                // Registrar no backend
                // A confirmação abaixo ocorre somente após a resposta da API.
                await apiRequest('/contato',{method:'POST',body:JSON.stringify(dados)});

                
                

                // ===== SUCESSO =====
                successBox.classList.add('show');
                form.reset();
                charCount.textContent = '0';

                // Scroll para o topo do formulário
                successBox.scrollIntoView({ behavior: 'smooth', block: 'center' });

                // Esconder após 8 segundos
                setTimeout(() => {
                    successBox.classList.remove('show');
                }, 8000);

            } catch (error) {
                console.error('Erro ao enviar:', error);
                showToast('Erro ao enviar mensagem. Tente novamente.', 'error');
            } finally {
                btnEnviar.disabled = false;
                btnEnviar.textContent = 'Enviar Mensagem';
            }
        });

        // ==========================================
        // NAVBAR SCROLL
        // ==========================================
        const navbar = document.querySelector('.navbar');
        window.addEventListener('scroll', () => {
            navbar.style.boxShadow = window.scrollY > 50 
                ? '0 4px 20px rgba(0, 0, 0, 0.1)' 
                : '';
        });
    
Object.assign(window,{...(typeof limparErro === 'function' ? {limparErro} : {}),...(typeof mostrarErro === 'function' ? {mostrarErro} : {}),...(typeof validar === 'function' ? {validar} : {})});
})();