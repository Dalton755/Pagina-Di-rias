# Diagnóstico de submissão — somente formulário de teste

Este código foi preparado para uso **apenas** no Google Forms de teste do usuário, cujo link público é `https://forms.gle/m2Zs4nSjbHcDELX8A`.

**O script não foi executado. Nenhuma resposta foi enviada.**

## Objetivo
Verificar, sem presumir, se uma resposta enviada pelo serviço `FormApp` registra o **e-mail verificado** como um envio realizado pelo navegador. A caixa do Google que solicita confirmação do e-mail não é uma pergunta editável nem um campo `entry.*`, e não pode ser pré-selecionada pelo PWA.

## Como usar
1. Abra o formulário **Solicitação de rotas Teste** no modo de edição.
2. Acesse **Extensões > Apps Script** (no desktop; pelo celular, o Chrome pode exigir "Site para computador").
3. Cole o conteúdo de `diagnostico-email-teste.gs`.
4. Execute apenas **diagnosticarFormularioTeste** e autorize o acesso se solicitado. Isso não envia respostas.
5. Após conferir o diagnóstico, altere `PERMITIR_UM_ENVIO_TESTE` de `false` para `true` e execute **enviarUmaRespostaDeTeste**, se quiser enviar **exatamente uma** resposta fictícia para seu próprio formulário.
6. Abra a aba **Respostas** e confirme se os três campos e, principalmente, o endereço de e-mail verificado foram registrados. Não conclua que o endereço está correto apenas porque `submit()` retornou sucesso.

O script recusa a execução se estiver vinculado a outro formulário, tem trava contra uma segunda tentativa e nunca lê nem precisa dos dados pessoais reais do entregador.

Se o formulário de teste registrar os três campos **sem** e-mail verificado, isso NÃO reproduz corretamente o fluxo do formulário oficial. Não propagar o mesmo método para o formulário da empresa.
