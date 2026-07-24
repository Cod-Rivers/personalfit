'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { microcycleHelpTopics } from '@/libs/microcycleHelpContent';

type Audience = 'student' | 'personal';

interface HelpSection {
    id: string;
    title: string;
    /** Marca tópicos que dependem do plano PRO do personal. */
    pro?: boolean;
    body: React.ReactNode;
}

/* ────────────────────────────────────────────────────────────────────────
 * Central do Aluno (conteúdo já existente)
 * ──────────────────────────────────────────────────────────────────────── */
const studentSections: HelpSection[] = [
    {
        id: 'meus-treinos',
        title: 'Meus Treinos',
        body: (
            <>
                <p className="mb-2">
                    Mostra a lista de exercícios do treino do dia, organizados
                    pelo seu personal (ou pelo plano que você escolheu).
                    Toque em um exercício para ver detalhes, séries, repetições
                    e um vídeo de execução.
                </p>
                <p className="mb-0">
                    No topo da tela fica o{' '}
                    <Link href="#autorregulacao">
                        Controle do Microciclo
                    </Link>
                    , que ajusta a carga do treino de acordo com sua
                    recuperação.
                </p>
            </>
        ),
    },
    {
        id: 'registro-de-treino',
        title: 'Registrar um treino',
        body: (
            <>
                <p className="mb-2">
                    Ao abrir um exercício, você pode registrar o resultado de
                    cada série: repetições, carga (kg) e RPE (esforço
                    percebido, de 1 a 10). No final, escolha{' '}
                    <strong>Completar Treino</strong> para salvar tudo, ou{' '}
                    <strong>Pular Treino</strong> caso não tenha treinado,
                    informando o motivo.
                </p>
                <p className="mb-0">
                    O RPE que você registra aqui alimenta o campo{' '}
                    <Link href="#rpe-previo">RPE prévio</Link> do próximo
                    Controle de Microciclo.
                </p>
            </>
        ),
    },
    {
        id: 'offline',
        title: 'Treinar offline',
        body: (
            <>
                <p className="mb-2">
                    Toque em <strong>Baixar para offline</strong> para salvar
                    seu plano de treino atual e os vídeos dos exercícios no
                    aparelho. Assim você consegue treinar mesmo sem internet.
                </p>
                <p className="mb-0">
                    Enquanto estiver offline, os treinos completados ficam
                    guardados no aparelho e são enviados automaticamente assim
                    que a internet voltar. Um selo mostra quantos treinos
                    ainda estão pendentes de sincronizar.
                </p>
            </>
        ),
    },
    {
        id: 'agendamentos',
        title: 'Agendamentos',
        body: (
            <p className="mb-0">
                Em <strong>Meus Agendamentos</strong> você visualiza suas
                sessões marcadas com o personal (presencial, online ou
                consultoria), solicita novos horários, confirma presença ou
                cancela — cancelamentos feitos com antecedência mínima não
                descontam a sessão do seu plano.
            </p>
        ),
    },
    {
        id: 'anamnese',
        title: 'Anamnese',
        body: (
            <p className="mb-0">
                É o questionário inicial de saúde e dores (tornozelo, lombar,
                joelho, quadril, ombro etc.) usado para entender suas
                limitações antes de montar seus treinos. Se você já está
                vinculado a um personal, essa etapa costuma ser dispensada,
                pois ele monta o plano diretamente com você.
            </p>
        ),
    },
    {
        id: 'escolher-plano',
        title: 'Escolher um plano pronto',
        body: (
            <p className="mb-0">
                Em <strong>Planos estilo famosos</strong> você pode comprar um
                modelo de treino pronto e aplicá-lo como seu plano ativo — o
                plano em andamento é marcado como concluído e o novo entra no
                lugar. Cada plano é uma compra avulsa e pode ser baixado para
                treinar offline.
            </p>
        ),
    },
    {
        id: 'notificacoes',
        title: 'Notificações',
        body: (
            <p className="mb-0">
                O sino no topo da tela mostra avisos do seu personal ou do
                app (por exemplo, mudanças de treino ou agenda). Toque em uma
                notificação para marcá-la como lida.
            </p>
        ),
    },
    {
        id: 'conta',
        title: 'Minha Conta e privacidade',
        body: (
            <>
                <p className="mb-2">
                    Em <strong>Minha Conta</strong> você atualiza nome,
                    e-mail e telefone. Também pode baixar uma cópia de todos
                    os seus dados (perfil, anamnese, histórico de treinos e
                    assinatura) ou solicitar a exclusão/anonimização
                    permanente da conta.
                </p>
                <p className="mb-0">
                    Detalhes completos de como tratamos seus dados estão na{' '}
                    <Link href="/politica-privacidade">
                        Política de Privacidade
                    </Link>
                    .
                </p>
            </>
        ),
    },
    {
        id: 'tema',
        title: 'Tema claro/escuro',
        body: (
            <p className="mb-0">
                O botão 🌙 / ☀️ no menu superior alterna entre tema claro e
                escuro. A escolha fica salva no aparelho e é aplicada
                automaticamente nas próximas vezes que você abrir o app.
            </p>
        ),
    },
];

