# Changelog — Frontend (personalfit)

> Histórico de alterações feitas via prompt no Claude Code (ou notadas durante sessões de chat) neste repositório.
> Mantido automaticamente por um hook do Claude Code (evento `Stop`, script `.claude/hooks/changelog-log.js` na raiz do workspace `Venafit`): toda vez que um prompt resulta em edição/criação de arquivo dentro deste repositório, uma entrada é anexada aqui com data, hora, autor e um resumo do que foi feito.
>
> **Formato de cada entrada:**
> `## AAAA-MM-DD HH:MM — quem`
> `**Resumo:** o que foi feito`
> `**Arquivos:** arquivos tocados (quando disponível)`
>
> **Backfill (gerado em 2026-08-04):** as entradas abaixo, marcadas "(commit ...)", foram reconstruídas a partir de `git log --reverse` (histórico real de commits) — não de prompts individuais. Um commit pode agregar o trabalho de várias sessões/prompts que não foram registradas prompt-a-prompt. Este repositório tem histórico git completo desde o commit inicial (2025-05-18).
> A partir de 2026-08-04, novas entradas são geradas por prompt/sessão (não por commit) pelo hook acima.

---

## Histórico (backfill via `git log`)

## 2025-05-18 16:15 — riverkirasamura (commit `e93465a`)
**Resumo:** primeiro

## 2025-05-19 17:49 — riverkirasamura (commit `2c0bf22`)
**Resumo:** adicionado a pagina de protocolos

## 2025-05-20 11:38 — riverkirasamura (commit `47d07bf`)
**Resumo:** adicionado a pagina de mock

## 2025-05-23 01:50 — riverson Morais (commit `47ffbdf`)
**Resumo:** alteração css training module

## 2025-05-23 16:46 — riverkirasamura (commit `9468959`)
**Resumo:** pagina de treinamento

## 2026-07-19 19:23 — riverkirasamura (commit `3ac436c`)
**Resumo:** Painel admin, agendamentos, LGPD, modo offline e refactor de tipos

## 2026-07-19 20:02 — riverkirasamura (commit `f5597d3`)
**Resumo:** Fix macrocycle/mesocycle/microcycle consistency on the frontend

## 2026-07-19 21:04 — riverkirasamura (commit `c149d0b`)
**Resumo:** feat: preparar frontend para deploy no Cloud Run

## 2026-07-19 21:05 — riverkirasamura (commit `d04cffc`)
**Resumo:** fix: aceitar variáveis NEXT_PUBLIC_* como build args no Dockerfile

## 2026-07-20 14:40 — riverkirasamura (commit `6d00e58`)
**Resumo:** feat: mostrar/ocultar senha e normalizar CPF com pontuação no cadastro

## 2026-07-20 15:08 — riverkirasamura (commit `0b33361`)
**Resumo:** fix: usar cloudbuild.yaml com --build-arg explícito para variáveis NEXT_PUBLIC_*

## 2026-07-20 15:59 — riverkirasamura (commit `d6de224`)
**Resumo:** fix: adicionar timeout e retry no upload de vídeo para R2

## 2026-07-20 16:38 — riverkirasamura (commit `9d85baf`)
**Resumo:** feat: gerar thumbnail automática do vídeo (frame do segundo 3) e confirmar upload

## 2026-07-20 18:10 — riverkirasamura (commit `dd84c3d`)
**Resumo:** feat: biblioteca "Minha Periodização/Treinos" com builder de templates

## 2026-07-21 09:41 — riverkirasamura (commit `a220585`)
**Resumo:** fix: tipar erro de catch no cadastro em vez de any

## 2026-07-21 16:00 — riverkirasamura (commit `7d534d3`)
**Resumo:** feat: reconstrói checkout de pagamento e fecha pendências acumuladas

## 2026-07-21 16:32 — riverkirasamura (commit `7681e6b`)
**Resumo:** fix: menu horizontal da área do personal arrastava a tela toda

## 2026-07-21 21:05 — riverkirasamura (commit `a206e1b`)
**Resumo:** corrigido bug run local

## 2026-07-22 05:43 — riverkirasamura (commit `8092dd9`)
**Resumo:** feat: adiciona seção de Parceiros de Indicação no admin

## 2026-07-22 06:49 — riverkirasamura (commit `d97d310`)
**Resumo:** fix: dropdown de notificacoes estourava a tela em viewports estreitas

## 2026-07-22 11:18 — riverkirasamura (commit `cfb8545`)
**Resumo:** fix(deploy): documenta processo correto de deploy e adiciona fail-fast no build

## 2026-07-22 11:18 — riverkirasamura (commit `6da4995`)
**Resumo:** fix(docs): corrige nome do branch padrao (master, nao main) no README

## 2026-07-22 12:34 — riverkirasamura (commit `48a8511`)
**Resumo:** refactor: migra modais para componente reutilizavel system/Modal

## 2026-07-22 12:56 — riverkirasamura (commit `b696850`)
**Resumo:** fix(deploy): usa tag fixa 'latest' na imagem em vez de $SHORT_SHA

## 2026-07-22 13:25 — riverkirasamura (commit `da3de8c`)
**Resumo:** fix(deploy): adiciona push explicito antes do deploy no cloudbuild.yaml

## 2026-07-22 14:15 — riverkirasamura (commit `3f9463d`)
**Resumo:** fix(personal): corrige botao Desvincular estourando area em telas pequenas

## 2026-07-22 14:27 — riverkirasamura (commit `501c042`)
**Resumo:** fix: corrige overflow de botoes de acao em mais 3 cards

## 2026-07-22 20:57 — riverkirasamura (commit `c9dd593`)
**Resumo:** fix(convite): estiliza pagina de convite com padrao existente e link de login

## 2026-07-22 21:03 — riverkirasamura (commit `e0c3734`)
**Resumo:** feat: adiciona plano alimentar versionado e evolucao do aluno (frontend)

## 2026-07-22 21:26 — riverkirasamura (commit `a442ae4`)
**Resumo:** fix(ui): centraliza modais em dialogo no desktop em vez de folha full-screen

## 2026-07-22 21:26 — riverkirasamura (commit `3c745b5`)
**Resumo:** feat(android): detecta WebView nativo e prepara App Links do app Android

## 2026-07-23 08:10 — riverkirasamura (commit `ddc0924`)
**Resumo:** fix(sw): nao cacheia GET presigned do R2 (mídia sensível com URL única por requisição)

## 2026-07-23 13:37 — riverkirasamura (commit `11ce141`)
**Resumo:** feat: central de ajuda do personal + agenda como recurso PRO

## 2026-07-23 17:52 — riverkirasamura (commit `818c353`)
**Resumo:** botoes de fechar nos baloes e correção sobreposição footer

