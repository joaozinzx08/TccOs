# GestãoOS — plano de conformidade legal e proteção de dados

Atualizado em 26/10/2026. **Status: em andamento; não é certificação de conformidade.**
Referência auxiliar: https://github.com/ctresb/leis . A legislação vigente deve ser confirmada nas fontes oficiais.

## Inventário identificado no código
- React/Vite, Express, SQLite; login JWT Bearer e sessão revogável.
- Cadastro de empresas e pessoas; ordens, mensagens, anexos, auditoria e contatos.
- Token do navegador e dados de sessão persistidos no localStorage.
- E-mails em arquivos de outbox no desenvolvimento sem SMTP; exigir SMTP seguro em produção.
- Armazenamento SQLite e uploads locais; backup manual documentado.
- Formulário de criação exige caixa de aceite **apenas no cliente**; API ainda não guarda versão e prova de aceite.
- Site continha links jurídicos `#` e avisos “em desenvolvimento” (tratado neste conjunto de alterações).

## Prioridades antes de publicar ou aceitar dados empresariais reais

### P0 — bloquear lançamento até validar
1. **Identificação do agente**: nome/razão social, endereço/canal adequado, responsáveis, contratos e situação de formalização. Não inventar CNPJ.
2. **Mapeamento de dados**: categorias, finalidades, bases legais, agentes de tratamento, titulares, fornecedores, localização dos servidores e eventual transferência internacional.
3. **Retenção**: definir tabela por categoria (contas, ordens, anexos, backups, auditoria, contato), prazos e exclusão efetiva, com suspensão por obrigação legal quando aplicável.
4. **Exercício de direitos**: fluxo autenticado de confirmação, acesso, correção e solicitações de eliminação/anonimização; trilha auditável de resposta e de indeferimento motivado.
5. **Segurança de sessão**: avaliar migração de Bearer no localStorage para sessões em cookies Secure, HttpOnly e SameSite, com defesa CSRF apropriada; testar XSS e revogação.
6. **Operação/infraestrutura**: HTTPS obrigatório, configuração de proxy, controle de acesso ao SQLite, backups cifrados e teste de restauração, observabilidade sem vazamento de dados, segregação de produção/desenvolvimento.
7. **Incidentes**: plano com classificação, contenção, preservação de evidências, responsáveis e comunicação à ANPD e aos titulares quando exigida pela Resolução CD/ANPD 15/2024.
8. **Textos**: revisão jurídica da Política, Termos, Cookies e contratos B2B; detalhar prestadores reais e SLA conforme a operação.

### P1 — próximo ciclo técnico
- Aceite dos Termos **versionado no backend** e registrado por usuário com timestamp; bloquear POST /api/empresas sem aceite explícito, atualizando testes e fluxo de cadastro ao mesmo tempo. Não inferir consentimento LGPD a partir disso.
- Inventário automatizado de dependências, SAST/DAST, testes multitenant e pentest por profissional qualificado.
- Excluir informações fictícias da página de contato (email inexistente, telefone genérico, horários sem operação) e de marketing (“500+ empresas”, “99.9% uptime”) ou claramente identificá-las como demonstração.
- Revisar Google Fonts/terceiros, CSP, scripts legados, acessibilidade e internacionalização inclusive nos avisos legais.
- Estabelecer contratos de operador/controlador de acordo com papel efetivo e canal formal para titulares.

## Matriz de referência
- LGPD 13.709/2018, arts. 6, 7, 9, 16, 18, 37, 46 e 48:
  https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm
- Marco Civil da Internet 12.965/2014:
  https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2014/lei/l12965.htm
- CDC 8.078/1990, quando relação de consumo:
  https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm
- Resolução CD/ANPD nº 15/2024:
  https://www.gov.br/anpd/pt-br/canais_atendimento/agente-de-tratamento/comunicado-de-incidente-de-seguranca-cis

## Evidências necessárias para encerrar o plano
Relatório de testes, versionamento de políticas e aceites, inventário de dados, contratos de fornecedores, registros de tratamento, backups e testes de restauração, revisão externa de segurança e parecer jurídico.
