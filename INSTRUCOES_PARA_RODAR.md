# GestãoOS — como executar

1. Extraia o ZIP e abra a pasta `GestaoOS` no VS Code.
2. Abra o terminal nessa pasta e execute:

   ```powershell
   npm install
   npm run setup
   npm run dev
   ```

3. Abra `http://localhost:5173` no navegador.

## Recuperação de senha

Em desenvolvimento, cada solicitação de redefinição é gravada em `backend/data/outbox`. Abra o arquivo mais recente dessa pasta e use o link recebido para testar.

Em produção, preencha `backend/.env` com os dados do seu provedor SMTP e a URL pública do sistema:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seuemail@gmail.com
SMTP_PASS=sua_senha_de_aplicativo
SMTP_FROM="GestãoOS <seuemail@gmail.com>"
PUBLIC_APP_URL=https://seu-dominio.com
```

Para Gmail, use uma senha de aplicativo, não a senha normal da conta.

## O que foi incluído

- redefinição de senha por link com validade real de 5 minutos;
- link de uso único e encerramento das sessões após a troca de senha;
- foto de perfil em JPG, PNG ou WebP, com limite de 5 MB e conversão automática para WebP;
- visões do gestor para `OS do Meu Setor`, `Minhas Solicitações` e `Todas que acompanho`.

## Verificação

```powershell
npm test
npm run build
npm run test:e2e
```
