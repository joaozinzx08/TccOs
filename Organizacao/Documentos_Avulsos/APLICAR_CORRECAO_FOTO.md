# Correção da foto de perfil

1. Extraia este ZIP dentro da pasta principal `GestaoOS` e permita substituir
   os arquivos.
2. No terminal, pare o projeto com `Ctrl + C` e rode `npm run dev`.
3. No navegador, pressione `Ctrl + F5` na página do perfil.
4. Envie a foto novamente se o avatar antigo ainda estiver armazenado no
   navegador.

Esta correção carrega a imagem antes de renderizá-la, atualiza os dois avatares
da tela e identifica corretamente avatares WebP criados em versões anteriores.
