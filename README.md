# GestãoOS — versão integrada para o TCC

React + Vite no frontend, Node.js + Express no backend e SQLite persistente. As 40 telas foram recuperadas do ZIP original: cores, CSS, imagens, organização e navegação do legado foram preservadas. O trabalho concentra-se na integração, nas regras de negócio e na segurança.

## Rodar pela primeira vez

Instale **Node.js 24 LTS**. Extraia o ZIP e abra o terminal na pasta `GestaoOS-TCC/GestaoOS`, onde está este arquivo e o `package.json`. Execute:

```sh
npm install
npm run setup
npm run dev
```

Abra **http://127.0.0.1:5173**. O último comando mantém Vite e Express funcionando simultaneamente. Mantenha esse terminal aberto; `Ctrl+C` encerra os dois.

1. Clique em **Criar empresa** e cadastre o administrador principal.
2. A empresa recebe um código exclusivo. O cadastro já inicia uma sessão; o código aparece no sistema e em Minha empresa.
3. Compartilhe o código para ingresso de colaboradores ou cadastre a equipe pela administração. Defina setores e gestores.
4. Ao sair, faça login com e-mail e senha. Se essas credenciais corresponderem a mais de uma empresa, o sistema solicita também o código.

Não há usuário ou senha padrão. O banco inicial é vazio. Os dados antigos estão separados para migração opcional; não são expostos pelo frontend.

## Conferir a instalação

```sh
npm test
npm run build
```

Para executar também os testes de navegador:

```sh
npx playwright install chromium
npm run test:e2e
npm run test:e2e:production
```

Os testes usam bancos temporários e não alteram seus dados. No Linux, o Playwright pode solicitar bibliotecas do sistema com `npx playwright install --with-deps chromium`.

## Executar a versão compilada

Encerre `npm run dev` antes de iniciar:

```sh
npm run build
npm start
```

Abra **http://127.0.0.1:3000**. Nessa modalidade o próprio Express entrega o frontend compilado e a API na mesma origem. Em desenvolvimento, o proxy do Vite encaminha `/api` para o Express. Alterar `PORT` em `backend/.env` também ajusta o destino desse proxy.

## Configuração e dados

`npm run setup` cria `backend/.env` a partir de `.env.example`, gera um segredo JWT criptográfico individual de 64 bytes e prepara SQLite/uploads. Reexecutá-lo preserva um segredo válido e os dados existentes. Não copie um segredo de exemplos nem publique o `.env`.

| Variável | Uso |
| --- | --- |
| `HOST` / `PORT` | API; padrão `127.0.0.1:3000` |
| `DATABASE_PATH` | Arquivo SQLite, relativo a `backend`; padrão `data/gestao.sqlite` |
| `UPLOADS_PATH` | Anexos e avatares privados; padrão `data/uploads` |
| `JWT_SECRET` | Segredo individual criado pelo setup |
| `JWT_EXPIRES_IN` | Validade do JWT; padrão `8h` |
| `NODE_ENV` | `development` local; use `production` na hospedagem |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Envio real dos códigos de recuperação/verificação |

Sem SMTP, em desenvolvimento, os e-mails são gravados como arquivos em `backend/data/outbox`. Abra o arquivo local para obter o código durante a demonstração. Isso não envia e-mail externo. Em produção, é necessário configurar SMTP para esses fluxos. A página Contato registra mensagens no banco; não promete envio de e-mail.

Para hospedagem pública, configure HTTPS no proxy/servidor da hospedagem e restrinja a porta interna da API. Não há certificado TLS incluído neste ZIP. A instalação local usa HTTP. A versão foi executada em Linux/Node 24; a execução dos scripts foi preparada para Windows, mas não foi testada em uma máquina Windows.

## Recuperar os dados do projeto antigo

Antes de criar empresas no banco novo, com o sistema parado:

```sh
npm run migrate:legacy -- legado/backend/db.json
```

O importador preserva empresas, usuários, hashes bcrypt, setores, categorias, ordens, anexos, histórico e os demais registros presentes. Os uploads devem estar junto ao JSON, em `uploads/anexos`. Sessões opacas antigas não são aceitas: faça login novamente. Novas senhas usam scrypt.

A importação é transacional e identifica o arquivo por SHA-256: repetir o mesmo arquivo não duplica dados. Um destino já preenchido por outra instalação é recusado. Para importar depois de criar dados novos, configure outro `DATABASE_PATH` e outro `UPLOADS_PATH`, execute setup e importe nesse destino; não apague o banco em uso.

