# Afiliados

## Uso

- Administração → Afiliados: habilitar pelo e-mail de uma conta já existente.
- Cada afiliado recebe um link `/r/<código>?locale=pt-br` (ou `pt-pt`).
- Perfil → Minhas indicações e vendas: link, cadastros, vendas, contas por pagar,
  contas pagas, histórico de indicações e histórico dos pagamentos.
- Administração → Afiliados → Ver histórico e pagamentos: informar a quantidade,
  revisar e confirmar **depois** de pagar a comissão fora da plataforma.
- Exemplo: 20 vendas pendentes, pagamento de 10 → 10 por pagar, 10 pagas.
  Não há valores monetários nem transferência financeira nesta funcionalidade.

## Regras implementadas

O primeiro convite válido no navegador vale por 30 dias. Visitar outro link
nesse intervalo não substitui o primeiro afiliado. O cookie é HttpOnly e contém
um token aleatório, validado no banco. A atribuição exige que a conta tenha sido
criada depois do convite, não pode ser alterada e não aceita autoindicação.

No cadastro por e-mail, um trigger em `auth.users` grava o vínculo na mesma
transação do cadastro, antes da confirmação. Confirmar em outro dispositivo não
perde a indicação. No Google, o callback grava o vínculo e o onboarding repete
a tentativa em caso de erro transitório. O cookie precisa estar no navegador
que inicia o cadastro Google. Uma visita anterior não identifica uma pessoa
que troca de navegador/dispositivo antes de criar a conta.

Uma venda é a primeira fatura PRO com pagamento confirmado e valor pago positivo
(`invoice.paid`). O código verifica o produto pelos preços PRO configurados ou
pelos metadados PRO definidos no checkout. Faturas de valor zero, períodos de
teste, PRO concedido manualmente e eventos de teste enviados ao ambiente live
não geram comissão. Renovações, reenvios e novas assinaturas da mesma conta não
geram outra venda. A venda é histórica: cancelamentos, reembolsos ou disputas
não a estornam automaticamente nesta versão.

Desativar um afiliado impede novos vínculos. Os cadastros já atribuídos continuam
a converter, e os pagamentos pendentes continuam disponíveis para baixa.
Excluir uma conta remove o vínculo pessoal, preservando os totais históricos.
Se for a conta do afiliado, seu nome passa a “Conta removida” e o link é desativado.

## Persistência e segurança

- `affiliates`: conta habilitada, código estável, estado e admin responsável.
- `affiliate_visits`: tokens dos convites e validade; acesso só pelo servidor.
- `affiliate_referrals`: vínculo único por usuário, primeira conversão e lote pago.
- `affiliate_payouts`: UUID idempotente, quantidade, data e admin responsável.

As tabelas têm RLS. Afiliados leem apenas seu painel por RPC; o painel expõe
códigos de indicação, datas e estado, não nomes/e-mails dos indicados. As RPCs
administrativas verificam `is_admin()` dentro do banco. O cliente nunca recebe
a chave de serviço. As baixas bloqueiam a linha do afiliado, selecionam as vendas
pendentes mais antigas e gravam lote + vínculos na mesma transação. Uma repetição
com o mesmo UUID não paga de novo; quantidades maiores que o saldo são recusadas.

## Publicação (ordem obrigatória)

1. Aplicar `supabase/migrations/20260922_afiliados.sql` no projeto Supabase
   `ujgbyvbizhkhzogroshk`, com o mecanismo de migrations ou SQL Editor. A migration
   cria tabelas/funções/políticas; não atribui usuários antigos nem muda planos.
2. Publicar o código pela branch `main` e aguardar o deploy da Vercel ficar Ready.
3. No endpoint Stripe `https://www.axonmindmuscle.com/api/stripe/webhook`,
   **adicionar `invoice.paid` preservando os eventos existentes**. Na inspeção de
   22/09/2026, esse evento ainda não estava habilitado. Não trocar o segredo.
4. Só então habilitar os primeiros afiliados. Verificar cadastro por e-mail e
   Google com contas de teste em staging e confirmar uma compra Stripe em modo
   teste no banco de staging. Nunca simular compras ou baixas no banco live.

Não são necessárias variáveis de ambiente novas. São usadas as chaves Supabase
e Stripe do servidor e `NEXT_PUBLIC_SITE_URL` para o link público. O domínio
canônico deve estar correto; o convite mantém seu cookie no host que recebeu a
requisição para não o perder entre domínio raiz e `www`.

Tokens expirados podem ser removidos periodicamente, sem afetar vínculos já
gravados: `delete from public.affiliate_visits where expires_at < now();`.

## Validação

`npm test` executa os testes de rotinas e afiliados. Os testes de afiliados
aplicam a migration a um PostgreSQL local em memória (PGlite), com fixtures de
Auth, perfis e papéis, e exercitam permissões, atribuição, eventos repetidos,
pagamentos parciais, excesso de saldo e preservação de histórico. Nenhum dado
de produção é alterado. O handler de conversão também é testado com Stripe
simulado, inclusive falhas do banco que devem propagar para reenvio do webhook.

`npm run build` valida TypeScript e as rotas. A interface foi inspecionada no
navegador com dados fictícios, incluindo link, revisão/cancelamento e largura
de celular. Testes com Supabase Auth e Stripe reais em staging continuam sendo
a verificação de integração antes de habilitar afiliados reais.