## 2026-07-23 17:56 — riverkirasamura (commit `bdb89fa`)
**Resumo:** correção menu admin

## 2026-07-23 19:55 — riverkirasamura (commit `326749d`)
**Resumo:** adicionado mais margem superuior

## 2026-07-23 20:04 — riverkirasamura (commit `0287c6a`)
**Resumo:** adicionadoadmin module css

## 2026-07-23 20:35 — riverkirasamura (commit `0ed7fcc`)
**Resumo:** adicionano os avisos de erros de upload

## 2026-07-23 21:20 — riverkirasamura (commit `5bf0444`)
**Resumo:** adicionado caixas nas notificaçoes eu acho

## 2026-07-23 21:25 — riverkirasamura (commit `e0457f3`)
**Resumo:** corrigido bug que não permitia o aceite de notificaçoes

## 2026-07-23 21:41 — riverkirasamura (commit `08f694c`)
**Resumo:** adição do botão ver como alunoe adição dna ajuda

## 2026-07-24 10:45 — riverkirasamura (commit `35cffa2`)
**Resumo:** adicionado algumas features relacionadas a swot do mfit

## 2026-07-24 11:03 — riverkirasamura (commit `9d97eb5`)
**Resumo:** adicionado algumas features relacionadas a swot do mfit correção

## 2026-07-24 16:14 — riverkirasamura (commit `7178bfb`)
**Resumo:** adicionado crud adm anamneses e firebase configuração

## 2026-07-27 23:35 — riverkirasamura (commit `536361e`)
**Resumo:** refatoração de designe

## 2026-07-28 00:04 — riverkirasamura (commit `727cdcd`)
**Resumo:** ajustado cards

## 2026-07-28 22:41 — riverkirasamura (commit `a15afa7`)
**Resumo:** adicionado botoes de voltar para pagina inicial nas paginas em que estavam ausentes

## 2026-07-28 22:52 — riverkirasamura (commit `7c538d0`)
**Resumo:**  corrigido modal que não loopava os videos

## 2026-07-28 23:00 — riverkirasamura (commit `f690230`)
**Resumo:** corrigido mesnagem de slint na build do google

## 2026-07-28 23:11 — riverkirasamura (commit `ab29d39`)
**Resumo:** corrigido o bug de cortar os videos no enquadramento

## 2026-07-29 10:31 — riverkirasamura (commit `6eaebd7`)
**Resumo:** corrigido cards sem graça dos treinos de famosos

## 2026-07-30 14:10 — riverkirasamura (commit `074b14d`)
**Resumo:**  adicionado endpoint de gravaçao das anotaçoes dos exercicios

## 2026-07-30 16:43 — riverkirasamura (commit `b8accea`)
**Resumo:** adicionado mudanças verificada em auditoria de responsividade

## 2026-07-30 20:48 — riverkirasamura (commit `ecf9d01`)
**Resumo:** padronização de design remoção de emogis

## 2026-07-31 00:20 — riverkirasamura (commit `179e79f`)
**Resumo:** adicionado midias novas

## 2026-07-31 09:58 — riverkirasamura (commit `c7bfea2`)
**Resumo:** ajustado grafico gantts

## 2026-07-31 14:47 — riverkirasamura (commit `a2d6df4`)
**Resumo:** Reorganiza edição de treino e cartão de aluno, adiciona bissérie/trissérie

## 2026-07-31 23:54 — riverkirasamura (commit `ea3cb53`)
**Resumo:** bug de edição do exercicio corrigido

## 2026-08-01 00:34 — riverkirasamura (commit `e20f86e`)
**Resumo:** Corrige tema claro sem contraste e cards de exercício sem thumbnail

## 2026-08-01 08:01 — riverkirasamura (commit `552c066`)
**Resumo:** Adiciona campos de prescrição faltantes ao card de edição de exercício

## 2026-08-01 08:33 — riverkirasamura (commit `0065a24`)
**Resumo:** Corrige thumbnail sumindo em exercícios já migrados para MP4

## 2026-08-01 08:58 — riverkirasamura (commit `59e65ea`)
**Resumo:** Adiciona suporte a PWA instalável e banner de sugestão de instalação

## 2026-08-01 09:54 — riverkirasamura (commit `623cd98`)
**Resumo:** feat: sugestão de carga no card do treino + autorregulação configurável

## 2026-08-01 10:58 — riverkirasamura (commit `19a8696`)
**Resumo:** Adiciona glossário central na Ajuda e atualiza conteúdo desatualizado

## 2026-08-01 11:36 — riverkirasamura (commit `4b7e24c`)
**Resumo:** feat: progressão de carga temporal fundamentada em literatura científica

## 2026-08-01 14:21 — riverkirasamura (commit `872fddd`)
**Resumo:** feat: técnicas de treinamento avançadas na edição de exercícios

## 2026-08-01 19:28 — riverkirasamura (commit `6502360`)
**Resumo:** feat: prescrição geral, reordenar treinos/exercícios por arrastar e confirmações de sucesso

## 2026-08-01 20:20 — riverkirasamura (commit `92aecda`)
**Resumo:** feat: variações condicional, anotações/microciclo colapsáveis no card de exercício

## 2026-08-01 20:22 — riverkirasamura (commit `e7d91f9`)
**Resumo:** feat: vitrine do personal (plano Pro) como tela inicial do aluno vinculado

## 2026-08-01 20:45 — riverkirasamura (commit `4246003`)
**Resumo:** Add triagem de saude PAR-Q antes da anamnese, com bloqueio e termo de responsabilidade

## 2026-08-01 23:10 — riverkirasamura (commit `55ef95f`)
**Resumo:** fix: carga do aluno nao persistia e sugestao de carga nunca aparecia

## 2026-08-01 23:57 — riverkirasamura (commit `5c65ada`)
**Resumo:** perf: code-split das abas pesadas do /admin (recharts, anúncios, parceiros, protocolos)

## 2026-08-01 23:58 — riverkirasamura (commit `240bf65`)
**Resumo:** feat: alternar plano PRO/free de qualquer usuário no painel admin

## 2026-08-01 23:58 — riverkirasamura (commit `07ee923`)
**Resumo:** perf: pausa polling de notificações/vínculo quando a aba está em background

## 2026-08-01 23:58 — riverkirasamura (commit `73ce0d2`)
**Resumo:** perf: captura de thumbnail sob demanda na lista de exercícios do mesociclo

## 2026-08-01 23:58 — riverkirasamura (commit `92e616e`)
**Resumo:** feat: pré-preenche calculadora de zonas de FC com a última avaliação

