import type { Dict } from "../types";

const dictionary: Dict = {
  meta: {
    siteName: "AXON Mind-Muscle",
    tagline: "Entre a intenção e a contração existe um caminho mensurável.",
    fitnessTitle: "AXON Mind-Muscle — Treino com método, resultado com prova",
    fitnessDescription:
      "Aplicativo de orientação e acompanhamento de treino de musculação. Séries, cargas e intervalos prescritos a partir de literatura revisada por pares.",
    scienceTitle: "AXON Mind-Muscle — Evidência antes de opinião",
    scienceDescription:
      "O método por trás da AXON: prescrição de volume, intensidade e recuperação derivada de literatura revisada por pares, traduzida em protocolos objetivos.",
    appTitle: "AXON",
  },

  common: {
    brand: "AXON",
    brandFull: "AXON Mind-Muscle",
    tagline: "Mind · Muscle",
    loading: "Carregando",
    save: "Salvar",
    saving: "Salvando",
    saved: "Salvo",
    cancel: "Cancelar",
    confirm: "Confirmar",
    close: "Fechar",
    back: "Voltar",
    next: "Continuar",
    skip: "Pular",
    finish: "Concluir",
    edit: "Editar",
    remove: "Remover",
    optional: "opcional",
    required: "obrigatório",
    yes: "Sim",
    no: "Não",
    or: "ou",
    soon: "Em breve",
    inDevelopment: "Em desenvolvimento",
    beta: "Beta",
    free: "Gratuito",
    pro: "PRO",
  },

  nav: {
    home: "Início",
    science: "O método",
    signIn: "Entrar",
    signUp: "Criar conta",
    openApp: "Abrir aplicativo",
    menu: "Menu",
    today: "Hoje",
    progress: "Progresso",
    community: "Comunidade",
    profile: "Perfil",
    account: "Conta",
    signOut: "Sair",
  },

  marketing: {
    fitness: {
      eyebrow: "Mind · Muscle",
      headline: "Treinar mais não é treinar melhor.",
      subheadline:
        "A AXON transforma evidência científica em prescrições objetivas: quantas séries, com qual carga, com qual intervalo — e quando parar. Sem achismo, sem programa genérico.",
      primaryCta: "Começar gratuitamente",
      secondaryCta: "Ver o método",
      trustLine: "Conta gratuita. Sem cartão de crédito.",

      pillarsTitle: "Três coisas que mudam o seu resultado",
      pillarsSubtitle:
        "Não são funcionalidades. São as decisões que separam quem evolui de quem repete.",
      pillars: [
        {
          index: "01",
          title: "Ritmo controlado",
          body: "Um metrônomo visual na tela marca a cadência de cada repetição. O tempo sob tensão deixa de ser estimativa e passa a ser executado.",
        },
        {
          index: "02",
          title: "Prontidão medida",
          body: "Três perguntas antes de treinar — sono, cansaço e batimento cardíaco. O aplicativo diz se hoje é dia de forçar, manter ou recuperar.",
        },
        {
          index: "03",
          title: "Progresso registrado",
          body: "Cada série fica registrada. O que é medido evolui: você vê a carga subir, o volume acumular e a consistência se construir.",
        },
      ],

      metronomeTitle: "O ritmo certo, sem nenhum equipamento",
      metronomeBody:
        "Excêntrica controlada, pausa, concêntrica. O guia visual acompanha a série do início ao fim, na tela do celular apoiado no banco. Você não precisa de câmera, sensor nem relógio.",
      metronomeCaption: "Cadência 3-1-1 · exemplo",
      metronomePhases: {
        eccentric: "Excêntrica",
        hold: "Pausa",
        concentric: "Concêntrica",
        rep: "Rep",
      },

      readinessTitle: "Nem todo dia é dia de recorde",
      readinessBody:
        "Forçar num dia ruim custa mais do que rende. O painel de prontidão cruza três sinais simples e devolve uma recomendação clara: treinar forte, moderado ou descansar.",
      readinessStates: {
        strong: "Treinar forte",
        moderate: "Treinar moderado",
        rest: "Descansar",
      },

      proofTitle: "Evidência antes de opinião",
      proofBody:
        "Nada entra no método sem fonte revisada por pares. Cada recomendação da AXON tem origem em literatura publicada — e você sempre pode ver de onde ela vem.",
      proofCta: "Conhecer o método",

      pricingTitle: "Comece sem pagar nada",
      pricingBody:
        "As funcionalidades essenciais são gratuitas para sempre. O plano PRO existe para quem quiser ir além.",
      pricingFreeTitle: "Gratuito",
      pricingFreeItems: [
        "Conta pessoal e área privada",
        "Metrônomo visual",
        "Painel de prontidão diário",
        "Registro de treinos e progresso",
      ],
      pricingProTitle: "PRO",
      pricingProItems: [
        "Tudo o que está no plano gratuito",
        "Professor AXON sem limite de perguntas",
        "Histórico e análise detalhada",
        "Protocolos avançados",
      ],
      pricingProNote: "Disponível em uma fase seguinte. Pagamento via {payment}.",

      finalTitle: "O sinal certo, transmitido.",
      finalBody:
        "Crie sua conta e comece hoje. Leva menos de um minuto e não pedimos cartão.",
      finalCta: "Criar conta gratuita",
    },

    science: {
      eyebrow: "O método",
      headline: "Evidência antes de opinião.",
      subheadline:
        "A AXON não é mais um aplicativo de treino com opiniões de treinador. É uma camada de tradução: pega literatura revisada por pares sobre hipertrofia e força e converte em prescrições verificáveis.",
      primaryCta: "Criar conta",
      secondaryCta: "Ver o aplicativo",

      principlesTitle: "Os três princípios",
      principles: [
        {
          index: "01",
          title: "Evidência",
          body: "Nada entra no método sem fonte revisada por pares. Quando a literatura é ambígua, dizemos isso — não preenchemos o vazio com opinião.",
        },
        {
          index: "02",
          title: "Precisão",
          body: "Números exatos e prescrições objetivas. Séries, repetições, carga relativa, intervalo e cadência. Zero achismo.",
        },
        {
          index: "03",
          title: "Progresso",
          body: "O que é medido, evolui. Registramos cada sinal para que a progressão seja uma consequência observável, e não uma esperança.",
        },
      ],

      pipelineTitle: "Da literatura ao seu treino",
      pipelineSubtitle:
        "Quatro passos entre um estudo publicado e a série que você vai executar hoje.",
      pipeline: [
        {
          step: "Fonte",
          title: "Literatura revisada por pares",
          body: "Metanálises e ensaios controlados sobre volume, intensidade, frequência e recuperação em treino de resistência.",
        },
        {
          step: "Extração",
          title: "Variáveis mensuráveis",
          body: "Cada estudo é reduzido às variáveis que se consegue prescrever: séries por grupo muscular e semana, percentual de 1RM, proximidade da falha, intervalo entre séries.",
        },
        {
          step: "Tradução",
          title: "Protocolo objetivo",
          body: "As variáveis viram intervalos de prescrição com limites explícitos, e não números únicos que fingem uma precisão que a evidência não tem.",
        },
        {
          step: "Ajuste",
          title: "Contexto individual",
          body: "Prontidão diária, histórico e experiência ajustam a prescrição dentro dos limites que a evidência sustenta.",
        },
      ],

      variablesTitle: "As variáveis que controlamos",
      variablesSubtitle:
        "Cada uma tem literatura por trás e um intervalo de trabalho definido.",
      variables: [
        {
          name: "Volume",
          unit: "séries / grupo / semana",
          body: "A relação entre volume semanal e hipertrofia é dose-dependente até um limiar individual, além do qual o retorno cai e o custo de recuperação sobe.",
        },
        {
          name: "Intensidade",
          unit: "% 1RM",
          body: "Ganhos de força são mais sensíveis à intensidade; a hipertrofia tolera um intervalo mais amplo desde que a proximidade da falha seja suficiente.",
        },
        {
          name: "Proximidade da falha",
          unit: "RIR",
          body: "As repetições em reserva são o controle de esforço mais prático. Falhar em todas as séries aumenta a fadiga sem aumentar proporcionalmente o estímulo.",
        },
        {
          name: "Cadência",
          unit: "s excêntrica / pausa / concêntrica",
          body: "O tempo sob tensão importa dentro de um intervalo útil. O metrônomo visual existe para tornar a cadência prescrita executável.",
        },
        {
          name: "Intervalo",
          unit: "segundos",
          body: "Intervalos curtos demais comprometem o volume total com carga; o intervalo é prescrito em função do objetivo da série.",
        },
        {
          name: "Recuperação",
          unit: "prontidão diária",
          body: "Sono, fadiga percebida e frequência cardíaca de repouso são indicadores acessíveis do estado de recuperação sem equipamento dedicado.",
        },
      ],

      honestyTitle: "O que ainda não fazemos",
      honestyBody:
        "Preferimos dizer isso agora a prometer e falhar. Estas funcionalidades estão fora do escopo desta fase e serão avaliadas depois de validarmos o aplicativo com usuários reais.",
      honestyItems: [
        "Aplicativo nativo na App Store e na Google Play",
        "Conexão com relógios inteligentes e sensores do celular",
        "Desafios em tempo real entre usuários",
        "Integração com o produto físico AXON",
      ],
      honestyNote:
        "A AXON funciona no navegador e pode ser instalada na tela inicial do celular como qualquer aplicativo.",

      assistantTitle: "Professor AXON",
      assistantBody:
        "Um assistente que responde a perguntas sobre treino com base na mesma literatura que sustenta o método — e que avisa quando a evidência não é conclusiva.",

      finalTitle: "Método público, resultado privado.",
      finalBody: "O método está aqui à vista. O que você faz com ele fica na sua conta.",
      finalCta: "Criar conta gratuita",
    },

    shared: {
      symbolTitle: "O símbolo",
      symbolBody:
        "Deitado, o neurônio vira barra. Um axônio liga intenção e contração: as anilhas fazem as vezes de dendritos, o impulso percorre o eixo e termina em massa sólida.",
      symbolNodes: {
        openTitle: "Nó aberto",
        openBody: "A mente: a intenção que inicia o movimento.",
        axonTitle: "Axônio",
        axonBody: "A barra: o eixo que transmite o sinal.",
        impulseTitle: "Impulso",
        impulseBody: "O estímulo em trânsito, sempre em sinapse.",
        solidTitle: "Nó sólido",
        solidBody: "O músculo: sinal convertido em força.",
      },
      footerRights: "Todos os direitos reservados.",
      footerMethod: "O método",
      footerApp: "Aplicativo",
      footerLegal: "Legal",
      footerTerms: "Termos de uso",
      footerPrivacy: "Política de privacidade",
      footerMarket: "Mercado",
      footerBuiltBy: "Desenvolvido por",
    },
  },

  auth: {
    signIn: {
      title: "Bem-vindo de volta",
      subtitle: "Entre na sua conta para continuar.",
      submit: "Entrar",
      googleCta: "Continuar com Google",
      noAccount: "Ainda não tem conta?",
      createAccount: "Criar conta",
      forgot: "Esqueceu a senha?",
    },
    signUp: {
      title: "Criar conta",
      subtitle: "Um minuto e você está dentro. Não pedimos cartão.",
      submit: "Criar conta gratuita",
      googleCta: "Continuar com Google",
      hasAccount: "Já tem conta?",
      signInLink: "Entrar",
      terms: "Ao criar conta, você aceita os Termos de Uso e a Política de Privacidade.",
      checkEmailTitle: "Confirme seu email",
      checkEmailBody:
        "Enviamos um link de confirmação para {email}. Abra o link para ativar a conta.",
      checkEmailHint:
        "Não recebeu? Verifique a caixa de spam ou tente novamente em um minuto.",
    },
    recover: {
      title: "Recuperar acesso",
      subtitle: "Informe seu email e enviamos um link para você definir uma nova senha.",
      submit: "Enviar link",
      sentTitle: "Link enviado",
      sentBody:
        "Se existir uma conta associada a {email}, o link de recuperação chega em instantes.",
      backToSignIn: "Voltar para entrar",
    },
    reset: {
      title: "Nova senha",
      subtitle: "Defina uma nova senha para sua conta.",
      submit: "Salvar senha",
      success: "Senha atualizada.",
    },
    fields: {
      name: "Nome",
      namePlaceholder: "Como você quer ser chamado",
      email: "Email",
      emailPlaceholder: "voce@exemplo.com",
      password: "Senha",
      passwordPlaceholder: "Mínimo 8 caracteres",
      passwordConfirm: "Confirmar senha",
      showPassword: "Mostrar senha",
      hidePassword: "Ocultar senha",
    },
    strength: {
      label: "Segurança",
      weak: "Fraca",
      fair: "Razoável",
      good: "Boa",
      strong: "Forte",
    },
    dividerOr: "ou",
    backHome: "Voltar ao início",
  },

  onboarding: {
    title: "Vamos calibrar",
    subtitle:
      "Quatro perguntas rápidas. Servem para ajustar as prescrições ao seu contexto — você pode mudar tudo depois.",
    stepOf: "Passo {current} de {total}",
    steps: {
      name: {
        title: "Como chamamos você?",
        body: "O nome aparece na sua área pessoal e na comunidade.",
      },
      goal: {
        title: "Qual é o objetivo principal?",
        body: "Define a prioridade entre carga, volume e recuperação.",
        options: {
          hypertrophy: "Hipertrofia",
          hypertrophyBody: "Aumentar massa muscular",
          strength: "Força",
          strengthBody: "Levantar mais carga",
          endurance: "Resistência",
          enduranceBody: "Sustentar esforço por mais tempo",
          health: "Saúde geral",
          healthBody: "Consistência e bem-estar",
        },
      },
      experience: {
        title: "Há quanto tempo você treina?",
        body: "A experiência determina a margem de progressão e o volume inicial.",
        options: {
          beginner: "Menos de 1 ano",
          beginnerBody: "Iniciante",
          intermediate: "1 a 3 anos",
          intermediateBody: "Intermediário",
          advanced: "Mais de 3 anos",
          advancedBody: "Avançado",
        },
      },
      frequency: {
        title: "Quantos dias por semana?",
        body: "O volume semanal se distribui pelos dias que você consegue cumprir.",
        days: "dias por semana",
      },
    },
    finishTitle: "Está calibrado",
    finishBody: "Sua área pessoal está pronta.",
    finishCta: "Entrar no aplicativo",
  },

  app: {
    greeting: {
      morning: "Bom dia",
      afternoon: "Boa tarde",
      evening: "Boa noite",
    },
    today: {
      title: "Hoje",
      readinessTitle: "Prontidão",
      readinessPrompt: "Responda a três perguntas para calibrar o dia.",
      readinessCta: "Avaliar prontidão",
      readinessDone: "Prontidão registrada hoje",
      sessionTitle: "Sessão",
      emptyTitle: "Ainda não há sessão programada",
      emptyBody:
        "As ferramentas de treino entram na próxima fase do desenvolvimento. Por enquanto, sua conta e seu perfil já estão prontos.",
      toolsTitle: "A caminho",
      tools: {
        metronome: "Metrônomo visual",
        metronomeBody: "Guia de cadência na tela",
        readiness: "Painel de prontidão",
        readinessBody: "Sono, cansaço e batimento cardíaco",
        tutorials: "Tutoriais simples",
        tutorialsBody: "Medir sem equipamento especial",
        assistant: "Professor AXON",
        assistantBody: "Respostas com base em evidência",
        community: "Comunidade",
        communityBody: "Mural e usuários online",
        points: "Pontos e níveis",
        pointsBody: "Recompensa a consistência",
      },
    },
    progress: {
      title: "Progresso",
      empty: "Sem registros ainda. O primeiro treino começa a linha.",
      streak: "Sequência",
      sessions: "Sessões",
      volume: "Volume total",
      days: "dias",
    },
    community: {
      title: "Comunidade",
      empty: "O mural abre quando a comunidade começar.",
      online: "online agora",
    },
    profile: {
      title: "Perfil",
      personal: "Dados pessoais",
      training: "Treino",
      displayName: "Nome",
      goal: "Objetivo",
      experience: "Experiência",
      frequency: "Frequência semanal",
      heightCm: "Altura (cm)",
      weightKg: "Peso (kg)",
      birthDate: "Data de nascimento",
      updated: "Perfil atualizado.",
      photo: "Foto",
      photoChange: "Trocar foto",
      photoRemove: "Remover",
      photoHint: "JPG, PNG ou WebP até 2 MB. A gente recorta no centro pra você.",
      photoTooLarge: "A imagem tem mais de 2 MB.",
      photoWrongType: "Formato não suportado. Use JPG, PNG ou WebP.",
      photoFailed: "Não foi possível salvar a foto. Tente novamente.",
    },
    account: {
      title: "Conta",
      preferences: "Preferências",
      appearance: "Aparência",
      appearanceSystem: "Sistema",
      appearanceLight: "Claro",
      appearanceDark: "Escuro",
      language: "Idioma e mercado",
      email: "Email",
      plan: "Plano",
      planFree: "Gratuito",
      planPro: "PRO",
      planUpgrade: "Assinar PRO",
      planSoon: "Disponível em uma fase seguinte",
      security: "Segurança",
      changePassword: "Alterar senha",
      signOut: "Sair",
      dangerZone: "Zona de risco",
      deleteAccount: "Excluir conta",
      deleteAccountBody:
        "Exclui permanentemente a conta e todos os dados associados. Não é reversível.",
      deleteConfirm: "Escreva EXCLUIR para confirmar",
      deleteWord: "EXCLUIR",
      installTitle: "Instalar no celular",
      installBody:
        "Adicione a AXON à tela inicial e use como um aplicativo, em tela cheia.",
      installCta: "Instalar",
      installIosHint:
        "No iPhone: toque em Compartilhar e depois em «Adicionar à Tela de Início».",
    },
  },

  errors: {
    generic: "Algo deu errado. Tente novamente.",
    network: "Sem conexão. Verifique a internet e tente novamente.",
    invalidCredentials: "Email ou senha incorretos.",
    emailInUse: "Já existe uma conta com este email.",
    emailNotConfirmed: "Confirme seu email antes de entrar.",
    invalidEmail: "Informe um email válido.",
    passwordTooShort: "A senha precisa de pelo menos 8 caracteres.",
    passwordMismatch: "As senhas não coincidem.",
    nameRequired: "Informe seu nome.",
    rateLimited: "Muitas tentativas. Aguarde um momento.",
    sessionExpired: "A sessão expirou. Entre novamente.",
    notFoundTitle: "Página não encontrada",
    notFoundBody: "O caminho que você seguiu não existe ou foi movido.",
    notFoundCta: "Voltar ao início",
    appErrorTitle: "Algo falhou",
    appErrorBody: "Ocorreu um erro inesperado. Você pode tentar novamente.",
    retry: "Tentar novamente",
  },
};

export default dictionary;
