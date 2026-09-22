import type { Locale } from "@/lib/i18n/config";

export function affiliateCopy(locale: Locale) {
  const br = locale === "pt-br";
  return {
    title: "Área de afiliado",
    adminTitle: "Afiliados",
    adminIntro: "Resumo das indicações e conversões PRO de todos os afiliados.",
    totalAffiliates: "Total de afiliados",
    activeAffiliates: "Afiliados ativos",
    pendingCommissions: "Comissões por pagar",
    paidCommissions: "Comissões pagas",
    manageUsers: br ? "Gerenciar afiliados em Usuários" : "Gerir afiliados em Utilizadores",
    byAffiliate: "Resultados por afiliado",
    profileTitle: br ? "Você é afiliado AXON" : "És afiliado AXON",
    profileBody: br ? "Acesse seu link de divulgação e acompanhe suas indicações, vendas PRO e histórico de comissões." : "Acede ao teu link de divulgação e acompanha as tuas indicações, vendas PRO e histórico de comissões.",
    intro:
      "Acompanhe os cadastros pelo seu link e as contas que se tornaram PRO.",
    rules:
      "Cada conta indicada conta como uma venda no primeiro pagamento confirmado do PRO. Renovações não geram novas vendas.",
    link: "Seu link de divulgação",
    copy: "Copiar link",
    copied: "Link copiado.",
    copyFailed: "Selecione o link e copie manualmente.",
    signups: "Cadastros indicados",
    sales: "Vendas PRO",
    pending: "Por pagar",
    paid: "Pagas",
    referralHistory: "Histórico de indicações",
    payoutHistory: "Histórico de pagamentos",
    referral: "Indicação",
    joined: "Cadastro",
    converted: "Conversão PRO",
    status: "Estado",
    awaiting: "Ainda não virou PRO",
    noReferrals: "Ainda não há indicações.",
    noPayouts: "Ainda não há pagamentos registrados.",
    inactive:
      "Link desativado para novos cadastros. O histórico e as indicações anteriores continuam disponíveis.",
    notAffiliate:
      "Esta conta ainda não foi habilitada como afiliada pela administração.",
    enabled: "Ativo",
    disabled: "Inativo",
    enable: "Ativar link",
    disable: "Desativar link",
    register: "Habilitar afiliado",
    email: "E-mail da conta",
    registerHint:
      "A pessoa precisa ter uma conta na AXON. Informe o e-mail usado no cadastro.",
    accountNotFound: "Nenhuma conta foi encontrada com esse e-mail.",
    failed: "Não foi possível concluir. Tente novamente.",
    insufficient:
      "A quantidade supera o saldo pendente atual. Atualize a página e confira o saldo.",
    empty: "Nenhum afiliado habilitado.",
    details: "Ver histórico e pagamentos",
    payTitle: "Registrar pagamento",
    quantity: "Quantidade de contas pagas",
    payHelp:
      "Use depois de efetuar o pagamento da comissão. Este registro apenas move contas de “Por pagar” para “Pagas”; não transfere dinheiro.",
    review: "Revisar pagamento",
    confirm: "Confirmar pagamento efetuado",
    cancel: "Cancelar",
    confirmText:
      "Confirmar o pagamento de {n} contas? Elas serão marcadas como pagas, começando pelas vendas mais antigas.",
    paidSuccess: "Pagamento registrado.",
    retry:
      "Não foi possível confirmar a resposta. Tente novamente para consultar ou concluir o mesmo pagamento.",
    invalidQuantity:
      "Informe uma quantidade inteira entre 1 e o saldo pendente.",
    previous: "Anterior",
    next: "Próxima",
    back: "Voltar aos afiliados",
    profileLink: br
      ? "Minhas indicações e vendas"
      : "As minhas indicações e vendas",
    updated: "Atualizado.",
    date: "Data",
    receipt: "Registro",
    count: "Contas pagas",
    historyHint:
      "As indicações são identificadas por código, sem expor dados pessoais das contas.",
    refresh: "Atualizar",
  };
}
export type AffiliateCopy = ReturnType<typeof affiliateCopy>;