## 2026-08-01 23:58 — riverkirasamura (commit `1151906`)
**Resumo:** feat: editar entrada de evolução (recria e apaga a antiga)

## 2026-08-01 23:59 — riverkirasamura (commit `ba28daf`)
**Resumo:** fix: contraste no tema claro e quebra de abas do personal em telas estreitas

## 2026-08-01 23:59 — riverkirasamura (commit `11d6110`)
**Resumo:** docs: nota de escopo das técnicas de treinamento avançadas

## 2026-08-02 00:30 — riverkirasamura (commit `5c0027c`)
**Resumo:** incluido evolução

## 2026-08-02 09:24 — riverkirasamura (commit `5255102`)
**Resumo:** feat: sessao de 7 dias com renovacao silenciosa de access token

## 2026-08-02 09:25 — riverkirasamura (commit `ccd1332`)
**Resumo:** feat: grade de disponibilidade para agendamento (frontend)

## 2026-08-02 09:44 — riverkirasamura (commit `45b729d`)
**Resumo:** refactor: substitui emojis por icones react-icons/fi no menu do personal

## 2026-08-03 12:51 — riverkirasamura (commit `c89e58c`)
**Resumo:** Adiciona progressão padrão na primeira sugestão de carga e corrige overrides de autorregulação

## 2026-08-03 14:10 — riverkirasamura (commit `53fbc57`)
**Resumo:** Adiciona execução de bi-set/triset/superset ao fluxo do aluno

## 2026-08-03 14:10 — riverkirasamura (commit `67af335`)
**Resumo:** Muda tema padrão do app para escuro

## 2026-08-03 14:11 — riverkirasamura (commit `1607eba`)
**Resumo:** Migra ícones de emoji para react-icons e outros ajustes de UI

## 2026-08-03 14:11 — riverkirasamura (commit `4194394`)
**Resumo:** Continua migração de emoji para react-icons em ExerciseDetailCard

## 2026-08-03 14:15 — riverkirasamura (commit `2ecb224`)
**Resumo:** Continua migração de ícones (ajuda, login, seleção de perfil)

## 2026-08-03 14:16 — riverkirasamura (commit `ab9c274`)
**Resumo:** Continua migração de ícones (ajuda)

## 2026-08-03 15:09 — riverkirasamura (commit `eb0804f`)
**Resumo:** Finaliza migração de emojis para react-icons/fi em todo o app

## 2026-08-03 15:34 — riverkirasamura (commit `a27274f`)
**Resumo:** fix: cronômetro de descanso no modal de exercício sem estilo correto

## 2026-08-04 17:20 — riverkirasamura (commit `004c763`)
**Resumo:** feat: tooltips de ajuda contextual no card de exercicio + timer local de duracao

## 2026-08-04 17:20 — riverkirasamura (commit `cfa6489`)
**Resumo:** feat: renovacao silenciosa de access token (sessao de 7 dias)

## 2026-08-04 17:20 — riverkirasamura (commit `9bc864c`)
**Resumo:** feat: substituicao inteligente de exercicios via IA (frontend)

## 2026-08-05 08:46 — River (via Claude Code)
**Resumo:** No response requested.
**Commits:** feat: cards de exercicio clicaveis no "ver treino" do personal

## 2026-08-05 17:54 — River (via Claude Code)
**Resumo:** O arquivo é um changelog automático mantido por um hook do Claude Code (`.claude/hooks/changelog-log.js`, evento `Stop`): toda vez que um prompt gera edição/criação de arquivo neste repo, uma entrada é anexada com data/hora/resumo. Estrutura dele: - **Linhas 18-139**: histórico "backfill" reconstruído a partir de `git log --reverse` em 2026-08-04 (não são prompts individuais, são commits — o repo só passou a ser versionado em 2026-07-19 embora o backend já existisse antes). - **A partir de 2026-08-04**: entradas passaram a ser geradas por prompt/sessão real, não mais por commit. A última entra…
**Commits:**  correção da substituição por ia obs pode quebrar alguma coisa , houve modificaçoes profundas

## 2026-08-06 16:32 — River (via Claude Code)
**Resumo:** Logic checks out. Fixed: the hook now skips the noisy `**Resumo:** No response requested.` line whenever a commit subject already covers the entry — it only falls back to the generic placeholder text when there's neither a real summary nor a commit to show. No other behavior changed.
**Arquivos:** CHANGELOG_FRONTEND.md

## 2026-08-06 17:13 — River (via Claude Code)
**Resumo:** Sim, mas separado do painel de comparação. São duas coisas diferentes: **Gráfico "Evolução ao longo do tempo"** (`EvolutionChart.tsx`) — aparece automaticamente acima do painel de comparação quando há 2+ avaliações. É um gráfico de linha com **peso (kg)** e **% de gordura** plotados por data, usando **todas** as avaliações da linha do tempo (não só as duas escolhidas no comparador). **Painel de comparação** (Antes/Depois) — esse não tem gráfico próprio: mostra fotos lado a lado e uma **tabela** com peso, %gordura e cada medida (cm), com uma coluna Δ (delta) calculando a diferença entre as duas…
**Arquivos:** EvolutionTimeline.module.css, EvolutionTimeline.tsx

## 2026-08-06 17:24 — River (via Claude Code)
**Resumo:** Syntax is valid. The fix is complete: the hook no longer writes a `**Resumo:** No response requested.` line when a commit already exists for that entry — only the `**Commits:**` line shows in that case, and the generic fallback text is used only when there's truly neither a summary nor a commit. Nothing else in the file changed.
**Arquivos:** EvolutionCompareChart.module.css, EvolutionCompareChart.tsx

