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