## Backup

Com a aplicação parada, execute:

```sh
npm run backup
```

A pasta `backups/<data-hora>` recebe uma cópia consistente do SQLite e dos uploads. Guarde também o `.env` separadamente, em local privado. Para restaurar, com a aplicação parada, aponte `DATABASE_PATH` e `UPLOADS_PATH` para as cópias restauradas e reinicie. O banco usa WAL; não copie apenas o `.sqlite` enquanto houver gravações em andamento.

## Módulos e regras

Empresas, equipe, setores, categorias/subcategorias, ordens, prioridades, prazos/SLA, comentários, histórico, anexos privados, Kanban, calendário, indicadores, CSV, conhecimento, chat geral/privado, notificações, auditoria, perfil, avatar e troca/recuperação de senha estão conectados à API.

O código da empresa usa aleatoriedade criptográfica e restrição `UNIQUE` no banco. Um registro permanente reserva códigos antigos quando o administrador renova o código. O servidor obtém a empresa da sessão autenticada; campos enviados pelo navegador não permitem trocar de empresa.

| Perfil | Escopo |
| --- | --- |
| `administrador_principal` | Administração da própria empresa, equipe, setores, ordens, SLA, código e auditoria |
| `administrador_setor` | Ordens do setor; cadastro/edição de gestores e colaboradores do próprio setor; sem gestão da empresa ou auditoria global |
| `gestor` | Atendimento e relatórios do setor; publicação de conhecimento; sem administrar usuários |
| `colaborador` | Abertura/acompanhamento das próprias ordens, comentários, anexos, conhecimento, conversas e perfil |

Toda autorização é conferida na API. Mensagens privadas exigem participação na conversa, inclusive para administradores. Uma ordem sigilosa omite a identidade do solicitante nos dados e no histórico entregues aos demais usuários. O solicitante não pode atender a própria ordem, mesmo sendo administrador.

JWT assinado, Bearer, expiração, sessão revogável, scrypt, Helmet, limites de requisições, validação de arquivos, transações e trilha de auditoria fazem parte da implementação. Os testes cobrem essas regras; isso não equivale a uma auditoria de segurança externa.

## Estrutura e documentação

- `frontend/src/main.jsx`: inicialização React, contexto de autenticação e proteção de rotas.
- `frontend/src/pages`: componentes correspondentes às telas originais.
- `frontend/src/api.js` e `legacy-bridge.js`: comunicação autenticada e compatibilidade de comportamento.
- `frontend/legacy`: fontes HTML para manutenção das telas; `npm run legacy:generate` regenera os componentes/scripts. Não edite somente os arquivos gerados.
- `frontend/public/css`: CSS original, sem alteração.
- `backend/src`: API, SQLite, autenticação, senhas, recuperação e migração.
- `backend/test` e `e2e`: testes de API/banco e navegador.
- [Guia da API](docs/API.md), [arquitetura e decisões](docs/ARQUITETURA.md), [validação](docs/VALIDACAO.md), [retomada da conversa](docs/RETOMADA.md), [roteiro de apresentação](docs/DEMONSTRACAO.md).

Com o backend ligado, `http://127.0.0.1:3000/docs` mostra o guia da API e `/api/openapi.json` fornece o inventário OpenAPI. Não dependem de uma conta. `npm run docs:api` atualiza o inventário a partir das rotas.

## Limites conhecidos

A integração mantém parte do JavaScript legado em uma camada de compatibilidade; não é uma reescrita integral de todos os comportamentos em hooks. O chat atualiza por consulta a cada cinco segundos. O calendário deriva dos prazos; não cria eventos independentes. SLA usa horas corridas. Categorias setoriais e confirmação de e-mail possuem API, sem nova tela exclusiva. A recuperação reutiliza o link de login com diálogos do navegador.

A paginação está disponível na API; as telas antigas ainda carregam listas completas. A aplicação usa SQLite local e operações síncronas: não foi validada para grande volume ou múltiplos servidores. A auditoria bloqueia alterações pela aplicação, mas um administrador com acesso direto ao arquivo do banco continua tendo controle sobre ele.

O token fica no `localStorage` para manter a integração Bearer do legado. A sanitização e a política de conteúdo reduzem riscos de injeção; o projeto não deve carregar scripts não confiáveis. A página pública preserva textos demonstrativos do original, como contadores de empresas/uptime: não são medições de clientes reais. Veja as evidências e os limites em `docs/VALIDACAO.md`.