## 2026-08-06 17:40 — River (via Claude Code)
**Resumo:** Feito e já em produção. Resumo do que investiguei e mudei: **Achado principal — "thinking" invisível** Testei a resposta real da API do Gemini e descobri que ela reporta um campo `thoughtsTokenCount` separado, que **não aparecia em lugar nenhum no código** (o parser Go só lia `promptTokenCount`/`candidatesTokenCount`/`totalTokenCount`). Para uma tarefa trivial de 5 tokens de resposta, o modelo padrão gastava **91-134 tokens de "raciocínio" invisível** — 20-30x mais que a resposta em si, sem ganho nenhum, já que a tarefa é só escolher um índice de uma lista fechada (o schema já obriga o formato…
**Arquivos:** EvolutionChart.tsx

## 2026-08-06 18:31 — River (via Claude Code)
**Commits:** corrigido a versão do gemini usado para replace dos exercicios

## 2026-08-06 18:32 — River (via Claude Code)
**Resumo:** Dá pra conectar de duas formas — não existe uma sincronização automática entre a memória do Claude Code (aqui, local) e o Claude.ai, mas dá pra alimentar o Project "Venafit" manualmente: **1. Conectar os repositórios via GitHub (recomendado)** Os três repos já estão no GitHub sob `Cod-Rivers`: - `personalfit` (frontend) - `Personal-fit-Back` (backend) - `VenafitApp` (Android) No Claude.ai, dentro do Project → **Add content → GitHub**, você pode conectar esses repos (precisa autorizar o GitHub uma vez em Settings → Connectors). Isso dá ao Project acesso ao código/histórico real, sem precisar co…
**Arquivos:** CHANGELOG_FRONTEND.md

## 2026-08-07 18:56 — River (via Claude Code)
**Resumo:** Nenhum teste referencia esses valores. Resumo do que foi alterado: **Backend** (`Personal-fit-Back`): - `internal/infra/storage/r2.go`: `MaxUploadBytes` 20MB → 35MB (personal); nova constante `MaxUploadBytesAdmin` = 50MB - `enforceMaxUploadSize` agora recebe `maxBytes` como parâmetro - `admin-controller.go` (3 pontos: confirmação de vídeo, upload de imagem) usa `MaxUploadBytesAdmin` - `exercise-fork-controller.go` e `personal-exercises-controller.go` usam `MaxUploadBytes` (35MB) **Frontend** (`personalfit`): - `exerciseVideoService.ts`: `MAX_UPLOAD_BYTES` → 35MB; nova `MAX_UPLOAD_BYTES_ADMIN` …
**Arquivos:** exerciseVideoService.ts, page.tsx

## 2026-08-07 20:35 — River (via Claude Code)
**Resumo:** Vou mapear o código em busca de todos os tipos de mensagens enviadas (push, email, in-app, etc.) e seus canais de envio.
**Commits:** Aumenta limite de upload de mídia de exercício: 20MB -> 35MB (personal) / 50MB (admin)

## 2026-08-10 17:27 — River (via Claude Code)
**Resumo:** Investigando a página de treino do aluno em background para verificar se os treinos sempre aparecem primeiro no layout. Te aviso assim que tiver o resultado.
**Arquivos:** index.tsx
**Commits:** feat: seleção predefinida de grupo muscular/categoria/tags + busca reativa na biblioteca de exercícios | fix: rótulos de grupo muscular mais claros (Abdômen, Isquiotibiais, Lombar) | fix: lombar não é sinônimo de abdômen/core

## 2026-08-10 17:29 — River (via Claude Code)
**Resumo:** Você não achou porque essa funcionalidade ainda não existe no código — ela foi só planejada, nunca implementada. Confirmei isso agora contra o repositório (nenhuma rota, componente ou tela de importação de treino via PDF em nenhum dos dois repos) e contra `Todo/TAREFAS_PENDENTES.md`, item -11. O que existe hoje é só o desenho técnico completo, fechado em 2026-08-05, salvo em `C:\Users\river\.claude\plans\lazy-plotting-abelson.md`: - **Aluno ou personal** sobe um PDF (foto de caderno, planilha, plano de outra academia) e o Gemini extrai os exercícios automaticamente. - **No personal**: pensado …
**Arquivos:** InstallPwaPrompt.tsx

## 2026-08-11 12:55 — River (via Claude Code)
**Resumo:** I'll just wait for the background agent's notification rather than polling — no action needed right now.
**Commits:** alterado aforma de vinculo com personal, corrigido campos de cadastro e adicionado pdf com ia' | CPF opcional no pré-cadastro de aluno, completado no primeiro login | Mostra a senha temporária pro personal + validação client-side no pré-cadastro | Remove cache-buster local do upload da vitrine | Thumbnail de exercício no editor do personal abre preview de vídeo | Enquadramento (arrastar + zoom) para as imagens da vitrine

## 2026-08-11 14:04 — River (via Claude Code)
**Resumo:** Sim, funciona — mas com uma ressalva importante sobre o `ads.txt`. **Site no AdSense**: quando você cadastra `codriverslabs.com` como site, isso cobre automaticamente todos os subdomínios (`venafit.codriverslabs.com` incluso) — não precisa cadastrar o subdomínio separado. O script com `ca-pub-9935304322065680` vai carregar e servir anúncios normalmente em `venafit.codriverslabs.com` assim que a conta/site for aprovado pelo Google (isso pode levar de algumas horas a alguns dias se a conta ainda estiver em revisão). **O problema**: o `ads.txt` que eu criei fica em `personalfit/public/ads.txt`, q…
**Commits:** Integra Google AdSense (auto ads + slot dedicado), gated pelo plano efetivo

## 2026-08-11 14:07 — River (via Claude Code)
**Resumo:** Sim, funciona — mas com uma ressalva importante sobre o `ads.txt`. **Site no AdSense**: quando você cadastra `codriverslabs.com` como site, isso cobre automaticamente todos os subdomínios (`venafit.codriverslabs.com` incluso) — não precisa cadastrar o subdomínio separado. O script com `ca-pub-9935304322065680` vai carregar e servir anúncios normalmente em `venafit.codriverslabs.com` assim que a conta/site for aprovado pelo Google (isso pode levar de algumas horas a alguns dias se a conta ainda estiver em revisão). **O problema**: o `ads.txt` que eu criei fica em `personalfit/public/ads.txt`, q…
**Arquivos:** CHANGELOG_FRONTEND.md

## 2026-08-12 10:11 — River (via Claude Code)
**Commits:** Atualiza changelog do frontend

## 2026-08-12 10:26 — River (via Claude Code)
**Resumo:** Ainda não — vou salvar agora.
**Arquivos:** CHANGELOG_FRONTEND.md, Modal.module.css, ScrollHint, index.tsx, page.tsx

## 2026-08-15 08:19 — River (via Claude Code)
**Resumo:** Correção aplicada em [constants.css](personalfit/src/app/css/constants.css#L1-L6) e [linha 143](personalfit/src/app/css/constants.css#L143-L145). Só CSS, sem tocar em nenhuma das 13 telas com `<input type="date">` — a causa era global. **Resumo:** o app nunca declarava `color-scheme`, então o navegador improvisava o contraste do popup nativo do calendário (e do ícone) com base em heurística própria em vez do tema real da página — daí números "brancos sobre branco" só visíveis quando selecionados (o destaque de acento salvava o contraste). Agora `[data-theme="light"]` declara `color-scheme: lig…
**Arquivos:** constants.css
**Commits:** Adiciona indicador de scroll e corrige rodapé de modal cortado no iOS |  alterado nos cards dos alunos do personal preiodização para prescrever treino |  alterado botãod e criar treino / macrociclo

## 2026-08-15 09:22 — River (via Claude Code)
**Resumo:** Achei a causa real — as fotos mostram o **seletor nativo de data do Android** (dentro do `WebView` do app, não o navegador). Isso está totalmente fora do alcance do CSS que corrigi antes; a correção do `color-scheme` era necessária mas não resolve esse caso, porque esse diálogo é renderizado pelo próprio Android, não pela página web.
**Commits:** Altewrado contraste errado dos calendarios

## 2026-08-15 10:27 — River (via Claude Code)
**Resumo:** Confirmado no código: [build.gradle.kts:30-35](VenafitApp/app/build.gradle.kts#L30-L35) já está com `compileSdk = 36` e `targetSdk = 36` (Android 16), que é exatamente o nível que o aviso está pedindo. Isso já estava certo desde a atualização de julho (memória: upgrade de Billing Library + API 36). Duas coisas importantes: 1. **"Sync Now" no Android Studio não resolve esse aviso.** Isso só sincroniza o projeto localmente com o Gradle — o Google Play não sabe nada sobre isso. O aviso só desaparece quando uma **versão publicada** (build enviado ao Play Console) atinge o nível de API exigido. 2. …
**Arquivos:** CHANGELOG_FRONTEND.md

## 2026-08-15 12:21 — River (via Claude Code)
**Resumo:** Corrigido: o banner "Ative as notificações..." (e o de "notificações bloqueadas") agora só aparece para usuários logados — não vai mais surgir na tela de cadastro/login, onde não fazia sentido nem funcionava (o `requestPermission` já no-opava sem sessão).
**Arquivos:** FCMProvider.tsx
**Commits:** Documenta regra de visibilidade de templates na Política de Privacidade | Memoiza agrupamento de exercícios no editor de periodização

## 2026-08-15 12:26 — River (via Claude Code)
**Resumo:** Confirmado, o fluxo já funciona do jeito que você espera: 1. **Onde fica guardado**: `Notification.permission` é uma API nativa do navegador, persistida por origem (domínio) desde a primeira vez que o usuário aceita ou nega — não é algo que o app precisa salvar em `localStorage`/backend. Sobrevive a reloads, fechar o navegador, etc. 2. **O banner (`FCMProvider.tsx:47-48`)** só aparece quando `permissionState === 'default'` (nunca decidiu) ou `'denied'` (bloqueou). Se já está `'granted'`, nenhum dos dois banners renderiza. 3. **Se já estava `'granted'`** de uma vez anterior, o hook nem mostra p…
**Commits:** Restringe banner de notificacoes a usuarios logados e reduz tamanho

## 2026-08-15 12:45 — River (via Claude Code)
**Resumo:** Vou delegar a auditoria de padronização de botões e modais para um agente de exploração, já que isso envolve varrer muitos arquivos do frontend.
**Commits:** Adiciona botao voltar na tela de cadastro

## 2026-08-15 12:50 — River (via Claude Code)
**Resumo:** Auditoria concluída. Achado principal: **o componente de botão padrão está órfão**. **Botões** - `src/components/atoms/Button` (variantes primary/secondary/danger/warning/ghost, tokens corretos, spinner, a11y) existe e está bem feito, mas **não é usado em nenhum lugar do app**. - Na prática há 3 sistemas paralelos de botão: `.btn-gold`/Bootstrap re-temado em `globals.css` (usado em ~28 arquivos: minha-conta, anamnese, pagamento, login/signup, error/not-found...), `.btn-luxe` exclusivo do Header, e dezenas de CSS Modules por tela reinventando a mesma coisa (admin, ExerciseDetailCard, ExerciseSu…
**Arquivos:** CHANGELOG_FRONTEND.md

## 2026-08-15 13:03 — River (via Claude Code)
**Resumo:** Corrigido nos dois arquivos (`Login/styles.css` e `SignUp/styles.css`). Mudança é só CSS, sem risco de quebrar build: `overflow: hidden` virou `overflow-x: hidden` + `overflow-y: auto`, e adicionei `align-items: safe center` (navegadores que não suportam ignoram e mantêm o `center` normal como fallback). Resultado prático: quando o card não couber na altura da janela (zoom 100%, PWA desktop), ele agora ancora no topo em vez de ser cortado — e mesmo que ainda não caiba perfeitamente, dá pra rolar pra ver o que ficou acima. Não commitei nada, fica pra você validar visualmente no app instalado.
**Arquivos:** ExerciseDetailCard.module.css, ExerciseDetailCard.tsx, ExerciseSubstitutionModal.module.css, ExerciseSubstitutionModal.tsx, WorkoutLogger.module.css, admin.module.css, agenda.module.css, agendamentos.module.css, builder.module.css, escolher-plano.module.css, periodizacao.module.css, personal.module.css, styles.css

## 2026-08-15 21:58 — River (via Claude Code)
**Resumo:** Revertido. O repositório continua clonado em `references/agent-skills/`, sem a entrada no `.clineignore`.
**Arquivos:** page.tsx
**Commits:** Corrige overflow vertical do login/cadastro em janelas baixas | Padroniza botões em modais/cards de exercício e anúncios; remove CSS morto | Compacta footer em uma única linha | Adiciona helptips nos campos de criação de treinos do personal

## 2026-08-15 21:59 — River (via Claude Code)
**Resumo:** Pasta `.git` removida. Agora é só um conjunto de arquivos de referência, sem histórico git.
**Arquivos:** CHANGELOG_FRONTEND.md

## 2026-08-18 17:16 — River (via Claude Code)
**Resumo:** Investiguei e encontrei **duas causas independentes** — a IA de fato não era a única culpada. ## O que estava errado **1. O fluxo do personal jogava a mídia fora.** Este é o que causou o sintoma da aluna. Em [TrainingPdfReviewScreen.tsx:36-37](personalfit/src/components/features/TrainingPdfReviewScreen.tsx#L36-L37), o payload enviado ao criar o macrociclo mandava `video_url: ''` e `video_thumb: ''` — mesmo quando o exercício tinha o `exercise_library_id` certo. E [save-planning.go](Personal-fit-Back/internal/application/user/commands/save-planning.go) gravava exatamente isso. O fluxo do **alun…
**Arquivos:** TrainingPdfReviewScreen.module.css, TrainingPdfReviewScreen.tsx
**Commits:** Adiciona upload em lote de midia no admin e remove limite de tamanho

## 2026-08-20 21:16 — River (via Claude Code)
**Resumo:** Feito. Cada exercício do editor de treinos agora tem um campo **"Vídeo de demonstração"** — vale igualmente para exercício da biblioteca e para exercício avulso (o caso do treino puxado por PDF, que nasce sem mídia). **Como fica na UI** (dentro do card do exercício, logo abaixo de Observações): - Sem vídeo → botão `Adicionar vídeo` → input "Cole o link do YouTube, Vimeo, Instagram ou TikTok" + `Aplicar`. - Com vídeo → chip da origem (`YouTube` / `Vídeo da biblioteca` / `Vídeo próprio`), link `Abrir`, `Trocar vídeo` e um botão de limpar, além da miniatura salva. **Frontend** - [ExerciseVideoFie…
**Arquivos:** ExerciseVideoField.tsx, TrainingsEditor.tsx, builder.module.css, exerciseVideoService.ts
**Commits:** Aumenta limite mensal de importação de treino via PDF de 1 para 3 | Mostra qual exercicio da biblioteca foi vinculado na revisao do PDF

## 2026-09-01 09:51 — River (via Claude Code)
**Resumo:** Corrigido bug real que fazia `/politica-privacidade` exigir login (rejeição do Play Console: "Política de Privacidade exige login"). A página em si nunca teve guard de autenticação, mas faltava na lista `PUBLIC_PATHS` do [HeaderCondicional](src/components/organism/HeaderCondicional/index.tsx) — por isso o `Header` autenticado renderizava ali também, suas chamadas de API levavam 401 sem sessão válida, e o interceptor global do axios ([libs/api.ts](src/libs/api.ts)) redirecionava a página inteira para `/?reason=session_expired`. Reproduzido ao vivo (print do usuário mostrando a tela de login com "Sua sessão expirou") e corrigido adicionando a rota à lista de caminhos públicos, igual `/cadastro` e `/esqueceu-senha`.
**Arquivos:** HeaderCondicional/index.tsx
**Commits:** Permite inserir link de vídeo em qualquer exercício do editor de treinos

## 2026-09-03 18:34 — River (via Claude Code)
**Resumo:** The commit and push from the previous turn are already done — nothing else was pending in this task (the fixes only touched the `personalfit` frontend repo; no backend or Android changes were made this session). Noted on the new attribution format for future commits/PRs. Is there something specific you'd like me to continue with — e.g. testing these changes live, or moving on to another item from the pending-tasks list?
**Commits:** Corrige exigencia de login na pagina de Politica de Privacidade | Corrige tooltip de ajuda atrás de modal, permite prescrever carga no preview e adiciona guarda de saída do modo Ver como Aluno

## 2026-09-04 15:59 — River (via Claude Code)
**Resumo:** Finalizado. As três fases estão entregues. **Criado** (2.909 linhas, nenhum arquivo dos repos de código tocado — os dois `CHANGELOG` sujos no `git status` já estavam assim antes): | Fase | Artefato | Linhas | |---|---|---| | 0 | [docs/conventions.md](docs/conventions.md) — 13 tabelas de padrões com arquivo de referência e confiança, 11 lacunas com 2 opções cada, decisões D-01…D-08, correções CP-01…CP-04 | 594 | | 1 | [docs/product/prd-registro-aderencia.md](docs/product/prd-registro-aderencia.md) — 7 user stories, 38 regras de negócio, 3 eixos de estado, 10 métricas, 10 riscos | 428 | | 2 | [d…
**Arquivos:** CHANGELOG_FRONTEND.md

## 2026-09-04 21:41 — River (via Claude Code)
**Resumo:** ## A premissa está errada: os triggers existem e o push **deployou** hoje O `gcloud builds triggers list` voltou vazio por causa da configuração local, não por ausência de trigger: ``` [builds] region = us-west1 ← gcloud config ``` Sem `--region`, o comando consulta **só us-west1**. Os dois triggers vivem em outras regiões: | Trigger | Região | Repo | Branch | Estado | |---|---|---|---|---| | `venafit-frontend-master` | `us-east1` | `personalfit` | `^master$` | ativo, GITHUB push | | `venafit-backend-main` | `southamerica-east1` | `personal-fit-back` | `^main$` | ativo, GITHUB push | E não exi…
**Commits:** Envia a hora local de conclusão do treino ao concluir

## 2026-09-04 21:43 — River (via Claude Code)
**Resumo:** Fechado. Resumo do estado real: **Sprint 1 está em produção.** Backend `4781b4f` → `venafit-backend-00060-ksz`, frontend `90284b0` → `venafit-frontend-00092-46d`, ambos com 100% do tráfego, deployados automaticamente pelos triggers no push de hoje. Nenhuma ação manual era necessária — e o `gcloud builds submit` que o classificador barrou teria só disparado um build redundante. Os três casos: 1. **tzdata** — corrigido e no ar. É a única das três correções que muda algo que já estava quebrado hoje. 2. **Buraco do D-04** — fechado nas duas pontas (backend aceita `client_completed_at`, `WorkoutLog…
**Arquivos:** CHANGELOG_FRONTEND.md

## 2026-09-04 23:19 — River (via Claude Code)
**Resumo:** Enquanto isso levanto o cenário: essa é uma decisão de produto (que mecanismos de validação usar nos desafios), não uma implementação — vou esperar o resultado da investigação antes de sugerir algo concreto, para não propor algo que já existe ou que não se encaixa no que já foi construído (upload R2, moderação, IA de imagem etc.). Assim que o agente retornar, te dou uma análise curta com as opções de mecanismo simbólico de validação e a recomendação, sem implementar nada ainda.
**Arquivos:** db.ts, workoutLogService.ts

## 2026-09-04 23:21 — River (via Claude Code)
**Resumo:** Investiguei o código antes de responder, porque o nome "desafios" no Venafit não é o que parece. ## O que existe hoje `Challenge` (`internal/domain/training/challenge.go`) é um **funil de captação de leads**, não um desafio de treino gamificado: o personal cria um desafio público (nome, rotina/`TemplateID`, datas, limite de vagas), divulga um link (`/desafio/[token]`), e quem entra é um `ChallengeParticipant` (nome/e-mail/telefone) — sem conta, sem perfil de aluno. A única transição de estado hoje é manual: o personal marca `Converted` quando o lead vira aluno pagante. **Não há hoje nenhum vín…
**Arquivos:** session.ts, syncQueue.ts

## 2026-09-04 23:38 — River (via Claude Code)
**Resumo:** Fechado nas 5 opções. Desenho rápido de como isso encaixaria no `Challenge` existente, com as decisões que fiz por padrão — me avisa se quiser mudar alguma: ## Modelo **`ChallengeDayPrompt`** (novo, 1 por dia do desafio) — `ChallengeID`, `DayIndex` (1, 2, 3... relativo ao `StartDate`, não data calendário — desafios de personals diferentes começam em dias diferentes), `Type` (`pose` | `code` | `pose_code` | `gesture` | `video`), `Content` (texto da instrução: descrição da pose/gesto, a palavra-código, ou o link do vídeo-referência), `CreatedAt`. - Personal escolhe o tipo **dia a dia**, não um t…
**Arquivos:** WorkoutLogger.tsx, db.test.ts, package-lock.json, package.json, syncQueue.test.ts

## 2026-09-10 20:38 — River (via Claude Code)
**Resumo:** A causa da reprovação não estava no código. A página da política sempre foi pública e responde 200 sem sessão. O que o Google fotografou foi a raiz do site, que é a tela de login. Isso significa que a URL declarada no Play Console aponta para `https://venafit.codriverslabs.com` em vez da página da política. O rodapé visível na captura, com "Central de Ajuda · Política de Privacidade", é o rodapé global e confirma que a tela é a home. **A correção principal é sua, no Play Console.** Troque a URL da política de privacidade para: ``` https://venafit.codriverslabs.com/politica-privacidade ``` Ela …
**Arquivos:** next.config.ts, page.test.tsx, page.tsx
**Commits:** Reescreve a fila offline para o endpoint de sessão idempotente (Sprint 3) | Registra o próprio treino via /me/planning em vez de /students/:id (pendência -16) | Permite ajustar o número de séries ao registrar treino importado de PDF | Adiciona check-in com foto de treino e janela de registro do personal (Sprint 4) | Adiciona toggle de exercício não-substituível no editor e bloqueio no modal (Sprint 5) | Adiciona manual de check-in offline, janela de registro e exercício não-substituível na Central de Ajuda | Adiciona Desafio entre Alunos: ranking por streak com foto de check-in

## 2026-09-10 21:58 — River (via Claude Code)
**Resumo:** A política nova está em produção e verificada. Testei como o revisor faria, sem sessão e sem cookies. | Verificação | Resultado | |---|---| | Política, acesso direto | 200, sem redirecionamento | | Placeholders "a preencher" | 0 | | Aliases de URL | 4 de 4 redirecionando | Os nove operadores estão listados e o controlador aparece com o contato de privacidade. Sobre o aviso de símbolos, ele não bloqueia a revisão. Você segue com a versão 11 como está. Adicionei `debugSymbolLevel` ao build de release e commitei, então ele vale a partir do próximo versionCode que você gerar. A causa é que dependê…
**Commits:** Reescreve a política de privacidade sem placeholders de rascunho | Redireciona variações de URL da política para a rota canônica

## 2026-09-10 23:33 — River (via Claude Code)
**Resumo:** Diagnóstico fechado com evidência de produção. Eram três bugs independentes, não um. **1. O mural ficou vazio porque as flags do check-in nunca foram ligadas no Cloud Run.** As variáveis `ADHERENCE_CHECKIN_ENABLED` e `ADHERENCE_PHOTO_ENABLED` não existiam no serviço, e ambas têm default `false`. O log de ontem às 02:14 mostra a sequência exata: ``` 02:14:39 POST .../workout-log/session 404 02:14:39 POST .../workout-log 201 02:14:48 PATCH .../workout-log/.../complete 200 ``` A rota nova não existia, a fila offline reescreveu a mutação para o caminho antigo, e o caminho antigo não carrega check-…
**Commits:** Registra os gatilhos da fila de fotos de check-in

## 2026-09-10 23:40 — River (via Claude Code)
**Resumo:** Deploys concluídos e verificados. A revisão nova do backend é a `00065-6d8`, as duas flags sobreviveram ao redeploy, e a rota de sessão segue respondendo 401 em vez de 404. **Está pronto para testar ao vivo.** Peça para ela registrar um treino novo com foto. O treino anterior não conta, porque foi gravado sem check-in, e a foto antiga ficou marcada como falha no navegador dela. Sobre o plano do desafio multi-personal, o agente terminou e gravou 994 linhas em [PLANO_DESAFIO_MULTI_PERSONAL.md](Todo/PLANO_DESAFIO_MULTI_PERSONAL.md), em 15 seções e 7 fases. Os pontos que valem sua decisão antes de…
**Arquivos:** CHANGELOG_FRONTEND.md, assetlinks.json

## 2026-09-10 23:53 — River (via Claude Code)
**Resumo:** Deploy confirmado e verificado pela própria API do Google. As duas declarações estão ativas em `digitalassetlinks.googleapis.com`, com o pacote certo e sem erro. O que foi entregue nesta sessão: - **`assetlinks.json` preenchido e publicado.** Commit `4f7a34b` no `personalfit`, com as duas impressões digitais SHA-256, a da chave de assinatura do app e a da chave de upload. - **Trava no Gradle para o `RELEASE_API_BASE_URL`.** O build de release agora falha na hora se a propriedade faltar ou não for https. A linha também foi gravada no `local.properties`, que fica fora do Git. - **Arquivo de pend…
**Commits:** Preenche o assetlinks.json com as impressoes digitais reais

## 2026-09-11 01:56 — River (via Claude Code)
**Resumo:** Implementação concluída e validada. Estou aguardando a revisão de convenções antes de commitar. **O que já está pronto e verde.** Backend compila, `go vet` limpo e todos os testes passam. Frontend com verificação de tipos limpa, 121 testes passando e build de produção verde. As 14 rotas novas do cliente batem exatamente com as registradas no servidor. **Sobre a transferência de titularidade que você pediu.** Implementei em duas etapas, oferta e aceite, em vez de imediata. Virar organizador é receber poder de encerrar e excluir um desafio que envolve alunos de terceiros, e é herdar a cascata de…
**Arquivos:** PersonalInviteModal.tsx, StudentChallengeConsentModal.module.css, StudentChallengeConsentModal.tsx, StudentChallengeGoalProgress.module.css, StudentChallengeGoalProgress.tsx, StudentChallengeTab.tsx, StudentChallengeTeamLeaderboard.module.css, StudentChallengeTeamLeaderboard.tsx, desafios.module.css, glossaryContent.ts, page.tsx, studentChallengeService.ts

## 2026-09-11 08:26 — River (via Claude Code)
**Resumo:** Plano escrito em [Todo/PLANO_UX_CARDS_MODAL_PRESCRICAO.md](Todo/PLANO_UX_CARDS_MODAL_PRESCRICAO.md), com um item novo no topo de [Todo/TAREFAS_PENDENTES.md](Todo/TAREFAS_PENDENTES.md). Nada de código foi alterado. Antes de planejar, medi a causa no código. São três problemas separados, e vale tratar como três: - **O editor de mesociclo é um formulário único.** [MesocycleFormModal.tsx](personalfit/src/app/personal/_shared/periodizacao/components/MesocycleFormModal.tsx) empilha os 4 campos da fase, o `TrainingsEditor` inteiro e os cards de semana dentro de um só scroll. - **O card de exercício é…
**Commits:** Adiciona interface do Desafio entre Alunos multi-personal

## 2026-09-11 16:10 — River (via Claude Code)
**Resumo:** Commitado e pushado nos dois repositórios. As duas árvores estão limpas. | Repositório | Commits | Destino | |---|---|---| | Personal-fit-Back | 1 | `main` | | personalfit | 3 | `master` | No backend, um commit só, porque é uma mudança coerente: os endpoints de salvamento por card, o round-trip do identificador do treino e a extração que tirou o bloco de oitenta linhas duplicado em três lugares. No frontend separei em três, para o histórico ficar legível: a promoção da linha de navegação a componente compartilhado, os três bugs do fluxo do aluno, e o registro de treino por blocos. **Atenção a …
**Commits:**  telas individuais com cards | Promove NavRow a componente compartilhado | Corrige tres bugs do fluxo do aluno | Registra treino por blocos, um exercicio por card

## 2026-09-11 18:35 — River (via Claude Code)
**Resumo:** O plano está em [PLANO_ANTIFRAUDE_DESAFIO.md](Todo/PLANO_ANTIFRAUDE_DESAFIO.md), com 604 linhas e 14 seções, mais o item -24 em [TAREFAS_PENDENTES.md](Todo/TAREFAS_PENDENTES.md). Nada foi implementado. **Sua ideia da Pose do Dia entrou inteira, com um acréscimo importante.** A pose sozinha passa de aluno para aluno por WhatsApp em dois segundos. Por isso, junto da pose, o servidor devolve um código de 4 caracteres derivado do identificador daquele aluno. A pose é uma só para o desafio inteiro, então o personal confere tudo de uma vez, mas a foto de um aluno não serve para o outro. O sorteio é …
**Commits:** Documenta na Central de Ajuda os topicos que faltavam | Adiciona balao de ajuda em cada item do menu principal

## 2026-09-11 22:15 — River (via Claude Code)
**Resumo:** Está no ar. **Quatro commits, dois em cada repositório.** No backend, o domínio primeiro e a camada de aplicação depois, nessa ordem para que cada um compile sozinho. No frontend, o cliente de API e depois as telas. Os dois pushes dispararam o Cloud Build automático e as duas builds passaram. **A variável está ligada.** O serviço de backend roda em southamerica-east1 e ganhou uma revisão nova com a flag ao lado das duas que já existiam. O passo do Cloud Build passa apenas a imagem no deploy, então essa variável sobrevive aos próximos pushes sem precisar ser reposta. Confirmei em produção que a…
**Commits:** Adiciona o cliente de antifraude, premio e conteudo do desafio | Adiciona as telas de conferencia, premio, conteudo e grupo do desafio

## 2026-09-11 22:35 — River (via Claude Code)
**Resumo:** Não, não estava feita. E ao ir conferir, achei que o pouco de admin que existia estava quebrado. Fiz as duas coisas agora, e já estão no ar. **O defeito.** Eu tinha registrado as rotas de baralho no grupo de personal, que usa uma checagem de papel por igualdade e devolve acesso negado para administrador. O ramo que cria o baralho da plataforma, dentro do handler, era código morto: nenhum administrador conseguia chegar nele. O teste de registro de rotas passava, porque ele confere que a rota existe na árvore, não quem consegue atravessar o middleware. Agora o catálogo vive em um grupo próprio q…
**Commits:** Adiciona a tela de montagem do baralho de poses no admin

## 2026-09-12 02:55 — River (via Claude Code)
**Resumo:** A página pública de exclusão está pronta nos dois repos, com builds e testes verdes. Nada foi commitado. **O que foi criado** - [excluir-conta/page.tsx](personalfit/src/app/excluir-conta/page.tsx): página estática, sem login e sem guard, com os dois caminhos que o Google exige. Identifica app e desenvolvedor, ensina a excluir dentro do app e oferece um formulário para quem não consegue mais entrar. - [confirmar/[token]/page.tsx](personalfit/src/app/excluir-conta/confirmar/[token]/page.tsx): confirma o link recebido por e-mail. A exclusão dispara só no clique, nunca ao abrir a URL, porque pré-v…
**Arquivos:** excluir-conta, index.tsx, next.config.ts, page.tsx
**Commits:** Registra no changelog a tela de baralho de poses do admin | Permite manter varios baralhos de poses e editar os existentes | Completa o aviso de foto de check-in descartada | Corrige links externos mortos dentro do app Android (WebView sem onCreateWindow)

## 2026-09-12 03:17 — River (via Claude Code)
**Resumo:** A modalidade está implementada nos dois repos, com build, vet, testes, typecheck e lint limpos. Nada foi commitado. **Como ela funciona.** O valor novo é `individual_multi`, rotulado "Individual entre carteiras (multi-personal)". Os alunos de todos os personais convidados entram num ranking único, ordenado pelos mesmos critérios de sempre: streak recorde, streak atual, total de dias, consentimento. Não há quadro de equipes e não há correção pelo tamanho da carteira. O personal de cada aluno continua viajando na linha do mural como etiqueta ao lado do nome, só que sem pontuar. **Uma descoberta …
**Arquivos:** StudentChallengeTab.tsx, glossaryContent.ts, page.tsx, studentChallengeService.ts
**Commits:** Cria a pagina publica de exclusao de conta e dados

## 2026-09-12 03:23 — River (via Claude Code)
**Resumo:** Commitado e pushado nos dois repos. | Repo | Branch | Commit | |---|---|---| | Personal-fit-Back | main | 7cfaa0c | | personalfit | master | e028958 | Os changelogs gerados pelo hook entraram junto, como nos commits anteriores. O push dispara o Cloud Build automaticamente, então a modalidade deve aparecer em produção assim que o build terminar. Ainda não testei ao vivo. O que vale conferir quando subir: criar um desafio na modalidade nova exige plano PRO, e com um personal só o card mostra o aviso para convidar um colega.
**Commits:** Oferece a modalidade individual entre carteiras no Desafio

## 2026-09-12 03:28 — River (via Claude Code)
**Resumo:** É exatamente isso que a modalidade nova faz. A competição é individual, aluno contra aluno. O que acontece nela, concretamente: - **Um ranking só.** Todos os alunos de todos os personais entram na mesma lista, ordenados pelos critérios de sempre: streak recorde, streak atual, total de dias, consentimento como desempate final. - **A carteira não pontua.** Não existe placar de equipe, nem soma por personal, nem correção pelo tamanho da carteira. O nome do personal aparece só como etiqueta ao lado do aluno, para você saber de quem ele é. - **O prêmio é individual.** As primeiras colocações do ran…
**Arquivos:** CHANGELOG_FRONTEND.md
