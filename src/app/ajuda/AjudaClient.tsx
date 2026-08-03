'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FiBookOpen } from 'react-icons/fi';
import { microcycleHelpTopics } from '@/libs/microcycleHelpContent';
import { getSortedGlossaryTerms } from '@/libs/glossaryContent';
import GlossaryLink from '@/components/atoms/GlossaryLink';

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
                    cada série: repetições, carga (kg) e{' '}
                    <GlossaryLink id="rpe">RPE</GlossaryLink> (esforço
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
            <>
                <p className="mb-2">
                    Em <strong>Meus Agendamentos</strong> você visualiza suas
                    sessões marcadas com o personal (presencial, online ou
                    consultoria), solicita novos horários, confirma presença ou
                    cancela — cancelamentos feitos com antecedência mínima não
                    descontam a sessão do seu plano.
                </p>
                <p className="mb-0">
                    Se o seu personal configurou uma{' '}
                    <GlossaryLink id="janela-de-disponibilidade">
                        grade de horários
                    </GlossaryLink>
                    , ao solicitar você escolhe a data num calendário e depois
                    um horário entre os que aparecem. Horários riscados já
                    estão reservados por outra pessoa (ou fora do prazo/regra
                    do personal) — passe o dedo ou o mouse sobre eles para ver
                    o motivo. Se o seu personal ainda não configurou uma
                    grade, você digita a data e hora livremente, como antes.
                </p>
            </>
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
            <>
                <p className="mb-2">
                    O sino no topo da tela mostra avisos do seu personal ou do
                    app (por exemplo, mudanças de treino ou agenda). Toque em
                    uma notificação para marcá-la como lida.
                </p>
                <p className="mb-0">
                    Se você permitir quando o app pedir, esses avisos também
                    chegam como <strong>notificação push</strong> no
                    navegador ou celular, mesmo com o Venafit fechado.
                </p>
            </>
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
                O botão de tema (lua/sol) no menu superior alterna entre tema claro e
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
                    <Link href="#retencao">Retenção</Link>,{' '}
                    <Link href="#exercicios">Meus Exercícios</Link>,{' '}
                    <Link href="#personalizacao">Personalização</Link>,{' '}
                    <Link href="#autorregulacao-config">Autorregulação</Link>,{' '}
                    <Link href="#periodizacao-biblioteca">
                        Minha Periodização / Treinos
                    </Link>{' '}
                    e a{' '}
                    <Link href="#biblioteca-publica">Biblioteca Pública</Link>.
                    Assinantes <Link href="#plano-pro">PRO</Link> têm ainda a
                    aba <Link href="#anuncios">Meus Anúncios</Link>.
                </p>
                <p className="mb-2">
                    <Link href="#agenda">Agenda</Link> e{' '}
                    <Link href="#desafios">Desafios</Link> ficam como botões de
                    acesso rápido no topo do painel (não abas).
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
                    <strong>Ver Treino</strong>, que leva direto para o
                    treino ativo do aluno (com todo o CRUD de mesociclos e
                    treinos), além de{' '}
                    <Link href="#periodizacao-aluno">Periodização</Link>,{' '}
                    <Link href="#plano-alimentar-personal">
                        Plano Alimentar
                    </Link>
                    , <Link href="#evolucao-personal">Evolução</Link>,{' '}
                    <Link href="#financeiro-personal">Financeiro</Link> e{' '}
                    <Link href="#feedback-personal">Feedback</Link> do
                    aluno.
                </p>
                <p className="mb-0">
                    <strong>Editar</strong> fica no rodapé do cartão; as ações{' '}
                    <strong>Ativar</strong>/<strong>Desativar</strong> e{' '}
                    <strong>Desvincular</strong> ficam no menu{' '}
                    <strong>⋯</strong> do cartão. Desvincular não apaga a
                    conta do aluno — remove só o vínculo com você. Sem um
                    personal, ele passa a poder gerar o próprio treino pela
                    anamnese automática. No plano gratuito você mantém{' '}
                    <strong>até 3 alunos</strong>; com o{' '}
                    <Link href="#plano-pro">PRO</Link> os alunos são
                    ilimitados.
                </p>
            </>
        ),
    },
    {
        id: 'retencao',
        title: 'Retenção',
        body: (
            <p className="mb-0">
                Na aba <strong>Retenção</strong> você vê há quantos dias
                cada aluno não registra um treino, para agir antes que ele
                abandone o acompanhamento. Direto da lista você pode{' '}
                <strong>enviar um lembrete</strong> ao aluno.
            </p>
        ),
    },
    {
        id: 'financeiro-personal',
        title: 'Financeiro do aluno',
        body: (
            <p className="mb-0">
                Pelo cartão do aluno em <strong>Financeiro</strong> você
                lança cobranças (mensalidade, pacote de sessões etc.), marca
                como pagas, reabre ou exclui um lançamento — um controle
                simples de cobrança por aluno, sem meio de pagamento
                integrado.
            </p>
        ),
    },
    {
        id: 'feedback-personal',
        title: 'Feedback do aluno',
        body: (
            <p className="mb-0">
                Pelo cartão do aluno em <strong>Feedback</strong> você vê a
                nota que o aluno deu para cada{' '}
                <GlossaryLink id="macrociclo">macrociclo</GlossaryLink>,{' '}
                <GlossaryLink id="mesociclo">mesociclo</GlossaryLink> e{' '}
                <GlossaryLink id="microciclo-periodo">microciclo</GlossaryLink>{' '}
                (satisfação e RPE), para calibrar os próximos ciclos com base
                na experiência real dele.
            </p>
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
                    aparelho ou importar de um <strong>TikTok</strong>, com a
                    sua própria mídia.
                </p>
            </>
        ),
    },
    {
        id: 'autorregulacao-config',
        title: 'Autorregulação (configurações)',
        body: (
            <p className="mb-0">
                Na aba <strong>Autorregulação</strong> você ajusta os
                parâmetros que definem as zonas de{' '}
                <GlossaryLink id="autorregulacao">autorregulação</GlossaryLink>{' '}
                dos seus alunos — por exemplo, a partir de qual diferença
                entre RPE previsto e RPE alvo o app classifica o dia como{' '}
                <GlossaryLink id="supercompensacao">
                    Supercompensação
                </GlossaryLink>{' '}
                ou Fadiga, e quando sugerir um{' '}
                <GlossaryLink id="deload">deload</GlossaryLink>. Veja o manual
                completo em{' '}
                <Link href="#autorregulacao-rpe-rir">
                    Periodização + Autorregulação por RPE/RIR
                </Link>
                .
            </p>
        ),
    },
    {
        id: 'periodizacao-biblioteca',
        title: 'Minha Periodização / Treinos',
        body: (
            <>
                <p className="mb-2">
                    Aqui ficam seus{' '}
                    <GlossaryLink id="template-modelo">
                        ciclos reutilizáveis
                    </GlossaryLink>{' '}
                    — monte uma vez e aplique em vários alunos. Em{' '}
                    <strong>+ Novo Ciclo</strong> você cria o{' '}
                    <GlossaryLink id="macrociclo">macrociclo</GlossaryLink>;
                    depois use <strong>Configurar treinos</strong> para
                    montar <GlossaryLink id="mesociclo">mesociclos</GlossaryLink>
                    ,{' '}
                    <GlossaryLink id="microciclo-periodo">
                        microciclos
                    </GlossaryLink>{' '}
                    e os exercícios de cada treino.
                </p>
                <p className="mb-2">
                    Para cada ciclo você pode <strong>Aplicar</strong> a um
                    aluno, <strong>Editar</strong> os dados (nome, objetivo,
                    visibilidade), <strong>Duplicar</strong> ou{' '}
                    <strong>Remover</strong>. O selo de usos mostra quantas
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
                ou objetivo e <strong>Aplicar</strong> um deles direto a um
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
                    O botão <strong>Ver Treino</strong> no cartão do aluno é
                    um atalho: ele pula direto para o{' '}
                    <GlossaryLink id="macrociclo">macrociclo</GlossaryLink>{' '}
                    ativo do aluno (ou o mais recente, se nenhum estiver
                    ativo) já na tela de edição de mesociclos e treinos. Se o
                    aluno ainda não tiver nenhum macrociclo, você cai na lista
                    abaixo para criar o primeiro.
                </p>
                <p className="mb-2">
                    Pelo cartão do aluno em <strong>Periodização</strong>{' '}
                    você vê os macrociclos dele. Crie um do zero em{' '}
                    <strong>+ Novo Macrociclo</strong> ou parta de um modelo em{' '}
                    <strong>De Modelo</strong>. Cada macrociclo tem
                    objetivo, datas e status (<strong>Rascunho</strong>,{' '}
                    <strong>Ativo</strong> ou <strong>Concluído</strong>).
                </p>
                <p className="mb-0">
                    Ao abrir um macrociclo você organiza{' '}
                    <GlossaryLink id="mesociclo">mesociclos</GlossaryLink>,{' '}
                    <GlossaryLink id="microciclo-periodo">
                        microciclos
                    </GlossaryLink>{' '}
                    e os treinos. Um bom macrociclo pode virar modelo
                    reutilizável com <strong>Modelo</strong> — ele passa a
                    aparecer na sua{' '}
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
                    O <GlossaryLink id="rpe"><strong>RPE</strong></GlossaryLink>{' '}
                    (Rate of Perceived Exertion, ou Esforço Percebido) mede o
                    quão puxada foi uma série, de 1 a 10. O{' '}
                    <GlossaryLink id="rir"><strong>RIR</strong></GlossaryLink>{' '}
                    (Reps in Reserve, ou Repetições em Reserva) é a leitura
                    inversa: quantas repetições ainda dariam para fazer antes
                    de falhar. São a mesma régua — basta converter:
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
                        <GlossaryLink id="macrociclo">
                            <strong>Macrociclo</strong>
                        </GlossaryLink>{' '}
                        — o plano inteiro (objetivo, datas, status
                        Rascunho/Ativo/Concluído).
                    </li>
                    <li>
                        <GlossaryLink id="mesociclo">
                            <strong>Mesociclos (Fases)</strong>
                        </GlossaryLink>{' '}
                        — blocos de 3 a 6 semanas, cada um com uma{' '}
                        <strong>fase</strong> e uma <strong>metodologia</strong>{' '}
                        (veja abaixo).
                    </li>
                    <li>
                        <GlossaryLink id="microciclo-periodo">
                            <strong>Microciclos</strong>
                        </GlossaryLink>{' '}
                        — cada semana da fase. É aqui que a autorregulação
                        vive: RPE alvo, ajustes de volume/intensidade e deload
                        são definidos por semana.
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
                    Ondulada Diária (<GlossaryLink id="dup">DUP</GlossaryLink>),
                    Ondulada Semanal, Conjugada, Bloco ou Outra. Duração
                    recomendada: <strong>3–6 semanas por fase</strong> (4 é o
                    padrão).
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
                        <GlossaryLink id="deload">
                            <strong>Deload:</strong>
                        </GlossaryLink>{' '}
                        marca a semana como recuperação (tipicamente RPE mais
                        baixo e volume reduzido).
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
                                    <GlossaryLink id="supercompensacao">
                                        <strong>Supercompensação</strong>
                                    </GlossaryLink>
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
                        <GlossaryLink id="intrassessao-intersessao">
                            <strong>Intrassessão:</strong>
                        </GlossaryLink>{' '}
                        durante o treino (ex.: baixar 5% a 10% da carga se o
                        RPE estourar o alvo).
                    </li>
                    <li>
                        <GlossaryLink id="intrassessao-intersessao">
                            <strong>Intersessão:</strong>
                        </GlossaryLink>{' '}
                        para os próximos dias (ex.: cortar ~20% de volume
                        enquanto a fadiga persistir).
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
                        <strong>Periodização → + Novo Macrociclo</strong>{' '}
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
        id: 'progressao-carga',
        title: 'Sugestão de carga e progressão temporal',
        body: (
            <>
                <p className="mb-3">
                    Além do ajuste reativo por RPE (explicado em{' '}
                    <Link href="#autorregulacao-rpe-rir">
                        Periodização + Autorregulação por RPE/RIR
                    </Link>
                    ), a sugestão de carga que aparece no card do treino do
                    aluno leva em conta{' '}
                    <strong>há quanto tempo e com que consistência</strong> ele
                    vem performando naquela carga — não só a última sessão
                    isolada. Essas duas camadas adicionais são calibradas por
                    literatura de treinamento resistido; esta página explica
                    de onde vêm os números e onde eles são uma estimativa de
                    engenharia, não uma citação literal.
                </p>

                <h3 className="h6 mt-3 mb-2">
                    1.{' '}
                    <GlossaryLink id="regra-2-for-2">
                        Regra &quot;2-for-2&quot;
                    </GlossaryLink>
                    : aumento só após confirmação
                </h3>
                <p className="mb-2">
                    Um aumento de carga só é sugerido depois que o aluno bate a
                    meta de RPE (e, quando a prescrição tem uma faixa de
                    repetições definida, também as reps — princípio de{' '}
                    <GlossaryLink id="dupla-progressao">
                        <strong>dupla progressão</strong>
                    </GlossaryLink>
                    ) em <strong>N sessões consecutivas</strong> do mesmo exercício
                    — não a cada sessão isolada. O padrão é N = 2, o valor da
                    regra original. Reduções de carga continuam imediatas
                    (critério de segurança): a autorregulação nunca espera
                    confirmação para proteger o aluno.
                </p>
                <p className="mb-3 small text-muted">
                    Configurável em{' '}
                    <strong>
                        Autorregulação → Progressão temporal → Sessões
                        consecutivas para liberar aumento
                    </strong>
                    . Definir como 1 restaura o comportamento reativo
                    imediato (comportamento anterior a esta funcionalidade).
                </p>

                <h3 className="h6 mt-3 mb-2">
                    2. Teto de progressão por semana
                </h3>
                <p className="mb-2">
                    Mesmo com a regra 2-for-2 liberada, a carga de trabalho
                    sugerida não sobe mais que um percentual definido dentro
                    de uma janela móvel de <strong>7 dias corridos</strong> —
                    evita que múltiplos eventos de progressão na mesma semana
                    (por exemplo, o aluno treinando o mesmo exercício 3x) somem
                    um salto de carga fora de controle.
                </p>
                <p className="mb-3 small text-muted">
                    Configurável em{' '}
                    <strong>
                        Autorregulação → Progressão temporal → Teto de
                        progressão por semana
                    </strong>
                    . Padrão: 5% / 7 dias.
                </p>

                <h3 className="h6 mt-3 mb-2">
                    3. De onde vêm esses números (e onde não há consenso)
                </h3>
                <p className="mb-2">
                    A literatura-âncora sobre progressão de carga (ACSM, NSCA)
                    não expressa a taxa em &quot;% por semana&quot; — ela
                    gateia por <strong>desempenho</strong> (ex.: 2 sessões
                    consecutivas dentro da meta), não por calendário. Isso é
                    importante para calibrar as expectativas:
                </p>
                <ul className="mb-2 ps-3">
                    <li>
                        <strong>Regra &quot;2-for-2&quot; e faixa de 2–10% por
                        evento de progressão:</strong> ACSM, position stand
                        &quot;Progression Models in Resistance Training for
                        Healthy Adults&quot; (2009) — quando o aluno completa
                        1–2 repetições a mais que o alvo em duas sessões
                        consecutivas, aumenta-se a carga em 2–10% (menor para
                        exercícios isoladores, maior para compostos). A NSCA
                        (Essentials of Strength Training and Conditioning)
                        descreve essencialmente a mesma regra.
                    </li>
                    <li>
                        <strong>Progressão proporcional ao RIR:</strong> Helms,
                        Morgan &amp; Valdez, &quot;The Muscle and Strength
                        Pyramid&quot; — ajustar a carga em ~4% para cada
                        repetição de RIR fora do alvo (reativo por sessão,
                        proporcional ao desvio).
                    </li>
                    <li>
                        <strong>Frequência de deload:</strong> pesquisa
                        transversal com atletas competitivos publicada em
                        Sports Medicine – Open (&quot;Deloading Practices in
                        Strength and Physique Sports&quot;) reporta deload a
                        cada 5,6 ± 2,3 semanas, durando 6,4 ± 1,7 dias —
                        compatível com a heurística comum de 4–6 semanas. No
                        Venafit o deload é reativo (por sinais de fadiga
                        acumulada), não calendarizado por padrão.
                    </li>
                    <li>
                        <strong>Dupla progressão:</strong> princípio
                        estabelecido na literatura de treinamento (NSCA/
                        Baechle &amp; Earle) — progredir repetições dentro da
                        faixa prescrita até o topo, só então subir carga.
                    </li>
                </ul>
                <p className="mb-0 small text-muted">
                    <strong>O teto de progressão semanal (5%/7 dias) é uma
                    tradução de engenharia</strong>, não um número citado
                    literalmente por essas fontes: convertemos a faixa de
                    evento (2–10% por progressão, tipicamente liberada a cada
                    2–3 sessões numa frequência de treino comum) para uma
                    janela de calendário. Fontes com identificador estável
                    para consulta:{' '}
                    <a
                        href="https://pubmed.ncbi.nlm.nih.gov/19204579/"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        ACSM 2009 (PubMed 19204579)
                    </a>{' '}
                    e{' '}
                    <a
                        href="https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7810043/"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        revisão sistemática de autorregulação (PMC7810043)
                    </a>
                    . As demais (NSCA Essentials, Helms/Muscle and Strength
                    Pyramid, o estudo de deload) são citadas por título/autor
                    por não terem um identificador único e estável que
                    pudéssemos confirmar para linkar diretamente.
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
                Pelo cartão do aluno em <strong>Plano Alimentar</strong>{' '}
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
                Pelo cartão do aluno em <strong>Evolução</strong> você
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
                    Em <strong>Agenda</strong> você marca sessões{' '}
                    <strong>presenciais</strong>, <strong>online</strong>{' '}
                    (com link de reunião), de <strong>consultoria</strong> ou
                    de <strong>avaliação física</strong>. Filtre por período
                    e, em cada sessão, registre a situação:{' '}
                    <strong>Confirmar</strong>, <strong>Presente</strong>,{' '}
                    <strong>Faltou</strong> ou <strong>Cancelar</strong>.
                </p>
                <p className="mb-0">
                    Você define a <strong>antecedência mínima</strong> para um
                    cancelamento não descontar a sessão do plano do aluno.
                    Cancelamentos feitos dentro desse prazo usam o{' '}
                    <strong>Antecipado</strong> e não pesam para o aluno.
                    Quando o aluno solicita um horário, a sessão aparece
                    marcada como <strong>(solicitado pelo aluno)</strong>. A
                    Agenda é um recurso do{' '}
                    <Link href="#plano-pro">plano PRO</Link>. Para limitar os
                    horários que o aluno pode escolher, veja{' '}
                    <Link href="#disponibilidade">Disponibilidade</Link>.
                </p>
            </>
        ),
    },
    {
        id: 'disponibilidade',
        title: 'Disponibilidade: horários que o aluno pode escolher',
        pro: true,
        body: (
            <>
                <p className="mb-2">
                    Na aba <strong>Disponibilidade</strong> da Agenda você
                    define quais horários o aluno pode escolher ao solicitar
                    um agendamento, em vez de ele digitar qualquer data e
                    hora livremente. Isso funciona em três camadas:
                </p>
                <ul className="mb-2 pl-4">
                    <li className="mb-1">
                        <strong>Grade semanal (geral):</strong> os dias e
                        horários em que você atende normalmente — por
                        exemplo, segunda a sexta das 6h às 11h e das 14h às
                        20h. Configure também a duração de cada atendimento,
                        o intervalo entre eles, a antecedência mínima para
                        solicitar, até quantos dias no futuro o aluno pode
                        marcar e quantos alunos cabem no mesmo horário
                        (use mais de um para treino em dupla ou turma).
                    </li>
                    <li className="mb-1">
                        <strong>Exceção de data (pontual):</strong> muda a
                        grade normal de um dia específico — marcar um feriado
                        como fechado, ou abrir um horário diferente naquele
                        dia.
                    </li>
                    <li className="mb-1">
                        <strong>Bloqueio (pontual):</strong> reserva um
                        intervalo de tempo específico, como uma consulta
                        médica ou uma viagem de vários dias, sem mexer na
                        grade semanal.
                    </li>
                </ul>
                <p className="mb-0">
                    Enquanto você não ativa o interruptor{' '}
                    <strong>“Deixar o aluno escolher o horário na minha
                    grade”</strong>, o aluno continua digitando a data e hora
                    livremente, como sempre funcionou. Você também pode
                    encaixar agendamentos manualmente fora da grade a
                    qualquer momento — só o aluno é limitado aos horários
                    livres.
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
                    <strong>Aceita</strong> ou <strong>Rejeita</strong>.
                </p>
            </>
        ),
    },
    {
        id: 'desafios',
        title: 'Desafios',
        body: (
            <>
                <p className="mb-2">
                    Em <strong>Desafios</strong> você cria uma campanha
                    pública com um link para divulgar seu trabalho — quem
                    ainda não é seu aluno pode participar informando nome,
                    e-mail e telefone, sem precisar ter conta no Venafit.
                </p>
                <p className="mb-0">
                    Pela lista de participantes você acompanha quem entrou e
                    pode <strong>converter</strong> qualquer um deles em aluno
                    seu diretamente, sem precisar enviar o convite padrão.
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
                Na aba <strong>Personalização</strong> você aplica a sua
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
                Na aba <strong>Meus Anúncios</strong> você divulga o seu
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

    const glossarioTocItem = {
        id: 'glossario',
        title: (
            <>
                <FiBookOpen /> Glossário
            </>
        ),
        pro: false,
    };
    const tocSections = isPersonal
        ? [
              ...sections.map((s) => ({ id: s.id, title: s.title as React.ReactNode, pro: s.pro })),
              glossarioTocItem,
          ]
        : [
              { id: 'autorregulacao', title: 'Controle do Microciclo' as React.ReactNode, pro: false },
              ...sections.map((s) => ({ id: s.id, title: s.title as React.ReactNode, pro: s.pro })),
              glossarioTocItem,
          ];

    return (
        <div className="container py-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h1 className="h4 mb-0">Central de Ajuda</h1>
                <div className="d-flex gap-2">
                    <Link
                        href="#glossario"
                        className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center gap-2"
                    >
                        <FiBookOpen /> Glossário
                    </Link>
                    <Link
                        href={isPersonal ? '/personal' : '/meus-treinos'}
                        className="btn btn-outline-secondary btn-sm"
                    >
                        Voltar
                    </Link>
                </div>
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
                            className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center gap-2"
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

            <section id="glossario" className="card mb-3">
                <div className="card-body">
                    <h2 className="h6 d-flex align-items-center gap-2">
                        <FiBookOpen /> Glossário
                    </h2>
                    <p className="text-muted small mb-3">
                        Explicação rápida dos termos técnicos usados nesta
                        Central de Ajuda, de RPE e periodização a recursos do
                        app.
                    </p>
                    <div className="row g-3">
                        {getSortedGlossaryTerms().map((term) => (
                            <div
                                className="col-12 col-md-6"
                                key={term.id}
                                id={`glossario-${term.id}`}
                            >
                                <div className="h-100 p-3 rounded border">
                                    <h3 className="h6 mb-1">{term.term}</h3>
                                    <p className="small mb-0">{term.long}</p>
                                    {term.seeAlso &&
                                        (term.seeAlso.audience === audience ? (
                                            <Link
                                                href={`#${term.seeAlso.id}`}
                                                className="small d-inline-block mt-2"
                                            >
                                                Ver seção completa:{' '}
                                                {term.seeAlso.label} →
                                            </Link>
                                        ) : (
                                            <p className="text-muted small mt-2 mb-0">
                                                Detalhado na Central do{' '}
                                                {term.seeAlso.audience ===
                                                'personal'
                                                    ? 'Personal'
                                                    : 'Aluno'}
                                                : “{term.seeAlso.label}”.
                                            </p>
                                        ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <div className="text-muted small mt-4">
                {isPersonal
                    ? 'Não encontrou o que precisava? Fale com o suporte pelo app.'
                    : 'Não encontrou o que precisava? Fale com seu personal trainer pelo app ou entre em contato pelo suporte.'}
            </div>
        </div>
    );
}
