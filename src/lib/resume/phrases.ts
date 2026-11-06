import type { Locale } from "./schema"

/*
 * Ready-made sentences for people staring at an empty box. Every number and
 * name is a placeholder in square brackets: the point is the shape of a
 * strong sentence, the facts have to be the person's own.
 */

export type PhraseKind = "summary" | "bullet"
type Lang = "en" | "pt"

export type PhraseFamily = {
  id: string
  label: Record<Lang, string>
  summaries: Record<Lang, string[]>
  bullets: Record<Lang, string[]>
}

export const phraseLang = (locale: Locale): Lang => (locale === "pt" || locale === "pt-BR" ? "pt" : "en")

export const PHRASE_FAMILIES: PhraseFamily[] = [
  {
    id: "general",
    label: { en: "Any role", pt: "Qualquer área" },
    summaries: {
      en: [
        "[Job title] with [N] years of experience in [industry], known for [strength] and for delivering [type of result] on time.",
        "Hands-on [job title] who turns [problem] into [outcome]. Most recently at [company], where I [achievement with a number].",
        "I bring [skill 1], [skill 2] and a habit of writing things down. Looking for a [role] where [what you want to do next].",
      ],
      pt: [
        "[Cargo] com [N] anos de experiência em [setor], com foco em [ponto forte] e resultados entregues no prazo.",
        "[Cargo] mão na massa que transforma [problema] em [resultado]. Mais recentemente na [empresa], onde [conquista com número].",
        "Trago [competência 1], [competência 2] e o hábito de documentar. Procuro uma posição de [cargo] para [o que quer fazer a seguir].",
      ],
    },
    bullets: {
      en: [
        "Cut [metric] by [N]% by [what you changed], saving [time or money] per [period].",
        "Led [project] from kickoff to delivery, [N] weeks ahead of plan and within budget.",
        "Trained [N] colleagues on [tool or process], which removed [recurring problem].",
        "Owned [responsibility] for a team of [N], reporting to [role].",
        "Wrote the [document or playbook] now used by [team] for [process].",
        "Chosen to [represent, present, lead] [initiative] because of [reason].",
      ],
      pt: [
        "Reduzi [métrica] em [N]% ao [o que mudou], poupando [tempo ou dinheiro] por [período].",
        "Liderei [projeto] do início à entrega, [N] semanas antes do plano e dentro do orçamento.",
        "Formei [N] colegas em [ferramenta ou processo], o que eliminou [problema recorrente].",
        "Responsável por [responsabilidade] numa equipa de [N] pessoas, reportando a [cargo].",
        "Escrevi o [documento ou guia] que a equipa de [área] usa hoje para [processo].",
        "Escolhido(a) para [representar, apresentar, liderar] [iniciativa] por [motivo].",
      ],
    },
  },
  {
    id: "software",
    label: { en: "Software engineering", pt: "Engenharia de software" },
    summaries: {
      en: [
        "Software engineer with [N] years building [web, mobile, backend] products in [language or stack]. Ships end to end, from API design to deploy, and cares about tests that catch real bugs.",
        "[Frontend, backend, full-stack] engineer who has shipped [product or feature] used by [N] people. Strong in [stack], comfortable owning a service in production.",
        "Engineer who likes small pull requests, boring infrastructure and clear docs. Built [system] at [company], now looking for [kind of problem] at scale.",
      ],
      pt: [
        "Engenheiro(a) de software com [N] anos a construir produtos [web, mobile, backend] em [linguagem ou stack]. Entrega de ponta a ponta, da API ao deploy, com testes que apanham bugs reais.",
        "Engenheiro(a) [frontend, backend, full-stack] que lançou [produto ou funcionalidade] usado por [N] pessoas. Forte em [stack], à vontade a manter um serviço em produção.",
        "Gosto de pull requests pequenos, infraestrutura previsível e documentação clara. Construí [sistema] na [empresa] e procuro agora [tipo de problema] em escala.",
      ],
    },
    bullets: {
      en: [
        "Rebuilt [service or page] in [stack], cutting [load time, error rate] from [before] to [after].",
        "Designed and shipped the [API or feature] used by [N] customers a day, with [test coverage, zero downtime] releases.",
        "Reduced cloud spend by [N]% by [right-sizing, caching, moving X to Y].",
        "Set up CI/CD with [tool], taking deploys from [weekly] to [daily] with no rollback in [N] months.",
        "Found and fixed [class of bug] in [component], removing [N] support tickets a month.",
        "Reviewed [N] pull requests a week and mentored [N] junior engineers through [practice].",
      ],
      pt: [
        "Reconstruí [serviço ou página] em [stack], reduzindo [tempo de carregamento, taxa de erro] de [antes] para [depois].",
        "Desenhei e lancei a [API ou funcionalidade] usada por [N] clientes por dia, com [cobertura de testes, zero downtime] nas releases.",
        "Reduzi os custos de cloud em [N]% ao [ajustar instâncias, usar cache, migrar X para Y].",
        "Montei CI/CD com [ferramenta], passando os deploys de [semanais] para [diários] sem rollbacks em [N] meses.",
        "Encontrei e corrigi [tipo de bug] em [componente], eliminando [N] tickets de suporte por mês.",
        "Revi [N] pull requests por semana e orientei [N] engenheiros(as) júnior em [prática].",
      ],
    },
  },
  {
    id: "data",
    label: { en: "Data & analytics", pt: "Dados e analytics" },
    summaries: {
      en: [
        "Data analyst with [N] years turning [kind of data] into decisions. Strong SQL and [Python, R], dashboards people actually open, and metrics defined with the teams that use them.",
        "Data engineer who builds pipelines that stay up: [N] sources, [N] GB a day, [tool stack]. Cares about data quality more than about new tools.",
        "[Data scientist, ML engineer] with models in production at [company]: [use case] serving [N] predictions a day.",
      ],
      pt: [
        "Analista de dados com [N] anos a transformar [tipo de dados] em decisões. SQL forte e [Python, R], dashboards que as pessoas abrem mesmo, e métricas definidas com quem as usa.",
        "Engenheiro(a) de dados que constrói pipelines que não caem: [N] fontes, [N] GB por dia, [stack]. Qualidade dos dados antes de ferramentas novas.",
        "[Cientista de dados, engenheiro(a) de ML] com modelos em produção na [empresa]: [caso de uso] a servir [N] previsões por dia.",
      ],
    },
    bullets: {
      en: [
        "Built the [forecast, model, dashboard] that cut [late shipments, churn, stock-outs] by [N]%.",
        "Replaced [N] manual spreadsheet reports with [N] self-serve dashboards in [tool].",
        "Defined the company's [metric] with [finance, operations] and made it the number reviewed every [week, month].",
        "Automated the [weekly pack, data load] with [Python, dbt], saving [N] hours a week.",
        "Found a [segment, pattern] worth [N]% of revenue by analysing [dataset] of [N] records.",
        "Migrated the warehouse from [A] to [B] with zero data loss and [N]% lower cost.",
      ],
      pt: [
        "Construí o [modelo, dashboard] que reduziu [atrasos, churn, ruturas de stock] em [N]%.",
        "Substituí [N] relatórios manuais em folha de cálculo por [N] dashboards self-service em [ferramenta].",
        "Defini a métrica de [métrica] com [finanças, operações] e tornei-a o número revisto todas as [semanas, meses].",
        "Automatizei o [relatório semanal, carregamento de dados] com [Python, dbt], poupando [N] horas por semana.",
        "Identifiquei um [segmento, padrão] que vale [N]% da receita ao analisar [conjunto de dados] com [N] registos.",
        "Migrei o data warehouse de [A] para [B] sem perda de dados e com [N]% menos custo.",
      ],
    },
  },
  {
    id: "product",
    label: { en: "Product & design", pt: "Produto e design" },
    summaries: {
      en: [
        "Product manager with [N] years in [B2B, consumer] software. Shipped [product or feature] that grew [metric] by [N]%, and I write the spec before the meeting.",
        "Product designer who runs research, designs the whole flow and keeps the design system alive. [N] years, [industries], Figma and enough code to prototype.",
        "UX researcher who turns [N] interviews into decisions the team acts on. Comfortable with [methods] and with saying what the data does not support.",
      ],
      pt: [
        "Product manager com [N] anos em software [B2B, de consumo]. Lancei [produto ou funcionalidade] que fez crescer [métrica] em [N]%, e escrevo a especificação antes da reunião.",
        "Product designer que faz pesquisa, desenha o fluxo completo e mantém o design system vivo. [N] anos, [setores], Figma e código suficiente para prototipar.",
        "Investigador(a) de UX que transforma [N] entrevistas em decisões que a equipa executa. À vontade com [métodos] e com dizer o que os dados não suportam.",
      ],
    },
    bullets: {
      en: [
        "Redesigned [flow], raising conversion from [N]% to [N]% in [period].",
        "Ran [N] user interviews and [N] usability tests, which changed [decision].",
        "Created the design system now used by [N] teams, cutting design-to-dev handoff from [N] days to [N].",
        "Wrote the roadmap for [product area] and shipped [N] releases in [period] with [team].",
        "Killed [feature] after data showed [finding], freeing [N] weeks of engineering time.",
        "Launched [product] in [market], reaching [N] users in the first [N] months.",
      ],
      pt: [
        "Redesenhei [fluxo], subindo a conversão de [N]% para [N]% em [período].",
        "Conduzi [N] entrevistas com utilizadores e [N] testes de usabilidade, que mudaram [decisão].",
        "Criei o design system usado hoje por [N] equipas, reduzindo a passagem de design para desenvolvimento de [N] dias para [N].",
        "Escrevi o roadmap de [área do produto] e lancei [N] versões em [período] com [equipa].",
        "Descontinuei [funcionalidade] depois de os dados mostrarem [descoberta], libertando [N] semanas de engenharia.",
        "Lancei [produto] em [mercado], chegando a [N] utilizadores nos primeiros [N] meses.",
      ],
    },
  },
  {
    id: "marketing",
    label: { en: "Marketing & sales", pt: "Marketing e vendas" },
    summaries: {
      en: [
        "Growth marketer who took [product] from [N] to [N] users with [channels]. Runs lean experiments, writes the copy, reports on revenue rather than clicks.",
        "Account executive with [N] years selling [product type] to [segment]. [N]% of quota on average, [N] new logos in [period].",
        "Content marketer who built [blog, newsletter, channel] to [N] readers. SEO, editorial calendar and the discipline to publish every [week].",
      ],
      pt: [
        "Growth marketer que levou [produto] de [N] para [N] utilizadores com [canais]. Experiências rápidas, copy própria e relatórios de receita, não de cliques.",
        "Account executive com [N] anos a vender [tipo de produto] a [segmento]. [N]% da quota em média, [N] clientes novos em [período].",
        "Marketer de conteúdo que construiu [blog, newsletter, canal] até [N] leitores. SEO, calendário editorial e disciplina para publicar todas as [semanas].",
      ],
    },
    bullets: {
      en: [
        "Grew [subscribers, leads, MRR] from [N] to [N] in [N] months with [channel].",
        "Cut customer acquisition cost by [N]% by [what you changed].",
        "Closed [N] deals worth [amount] in [period], [N]% above target.",
        "Launched [campaign] that brought [N] qualified leads at [cost per lead].",
        "Managed a yearly budget of [amount] across [channels] and reported ROI by [week, month].",
        "Built the sales playbook now used by [N] reps, lifting win rate from [N]% to [N]%.",
      ],
      pt: [
        "Fiz crescer [subscritores, leads, MRR] de [N] para [N] em [N] meses com [canal].",
        "Reduzi o custo de aquisição de clientes em [N]% ao [o que mudou].",
        "Fechei [N] negócios no valor de [montante] em [período], [N]% acima da meta.",
        "Lancei [campanha] que trouxe [N] leads qualificadas a [custo por lead].",
        "Geri um orçamento anual de [montante] em [canais] com relatório de ROI por [semana, mês].",
        "Criei o playbook de vendas usado por [N] comerciais, subindo a taxa de fecho de [N]% para [N]%.",
      ],
    },
  },
  {
    id: "support",
    label: { en: "Customer support & operations", pt: "Apoio ao cliente e operações" },
    summaries: {
      en: [
        "Support lead with [N] years in [industry]. Kept CSAT above [N]% while the ticket volume grew [N]x, by [process or tooling change].",
        "Operations manager who makes [process] run on time: [N] people, [N] locations, [tools]. Fixes the cause, not the symptom.",
        "Customer success manager for [N] accounts worth [amount], with [N]% renewal over [period].",
      ],
      pt: [
        "Líder de suporte com [N] anos em [setor]. Mantive o CSAT acima de [N]% enquanto o volume de tickets cresceu [N] vezes, graças a [mudança de processo ou ferramenta].",
        "Gestor(a) de operações que faz [processo] correr a horas: [N] pessoas, [N] locais, [ferramentas]. Corrige a causa, não o sintoma.",
        "Customer success manager de [N] contas no valor de [montante], com [N]% de renovação em [período].",
      ],
    },
    bullets: {
      en: [
        "Cut first-response time from [N] hours to [N] minutes by [macro library, routing, staffing].",
        "Handled [N] tickets a month with a CSAT of [N]%.",
        "Wrote [N] help-center articles that deflected [N]% of incoming questions.",
        "Reduced order errors by [N]% by redesigning [checklist, process].",
        "Renewed [N]% of my book of business and expanded [N] accounts by [amount].",
        "Coordinated [N] suppliers and kept [delivery, stock] on time [N]% of the time.",
      ],
      pt: [
        "Reduzi o tempo de primeira resposta de [N] horas para [N] minutos com [biblioteca de respostas, encaminhamento, equipa].",
        "Tratei [N] tickets por mês com um CSAT de [N]%.",
        "Escrevi [N] artigos de ajuda que evitaram [N]% das perguntas recebidas.",
        "Reduzi os erros de encomenda em [N]% ao redesenhar [checklist, processo].",
        "Renovei [N]% da minha carteira e expandi [N] contas em [montante].",
        "Coordenei [N] fornecedores e mantive [entregas, stock] a horas [N]% das vezes.",
      ],
    },
  },
  {
    id: "finance",
    label: { en: "Finance & administration", pt: "Finanças e administração" },
    summaries: {
      en: [
        "Accountant with [N] years in [industry], [certification]. Closes the month in [N] days and has never missed a filing deadline.",
        "Financial analyst who builds the models leadership decides on: [budget, forecast, pricing] for a [amount] business.",
        "Executive assistant who keeps [N] leaders' calendars, travel and board papers running without surprises.",
      ],
      pt: [
        "Contabilista com [N] anos em [setor], [certificação]. Fecho o mês em [N] dias e nunca falhei um prazo de entrega.",
        "Analista financeiro(a) que constrói os modelos em que a direção decide: [orçamento, previsão, preços] para um negócio de [montante].",
        "Assistente executivo(a) que mantém as agendas, viagens e documentos de [N] diretores a funcionar sem surpresas.",
      ],
    },
    bullets: {
      en: [
        "Shortened the monthly close from [N] to [N] days by [automation or process].",
        "Found [amount] in [duplicate payments, unused licences] through a review of [process].",
        "Built the [budget, forecast] model used for [decision], accurate within [N]%.",
        "Managed accounts payable of [amount] a month with [N] late payments in [period].",
        "Prepared [audit, filing] with zero findings in [N] consecutive years.",
        "Organised [N] events a year for [N] people within [N]% of budget.",
      ],
      pt: [
        "Encurtei o fecho mensal de [N] para [N] dias com [automação ou processo].",
        "Identifiquei [montante] em [pagamentos duplicados, licenças sem uso] ao rever [processo].",
        "Construí o modelo de [orçamento, previsão] usado para [decisão], com desvio inferior a [N]%.",
        "Geri contas a pagar de [montante] por mês com [N] pagamentos em atraso em [período].",
        "Preparei [auditoria, declaração] sem qualquer reparo durante [N] anos consecutivos.",
        "Organizei [N] eventos por ano para [N] pessoas dentro de [N]% do orçamento.",
      ],
    },
  },
  {
    id: "management",
    label: { en: "Management & leadership", pt: "Gestão e liderança" },
    summaries: {
      en: [
        "Engineering manager of [N] people across [N] teams. Hired [N], promoted [N], and kept attrition at [N]% while shipping [product].",
        "Team lead who grew [team] from [N] to [N] and [outcome]. Clear priorities, honest feedback, and no surprises in the review.",
        "Director of [area] with P&L of [amount]. Took [unit] from [state] to [state] in [N] years.",
      ],
      pt: [
        "Engineering manager de [N] pessoas em [N] equipas. Contratei [N], promovi [N] e mantive a saída de pessoas em [N]% enquanto entregávamos [produto].",
        "Team lead que fez crescer [equipa] de [N] para [N] e [resultado]. Prioridades claras, feedback honesto e sem surpresas na avaliação.",
        "Diretor(a) de [área] com P&L de [montante]. Levei [unidade] de [estado] para [estado] em [N] anos.",
      ],
    },
    bullets: {
      en: [
        "Hired and onboarded [N] people in [period], with [N]% still on the team after a year.",
        "Set quarterly goals with the team and hit [N] of [N] in [year].",
        "Cut meeting load by [N]% by [what you changed], giving engineers [N] focus days a week.",
        "Ran the [budget, headcount] plan of [amount] and came in [N]% under.",
        "Turned around [underperforming team or project] within [N] months: [result].",
        "Introduced [practice] that cut incidents from [N] to [N] a month.",
      ],
      pt: [
        "Contratei e integrei [N] pessoas em [período], com [N]% ainda na equipa um ano depois.",
        "Defini objetivos trimestrais com a equipa e cumpri [N] de [N] em [ano].",
        "Reduzi a carga de reuniões em [N]% ao [o que mudou], dando à equipa [N] dias de foco por semana.",
        "Geri o plano de [orçamento, headcount] de [montante] e fechei [N]% abaixo.",
        "Recuperei [equipa ou projeto em dificuldade] em [N] meses: [resultado].",
        "Introduzi [prática] que reduziu os incidentes de [N] para [N] por mês.",
      ],
    },
  },
]

/** Pick a role family and a kind, in the resume's language (English for languages without a set yet). */
export function phrasesFor(familyId: string, kind: PhraseKind, locale: Locale): string[] {
  const family = PHRASE_FAMILIES.find((f) => f.id === familyId) ?? PHRASE_FAMILIES[0]
  return kind === "summary" ? family.summaries[phraseLang(locale)] : family.bullets[phraseLang(locale)]
}