/* ────────────────────────────────────────────────────────────────────────
 * Central do Personal (nova)
 * ──────────────────────────────────────────────────────────────────────── */
const personalSections: HelpSection[] = [
    {
        id: 'painel-personal',
        title: 'Área do Personal',
        body: (
            <>
                <p className="mb-2">
                    É o seu painel de trabalho. No topo aparecem os números de{' '}
                    <strong>Total de Alunos</strong> e <strong>Ativos</strong>,
                    e logo abaixo as abas com tudo que você gerencia:{' '}
                    <Link href="#convidar-alunos">Meus Alunos</Link>,{' '}
                    <Link href="#exercicios">Meus Exercícios</Link>,{' '}
                    <Link href="#personalizacao">Personalização</Link>,{' '}
                    <Link href="#anuncios">Meus Anúncios</Link>,{' '}
                    <Link href="#agenda">Agenda</Link>,{' '}
                    <Link href="#periodizacao-biblioteca">
                        Minha Periodização / Treinos
                    </Link>{' '}
                    e a{' '}
                    <Link href="#biblioteca-publica">Biblioteca Pública</Link>.
                </p>
                <p className="mb-0">
                    Quer ver como o app aparece para quem você treina? Use{' '}
                    <strong>Ver como Aluno</strong> no menu superior — e volte
                    ao painel pelo mesmo botão.
                </p>
            </>
        ),
    },
    {
        id: 'convidar-alunos',
        title: 'Convidar e gerenciar alunos',
        body: (
            <>
                <p className="mb-2">
                    Na aba <strong>Meus Alunos</strong>, toque em{' '}
                    <strong>+ Convidar Aluno</strong> para gerar um link de
                    convite. Envie o link ao aluno: ao se cadastrar por ele,
                    ele já entra vinculado a você.
                </p>
                <p className="mb-2">
                    Cada aluno mostra um selo de situação:{' '}
                    <strong>Ativo</strong>,{' '}
                    <strong>Aguardando confirmação</strong> (o aluno ainda
                    precisa aceitar a reativação) ou <strong>Inativo</strong>.
                    Nos cartões você acessa{' '}
                    <strong>👁️ Ver Treino</strong>, que leva direto para o
                    treino ativo do aluno (com todo o CRUD de mesociclos e
                    treinos), a{' '}
                    <Link href="#periodizacao-aluno">Periodização</Link>, o{' '}
                    <Link href="#plano-alimentar-personal">
                        Plano Alimentar
                    </Link>{' '}
                    e a{' '}
                    <Link href="#evolucao-personal">Evolução</Link> do aluno,
                    além de <strong>Editar</strong>, <strong>Ativar</strong>/
                    <strong>Desativar</strong> e <strong>Desvincular</strong>.
                </p>
                <p className="mb-0">
                    Desvincular não apaga a conta do aluno — remove só o
                    vínculo com você. Sem um personal, ele passa a poder gerar
                    o próprio treino pela anamnese automática. No plano
                    gratuito você mantém <strong>até 3 alunos</strong>; com o{' '}
                    <Link href="#plano-pro">PRO</Link> os alunos são
                    ilimitados.
                </p>
            </>
        ),
    },
    {
        id: 'exercicios',
        title: 'Meus Exercícios',
        body: (
            <>
                <p className="mb-2">
                    Complemente o catálogo do sistema com exercícios seus. Em{' '}
                    <strong>+ Novo Exercício</strong> defina nome, grupo
                    muscular, categoria, uma descrição e o vídeo de execução.
                    Use a busca e o filtro por grupo muscular para achá-los
                    depois.
                </p>
                <p className="mb-0">
                    No plano gratuito você aponta o vídeo por{' '}
                    <strong>URL</strong> (por exemplo, um link do YouTube). Com
                    o <Link href="#plano-pro">PRO</Link>, você também pode{' '}
                    <strong>subir o arquivo de vídeo</strong> direto do
                    aparelho, com a sua própria mídia.
                </p>
            </>
        ),
    },
    {
        id: 'periodizacao-biblioteca',
        title: 'Minha Periodização / Treinos',
        body: (
            <>
                <p className="mb-2">
                    Aqui ficam seus <strong>ciclos reutilizáveis</strong> —
                    monte uma vez e aplique em vários alunos. Em{' '}
                    <strong>+ Novo Ciclo</strong> você cria o macrociclo;
                    depois use <strong>🛠 Configurar treinos</strong> para
                    montar mesociclos, microciclos e os exercícios de cada
                    treino.
                </p>
                <p className="mb-2">
                    Para cada ciclo você pode <strong>📋 Aplicar</strong> a um
                    aluno, <strong>✏️ Editar</strong> os dados (nome, objetivo,
                    visibilidade), <strong>🧬 Duplicar</strong> ou{' '}
                    <strong>🗑 Remover</strong>. O selo de usos mostra quantas
                    vezes o ciclo já foi aplicado, e você pode ordenar por{' '}
                    <strong>mais usados</strong>.
                </p>
                <p className="mb-0">
                    Sobre a <strong>visibilidade</strong>: no plano gratuito,
                    seus ciclos ficam disponíveis para revisão da equipe
                    Venafit e podem entrar na{' '}
                    <Link href="#biblioteca-publica">Biblioteca Pública</Link>{' '}
                    (o selo mostra se estão Pendentes, Aprovados ou
                    Rejeitados). Com o <Link href="#plano-pro">PRO</Link> você
                    pode manter os ciclos <strong>privados</strong>, só seus.
                </p>
            </>
        ),
    },
    {
        id: 'biblioteca-publica',
        title: 'Biblioteca Pública',
        body: (
            <p className="mb-0">
                Reúne ciclos que outros personals escolheram compartilhar e que
                foram aprovados pela equipe Venafit. Você pode buscar por nome
                ou objetivo e <strong>📋 Aplicar</strong> um deles direto a um
                aluno seu — um bom atalho para começar rápido e depois ajustar.
            </p>
        ),
    },
    {
        id: 'periodizacao-aluno',
        title: 'Periodização do aluno',
        body: (
            <>
                <p className="mb-2">
                    O botão <strong>👁️ Ver Treino</strong> no cartão do aluno é
                    um atalho: ele pula direto para o macrociclo ativo do
                    aluno (ou o mais recente, se nenhum estiver ativo) já na
                    tela de edição de mesociclos e treinos. Se o aluno ainda
                    não tiver nenhum macrociclo, você cai na lista abaixo para
                    criar o primeiro.
                </p>
                <p className="mb-2">
                    Pelo cartão do aluno em <strong>📋 Periodização</strong>{' '}
                    você vê os macrociclos dele. Crie um do zero em{' '}
                    <strong>+ Novo Macrociclo</strong> ou parta de um modelo em{' '}
                    <strong>📂 De Modelo</strong>. Cada macrociclo tem
                    objetivo, datas e status (<strong>Rascunho</strong>,{' '}
                    <strong>Ativo</strong> ou <strong>Concluído</strong>).
                </p>
                <p className="mb-0">
                    Ao abrir um macrociclo você organiza mesociclos,
                    microciclos e os treinos. Um bom macrociclo pode virar
                    modelo reutilizável com <strong>📋 Modelo</strong> — ele
                    passa a aparecer na sua{' '}
                    <Link href="#periodizacao-biblioteca">
                        Minha Periodização / Treinos
                    </Link>
                    .
                </p>
                <p className="mb-0">
                    Para tirar o máximo das semanas, veja o manual de{' '}
                    <Link href="#autorregulacao-rpe-rir">
                        Periodização + Autorregulação por RPE/RIR
                    </Link>{' '}
                    — como definir RPE alvo, ajustar carga e programar deloads.
                </p>
            </>
        ),
    },
    {
        id: 'autorregulacao-rpe-rir',
        title: 'Periodização + Autorregulação por RPE/RIR',
        body: (
            <>
                <p className="mb-3">
                    Este é o recurso avançado que diferencia o Venafit: unir a{' '}
                    <strong>periodização estruturada</strong> (macro → meso →
                    microciclos) com a{' '}
                    <strong>autorregulação por esforço percebido</strong>. Em
                    vez de uma planilha fixa, a carga do aluno se ajusta ao
                    estado real de recuperação dele, dia a dia — sem que você
                    precise refazer o plano toda semana. Este manual mostra
                    como usar tudo isso na prática.
                </p>

                <h3 className="h6 mt-3 mb-2">1. RPE e RIR: a mesma escala</h3>
                <p className="mb-2">
                    O <strong>RPE</strong> (Rate of Perceived Exertion, ou
                    Esforço Percebido) mede o quão puxada foi uma série, de 1 a
                    10. O <strong>RIR</strong> (Reps in Reserve, ou Repetições
                    em Reserva) é a leitura inversa: quantas repetições ainda
                    dariam para fazer antes de falhar. São a mesma régua — basta
                    converter:
                </p>
                <div className="table-responsive mb-2">
                    <table className="table table-sm table-bordered align-middle mb-1">
                        <thead>
                            <tr>
                                <th>RPE</th>
                                <th>RIR</th>
                                <th>O que significa na série</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>10</td>
                                <td>0</td>
                                <td>Falha total — nenhuma rep sobrando</td>
                            </tr>
                            <tr>
                                <td>9</td>
                                <td>1</td>
                                <td>Sobrou 1 repetição</td>
                            </tr>
                            <tr>
                                <td>8</td>
                                <td>2</td>
                                <td>Sobraram 2 repetições (zona de hipertrofia)</td>
                            </tr>
                            <tr>
                                <td>7</td>
                                <td>3</td>
                                <td>Sobraram 3 (técnica/volume seguro)</td>
                            </tr>
                            <tr>
                                <td>5–6</td>
                                <td>4–5</td>
                                <td>Trabalho leve, deload ou aquecimento</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <p className="mb-3 small text-muted">
                    Regra rápida: <strong>RIR = 10 − RPE</strong>. Explique isso
                    ao aluno uma vez — ele registra o RPE ao completar cada
                    série no app, e esse valor alimenta a autorregulação.
                </p>

                <h3 className="h6 mt-3 mb-2">
                    2. A estrutura da periodização
                </h3>
                <p className="mb-2">
                    Na{' '}
                    <Link href="#periodizacao-aluno">Periodização do aluno</Link>{' '}
                    (ou nos seus{' '}
                    <Link href="#periodizacao-biblioteca">
                        ciclos reutilizáveis
                    </Link>
                    ), o plano é montado em três níveis:
                </p>
                <ul className="mb-2 ps-3">
                    <li>
                        <strong>Macrociclo</strong> — o plano inteiro
                        (objetivo, datas, status Rascunho/Ativo/Concluído).
                    </li>
                    <li>
                        <strong>Mesociclos (Fases)</strong> — blocos de 3 a 6
                        semanas, cada um com uma <strong>fase</strong> e uma{' '}
                        <strong>metodologia</strong> (veja abaixo).
                    </li>
                    <li>
                        <strong>Microciclos</strong> — cada semana da fase. É
                        aqui que a autorregulação vive: RPE alvo, ajustes de
                        volume/intensidade e deload são definidos por semana.
                    </li>
                    <li>
                        <strong>Treinos A/B/C/D</strong> — os treinos de cada
                        semana, com os exercícios, séries e repetições.
                    </li>
                </ul>
                <p className="mb-2">
                    Ao criar um mesociclo você escolhe a <strong>Fase</strong>{' '}
                    por dois modelos clássicos:
                </p>
                <ul className="mb-2 ps-3">
                    <li>
                        <strong>Clássica (Matveyev):</strong> Introdução, Base,
                        Preparação e Controle, Pré-competição, Competição.
                    </li>
                    <li>
                        <strong>Força / Bloco (Bompa/Fleck):</strong>{' '}
                        Acumulação, Transmutação, Realização, Hipertrofia,
                        Força, Potência, Manutenção, Deload.
                    </li>
                </ul>
                <p className="mb-3">
                    E a <strong>Metodologia</strong> de progressão: Linear,
                    Ondulada Diária (DUP), Ondulada Semanal, Conjugada, Bloco ou
                    Outra. Duração recomendada: <strong>3–6 semanas por
                    fase</strong> (4 é o padrão).
                </p>

                <h3 className="h6 mt-3 mb-2">
                    3. Definindo a autorregulação no microciclo
                </h3>
                <p className="mb-2">
                    Ao configurar os treinos de um mesociclo, cada semana
                    (microciclo) tem estes campos — é o coração do recurso:
                </p>
                <ul className="mb-2 ps-3">
                    <li>
                        <strong>RPE alvo (1–10):</strong> o esforço que você
                        espera daquela semana. Ex.: semana de acúmulo → RPE 7
                        (RIR 3); semana de choque/pico → RPE 9 (RIR 1).
                    </li>
                    <li>
                        <strong>Ajuste de volume %:</strong> aumenta ou reduz o
                        volume previsto da semana (ex.: +10% numa semana de
                        acúmulo, −40% num deload).
                    </li>
                    <li>
                        <strong>Ajuste de intensidade %:</strong> mesma ideia
                        para a carga/intensidade.
                    </li>
                    <li>
                        <strong>Deload:</strong> marca a semana como
                        recuperação (tipicamente RPE mais baixo e volume
                        reduzido).
                    </li>
                    <li>
                        <strong>Foco e Notas:</strong> a estratégia da semana em
                        texto livre — o aluno enxerga isso como orientação.
                    </li>
                </ul>
                <p className="mb-3 small text-muted">
                    Dica: o <strong>Status</strong> da semana (Pendente / Em
                    progresso / Concluído) é calculado automaticamente pelos
                    treinos que o aluno registra — você não precisa mexer nele.
                </p>

                <h3 className="h6 mt-3 mb-2">
                    4. Como a carga se autorregula
                </h3>
                <p className="mb-2">
                    Antes de treinar, o aluno preenche o{' '}
                    <strong>Controle do Microciclo</strong> (prontidão, sono,
                    estresse, dor muscular, delta de VFC e o RPE do treino
                    anterior). O app compara esses dados com o{' '}
                    <strong>RPE alvo</strong> que você definiu e classifica o dia
                    em três zonas:
                </p>
                <div className="table-responsive mb-2">
                    <table className="table table-sm table-bordered align-middle mb-1">
                        <thead>
                            <tr>
                                <th>Zona</th>
                                <th>Sinal</th>
                                <th>Ajuste de carga</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>
                                    <strong>Supercompensação</strong>
                                </td>
                                <td>Bem recuperado, RPE abaixo do alvo</td>
                                <td>Progride levemente carga/volume</td>
                            </tr>
                            <tr>
                                <td>
                                    <strong>Manutenção</strong>
                                </td>
                                <td>Dentro do esperado</td>
                                <td>Segue o plano previsto do microciclo</td>
                            </tr>
                            <tr>
                                <td>
                                    <strong>Fadiga</strong>
                                </td>
                                <td>Mal recuperado, RPE acima do alvo</td>
                                <td>Reduz a carga total para recuperar</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <p className="mb-2">Os ajustes acontecem em dois tempos:</p>
                <ul className="mb-3 ps-3">
                    <li>
                        <strong>Intrassessão:</strong> durante o treino (ex.:
                        baixar 5% a 10% da carga se o RPE estourar o alvo).
                    </li>
                    <li>
                        <strong>Intersessão:</strong> para os próximos dias
                        (ex.: cortar ~20% de volume enquanto a fadiga persistir).
                    </li>
                </ul>

                <h3 className="h6 mt-3 mb-2">
                    5. Progressão por RIR ao longo da fase
                </h3>
                <p className="mb-2">
                    Uma forma robusta de periodizar é <strong>reduzir o RIR
                    (subir o RPE) semana a semana</strong> dentro do mesociclo,
                    fechando com um deload. Exemplo de uma fase de hipertrofia de
                    4 semanas:
                </p>
                <div className="table-responsive mb-3">
                    <table className="table table-sm table-bordered align-middle mb-1">
                        <thead>
                            <tr>
                                <th>Semana</th>
                                <th>RPE alvo</th>
                                <th>RIR</th>
                                <th>Estratégia</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>1 — Acúmulo</td>
                                <td>7</td>
                                <td>3</td>
                                <td>Volume alto, longe da falha</td>
                            </tr>
                            <tr>
                                <td>2</td>
                                <td>8</td>
                                <td>2</td>
                                <td>Mesmo volume, um pouco mais perto</td>
                            </tr>
                            <tr>
                                <td>3 — Pico</td>
                                <td>9</td>
                                <td>1</td>
                                <td>Intensidade máxima da fase</td>
                            </tr>
                            <tr>
                                <td>4 — Deload</td>
                                <td>5–6</td>
                                <td>4–5</td>
                                <td>Volume −40%, recuperar</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <h3 className="h6 mt-3 mb-2">6. Gatilho de deload</h3>
                <p className="mb-3">
                    Se a fadiga se mantiver alta por vários dias e o rendimento
                    cair, o sistema pode sugerir um <strong>deload</strong> no
                    próximo microciclo, protegendo a recuperação e evitando
                    estagnação. Você pode antecipá-lo marcando a semana como
                    Deload manualmente.
                </p>

                <h3 className="h6 mt-3 mb-2">Passo a passo resumido</h3>
                <ol className="mb-2 ps-3">
                    <li>
                        Crie o macrociclo do aluno em{' '}
                        <strong>📋 Periodização → + Novo Macrociclo</strong>{' '}
                        (ou parta de um modelo).
                    </li>
                    <li>
                        Adicione mesociclos (fases) com fase, metodologia e
                        duração.
                    </li>
                    <li>
                        Em cada semana, defina <strong>RPE alvo</strong> e os
                        ajustes de volume/intensidade; marque deload quando fizer
                        sentido.
                    </li>
                    <li>
                        Monte os treinos A/B/C/D com os exercícios, séries e
                        repetições.
                    </li>
                    <li>
                        Oriente o aluno a preencher o Controle do Microciclo e
                        registrar o RPE de cada série — a autorregulação faz o
                        resto.
                    </li>
                    <li>
                        Acompanhe pela{' '}
                        <Link href="#evolucao-personal">Evolução</Link> e ajuste
                        os alvos nas próximas fases.
                    </li>
                </ol>
                <p className="mb-0 small text-muted">
                    Bom para lembrar: a autorregulação apoia a sua decisão, não
                    a substitui. Os alvos e ajustes finais são sempre seus.
                    Ciclos bem calibrados podem virar{' '}
                    <Link href="#periodizacao-biblioteca">
                        modelos reutilizáveis
                    </Link>{' '}
                    para aplicar em outros alunos.
                </p>
            </>
        ),
    },
    {
        id: 'plano-alimentar-personal',
        title: 'Plano Alimentar do aluno',
        pro: true,
        body: (
            <p className="mb-0">
                Pelo cartão do aluno em <strong>🍽️ Plano Alimentar</strong>{' '}
                você monta e acompanha as refeições do aluno — inclusive
                anexando um PDF do plano. Este recurso é do{' '}
                <Link href="#plano-pro">plano PRO</Link>: os alunos vinculados a
                um personal PRO passam a enxergar o plano alimentar no app
                deles.
            </p>
        ),
    },
    {
        id: 'evolucao-personal',
        title: 'Evolução do aluno',
        body: (
            <p className="mb-0">
                Pelo cartão do aluno em <strong>📈 Evolução</strong> você
                acompanha medidas e fotos ao longo do tempo, para comparar o
                antes e o depois. O acompanhamento de evolução é gratuito — o
                próprio aluno também registra as medidas dele.
            </p>
        ),
    },
    {
        id: 'agenda',
        title: 'Agenda e presença',
        pro: true,
        body: (
            <>
                <p className="mb-2">
                    Em <strong>📅 Agenda</strong> você marca sessões{' '}
                    <strong>presenciais</strong>, <strong>online</strong>{' '}
                    (com link de reunião) ou de <strong>consultoria</strong>.
                    Filtre por período e, em cada sessão, registre a situação:{' '}
                    <strong>Confirmar</strong>, <strong>✓ Presente</strong>,{' '}
                    <strong>✗ Faltou</strong> ou <strong>Cancelar</strong>.
                </p>
                <p className="mb-0">
                    Você define a <strong>antecedência mínima</strong> para um
                    cancelamento não descontar a sessão do plano do aluno.
                    Cancelamentos feitos dentro desse prazo usam o{' '}
                    <strong>⏮ Antecipado</strong> e não pesam para o aluno.
                    Quando o aluno solicita um horário, a sessão aparece
                    marcada como <strong>(solicitado pelo aluno)</strong>. A
                    Agenda é um recurso do{' '}
                    <Link href="#plano-pro">plano PRO</Link>.
                </p>
            </>
        ),
    },
    {
        id: 'recorrencias',
        title: 'Recorrências e remarcações',
        pro: true,
        body: (
            <>
                <p className="mb-2">
                    Na aba <strong>Recorrências</strong> você cria horários
                    fixos (por exemplo, seg/qua/sex às 8h) com data-limite
                    opcional, em vez de marcar sessão por sessão.
                </p>
                <p className="mb-0">
                    Uma <strong>Exceção</strong> remaneja um dia específico
                    daquela recorrência (novo dia/horário ou cancelamento
                    pontual). Quando o aluno pede uma remarcação, ela chega
                    como <strong>Pendente</strong> e você{' '}
                    <strong>✓ Aceita</strong> ou <strong>✗ Rejeita</strong>.
                </p>
            </>
        ),
    },
    {
        id: 'personalizacao',
        title: 'Personalização (sua marca)',
        pro: true,
        body: (
            <p className="mb-0">
                Na aba <strong>🎨 Personalização</strong> você aplica a sua
                identidade no app dos alunos: <strong>logo</strong>,{' '}
                <strong>cores</strong> primária e secundária e uma{' '}
                <strong>mensagem de boas-vindas</strong>. Há uma
                pré-visualização em tempo real. É um recurso do{' '}
                <Link href="#plano-pro">plano PRO</Link> — no gratuito, os
                alunos veem o visual padrão Venafit.
            </p>
        ),
    },
    {
        id: 'anuncios',
        title: 'Meus Anúncios',
        pro: true,
        body: (
            <p className="mb-0">
                Na aba <strong>📢 Meus Anúncios</strong> você divulga o seu
                trabalho para os seus alunos dentro do app. Disponível no{' '}
                <Link href="#plano-pro">plano PRO</Link> — e, como assinante
                PRO, nem você nem seus alunos veem anúncios de terceiros.
            </p>
        ),
    },
    {
        id: 'plano-pro',
        title: 'Plano PRO — o que desbloqueia',
        body: (
            <>
                <p className="mb-2">
                    O <strong>PRO</strong> é a assinatura do personal trainer.
                    Ele desbloqueia:
                </p>
                <ul className="mb-2 ps-3">
                    <li>
                        <strong>Alunos ilimitados</strong> (o plano gratuito
                        vai até 3).
                    </li>
                    <li>
                        <strong>Sem anúncios</strong> para você e para os seus
                        alunos.
                    </li>
                    <li>
                        <Link href="#personalizacao">Sua marca</Link> (logo,
                        cores e boas-vindas) no app dos alunos.
                    </li>
                    <li>
                        <Link href="#plano-alimentar-personal">
                            Plano alimentar
                        </Link>{' '}
                        para os alunos vinculados a você.
                    </li>
                    <li>
                        Upload de{' '}
                        <Link href="#exercicios">
                            vídeos e mídia própria
                        </Link>{' '}
                        nos seus exercícios.
                    </li>
                    <li>
                        <Link href="#periodizacao-biblioteca">
                            Ciclos de treino privados
                        </Link>{' '}
                        (fora da biblioteca pública).
                    </li>
                    <li>
                        <Link href="#anuncios">Meus Anúncios</Link> para
                        divulgar o seu trabalho.
                    </li>
                    <li>
                        <Link href="#agenda">Agenda e controle de presença</Link>
                        , com recorrências e remarcações.
                    </li>
                </ul>
                <p className="mb-2">
                    Planos: <strong>Mensal</strong>, <strong>Semestral</strong>{' '}
                    e <strong>Anual</strong>. Os valores atualizados aparecem na
                    tela de{' '}
                    <Link href="/pagamento?produto=pro">assinatura</Link>.
                </p>
                <p className="mb-0 text-muted small">
                    Observação: os seus alunos não têm plano PRO. Eles
                    acompanham a evolução gratuitamente e podem comprar planos
                    de treino avulsos (estilo famosos) quando quiserem.
                </p>
            </>
        ),
    },
];

