// frontend/js/icones.js
// Ícones SVG locais: não precisa instalar biblioteca ou usar CDN.

(function () {
    "use strict";

    const SVG_NS = "http://www.w3.org/2000/svg";

    // Todos os desenhos usam uma área de 24 × 24.
    // A cor é herdada do texto do botão, menu ou título.
    const desenhos = {
        painel: [
            ["rect", { x: 3, y: 3, width: 7, height: 7, rx: 1 }],
            ["rect", { x: 14, y: 3, width: 7, height: 7, rx: 1 }],
            ["rect", { x: 3, y: 14, width: 7, height: 7, rx: 1 }],
            ["rect", { x: 14, y: 14, width: 7, height: 7, rx: 1 }]
        ],

        empresa: [
            ["rect", { x: 5, y: 3, width: 14, height: 18, rx: 2 }],
            ["path", { d: "M9 21v-4h6v4M9 7h1m4 0h1M9 11h1m4 0h1" }]
        ],

        setores: [
            ["rect", { x: 9, y: 3, width: 6, height: 5, rx: 1 }],
            ["rect", { x: 3, y: 16, width: 6, height: 5, rx: 1 }],
            ["rect", { x: 15, y: 16, width: 6, height: 5, rx: 1 }],
            ["path", { d: "M12 8v4M6 16v-4h12v4" }]
        ],

        usuario: [
            ["circle", { cx: 12, cy: 8, r: 4 }],
            ["path", { d: "M4 21v-2a8 8 0 0 1 16 0v2" }]
        ],

        equipe: [
            ["circle", { cx: 9, cy: 8, r: 3 }],
            ["path", {
                d: "M2 21v-2a7 7 0 0 1 14 0v2M17 5a3 3 0 0 1 0 6M22 21v-2a7 7 0 0 0-5-6"
            }]
        ],

        ordens: [
            ["path", {
                d: "M9 5H6a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-3"
            }],
            ["rect", { x: 9, y: 2, width: 6, height: 5, rx: 1 }],
            ["path", { d: "M8 12h8M8 16h8" }]
        ],

        calendario: [
            ["rect", { x: 3, y: 5, width: 18, height: 16, rx: 2 }],
            ["path", { d: "M16 3v4M8 3v4M3 11h18M8 15h2m4 0h2M8 18h2" }]
        ],

        grafico: [
            ["path", { d: "M3 3v18h18M7 16v-4M12 16V8M17 16V5" }]
        ],

        tendencia: [
            ["path", { d: "m3 17 6-6 4 4 8-10M15 5h6v6" }]
        ],

        kanban: [
            ["rect", { x: 3, y: 3, width: 18, height: 18, rx: 2 }],
            ["path", { d: "M8 7v10M12 7v6M16 7v8" }]
        ],

        documento: [
            ["path", {
                d: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h6"
            }]
        ],

        conhecimento: [
            ["path", {
                d: "M12 5C8 2 4 3 2 4v15c3-1 6-1 10 2 4-3 7-3 10-2V4c-2-1-6-2-10 1Zm0 0v16"
            }]
        ],

        chat: [
            ["path", {
                d: "M21 11a8 8 0 0 1-8 8H7l-5 3 2-6a8 8 0 0 1-1-5 9 9 0 0 1 18 0Z"
            }],
            ["path", { d: "M8 10h8M8 14h5" }]
        ],

        notificacao: [
            ["path", {
                d: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"
            }]
        ],

        seguranca: [
            ["path", { d: "m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6z" }],
            ["path", { d: "m8 12 3 3 5-6" }]
        ],

        configuracoes: [
            ["path", { d: "M4 5h16M4 12h16M4 19h16" }],
            ["circle", { cx: 8, cy: 5, r: 2 }],
            ["circle", { cx: 16, cy: 12, r: 2 }],
            ["circle", { cx: 10, cy: 19, r: 2 }]
        ],

        sair: [
            ["path", {
                d: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M9 12h12m-4-4 4 4-4 4"
            }]
        ],

        buscar: [
            ["circle", { cx: 10.5, cy: 10.5, r: 7.5 }],
            ["path", { d: "m16 16 5 5" }]
        ],

        adicionar: [
            ["path", { d: "M12 5v14M5 12h14" }]
        ],

        confirmar: [
            ["path", { d: "m5 12 4 4L19 6" }]
        ],

        sucesso: [
            ["circle", { cx: 12, cy: 12, r: 9 }],
            ["path", { d: "m8 12 3 3 5-6" }]
        ],

        fechar: [
            ["path", { d: "m6 6 12 12M6 18 18 6" }]
        ],

        editar: [
            ["path", {
                d: "m16 3 5 5M3 21l5-1L21 7a2 2 0 0 0-5-5L3 15z"
            }]
        ],

        excluir: [
            ["path", {
                d: "M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"
            }]
        ],

        atualizar: [
            ["path", {
                d: "M20 7A9 9 0 0 0 5 4L2 7m0-5v5h5M4 17a9 9 0 0 0 15 3l3-3m0 5v-5h-5"
            }]
        ],

        relogio: [
            ["circle", { cx: 12, cy: 12, r: 9 }],
            ["path", { d: "M12 7v5l3 2" }]
        ],

        visualizar: [
            ["path", { d: "M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12Z" }],
            ["circle", { cx: 12, cy: 12, r: 3 }]
        ],

        ocultar: [
            ["path", {
                d: "m3 3 18 18M10 5a12 12 0 0 1 12 7 14 14 0 0 1-3 4M6 6a15 15 0 0 0-4 6s3 7 10 7a12 12 0 0 0 5-1M10 10a3 3 0 0 0 4 4"
            }]
        ],

        lua: [
            ["path", { d: "M21 13A9 9 0 0 1 11 3a9 9 0 1 0 10 10Z" }]
        ],

        sol: [
            ["circle", { cx: 12, cy: 12, r: 4 }],
            ["path", {
                d: "M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5"
            }]
        ],

        cadeado: [
            ["rect", { x: 5, y: 10, width: 14, height: 11, rx: 2 }],
            ["path", { d: "M8 10V7a4 4 0 0 1 8 0v3M12 14v3" }]
        ],

        chave: [
            ["circle", { cx: 8, cy: 8, r: 5 }],
            ["path", { d: "m12 12 9 9m-3-3 3-3m-6 0 3-3" }]
        ],

        anexo: [
            ["path", {
                d: "m21 11-9 9a6 6 0 0 1-8-8L14 2a4 4 0 0 1 6 6L10 18a2 2 0 0 1-3-3l9-9"
            }]
        ],

        baixar: [
            ["path", {
                d: "M12 3v12m-5-5 5 5 5-5M5 16v5h14v-5"
            }]
        ],

        enviar: [
            ["path", { d: "m22 2-7 20-4-9-9-4zM22 2 11 13" }]
        ],

        upload: [
            ["path", {
                d: "M12 16V3m-5 5 5-5 5 5M5 16v5h14v-5"
            }]
        ],

        email: [
            ["rect", { x: 3, y: 5, width: 18, height: 14, rx: 2 }],
            ["path", { d: "m3 6 9 7 9-7" }]
        ],

        pasta: [
            ["path", {
                d: "M3 7V4h6l2 3h10v13H3z"
            }]
        ],

        informacao: [
            ["circle", { cx: 12, cy: 12, r: 9 }],
            ["path", { d: "M12 11v6M12 7h.01" }]
        ],

        alerta: [
            ["path", { d: "M12 3 2 21h20zM12 9v5M12 17h.01" }]
        ],

        ajuda: [
            ["circle", { cx: 12, cy: 12, r: 9 }],
            ["path", {
                d: "M9 9a3 3 0 0 1 6 0c0 2-3 2-3 5M12 17h.01"
            }]
        ],

        bloquear: [
            ["circle", { cx: 12, cy: 12, r: 9 }],
            ["path", { d: "m6 6 12 12" }]
        ],

        inicio: [
            ["path", {
                d: "m3 10 9-7 9 7M5 9v12h14V9M9 21v-8h6v8"
            }]
        ],

        localizacao: [
            ["path", {
                d: "M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z"
            }],
            ["circle", { cx: 12, cy: 10, r: 3 }]
        ],

        prioridade: [
            ["path", { d: "m13 2-9 12h7l-1 8L21 9h-8z" }]
        ],

        ferramenta: [
            ["path", {
                d: "M14 6a5 5 0 0 0-6 6l-6 6a3 3 0 0 0 4 4l6-6a5 5 0 0 0 6-6l-4 2-3-3z"
            }]
        ],

        computador: [
            ["rect", { x: 2, y: 3, width: 20, height: 14, rx: 2 }],
            ["path", { d: "M8 21h8M12 17v4" }]
        ],

        celular: [
            ["rect", { x: 6, y: 2, width: 12, height: 20, rx: 2 }],
            ["path", { d: "M11 18h2" }]
        ],

        camera: [
            ["path", { d: "M3 7h4l2-3h6l2 3h4v14H3z" }],
            ["circle", { cx: 12, cy: 13, r: 4 }]
        ],

        salvar: [
            ["path", {
                d: "M3 3h15l3 3v15H3zM7 3v6h10V3M7 21v-8h10v8"
            }]
        ],

        imprimir: [
            ["path", { d: "M6 9V3h12v6M6 17H3V9h18v8h-3" }],
            ["rect", { x: 6, y: 14, width: 12, height: 7 }],
            ["path", { d: "M17 11h.01" }]
        ],

        link: [
            ["path", {
                d: "M10 13a5 5 0 0 0 7 0l4-4a5 5 0 0 0-7-7l-2 2M14 11a5 5 0 0 0-7 0l-4 4a5 5 0 0 0 7 7l2-2"
            }]
        ],

        alvo: [
            ["circle", { cx: 12, cy: 12, r: 9 }],
            ["circle", { cx: 12, cy: 12, r: 5 }],
            ["circle", { cx: 12, cy: 12, r: 1 }]
        ],

        estrela: [
            ["path", {
                d: "m12 3 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z"
            }]
        ],

        ideia: [
            ["path", {
                d: "M9 18h6M9 21h6M8 14a7 7 0 1 1 8 0c-1 1-1 2-1 4H9c0-2 0-3-1-4"
            }]
        ],

        caixa: [
            ["path", {
                d: "m12 3 9 5v9l-9 5-9-5V8zM3 8l9 5 9-5M12 13v9M7 5l10 6"
            }]
        ],

        status: [
            ["circle", { cx: 12, cy: 12, r: 5, fill: "currentColor" }]
        ],

        menu: [
            ["path", { d: "M4 6h16M4 12h16M4 18h16" }]
        ],

        direita: [
            ["path", { d: "m9 5 7 7-7 7" }]
        ],

        esquerda: [
            ["path", { d: "m15 5-7 7 7 7" }]
        ],

        baixo: [
            ["path", { d: "m5 9 7 7 7-7" }]
        ]
    };

    /**
     * Cria um elemento SVG.
     * Exemplo: GestaoIcones.criar("ordens")
     */
    function criar(nome) {
        const desenho = desenhos[nome];

        if (!desenho) {
            console.warn("Ícone não encontrado:", nome);
            return null;
        }

        const svg = document.createElementNS(SVG_NS, "svg");

        const atributos = {
            viewBox: "0 0 24 24",
            width: "1em",
            height: "1em",
            fill: "none",
            stroke: "currentColor",
            "stroke-width": "1.8",
            "stroke-linecap": "round",
            "stroke-linejoin": "round",
            "aria-hidden": "true",
            focusable: "false",
            class: "gestao-icone"
        };

        Object.entries(atributos).forEach(([nome, valor]) => {
            svg.setAttribute(nome, valor);
        });

        svg.style.display = "inline-block";
        svg.style.verticalAlign = "-0.125em";
        svg.style.flexShrink = "0";
        svg.style.pointerEvents = "none";

        desenho.forEach(([tipo, atributosElemento]) => {
            const elemento = document.createElementNS(SVG_NS, tipo);

            Object.entries(atributosElemento).forEach(([nome, valor]) => {
                elemento.setAttribute(nome, String(valor));
            });

            svg.appendChild(elemento);
        });

        return svg;
    }

    /**
     * Retorna o SVG em texto para templates JavaScript.
     * Exemplo:
     * botao.innerHTML = GestaoIcones.html("salvar") + " Salvar";
     */
    function html(nome) {
        const svg = criar(nome);
        return svg ? svg.outerHTML : "";
    }

    /**
     * Preenche elementos com data-icone.
     * Exemplo:
     * <span data-icone="ordens"></span>
     */
    function renderizar(raiz = document) {
        const elementos = [];

        if (
            raiz instanceof Element &&
            raiz.matches("[data-icone]")
        ) {
            elementos.push(raiz);
        }

        if (typeof raiz.querySelectorAll === "function") {
            elementos.push(
                ...raiz.querySelectorAll("[data-icone]")
            );
        }

        elementos.forEach(elemento => {
            const nome = elemento.getAttribute("data-icone");

            // Evita renderizar novamente um ícone que já está pronto.
            if (
                elemento.dataset.iconeRenderizado === nome &&
                elemento.querySelector("svg.gestao-icone")
            ) {
                return;
            }

            const svg = criar(nome);

            if (!svg) {
                return;
            }

            elemento.replaceChildren(svg);
            elemento.dataset.iconeRenderizado = nome;
        });
    }

    // Disponibiliza as funções para os outros arquivos do projeto.
    window.GestaoIcones = Object.freeze({
        criar,
        html,
        renderizar
    });

    // Only explicit UI markers are converted; emojis typed by users are untouched.
    const marker = /\[\[icone:([a-z0-9_]+)\]\]/g;
    function textoSemIcones(texto) {
        return String(texto).replace(marker, '').trim();
    }
    function renderizarTexto(raiz) {
        const textos = [];
        if (raiz.nodeType === Node.TEXT_NODE) textos.push(raiz);
        else if (raiz.querySelectorAll) {
            const walker = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT);
            while (walker.nextNode()) textos.push(walker.currentNode);
        }
        textos.forEach(no => {
            if (!no.data.includes('[[icone:') || !no.parentElement || no.parentElement.closest('script,style,textarea,pre,code,svg')) return;
            const parent = no.parentElement;
            if (parent.closest('option,title')) { no.data = textoSemIcones(no.data); return; }
            const fragmento = document.createDocumentFragment();
            let inicio = 0;
            for (const match of no.data.matchAll(marker)) {
                fragmento.append(document.createTextNode(no.data.slice(inicio, match.index)));
                const svg = criar(match[1]);
                if (svg) fragmento.append(svg);
                inicio = match.index + match[0].length;
            }
            fragmento.append(document.createTextNode(no.data.slice(inicio)));
            const controle = parent.closest('button,a');
            if (controle && !textoSemIcones(controle.textContent) && (!controle.hasAttribute('aria-label') || controle.dataset.iconeLabel === 'true')) {
                const nome = [...no.data.matchAll(marker)][0]?.[1];
                controle.dataset.iconeLabel = 'true';
                controle.setAttribute('aria-label', controle.title || ({lua:'Alternar tema',sol:'Alternar tema',visualizar:'Mostrar senha',ocultar:'Ocultar senha',menu:'Abrir menu',fechar:'Fechar',excluir:'Excluir',editar:'Editar'}[nome] || nome));
            }
            no.replaceWith(fragmento);
        });
    }
    for (const nome of ['alert', 'confirm', 'prompt']) {
        const original = window[nome].bind(window);
        window[nome] = (mensagem, ...args) => original(textoSemIcones(mensagem), ...args);
    }

    function iniciar() {
        renderizarTexto(document.body);
        renderizar();

        // Também renderiza ícones de cards, tabelas e modais
        // adicionados depois que a página carregou.
        const observador = new MutationObserver(alteracoes => {
            alteracoes.forEach(alteracao => {
                if (alteracao.type === "characterData") { renderizarTexto(alteracao.target); return; }
                if (alteracao.type === "attributes") {
                    renderizar(alteracao.target);
                    return;
                }

                alteracao.addedNodes.forEach(elemento => {
                    renderizarTexto(elemento);
                    if (elemento.nodeType === Node.ELEMENT_NODE) {
                        renderizar(elemento);
                    }
                });
            });
        });

        observador.observe(document.body, {
            characterData: true,
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ["data-icone"]
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", iniciar, {
            once: true
        });
    } else {
        iniciar();
    }
})();