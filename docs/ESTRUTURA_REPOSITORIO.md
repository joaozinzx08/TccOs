# Organização do repositório GestaoOS

Este repositório reúne o GestaoOS Web e o aplicativo pessoal GestaoOS Mobile. O app setorial para tablets fixos é uma proposta separada, ainda não implementada.

## Estrutura

```text
TccOs/
├── backend/              # Node.js, Express, API REST, SQLite e testes
├── frontend/             # React, Vite, páginas e assets do Web
├── docs/                 # API, arquitetura, guias e evidências
├── e2e/                  # Testes de navegação
├── scripts/              # Setup, migração, backup e utilitários
├── mobileos/             # Flutter/Dart — GestaoOS Mobile (enviado separadamente)
├── package.json          # Workspace Node do Web
└── README.md
```

## Regras de manutenção

- Não mover `backend/` ou `frontend/` sem atualizar scripts, caminhos de build e testes.
- O aplicativo Flutter permanece independente em `mobileos/`. O `package.json` da raiz **não** gerencia o Flutter.
- Não versionar `backend/data/`, `backend/.env`, tokens, bancos SQLite, senhas, chaves nem arquivos `android/key.properties`.
- Antes de sincronizar com GitHub, executar `npm test`, `npm run build`, `flutter analyze` e `flutter test`, conforme o projeto modificado.
- Para acesso ao Web por tablet, configurar a URL da API em tempo de execução com `--dart-define=GESTAOOS_API_URL=...`; não fixar IP privado no código.
- A API é a fonte de verdade das ordens, permissões e protocolos.
- As imagens do Mobile devem ter direitos de uso adequados antes de distribuir o produto.

## Próxima etapa

Copiar o projeto Flutter **funcionando na máquina local** para `mobileos/` (incluindo os arquivos padrão gerados por `flutter create`), verificar o `git status` e publicar somente o código e assets necessários. Consultar `mobileos/README.md`.

> A criação desta estrutura documental não publica nem verifica automaticamente o código Flutter local.