/* ──────────────────────────────────────────────────────────────────────── */

function ProBadge() {
    return (
        <span className="badge bg-warning text-dark ms-2 align-middle">
            PRO
        </span>
    );
}

export default function AjudaClient() {
    const [audience, setAudience] = useState<Audience>('student');

    // Define a central inicial pelo papel salvo, mas qualquer um pode alternar.
    useEffect(() => {
        try {
            const stored = localStorage.getItem('user');
            if (stored) {
                const role = JSON.parse(stored)?.role;
                if (role === 'personal') setAudience('personal');
            }
        } catch {
            /* sem papel salvo — mantém a central do aluno */
        }
    }, []);

    const isPersonal = audience === 'personal';
    const sections = isPersonal ? personalSections : studentSections;

    const tocSections = isPersonal
        ? sections.map((s) => ({ id: s.id, title: s.title, pro: s.pro }))
        : [
              { id: 'autorregulacao', title: 'Controle do Microciclo', pro: false },
              ...sections.map((s) => ({ id: s.id, title: s.title, pro: s.pro })),
          ];

    return (
        <div className="container py-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h1 className="h4 mb-0">Central de Ajuda</h1>
                <Link
                    href={isPersonal ? '/personal' : '/meus-treinos'}
                    className="btn btn-outline-secondary btn-sm"
                >
                    Voltar
                </Link>
            </div>

            {/* Seletor de público */}
            <div
                className="btn-group mb-3"
                role="group"
                aria-label="Escolher central de ajuda"
            >
                <button
                    type="button"
                    className={`btn btn-sm ${
                        !isPersonal ? 'btn-secondary' : 'btn-outline-secondary'
                    }`}
                    aria-pressed={!isPersonal}
                    onClick={() => setAudience('student')}
                >
                    Sou Aluno
                </button>
                <button
                    type="button"
                    className={`btn btn-sm ${
                        isPersonal ? 'btn-secondary' : 'btn-outline-secondary'
                    }`}
                    aria-pressed={isPersonal}
                    onClick={() => setAudience('personal')}
                >
                    Sou Personal
                </button>
            </div>

            <p className="text-muted mb-4">
                {isPersonal
                    ? 'Guia rápido de tudo que você gerencia como personal no Venafit. Toque em um tópico para ir direto até ele.'
                    : 'Aqui você encontra uma explicação rápida de cada funcionalidade do Venafit. Toque em um tópico para ir direto até ele.'}
            </p>

            <nav className="mb-4" aria-label="Índice da Central de Ajuda">
                <div className="d-flex flex-wrap gap-2">
                    {tocSections.map((s) => (
                        <a
                            key={s.id}
                            href={`#${s.id}`}
                            className="btn btn-outline-secondary btn-sm"
                        >
                            {s.title}
                            {s.pro && <ProBadge />}
                        </a>
                    ))}
                </div>
            </nav>

            {/* Central do Aluno tem o bloco especial de autorregulação */}
            {!isPersonal && (
                <section id="autorregulacao" className="card mb-3">
                    <div className="card-body">
                        <h2 className="h6">
                            Controle do Microciclo (Autorregulação)
                        </h2>
                        <p className="mb-2">
                            {
                                microcycleHelpTopics.find(
                                    (t) => t.id === 'autorregulacao',
                                )?.long
                            }
                        </p>
                        <p className="mb-3">
                            Os campos abaixo são preenchidos por você antes de
                            treinar:
                        </p>
                        <div className="row g-3">
                            {microcycleHelpTopics
                                .filter((t) => t.id !== 'autorregulacao')
                                .map((topic) => (
                                    <div
                                        className="col-12 col-md-6"
                                        key={topic.id}
                                        id={topic.id}
                                    >
                                        <div className="h-100 p-3 rounded border">
                                            <h3 className="h6 mb-1">
                                                {topic.label}
                                            </h3>
                                            <p className="small mb-0">
                                                {topic.long}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                        </div>
                        <div className="mt-3">
                            <Link
                                href="/meus-treinos/autorregulacao"
                                className="btn btn-outline-secondary btn-sm"
                            >
                                Ver explicação completa das zonas e do deload
                            </Link>
                        </div>
                    </div>
                </section>
            )}

            {sections.map((section) => (
                <section
                    id={section.id}
                    key={section.id}
                    className="card mb-3"
                >
                    <div className="card-body">
                        <h2 className="h6">
                            {section.title}
                            {section.pro && <ProBadge />}
                        </h2>
                        {section.body}
                    </div>
                </section>
            ))}

            <div className="text-muted small mt-4">
                {isPersonal
                    ? 'Não encontrou o que precisava? Fale com o suporte pelo app.'
                    : 'Não encontrou o que precisava? Fale com seu personal trainer pelo app ou entre em contato pelo suporte.'}
            </div>
        </div>
    );
}
