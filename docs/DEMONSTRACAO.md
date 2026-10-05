# Roteiro de demonstração do TCC

1. Na pasta GestaoOS, execute npm run dev. Mostre no terminal Vite e Express simultaneamente e abra http://127.0.0.1:5173.
2. Crie Empresa A pela tela original. Mostre administrador principal e o código exclusivo. Em janela anônima, crie Empresa B. Os códigos devem diferir e as equipes/dados não devem se misturar.
3. Na A, crie um gestor vinculado a um setor. Em outra sessão, use o código da A para ingressar como colaborador. Explique que esse ingresso nunca cria um administrador.
4. Como colaborador, abra uma OS sigilosa para o setor do gestor, com categoria, prioridade, descrição e anexo. Mostre o protocolo e prazo.
5. Como gestor, abra a OS, confira que o solicitante está oculto, inicie atendimento com justificativa, registre comentário e conclua. Volte ao colaborador e mostre o histórico e a resposta persistidos.
6. Mostre Kanban, calendário, indicadores e CSV do mesmo conjunto de ordens. Os números são calculados a partir do banco e respeitam o perfil.
7. Envie uma mensagem no chat geral e recarregue a página. Mostre conversa privada entre participantes, artigo de conhecimento, notificações e auditoria do administrador principal.
8. No painel Network do navegador, mostre /api/login retornando JWT e uma chamada protegida usando Authorization: Bearer. Não divulgue o segredo do .env.
9. Saia da conta. Uma requisição com o token antigo deve retornar 401. Trocar senha também encerra outras sessões.
10. Execute npm test para demonstrar os casos negativos: duas empresas, perfis diferentes, JWT adulterado/expirado, tentativa de atender a própria ordem, anexos privados e código duplicado rejeitado pelo SQLite. Execute npm run build e, com o dev parado, npm start.

O relatório VALIDACAO.md distingue o que foi executado do que depende de configuração externa. Apresente essa distinção com clareza: SMTP real, HTTPS público e grande escala não foram simulados como requisitos concluídos.
