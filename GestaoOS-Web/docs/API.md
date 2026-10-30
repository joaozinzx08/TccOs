# GestãoOS — guia da API

Base local: http://127.0.0.1:3000/api. No Vite, use /api na mesma origem.

Requisições JSON usam `Content-Type: application/json`. Rotas protegidas exigem `Authorization: Bearer <token>`. O login e o cadastro da empresa retornam `token`, `usuario` e `empresa`. O JWT expira por padrão em oito horas. A sessão correspondente precisa continuar ativa no banco; logout, troca de senha e alterações administrativas de acesso podem invalidá-la antes da expiração.

O escopo vem exclusivamente do usuário autenticado. Um ID de outra empresa não amplia o acesso. Respostas de erro têm `error`; erros tratados também podem incluir `requestId`. O cabeçalho `X-Request-Id` permite correlação. Erros internos não expõem stack ou SQL ao navegador.

## Fluxo inicial

`POST /empresas`:

```json
{"nome":"Empresa de demonstração","responsavel":"Administrador","email":"admin@example.com","senha":"MinhaSenhaSegura123!"}
```

Resposta 201 com sessão e código da empresa. Senhas novas: 8 a 128 caracteres.

`POST /login`:

```json
{"codigoEmpresa":"CODIGO_RECEBIDO_NO_CADASTRO","email":"admin@example.com","senha":"MinhaSenhaSegura123!"}
```

`codigoEmpresa` pode ser omitido se as credenciais identificarem somente uma empresa. Credenciais ambíguas retornam 409 com `code: COMPANY_CODE_REQUIRED`. Erros de acesso usam mensagem genérica.

`POST /empresas/entrar` cadastra um colaborador com `codigoEmpresa`, `nome`, `email`, `senha`. Campos de perfil administrativo fornecidos pelo cliente não elevam o acesso. O administrador pode desativar ingresso por código em Minha empresa.

## Métodos e permissões

GET consulta; POST cria ou executa uma ação; PUT salva formulários de recursos; PATCH altera campos/estado; DELETE remove um recurso autorizado ou revoga uma sessão. As rotas PUT herdadas aceitam campos omitidos por compatibilidade; clientes novos devem enviar o formulário completo ou preferir PATCH para mudanças parciais.

| Recurso | Método e rota | Regra |
| --- | --- | --- |
| Estado | GET /status | Público |
| Cadastro | POST /empresas; POST /empresas/entrar | Público, com limite de tentativas |
| Código | GET /empresas/validar-codigo?codigo=... | Público; retorna somente nome/validade |
| Autenticação | POST /login; POST /logout | Logout exige a sessão atual |
| Sessões | GET /sessoes; DELETE /sessoes; DELETE /sessoes/:id | Somente próprias; DELETE sem ID mantém a atual e revoga as outras |
| Perfil | GET /perfil; PUT/PATCH /perfil | Próprio perfil; não permite alterar role/empresa |
| Foto | POST /perfil/avatar; GET /avatares/:id | Upload multipart `avatar`; leitura restrita à empresa |
| Empresa | GET /empresa; PUT /empresa | Somente principal altera |
| Renovar código | POST /empresa/renovar-codigo | Principal; código antigo deixa de autorizar ingresso e permanece reservado |
| Setores | GET/POST /setores; PUT/PATCH/DELETE /setores/:id | Principal escreve; vínculos podem impedir exclusão |
| Categorias | GET/POST /categorias; PUT/DELETE /categorias/:id | Gestores escrevem no próprio escopo; exclusão pelo principal |
| Equipe | GET/POST /usuarios; PUT/PATCH /usuarios/:id | Principal ou administrador_setor dentro das restrições |
| Ordens | GET/POST /ordens; GET/PUT/PATCH /ordens/:id | Solicitante lê a própria; gestores atendem no escopo permitido |
| Cancelamento | PATCH /ordens/:id/cancelar | Solicitante pode cancelar a própria OS aberta, com justificativa |
| Comentário | POST /ordens/:id/comentarios | Usuário autorizado a ler a ordem; corpo `descricao` |
| Anexos | POST /ordens/:id/anexos; GET/DELETE /ordens/:id/anexos/:arquivo | Acesso à ordem; exclusão pelo autor do arquivo ou gestor autorizado a gerenciar a ordem |
| Indicadores | GET /dashboard | Dados visíveis ao usuário |
| Relatórios | GET /relatorios; GET /relatorios/csv | Gestores dentro do escopo; CSV previne fórmulas em células |
| Notificações | GET/PATCH /notificacoes; PUT/PATCH/DELETE /notificacoes/:id | Somente próprias; PATCH da coleção marca todas como lidas |
| Auditoria | GET /auditoria | Principal da própria empresa; leitura somente |
| Conhecimento | GET/POST /conhecimento; PUT/DELETE /conhecimento/:id | Publicação por gestores; edição/exclusão pelo autor ou principal |
| Artigos | POST /conhecimento/:id/visualizacao; POST /conhecimento/:id/util | Leitores da empresa; voto único por usuário/artigo |
| Conversas | GET/POST /chats | Geral da empresa ou privada com participantes da empresa |
| Mensagens | GET/POST /chats/:id/mensagens | Somente participantes, inclusive quando o usuário é administrador |
| Leitura | PATCH /chats/:id/leitura | Própria leitura da conversa |
| Contato | POST /contato | Público; persiste mensagem para análise local |

