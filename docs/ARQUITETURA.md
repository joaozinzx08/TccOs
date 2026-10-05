# Arquitetura e decisões do GestãoOS

## Continuidade e visual

O ZIP original é a referência visual. O Markdown recuperado continha uma versão anterior com telas reorganizadas e sessão opaca; essa interface não foi usada como substituta do legado. O marco JWT/SQLite/testes/build descrito na conversa foi reconstruído e testado antes da continuação. O código perdido não foi recuperado byte a byte.

O frontend tem 40 componentes React gerados mecanicamente a partir do HTML legado, preservando classes, textos, estilos e hierarquia. React controla montagem, contexto de autenticação, carregamento das páginas e autorização de navegação. O cliente API envia Bearer e encerra a sessão local ao receber 401. A ponte de compatibilidade integra os comportamentos imperativos antigos à API e sanitiza HTML dinâmico com DOMPurify.

Os dois arquivos CSS e o logo são idênticos aos originais. Houve ajustes funcionais em formulários (senha, tamanho do código, opções permitidas por perfil), correção de identificadores duplicados e inclusão de comentário/histórico dentro do modal já existente do colaborador. Não houve troca de paleta, reconstrução de layout ou substituição por template genérico.

## Responsabilidades

| Camada | Arquivos | Responsabilidade |
| --- | --- | --- |
| Apresentação | frontend/src/pages, public/css | Telas e estilos originais |
| React | main.jsx, api.js, legacy-bridge.js | Sessão, rotas, requisições, integração e compatibilidade |
| HTTP e domínio | backend/src/app.js | Validação, autorização, fluxo de ordens, upload, relatórios, notificações e auditoria |
| Autenticação | tokens.js, security.js | JWT/sessões, senhas, validações comuns |
| Recuperação | account-recovery.js, mail.js | Códigos de uso único e entrega por SMTP/outbox |
| Persistência | db.js | Schema, índices, constraints, transações e consultas por empresa |
| Migração | migrate.js | Importação explícita do JSON antigo |
| Operação | scripts | Setup, execução simultânea, build, migração, backup e documentação |

A API utiliza funções de domínio concentradas em app.js e módulos separados para persistência/autenticação/recuperação. Uma próxima evolução pode dividir rotas e serviços por módulo sem modificar a interface. Esta entrega priorizou recuperar o sistema verdadeiro e provar o fluxo integrado.

## Banco multiempresa

SQLite guarda entidades em tabelas relacionais: empresas, usuários, setores, categorias, ordens, anexos, histórico, sessões, desafios, notificações, auditoria, conhecimento, conversas e mensagens. Campos multivalorados específicos (preferências, SLA, subcategorias, participantes) e atributos legados complementares usam JSON dentro de colunas; o banco não é mais um único registro JSON da aplicação.

Chaves estrangeiras compostas incluem empresaId nos relacionamentos críticos. Isso impede, por exemplo, uma ordem da empresa A referenciar um setor/usuário da B, inclusive fora das rotas HTTP. Há UNIQUE para código, e-mail por empresa e protocolo por empresa, além de CHECK dos perfis. Foreign keys, WAL e busy_timeout são ativados em cada conexão.

O código de ingresso é GEST- seguido de 20 caracteres hexadecimais gerados por crypto.randomBytes. A criação ocorre em transação e consulta o registro de códigos reservados. UNIQUE e gatilhos no banco rejeitam colisões e reservam códigos antigos após renovação. A aleatoriedade reduz colisões; a restrição no banco é a garantia de que elas não sejam persistidas.

As sessões JWT continuam tendo estado revogável no SQLite. O JWT contém sub, empresaId, jti, iss, aud, iat e exp. O middleware limita o algoritmo a HS256, valida assinatura/expiração/emissor/destinatário e consulta sessão, usuário e empresa ativos. A autorização usa o perfil atual do banco, não confia em role enviado pelo cliente.

## Segurança e privacidade

Senhas novas usam scrypt com salt aleatório; bcrypt legado continua verificável após migração. Não há senha em texto simples no banco nem resposta de API. Logout revoga a sessão. Troca/recuperação de senha, desativação, mudança de setor/perfil ou senha administrativa encerram sessões afetadas.

Anexos ficam fora do diretório estático e exigem autorização da ordem no download. Conversas privadas são restritas aos participantes. Campos do solicitante sigiloso são mascarados nas respostas e no histórico. Trilha de auditoria é append-only por gatilhos contra UPDATE/DELETE; não substitui um serviço externo de auditoria imutável.

Helmet aplica cabeçalhos, incluindo CSP. Scripts vêm da mesma origem; estilos inline e compatibilidade com handlers do legado continuam permitidos. Sanitização remove conteúdo inseguro dos templates dinâmicos e permite apenas ações conhecidas. O JWT fica no localStorage, portanto prevenir XSS segue sendo necessário. A interface usa a mesma origem da API, sem CORS aberto.

## Limites que podem ser defendidos no TCC

- Modelo de implantação: uma instância local com SQLite. Não houve teste de carga ou disponibilidade 24/7.
- Banco e hash de senha usam operações síncronas. Consultas paginadas ainda filtram listas na aplicação; há espaço para otimizar SQL e índices conforme volume real.
- Chat usa polling, não WebSocket. Notificações são internas, sem push do navegador.
- SLA conta horas corridas, sem calendário de feriados/expediente.
- Categorias setoriais e confirmação de e-mail têm API. Não foi redesenhada a navegação para adicionar novas telas.
- E-mail externo, domínio, certificado HTTPS e implantação pública dependem da infraestrutura do usuário e não foram executados nesta entrega.
- Textos de marketing e links sem destino das páginas públicas originais foram preservados como demonstração visual, não como evidência de adoção ou disponibilidade.

## Referências técnicas

- Node.js 24 / SQLite: https://nodejs.org/download/release/latest-v24.x/docs/api/sqlite.html
- Express / segurança de produção: https://expressjs.com/en/advanced/best-practice-security.html
- Helmet: https://helmetjs.github.io/
- React: https://react.dev/
- Vite: https://vite.dev/guide/

As recomendações de TLS/Helmet do Express orientam a implantação; os resultados descritos em VALIDACAO.md vêm da execução local deste projeto.
