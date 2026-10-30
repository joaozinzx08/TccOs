# GestãoOS — ícones SVG e paleta azul

Atualização de 05/10/2026 sobre o ZIP enviado pelo usuário.

- Emojis decorativos das 40 telas substituídos por SVGs locais, sem CDN ou nova dependência de ícones.
- Menus, títulos, botões, estados vazios, notificações e templates dinâmicos usam o catálogo em frontend/public/js/icones.js. O catálogo equivalente fica em frontend/legacy/js/icones.js.
- Os marcadores [[icone:nome]] das fontes são convertidos em SVG pelo renderizador, inclusive após alterações dinâmicas. Emojis digitados pelos usuários não são substituídos.
- Campos de texto, opções nativas e caixas de confirmação usam texto simples.
- Azul, branco e neutros escuros predominam. Estados de erro, atenção e sucesso preservam cores semânticas. Estrutura e medidas das telas preservadas, inclusive limitações responsivas já existentes no legado.
- Correção do gerador React: funções locais de animação não causam mais ReferenceError ao exportar os manipuladores de página.
- Backend original preservado byte a byte; esta atualização não é uma migração de banco nem acrescenta RLS.

## Instalação
Requer Node.js 24 ou superior. Na pasta GestãoOS:

```sh
npm install
npm run setup
npm run dev
```

Ao atualizar uma instalação existente, mantenha seu backend/.env e backend/data (banco e anexos). O pacote não inclui segredos, dados operacionais nem node_modules. Faça uma cópia da instalação antes de aplicar a atualização. Em uma instalação nova, o setup cria o ambiente e o banco.

## Manutenção
Edite as fontes em frontend/legacy e execute npm run legacy:generate para atualizar as 40 páginas React e seus scripts. Mantenha os arquivos compartilhados de legacy/js e public/js, e os estilos de legacy/css e public/css, sincronizados.

## Validação desta entrega
npm install, npm run build e os 7 testes do backend passaram. Os 5 testes de navegador em produção passaram: cadastro/login, equipe/ordens/chat/base de conhecimento, fluxo colaborador/gestor/anexo privado, administrador de setor, dimensões móveis e verificação adicional de SVGs nas páginas públicas/administrativas e preservação de emoji enviado no chat.

As capturas visual-azul-*.png documentam esta atualização. Arquivos antigos de evidência visual são históricos e não representam a paleta atual.