`GET /usuarios` fornece um diretório com campos limitados para usuários sem permissão de gestão. A tela de equipe usa `?gestao=1`, que exige permissão administrativa e limita o administrador de setor à sua equipe.

## Ordens, sigilo e SLA

Campos de criação: `titulo`, `descricao`, `setorResponsavelId`, `prioridade`, `prazo`, `categoriaId` ou `categoria`, `subcategoria`, `sigilo`. O solicitante é obtido da sessão. Sem prazo explícito, o servidor calcula o vencimento a partir do SLA da prioridade. Anexos podem acompanhar a criação em multipart, campo `anexos`.

Exemplo de atendimento, depois de obter um ID de ordem:

```json
{"status":"Em atendimento","observacao":"Início da análise do equipamento","responsavelId":"ID_DE_UM_GESTOR_DO_SETOR"}
```

Enviar por PATCH /ordens/:id. O servidor exige justificativa para mudanças, valida transições e responsável ativo do setor. O responsável não pode ser o solicitante. O solicitante, mesmo administrador, não pode gerenciar a própria ordem. Encaminhamento de setor exige administrador principal ou de setor.

Estados: Aberta, Encaminhada, Em análise, Em atendimento, Aguardando informação, Concluída e Cancelada. Não é possível concluir diretamente uma ordem aberta. O detalhe inclui histórico real; comentários, status, encaminhamento e anexos registram acontecimentos.

Sigilo oculta ID/nome/setor do solicitante e sua identidade no histórico para outros leitores. Não apaga o vínculo no banco. Texto e arquivos que o próprio solicitante enviar ainda podem conter sua identidade.

Uploads: PNG/JPEG/WebP/PDF; até cinco arquivos de 5 MiB por requisição. MIME e assinatura inicial são conferidos. Na inclusão posterior, POST /ordens/:id/anexos recebe um único arquivo no campo `arquivo`, até cinco anexos por ordem. Arquivos usam nomes internos aleatórios e não há diretório público `/uploads`. A validação de formato não é um antivírus.

## Filtros e paginação

Ordens/relatórios aceitam `status`, `setorId`, `categoria`, `prioridade`, `q`, `de`, `ate`, `periodo=30d` e `sort=urgencia`. Datas seguem ISO; `ate=AAAA-MM-DD` inclui o dia completo. Os filtros sempre são aplicados depois do escopo de autorização.

Listagens de setores, categorias, usuários, ordens, artigos, notificações e auditoria aceitam `page`/`limit`. Sem parâmetros de paginação retornam arrays por compatibilidade. Com paginação retornam `{items,total,page,limit,pages}`. O limite padrão é 25 e o máximo é 100. Conversas/mensagens permanecem listas simples.

## Recuperação e confirmação de e-mail

- POST /auth/esqueci-senha: `{email,codigoEmpresa}`; resposta genérica para evitar confirmar contas.
- POST /auth/redefinir-senha: `{email,codigoEmpresa,codigo,novaSenha}`.
- POST /auth/solicitar-verificacao: Bearer da própria conta.
- POST /auth/confirmar-email: `{email,codigoEmpresa,codigo}`.

Código aleatório de oito dígitos, validade de 15 minutos, uso único e limite de cinco tentativas. O banco armazena HMAC do código. Recuperar ou trocar senha encerra as sessões existentes. SMTP real exige configuração; em desenvolvimento sem SMTP, a mensagem fica no outbox privado. A verificação de e-mail está disponível, mas não é obrigatória para login nesta versão.

Troca autenticada: PATCH /perfil com `{senhaAtual,novaSenha}`. Após sucesso, faça login novamente.

## Erros e limites

400 dados inválidos; 401 autenticação; 403 permissão; 404 registro inexistente/fora do escopo; 409 conflito; 413 upload acima do limite; 429 limite de requisições; 500 erro interno; 503 e-mail indisponível em produção.

Limite geral de 300 requisições/minuto por IP e limite de 25 tentativas/15 minutos por IP no grupo de rotas públicas de autenticação/cadastro/contato. Em hospedagem atrás de proxy, revise a configuração de IP confiável para seu provedor antes de expor a aplicação. O servidor não confia indiscriminadamente em X-Forwarded-For.

O arquivo `openapi.json` é um inventário das rotas com autenticação e schemas dos cadastros/login, importável em ferramentas de API. Ele não substitui este guia nem descreve todos os campos de todas as respostas. Não há interface Swagger instalada.
