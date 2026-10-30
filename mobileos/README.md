# GestaoOS Mobile (Flutter/Dart)

Esta pasta é destinada ao aplicativo Android já testado no tablet e integrado à API do GestaoOS Web.

**Atenção:** a documentação desta pasta foi criada antes da importação do projeto Flutter real. Não representa um aplicativo compilável por si só.

## Como adicionar o projeto local

1. No computador que possui `Documents/OS/mobileos`, confirme que há `pubspec.yaml`, `lib/`, `android/`, `test/` e `assets/`.
2. Copie o conteúdo do projeto Flutter para esta pasta `mobileos/`, sem copiar `build/`, `.dart_tool/`, `.gradle/`, `.idea/`, arquivos de assinatura, tokens ou segredos.
3. **Não apague este arquivo**; atualize-o com instruções específicas do app e permissões Android.
4. Execute, dentro de `mobileos/`:

```powershell
flutter pub get
flutter analyze
flutter test
flutter run --dart-define=GESTAOOS_API_URL=http://IP_DO_PC:3000/api
```

No desenvolvimento local autorizado, PC e Android devem acessar a mesma API. Para produção, usar HTTPS e configuração de rede segura. O backend permanece em `../backend/`; não duplicar banco SQLite no aplicativo.

## Integração

O login utiliza o código da empresa, matrícula cadastrada (ou e-mail) e senha. A criação de OS usa `/api/ordens` e o protocolo do servidor. O IP muda conforme a rede; não versionar configuração de IP pessoal.
