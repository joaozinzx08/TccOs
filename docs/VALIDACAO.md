# Validação executada — 30/09/2026

Ambiente: Linux, Node.js 24.19.0, npm 11.9, Chromium headless. A versão testada contém o frontend original convertido para React, Express, JWT e SQLite. Não foi executada em Windows nem publicada em hospedagem externa.

## Resultados

| Critério | Evidência observada |
| --- | --- |
| Instalação limpa | `npm install` em uma cópia sem node_modules: 126 pacotes instalados, saída 0 |
| Setup/.env | Cria banco, diretórios e segredo individual; segunda execução preserva a configuração |
| Desenvolvimento simultâneo | Playwright iniciou `scripts/dev.mjs`; React/Vite acessou a API Express pelo proxy |
| Backend | 7 testes aprovados, zero falhas |
| Navegador em desenvolvimento | 4 cenários aprovados, zero falhas |
| Build | `npm run build` aprovado; Vite 7.3.6, 71 módulos transformados |
| Navegador com build/Express | Os mesmos 4 cenários aprovados em `NODE_ENV=production`, com Helmet/CSP |
| Inicialização compilada | `npm start` executado na instalação limpa; frontend e `/api/status` responderam |
| Persistência | Empresa criada via HTTP; servidor encerrado/reiniciado; login recuperou a mesma empresa |
| Migração real | JSON do ZIP original importado em SQLite temporário; integrity_check=ok, foreign_key_check sem violações |
| Backup | Script oficial gerou SQLite e cópia dos uploads com servidor parado |
| Documentação servida | `/docs` e `/api/openapi.json` responderam na instalação compilada |
| Visual de referência | CSS claro, CSS escuro e logo comparados byte a byte com o ZIP original: iguais |
| Dependências de produção | `npm audit --omit=dev`: zero vulnerabilidades conhecidas reportadas na execução |

## O que os testes verificam

Os sete testes do backend cobrem:

1. Cadastro, login, ordens, comentário, histórico, notificações, anexos, chat, conhecimento, acesso administrativo, persistência e logout.
2. Migração de JSON, preservação de bcrypt, anexos e constraints relacionais/UNIQUE.
3. Recuperação e confirmação de e-mail: códigos, validade, cinco tentativas, uso único e revogação de sessões.
4. Separação dos quatro perfis, equipe setorial, sigilo e bloqueio de atendimento da própria ordem.
5. JWT adulterado/expirado, algoritmo/emissor/destinatário indevidos e revogação após troca de senha.
6. Isolamento transversal entre empresas, conversa privada, códigos únicos inclusive após renovação, exportação CSV e paginação.
7. Limite real de tentativas de login com resposta 429.

Os quatro cenários de navegador cobrem:

1. Proteção de rota; criação da empresa; logout/login; cadastro de usuário; ordem e histórico; chat e conhecimento persistidos após recarga; navegação pelos módulos administrativos.
2. Ingresso do colaborador por código; ordem sigilosa com PDF; download autenticado; gestor atendendo, comentando e concluindo; colaborador lendo e respondendo pelo detalhe.
3. Comparação das larguras renderizadas das páginas públicas originais e React em viewport de celular. Não houve redesenho para eliminar limitações responsivas que já existiam no legado.
4. Administrador de setor visualizando apenas sua equipe na gestão, sem escolher cargo principal ou outro setor, e criando colaborador do setor.

Os testes de navegador foram executados tanto com Vite+Express quanto com o build servido pelo Express. No ambiente desta validação, Chromium foi disponibilizado por um runtime local após falha no download padrão. Esse runtime não integra o ZIP; na instalação do usuário, use `npx playwright install chromium`.

## Migração do arquivo real

A conferência importou 5 empresas, 50 setores, 6 usuários, 15 categorias, 1 ordem, 1 registro de histórico, 1 notificação, 10 eventos de auditoria e 5 conversas. Nenhum artigo estava presente nessa fonte. Não foram publicadas informações pessoais nos logs da validação. A migração não modifica o JSON original e não reativa tokens opacos antigos.

## Evidências e reprodução

`evidencias/` contém logs dos testes, build, instalação e auditoria, hashes dos recursos visuais e resultado da migração/persistência. Os bancos dos testes não são distribuídos. O ZIP inclui o db.json e anexos antigos apenas em `legado/`, separados da aplicação e fora do diretório público.

```sh
npm install
npm run setup
npm test
npm run build
npx playwright install chromium
npm run test:e2e
npm run test:e2e:production
```

Para a apresentação, consulte `DEMONSTRACAO.md`.

## Limites da evidência

Passar nesses cenários não prova ausência de qualquer defeito. Não houve teste de carga, auditoria externa, SMTP com provedor real, certificado HTTPS público nem execução em Windows. A recuperação foi testada com transporte de e-mail substituído por coletor de teste; o modo local grava outbox. Nenhum e-mail externo foi enviado.

As 40 telas mantêm a estrutura original e os arquivos CSS, mas não há comparação pixel a pixel de todos os estados em todos os navegadores. A confirmação objetiva de layout em celular cobre quatro páginas; a navegação administrativa e os fluxos de gestor/colaborador foram exercitados. Fontes externas podem usar fallback quando a rede estiver indisponível.

A integração inclui uma camada de compatibilidade com scripts legados; não foi apresentada como reescrita completa em React. As limitações de implantação, paginação, calendário, polling e SLA estão documentadas no README e em ARQUITETURA.md. Dados de marketing presentes no site original não são métricas operacionais comprovadas.
