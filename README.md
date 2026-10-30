# GestaoOS — Ecossistema empresarial

Repositório organizado por aplicação, com o GestaoOS Web (React/Vite + Node/Express) e o espaço reservado para o aplicativo Flutter.

| Pasta | Conteúdo |
| --- | --- |
| [GestaoOS-Web](GestaoOS-Web/) | Frontend, backend, testes, scripts e documentação do sistema Web |
| [GestaoOS-Mobile](GestaoOS-Mobile/) | Projeto Flutter/Dart do app pessoal (importação do código local ainda pendente) |
| [Organizacao](Organizacao/) | Documentos avulsos e arquivos que precisam de revisão |

## Executar o Web

```powershell
cd GestaoOS-Web
npm install
npm run dev
```

Para compilação e teste:

```powershell
cd GestaoOS-Web
npm test
npm run build
```

## Publicar o Mobile

Copie os arquivos **locais** do Flutter para `GestaoOS-Mobile/` depois de atualizar sua cópia do Git. Não copie `build/`, `.dart_tool/`, bancos ou credenciais.

> Esta organização foi preparada em uma branch para revisão. A branch `main` permanece como estava até que a reorganização seja testada e aprovada.
