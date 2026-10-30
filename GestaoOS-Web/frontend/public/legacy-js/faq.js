(function(){

        // ==========================================
        // ACCORDION
        // ==========================================
        document.querySelectorAll('.accordion-header').forEach(header => {
            header.addEventListener('click', () => {
                const item = header.parentElement;
                const isOpen = item.classList.contains('open');

                // Fechar todos os outros da mesma categoria
                const category = item.closest('.faq-category');
                if (category) {
                    category.querySelectorAll('.accordion-item.open').forEach(other => {
                        if (other !== item) {
                            other.classList.remove('open');
                        }
                    });
                }

                // Toggle do atual
                item.classList.toggle('open', !isOpen);
            });
        });

        // ==========================================
        // BUSCA
        // ==========================================
        const searchInput = document.getElementById('faq-search');
        const faqContainer = document.getElementById('faq-container');
        const noResults = document.getElementById('no-results');

        searchInput.addEventListener('input', debounce((e) => {
            const termo = e.target.value.toLowerCase().trim();
            let totalVisiveis = 0;

            // Percorrer categorias
            document.querySelectorAll('.faq-category').forEach(category => {
                let questionsVisiveis = 0;

                // Percorrer accordion items
                category.querySelectorAll('.accordion-item').forEach(item => {
                    const pergunta = item.querySelector('.accordion-header span').textContent.toLowerCase();
                    const resposta = item.querySelector('.accordion-body-content')?.textContent.toLowerCase() || '';
                    const keywords = item.dataset.question?.toLowerCase() || '';

                    const match = !termo || 
                                  pergunta.includes(termo) || 
                                  resposta.includes(termo) || 
                                  keywords.includes(termo);

                    if (match) {
                        item.style.display = '';
                        questionsVisiveis++;
                        totalVisiveis++;
                    } else {
                        item.style.display = 'none';
                    }
                });

                // Mostrar/ocultar categoria
                category.style.display = questionsVisiveis > 0 ? '' : 'none';

                // Fechar accordions ao buscar
                if (termo) {
                    category.querySelectorAll('.accordion-item.open').forEach(item => {
                        item.classList.remove('open');
                    });
                }
            });

            // Mostrar mensagem de "nenhum resultado"
            noResults.classList.toggle('show', totalVisiveis === 0);
        }, 200));

        // ==========================================
        // ABRIR ACCORDION VIA URL (?q=...)
        // ==========================================
        const urlParams = new URLSearchParams(window.location.search);
        const buscaUrl = urlParams.get('q');
        if (buscaUrl) {
            searchInput.value = buscaUrl;
            searchInput.dispatchEvent(new Event('input'));
        }

        // ==========================================
        // SCROLL SUAVE
        // ==========================================
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                const targetId = this.getAttribute('href');
                if (targetId === '#') return;
                e.preventDefault();
                const target = document.querySelector(targetId);
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
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
    
Object.assign(window,{});
})();