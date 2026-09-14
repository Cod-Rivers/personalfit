'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FiBookOpen } from 'react-icons/fi';
import { microcycleHelpTopics } from '@/libs/microcycleHelpContent';
import { getSortedGlossaryTerms } from '@/libs/glossaryContent';
import GlossaryLink from '@/components/atoms/GlossaryLink';
import ExternalLink from '@/components/atoms/ExternalLink';

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
        title: 'Treinar offline e check-in com foto',
        body: (
            <>
                <p className="mb-2">
                    <strong>Por que isso existe:</strong> academia costuma ter
                    sinal fraco (porão, sala de musculação com paredes
                    grossas) ou nenhum sinal. Sem esse recurso, uma queda de
                    conexão bem na hora de salvar o treino apagaria o seu
                    esforço — você faria tudo certo e o app
                    &quot;esqueceria&quot;. O Venafit resolve isso guardando
                    o registro{' '}
                    <strong>no seu aparelho primeiro</strong>, e só manda para
                    o servidor quando a internet voltar. Falha de rede nunca
                    é problema seu.
                </p>
                <p className="mb-2">
                    Toque em <strong>Baixar para offline</strong> para salvar
                    seu plano de treino atual e os vídeos dos exercícios no
                    aparelho. Assim você consegue treinar mesmo sem internet
                    — e nem precisa ter baixado antes: o registro nunca se
                    perde, com ou sem plano baixado previamente.
                </p>
                <p className="mb-2">
                    <strong>Passo a passo para registrar um treino:</strong>
                </p>
                <ol className="mb-2 ps-3">
                    <li>
                        Abra o treino do dia e registre cada série (
                        repetições, carga e{' '}
                        <GlossaryLink id="rpe">RPE</GlossaryLink>), como de
                        costume.
                    </li>
                    <li>
                        Toque em <strong>Completar Treino</strong>. Aparece
                        uma tela de <strong>confirmação (check-in)</strong>:
                        você confirma que terminou e pode, opcionalmente,
                        anexar uma <strong>foto</strong> do treino ou do
                        resultado.
                    </li>
                    <li>
                        Se o seu personal configurou uma{' '}
                        <GlossaryLink id="janela-de-registro">
                            janela de registro
                        </GlossaryLink>
                        , essa mesma tela avisa quando o registro está perto
                        de ficar <strong>tardio</strong> — é só um aviso
                        estimado; o registro é salvo de qualquer forma, nunca
                        é bloqueado ou descartado por estar fora do prazo.
                    </li>
                    <li>
                        Confirme. O treino já é salvo <strong>no
                        aparelho</strong> nesse instante — a tela não fica
                        esperando a internet. Um selo mostra &quot;salvo
                        localmente&quot; até a sincronização de verdade
                        acontecer.
                    </li>
                    <li>
                        Assim que houver internet, o app envia o registro
                        automaticamente em segundo plano. Reenviar por engano
                        nunca duplica o treino.
                    </li>
                    <li>
                        A foto (se você anexou) sobe <strong>depois</strong>,
                        numa fila própria, e nunca atrasa nem bloqueia a
                        confirmação do treino em si — mesmo que o envio da
                        foto falhe (sinal fraco, foto grande demais), o
                        treino já está registrado.
                    </li>
                </ol>
                <p className="mb-2">
                    Enquanto estiver offline, os treinos completados ficam
                    guardados no aparelho e são enviados automaticamente assim
                    que a internet voltar. Um selo mostra quantos treinos
                    (e fotos) ainda estão pendentes de sincronizar.
                </p>
                <p className="mb-0 small text-muted">
                    <strong>Para aproveitar melhor:</strong> baixe o treino
                    para offline <em>antes</em> de sair de casa se a sua
                    academia costuma ter sinal ruim — assim os vídeos dos
                    exercícios também abrem sem internet. Anexar a foto no
                    check-in é opcional, mas ajuda o seu personal a
                    acompanhar de verdade (não só &quot;cumpriu&quot;, mas
                    &quot;como ficou&quot;) — e não custa nada tentar mesmo
                    com sinal fraco: se a foto falhar, o treino já está
                    registrado do mesmo jeito. Não force o app: fechar a
                    tela logo depois de &quot;Completar Treino&quot; é
                    seguro, o envio continua em segundo plano.
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
        title: 'Triagem automática',
        body: (
            <p className="mb-0">
                É o questionário de saúde e dores (tornozelo, lombar, joelho,
                quadril, ombro etc.) que monta um treino pronto quando você
                não tem personal. Ninguém lê essas respostas: elas só servem
                para escolher o plano. Se você já tem personal, é ele quem
                monta seu treino, e ele pode pedir a{' '}
                <Link href="#anamnese-do-personal">Anamnese do personal</Link>.
            </p>
        ),
    },
    {
        id: 'anamnese-do-personal',
        title: 'Anamnese do personal',
        body: (
            <p className="mb-0">
                Quando seu personal pede, aparece um aviso em{' '}
                <strong>Meus treinos</strong>, junto com uma notificação. Você
                responde perguntas de segurança, objetivos, disponibilidade,
                local de treino, dores, lesões e preferências. As respostas
                vão direto para o personal montar e ajustar seus treinos, e
                nada é gerado automaticamente.
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
        id: 'plano-alimentar',
        title: 'Plano Alimentar',
        body: (
            <>
                <p className="mb-2">
                    Em <strong>Plano Alimentar</strong> você acompanha as
                    refeições que o seu personal montou para você, com o
                    horário e o conteúdo de cada uma. Se ele anexou o plano em
                    PDF, o arquivo fica disponível para abrir na mesma tela.
                </p>
                <p className="mb-0">
                    A tela é preenchida pelo personal: se estiver vazia, é
                    porque ele ainda não montou o seu plano — fale com ele.
                </p>
            </>
        ),
    },
    {
        id: 'evolucao',
        title: 'Evolução',
        body: (
            <>
                <p className="mb-2">
                    Em <strong>Evolução</strong> você registra sua avaliação
                    física ao longo do tempo: peso, medidas e fotos. Cada
                    registro entra na linha do tempo, e você pode comparar
                    duas avaliações lado a lado para ver o antes e o depois.
                </p>
                <p className="mb-0">
                    Na mesma tela fica a calculadora de{' '}
                    <strong>zonas de frequência cardíaca</strong>, que mostra
                    em que faixa de batimentos treinar. Editar uma avaliação
                    nunca apaga as fotos já enviadas — elas apenas somam.
                </p>
            </>
        ),
    },
    {
        id: 'desafios',
        title: 'Desafios',
        body: (
            <>
                <p className="mb-3">
                    <strong>Por que isso existe:</strong> o que separa quem
                    evolui de quem não evolui quase nunca é o treino perfeito —
                    é aparecer. O{' '}
                    <GlossaryLink id="desafio-entre-alunos">
                        Desafio entre Alunos
                    </GlossaryLink>{' '}
                    transforma constância em jogo: cada dia em que você treina
                    e anexa a foto no check-in vira ponto, e o{' '}
                    <strong>mural de constância</strong> mostra você ao lado dos
                    outros participantes. Você entra só se quiser, e sai quando
                    quiser.
                </p>

                <h3 className="h6 mt-3 mb-2">
                    1. Entrar: o convite e o que você autoriza
                </h3>
                <p className="mb-2">
                    Convites pendentes aparecem no topo da tela{' '}
                    <strong>Desafios</strong>. Toque em{' '}
                    <strong>Ver convite</strong> para ler o nome do desafio, o
                    período e — o mais importante — exatamente o que passa a
                    ficar visível. Só depois de marcar a caixa de concordância o
                    botão <strong>Aceitar e participar</strong> libera.
                </p>
                <ul className="mb-2 ps-3">
                    <li>
                        <strong>O que os outros passam a ver:</strong> as fotos
                        que você anexar ao concluir treinos durante o período do
                        desafio, a sua sequência de dias, o seu nome e a sua
                        foto de perfil.
                    </li>
                    <li>
                        <strong>O que ninguém vê:</strong> seu plano de treino,
                        suas avaliações físicas, sua anamnese, seu telefone e
                        seu e-mail. O desafio só expõe o que aparece no mural.
                    </li>
                    <li>
                        <strong>Recusar</strong> é uma decisão tranquila: não
                        gera aviso constrangedor para ninguém. Só note que é
                        definitivo — para entrar depois, você precisaria de um
                        convite novo.
                    </li>
                    <li>
                        <strong>Sair</strong> está sempre disponível no card do
                        desafio (<strong>Sair do desafio</strong>). Suas fotos e
                        sua sequência somem do mural{' '}
                        <strong>imediatamente</strong> — sua autorização é
                        revogável, não é um caminho sem volta.
                    </li>
                </ul>

                <h3 className="h6 mt-3 mb-2">2. Como se pontua</h3>
                <p className="mb-2">
                    A moeda do desafio é o{' '}
                    <GlossaryLink id="dia-qualificante">
                        dia qualificante
                    </GlossaryLink>
                    : um dia do calendário em que você{' '}
                    <strong>concluiu um treino</strong> e{' '}
                    <strong>anexou uma foto</strong> na tela de check-in, dentro
                    do período do desafio. É a mesma foto opcional do{' '}
                    <Link href="#offline">registro de treino</Link> — não há
                    nada a mais para enviar.
                </p>
                <ul className="mb-2 ps-3">
                    <li>
                        Treino <strong>pulado</strong> não conta, e treino
                        concluído <strong>sem foto</strong> também não.
                    </li>
                    <li>
                        Dois treinos no mesmo dia contam como{' '}
                        <strong>um dia</strong> — o desafio mede constância, não
                        volume.
                    </li>
                    <li>
                        Vale a data do seu aparelho na hora em que você
                        concluiu. Treino feito offline e sincronizado no dia
                        seguinte conta no{' '}
                        <strong>dia em que você treinou</strong>, não no dia em
                        que a internet voltou.
                    </li>
                </ul>
                <p className="mb-2">
                    Com esses dias o mural calcula três números:
                </p>
                <ul className="mb-2 ps-3">
                    <li>
                        <GlossaryLink id="streak-atual">
                            <strong>Streak atual</strong>
                        </GlossaryLink>{' '}
                        — dias seguidos até hoje. Tem folga: enquanto o dia de
                        hoje ainda não teve treino, a sequência continua valendo
                        a partir de ontem. Ela só zera quando{' '}
                        <em>nem hoje nem ontem</em> tiveram registro — ou seja,
                        você tem o dia inteiro para treinar sem perder nada à
                        meia-noite.
                    </li>
                    <li>
                        <GlossaryLink id="streak-recorde">
                            <strong>Recorde</strong>
                        </GlossaryLink>{' '}
                        — a maior sequência que você já fez no desafio. Ela{' '}
                        <strong>nunca cai</strong>, mesmo que a atual quebre.
                    </li>
                    <li>
                        <strong>Total de dias</strong> — quantos dias
                        qualificaram ao todo.
                    </li>
                </ul>
                <p className="mb-2">
                    A classificação usa o <strong>recorde</strong> primeiro,
                    depois a <strong>streak atual</strong>, depois o{' '}
                    <strong>total de dias</strong> e, em caso de empate
                    completo, quem entrou no desafio primeiro. Um tropeço de um
                    dia não apaga o que você construiu.
                </p>

                <h3 className="h6 mt-3 mb-2">
                    3. Pose do dia e código (quando o seu personal usa)
                </h3>
                <p className="mb-2">
                    Alguns desafios pedem uma{' '}
                    <GlossaryLink id="pose-do-dia">pose do dia</GlossaryLink>.
                    Quando é o caso, a tela de check-in mostra{' '}
                    <strong>Pose de hoje: …</strong> e{' '}
                    <strong>Seu código do dia</strong> (quatro caracteres). Você
                    faz a pose sorteada, com o código à mostra, e o app estampa
                    código e data na própria imagem.
                </p>
                <ul className="mb-2 ps-3">
                    <li>
                        A pose é <strong>sorteada por dia</strong> e nunca é
                        revelada com antecedência — não dá para tirar as fotos
                        da semana toda de uma vez.
                    </li>
                    <li>
                        O código é <strong>só seu</strong>: a foto de um colega
                        não serve para você, e a sua não serve para ele.
                    </li>
                    <li>
                        Se a câmera não abrir no seu aparelho, o app cai no
                        caminho normal de tirar ou escolher a foto. Você{' '}
                        <strong>nunca</strong> fica sem como registrar o treino.
                    </li>
                    <li>
                        Treinou offline e a pose não apareceu? Tudo bem: o
                        registro sobe marcado como <strong>sem pose</strong> e o
                        seu personal confere depois. É um aviso para ele olhar,
                        não uma acusação.
                    </li>
                </ul>

                <h3 className="h6 mt-3 mb-2">
                    4. Quando uma foto não é aceita
                </h3>
                <p className="mb-2">
                    Nos desafios com conferência ligada, o seu personal olha as
                    fotos uma a uma. Se alguma não for aceita, aparece no card
                    do desafio o bloco <strong>Fotos não aceitas</strong>, com a
                    data e o motivo (pose diferente da do dia, código que não
                    aparece, foto repetida etc.). Aquele dia deixa de contar — e
                    isso pode partir a sua sequência em duas.
                </p>
                <p className="mb-2">
                    Se você acha que houve engano, use{' '}
                    <strong>Discordo</strong>: o caso vai para o topo da fila do
                    seu personal e ele é avisado. Não é um recurso automático e
                    não reverte a decisão sozinho — serve para abrir a conversa.
                </p>
                <p className="mb-2">
                    Em alguns desafios o dia só passa a contar{' '}
                    <strong>depois</strong> de o personal conferir. Mesmo nesses,
                    se ele demorar, a foto{' '}
                    <strong>passa a contar sozinha</strong> depois do prazo que
                    ele definiu — a ausência dele nunca congela o seu jogo.
                </p>

                <h3 className="h6 mt-3 mb-2">
                    5. Modalidades: o que muda para você
                </h3>
                <ul className="mb-2 ps-3">
                    <li>
                        <strong>Individual</strong> — o formato de sempre: você
                        e os outros alunos do seu personal, um a um.
                    </li>
                    <li>
                        <GlossaryLink id="individual-entre-carteiras">
                            <strong>Individual entre carteiras</strong>
                        </GlossaryLink>{' '}
                        — um mural só, somando alunos de vários personais. Quem
                        disputa continua sendo você; o personal de cada um
                        aparece como etiqueta ao lado do nome.
                    </li>
                    <li>
                        <strong>Equipes</strong> — cada personal é uma equipe.
                        Além do mural individual aparece o{' '}
                        <strong>quadro de equipes</strong>, em que a{' '}
                        <GlossaryLink id="taxa-ajustada-equipe">
                            taxa ajustada
                        </GlossaryLink>{' '}
                        corrige o tamanho das carteiras, para uma equipe de 3
                        não levar vantagem sobre uma de 30.
                    </li>
                    <li>
                        <GlossaryLink id="meta-colaborativa">
                            <strong>Colaborativo</strong>
                        </GlossaryLink>{' '}
                        — não há vencedor: todo mundo soma dias rumo a uma meta
                        única do grupo, mostrada numa barra no topo. Bater a
                        meta não encerra o desafio (o excedente aparece como
                        dias além da meta) e não bater{' '}
                        <strong>não gera nenhuma marca negativa</strong>.
                    </li>
                </ul>

                <h3 className="h6 mt-3 mb-2">
                    6. Se o desafio passar a reunir vários personais
                </h3>
                <p className="mb-2">
                    Quando um desafio vira{' '}
                    <GlossaryLink id="desafio-multi-personal">
                        multi-personal
                    </GlossaryLink>
                    , quem enxerga os seus dados muda — entram alunos de outras
                    carteiras e personais que não são o seu. Por isso o app pede
                    a sua confirmação de novo, listando{' '}
                    <strong>nominalmente</strong> quem participa, numa faixa{' '}
                    <strong>Confirme sua participação</strong> no topo da tela.
                </p>
                <p className="mb-2">
                    Até você confirmar, você continua inscrito, mas{' '}
                    <strong>fora do mural</strong>: ninguém vê seus dados e você
                    também não vê os dos outros. <strong>Agora não</strong> é
                    uma resposta legítima e não te tira do desafio. Sua
                    sequência não é perdida nesse período — ela volta exatamente
                    como estava assim que você confirmar.
                </p>

                <h3 className="h6 mt-3 mb-2">
                    7. Prêmio, grupo e material exclusivo
                </h3>
                <ul className="mb-2 ps-3">
                    <li>
                        <strong>Prêmio</strong> — quando existe, aparece no card
                        do desafio dizendo quantas colocações ganham. Quem
                        promete e entrega é o <strong>seu personal</strong>; o
                        app registra a promessa e mostra quando a entrega foi
                        marcada. No modo colaborativo o prêmio é do grupo
                        inteiro.
                    </li>
                    <li>
                        <strong>Grupo e redes</strong> — links de WhatsApp,
                        Telegram ou Instagram do desafio. Entrar é{' '}
                        <strong>opcional e não afeta a sua pontuação</strong>. O
                        app avisa antes o que cada plataforma expõe: no WhatsApp,
                        por exemplo, o seu telefone fica visível para os outros
                        participantes.
                    </li>
                    <li>
                        <strong>Treino geral do desafio</strong> — uma sugestão
                        igual para todos os participantes. É material de leitura
                        e <strong>não substitui o seu plano</strong>: não entra
                        no seu registro de treino nem muda a sua prescrição.
                    </li>
                    <li>
                        <strong>Guia alimentar</strong> — material{' '}
                        <strong>educativo</strong>, o mesmo para todo o desafio.
                        Não é dieta individualizada e não substitui consulta com
                        nutricionista.
                    </li>
                </ul>
                <p className="mb-2">
                    Enquanto você só foi convidado, o app mostra que existe
                    material exclusivo, mas bloqueado. Ele libera assim que você
                    aceita.
                </p>

                <h3 className="h6 mt-3 mb-2">8. Compartilhar</h3>
                <p className="mb-2">
                    O botão <strong>Compartilhar</strong> no card do desafio gera
                    uma imagem com o nome do desafio e os seus números (posição,
                    dias seguidos, treinos no desafio). Se você entrou hoje e
                    ainda não pontuou, ela sai só com o nome do desafio — o app
                    não inventa número nenhum. Detalhes em{' '}
                    <Link href="#compartilhar">
                        Compartilhar treino e desafio nas redes
                    </Link>
                    .
                </p>

                <p className="mb-0 small text-muted">
                    <strong>Para aproveitar melhor:</strong> tire a foto{' '}
                    <em>na hora</em> de concluir o treino, não depois — é o
                    caminho mais simples e o que menos dá margem a dúvida na
                    conferência. Se um dia der errado, olhe o recorde: ele não
                    cai, e recomeçar a sequência custa um dia, não o desafio
                    inteiro. E lembre que sair é sempre uma opção: o mural é um
                    incentivo, não um contrato.
                </p>
            </>
        ),
    },
    {
        id: 'compartilhar',
        title: 'Compartilhar treino e desafio nas redes',
        body: (
            <>
                <p className="mb-2">
                    Ao confirmar um treino com foto, o app oferece uma imagem
                    pronta para publicar: a sua foto com a marca do Venafit, o
                    nome do treino e os números do dia (duração, exercícios,
                    carga levantada). No card do desafio, o botão{' '}
                    <strong>Compartilhar</strong> monta a mesma imagem com a sua
                    posição no mural e a sua sequência de dias.
                </p>
                <p className="mb-2">
                    Você vê a imagem antes de compartilhar e decide se publica.
                    A foto do check-in continua indo só para o seu personal
                    (e para o mural do desafio, quando você participa de um) —
                    compartilhar nas redes é uma ação separada, sempre sua.
                </p>
                <p className="mb-0">
                    Ao tocar em compartilhar, o celular abre a lista de apps
                    (Instagram, Facebook, WhatsApp). No computador, a imagem é
                    baixada para você publicar pelo celular depois.
                </p>
            </>
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
        title: 'Adicionar e gerenciar alunos',
        body: (
            <>
                <p className="mb-2">
                    Na aba <strong>Meus Alunos</strong>, toque em{' '}
                    <strong>+ Adicionar Aluno</strong> e preencha nome,
                    e-mail, data de nascimento, sexo e telefone — CPF é
                    opcional aqui, o aluno completa ao trocar a senha no
                    primeiro login. Se o e-mail é novo, o aluno já entra
                    vinculado a você e
                    recebe por e-mail uma senha temporária, que troca no
                    primeiro login. Se o e-mail já tem conta, enviamos um
                    pedido de vínculo — o aluno precisa confirmar na
                    própria conta antes de ficar vinculado.
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
        id: 'janela-de-registro-personal',
        title: 'Janela de registro: até quando o aluno pode marcar o treino',
        body: (
            <>
                <p className="mb-2">
                    <strong>Por que isso existe:</strong> sem um prazo
                    definido, &quot;quando&quot; o aluno registra um treino é
                    ambíguo —
                    ele pode marcar um treino de terça só na sexta, e isso
                    conta como aderência real? A{' '}
                    <GlossaryLink id="janela-de-registro">
                        janela de registro
                    </GlossaryLink>{' '}
                    resolve isso: você define, por aluno, até quando um
                    registro conta como &quot;no prazo&quot; antes de ficar
                    marcado como <strong>tardio</strong>. Importante: um registro
                    tardio <strong>nunca é apagado ou recusado</strong> — ele
                    é salvo do mesmo jeito, só fica sinalizado, para você
                    diferenciar consistência real de registro tardio.
                </p>
                <p className="mb-2">
                    <strong>Passo a passo:</strong>
                </p>
                <ol className="mb-2 ps-3">
                    <li>
                        Na aba <strong>Meus Alunos</strong>, toque em{' '}
                        <strong>Editar</strong> no cartão do aluno.
                    </li>
                    <li>
                        Escolha a janela: <strong>mesmo dia</strong>,{' '}
                        <strong>24 horas</strong>, <strong>48 horas</strong>{' '}
                        (padrão) ou <strong>sem limite</strong>.
                    </li>
                    <li>Salve — vale a partir dali, sem afetar o histórico já registrado.</li>
                </ol>
                <p className="mb-0 small text-muted">
                    <strong>Para aproveitar melhor:</strong> use{' '}
                    <strong>mesmo dia</strong> ou <strong>24h</strong> só com
                    alunos que você quer cobrar disciplina rígida de horário
                    — para a maioria, <strong>48h</strong> já separa bem
                    quem treina e demora a confirmar de quem realmente não
                    treinou. Evite <strong>sem limite</strong> por padrão:
                    ele torna o sinal de &quot;tardio&quot; inútil para
                    identificar quem está sumindo (veja a aba{' '}
                    <Link href="#retencao">Retenção</Link>).
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
        id: 'anamnese-personal',
        title: 'Anamnese do personal',
        body: (
            <>
                <p className="mb-2">
                    No cartão do aluno, em <strong>Anamnese</strong>, você pede
                    que ele responda o questionário — ele recebe uma
                    notificação e um aviso na tela inicial do app — ou
                    preenche em nome dele, com declaração de
                    responsabilidade. O selo no cartão mostra se está
                    pendente ou respondida.
                </p>
                <p className="mb-0">
                    As respostas ficam agrupadas por tema (objetivo,
                    experiência, disponibilidade, local, dores e lesões,
                    preferências), com a triagem de segurança (PAR-Q)
                    destacada quando sinaliza risco. No editor de treinos, o
                    botão <strong>Ver anamnese</strong> abre as respostas sem
                    você sair da tela. Diferente da{' '}
                    <GlossaryLink id="anamnese">triagem automática</GlossaryLink>,
                    ela nunca gera treino sozinha.
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
        id: 'substituicao-ia',
        title: 'Substituição por IA',
        pro: true,
        body: (
            <>
                <p className="mb-2">
                    Na aba <strong>Substituição por IA</strong> você liga ou
                    desliga a <strong>Substituição Inteligente</strong> para
                    os seus alunos. Com ela ativa, o aluno que não conseguir
                    usar o equipamento prescrito recebe de 2 a 3 alternativas
                    na hora, respeitando o grupo muscular, o objetivo do
                    treino, o nível dele e as restrições da{' '}
                    <GlossaryLink id="anamnese">anamnese</GlossaryLink>.
                </p>
                <p className="mb-0">
                    É um recurso do{' '}
                    <Link href="#plano-pro">plano PRO</Link>. Para travar um
                    exercício específico contra troca, use o{' '}
                    <Link href="#exercicio-nao-substituivel">
                        marcador de não-substituível
                    </Link>{' '}
                    na prescrição.
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
        id: 'exercicio-nao-substituivel',
        title: 'Exercício não-substituível',
        body: (
            <>
                <p className="mb-2">
                    <strong>Por que isso existe:</strong> quando o
                    equipamento prescrito está indisponível, o aluno pode
                    pedir uma sugestão de troca por IA. Isso é ótimo na
                    maioria dos casos, mas alguns exercícios são{' '}
                    <strong>centrais do programa</strong> ou foram escolhidos
                    por um motivo técnico/de segurança específico (uma
                    restrição da anamnese, uma progressão que só faz sentido
                    naquele movimento) — trocá-los sem o seu aval pode
                    comprometer o plano. O toggle de{' '}
                    <GlossaryLink id="nao-substituivel">
                        não-substituível
                    </GlossaryLink>{' '}
                    te dá a palavra final sobre isso, exercício a exercício.
                </p>
                <p className="mb-2">
                    <strong>Passo a passo:</strong>
                </p>
                <ol className="mb-2 ps-3">
                    <li>
                        Abra a{' '}
                        <Link href="#periodizacao-aluno">
                            edição de treinos
                        </Link>{' '}
                        do aluno (ou de um{' '}
                        <Link href="#periodizacao-biblioteca">
                            ciclo reutilizável
                        </Link>
                        ) e ache o exercício desejado.
                    </li>
                    <li>
                        No campo de prescrição do exercício, defina{' '}
                        <strong>Nunca substituível</strong> (bloqueia a troca
                        sempre, mesmo que a regra automática de dor/restrição
                        liberaria),{' '}
                        <strong>Sempre substituível</strong> (libera mesmo
                        que a regra automática bloquearia) ou deixe{' '}
                        <strong>Sem restrição</strong> (padrão — segue a
                        regra automática da anamnese).
                    </li>
                    <li>
                        Salve o plano. O aluno passa a ver um selo de
                        bloqueio no card do exercício e não consegue abrir a
                        Substituição Inteligente para ele.
                    </li>
                </ol>
                <p className="mb-0 small text-muted">
                    <strong>Para aproveitar melhor:</strong> use com
                    moderação — marcar tudo como não-substituível tira do
                    aluno a saída de emergência para quando o equipamento
                    realmente não está disponível na academia dele, e ele
                    pode acabar pulando a série em vez de adaptar. Reserve
                    para os exercícios em que a técnica ou a segurança
                    realmente não permitem alternativa equivalente.
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
                    <ExternalLink href="https://pubmed.ncbi.nlm.nih.gov/19204579/">
                        ACSM 2009 (PubMed 19204579)
                    </ExternalLink>{' '}
                    e{' '}
                    <ExternalLink href="https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7810043/">
                        revisão sistemática de autorregulação (PMC7810043)
                    </ExternalLink>
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
        title: 'Desafios: por que existem e qual usar',
        body: (
            <>
                <p className="mb-2">
                    <strong>Por que esta área existe:</strong> todo personal
                    vive dois problemas ao mesmo tempo, e eles quase nunca são
                    técnicos. O primeiro é <strong>encher a agenda</strong> —
                    falar com quem ainda não é seu aluno sem depender de sorte
                    no Instagram. O segundo, mais caro, é{' '}
                    <strong>segurar quem já entrou</strong>: a maioria dos
                    alunos não cancela porque o treino era ruim, cancela porque
                    parou de ir, e quando percebe que parou já se envergonha de
                    voltar. A área de <strong>Desafios</strong> é a única do app
                    que ataca os dois — com o mesmo mecanismo simples: um prazo,
                    um placar e um motivo concreto para aparecer hoje.
                </p>
                <p className="mb-2">
                    <strong>Por que isso importa mais do que parece:</strong> a
                    constância do aluno não é só o resultado dele, é o{' '}
                    <em>insumo</em> do seu trabalho no Venafit. Sem registro de
                    treino não há{' '}
                    <Link href="#progressao-carga">progressão de carga</Link>,
                    a <Link href="#retencao">régua de retenção</Link> não tem o
                    que medir, o{' '}
                    <Link href="#feedback-personal">feedback</Link> fica no
                    achismo e a{' '}
                    <Link href="#evolucao-personal">evolução</Link> vira uma
                    linha vazia. O desafio é o que faz o aluno{' '}
                    <strong>registrar</strong> — e registrar com foto. Ele
                    devolve dado para todo o resto do sistema, além de devolver
                    ânimo para quem estava sumindo.
                </p>

                <h3 className="h6 mt-3 mb-2">Os dois tipos, lado a lado</h3>
                <p className="mb-2">
                    A tela <strong>Desafios</strong> (menu do personal) tem duas
                    abas, e elas são features diferentes, com públicos
                    diferentes:
                </p>
                <ul className="mb-2 ps-3">
                    <li>
                        <strong>Captação de Leads</strong> — um{' '}
                        <GlossaryLink id="desafio-de-captacao">
                            desafio de captação
                        </GlossaryLink>{' '}
                        com link público. Quem participa{' '}
                        <strong>ainda não é seu aluno</strong> e nem precisa ter
                        conta no Venafit. Objetivo: transformar audiência em
                        lead e lead em aluno. Ver{' '}
                        <Link href="#desafios-captacao">
                            Desafio de captação
                        </Link>
                        .
                    </li>
                    <li>
                        <GlossaryLink id="desafio-entre-alunos">
                            <strong>Entre Alunos</strong>
                        </GlossaryLink>{' '}
                        — um mural de constância entre os alunos{' '}
                        <strong>que já são seus</strong>, pontuado por dias
                        seguidos de treino registrado com foto. Objetivo:
                        aderência, retenção e prova social. Ver{' '}
                        <Link href="#desafios-entre-alunos">
                            Desafio entre alunos
                        </Link>
                        .
                    </li>
                </ul>
                <p className="mb-2">
                    Usar os dois em sequência é o fluxo que rende mais: um
                    desafio público traz gente nova, você converte os
                    interessados em alunos e, no mês seguinte, coloca essas
                    mesmas pessoas num desafio entre alunos para que o primeiro
                    mês não vire o único.
                </p>

                <h3 className="h6 mt-3 mb-2">O que custa</h3>
                <p className="mb-2">
                    O desafio de captação e o desafio entre alunos{' '}
                    <strong>individual</strong> são gratuitos, sem limite de
                    quantos você cria. Só o pacote{' '}
                    <GlossaryLink id="desafio-multi-personal">
                        multi-personal
                    </GlossaryLink>{' '}
                    — convidar outro profissional e as modalidades que reúnem
                    carteiras — exige{' '}
                    <Link href="#plano-pro">plano PRO</Link>, e{' '}
                    <strong>só de quem organiza</strong>: o colega convidado
                    entra mesmo no plano gratuito. Baralhos de pose{' '}
                    <em>próprios</em> também são PRO; os baralhos da plataforma
                    ficam disponíveis para todo mundo.
                </p>

                <p className="mb-0 small text-muted">
                    <strong>O que o desafio não é:</strong> ele não cria nem
                    altera plano de treino. O treino de cada aluno continua
                    vindo da{' '}
                    <Link href="#periodizacao-aluno">periodização</Link>, e o
                    &ldquo;treino geral do desafio&rdquo; (quando você preenche)
                    é material de leitura, não prescrição. Trate o desafio como
                    a camada de motivação em cima do programa — não como
                    substituto dele.
                </p>
            </>
        ),
    },
    {
        id: 'desafios-captacao',
        title: 'Desafio de captação (link público)',
        body: (
            <>
                <p className="mb-2">
                    <strong>Por que isso existe:</strong> convencer alguém a
                    assinar acompanhamento sem ter nenhuma experiência com você
                    é caro. Um desafio gratuito de duas ou três semanas inverte
                    a ordem: a pessoa <strong>experimenta primeiro</strong>, e
                    você termina o período com o nome, o e-mail e o telefone de
                    quem levantou a mão — mais a lembrança recente de ter
                    treinado com você.
                </p>
                <p className="mb-2">
                    <strong>Passo a passo:</strong>
                </p>
                <ol className="mb-2 ps-3">
                    <li>
                        Em <strong>Desafios → Captação de Leads</strong>, toque
                        em <strong>+ Novo desafio</strong> e preencha nome,
                        descrição, datas de início e fim e, se quiser, um{' '}
                        <strong>limite de participantes</strong> (deixe em
                        branco para ilimitado).
                    </li>
                    <li>
                        Copie o <strong>link público</strong> gerado e divulgue
                        onde a sua audiência está — story, bio, grupo, WhatsApp.
                        O botão <strong>Compartilhar</strong> monta uma imagem do
                        desafio com a marca do app, e a legenda já sai com o link
                        de inscrição.
                    </li>
                    <li>
                        O interessado abre o link e se inscreve com{' '}
                        <strong>nome, e-mail e telefone</strong>. Ele{' '}
                        <strong>não precisa ter conta</strong> no Venafit, e o
                        mesmo e-mail nunca entra duas vezes — reenviar o link
                        para a mesma pessoa não duplica ninguém.
                    </li>
                    <li>
                        Você recebe uma <strong>notificação</strong> a cada
                        inscrição e vê a lista completa dentro do card do
                        desafio.
                    </li>
                    <li>
                        Ao final (ou durante), use{' '}
                        <strong>Converter em aluno</strong> no participante que
                        fechou com você: ele entra direto na sua carteira, sem
                        você ter que{' '}
                        <Link href="#convidar-alunos">pré-cadastrar</Link> de
                        novo, e o participante fica marcado como convertido.
                    </li>
                </ol>
                <p className="mb-2">
                    As inscrições fecham sozinhas quando a data final passa ou
                    quando o limite de participantes é atingido. Excluir o
                    desafio apaga a campanha e a lista — exporte ou converta
                    antes de excluir.
                </p>
                <p className="mb-0 small text-muted">
                    <strong>Para aproveitar melhor:</strong> prometa no anúncio
                    exatamente o que o desafio entrega (período, formato,
                    frequência) e converta <em>durante</em>, não depois — o
                    melhor momento para falar de mensalidade é a semana em que a
                    pessoa está empolgada, não a segunda-feira seguinte ao fim.
                    Um limite de participantes baixo também ajuda: cria urgência
                    real e protege a sua agenda.
                </p>
            </>
        ),
    },
    {
        id: 'desafios-entre-alunos',
        title: 'Desafio entre alunos: o mural de constância',
        body: (
            <>
                <p className="mb-2">
                    <strong>Por que isso existe:</strong> cobrança individual
                    cansa os dois lados. O mural troca a cobrança por{' '}
                    <strong>companhia</strong>: o aluno vê que outras pessoas
                    treinaram hoje, vê a própria sequência crescendo e ganha um
                    custo simbólico para quebrá-la. É a mesma lógica que faz
                    aula coletiva ter presença melhor que treino solo — só que
                    assíncrona, e sem você precisar mandar mensagem para
                    ninguém.
                </p>

                <h3 className="h6 mt-3 mb-2">1. Criar e convidar</h3>
                <ol className="mb-2 ps-3">
                    <li>
                        Em <strong>Desafios → Entre Alunos</strong>, crie o
                        desafio com nome, descrição, <strong>início</strong> e{' '}
                        <strong>fim</strong> (o fim precisa ser depois do
                        início) e a{' '}
                        <Link href="#desafios-modalidades">modalidade</Link>.
                    </li>
                    <li>
                        Marque os alunos a convidar. Só aparecem alunos com{' '}
                        <strong>vínculo ativo</strong> com você. O desafio já
                        nasce ativo — não existe rascunho: o convite sai na
                        hora.
                    </li>
                    <li>
                        Cada aluno recebe uma notificação e decide na tela dele.
                        Enquanto não responde, fica como{' '}
                        <strong>Convite pendente</strong>; ao aceitar (com
                        consentimento explícito), vira{' '}
                        <strong>Participando</strong> e entra no mural.
                    </li>
                    <li>
                        Depois, <strong>Convidar mais alunos</strong> acrescenta
                        gente a qualquer momento — quem entra no meio começa com
                        sequência zero, o que é justo e costuma acirrar a
                        disputa.
                    </li>
                </ol>
                <p className="mb-2">
                    Reenviar o convite em lote <strong>não</strong> reverte quem
                    recusou ou saiu: essas decisões são do titular dos dados e
                    exigem um convite novo e explícito. Recusa de aluno{' '}
                    <strong>não gera aviso</strong> — de propósito, para não
                    constranger quem preferiu ficar de fora.
                </p>
                <p className="mb-2">
                    O teto é de <strong>300 participantes ativos</strong> por
                    desafio (somando todas as equipes, no caso multi-personal).
                    Um lote que estouraria o teto não convida ninguém pela
                    metade: ele é recusado inteiro.
                </p>

                <h3 className="h6 mt-3 mb-2">
                    2. Como a pontuação funciona (e por que assim)
                </h3>
                <p className="mb-2">
                    A unidade é o{' '}
                    <GlossaryLink id="dia-qualificante">
                        dia qualificante
                    </GlossaryLink>
                    : um dia do calendário, dentro da janela do desafio, em que
                    o aluno <strong>concluiu um treino</strong> e{' '}
                    <strong>anexou foto no check-in</strong>. Treino pulado não
                    conta; treino concluído sem foto não conta; dois treinos no
                    mesmo dia contam como um. A mecânica é{' '}
                    <em>manteve foto</em>, não <em>fez volume</em> — quem quer
                    medir volume tem a{' '}
                    <Link href="#evolucao-personal">evolução</Link> para isso.
                </p>
                <ul className="mb-2 ps-3">
                    <li>
                        Vale o horário do <strong>aparelho do aluno</strong> no
                        momento da conclusão, não o do servidor. Um treino feito
                        às 22h sem sinal e sincronizado no dia seguinte conta no
                        dia certo — falha de rede não pode custar a sequência
                        dele.
                    </li>
                    <li>
                        <GlossaryLink id="streak-atual">
                            Streak atual
                        </GlossaryLink>{' '}
                        tem folga para o dia corrente: só zera quando nem hoje
                        nem ontem tiveram registro. Sem essa folga, todo mundo
                        perderia a sequência à meia-noite por não ter treinado{' '}
                        <em>ainda</em>.
                    </li>
                    <li>
                        O critério oficial da classificação é a{' '}
                        <GlossaryLink id="streak-recorde">
                            streak recorde
                        </GlossaryLink>
                        , que não cai quando a sequência atual quebra. Depois
                        dela entram streak atual, total de dias e, por último,
                        quem aceitou o convite primeiro.
                    </li>
                    <li>
                        Tudo é <strong>calculado na hora da leitura</strong> —
                        nada de pontuação congelada. Por isso aceitar ou recusar
                        uma foto na conferência muda o ranking na mesma hora.
                    </li>
                </ul>

                <h3 className="h6 mt-3 mb-2">3. O que você vê e controla</h3>
                <ul className="mb-2 ps-3">
                    <li>
                        <strong>Ver mural</strong> abre o ranking com foto mais
                        recente, sequência atual e recorde de cada participante,
                        além do quadro de equipes ou da barra de meta, conforme
                        a modalidade.
                    </li>
                    <li>
                        <strong>Meus alunos neste desafio</strong> lista os{' '}
                        <em>seus</em> participantes com o status de cada um
                        (Participando, Convite pendente, Recusou, Saiu).
                    </li>
                    <li>
                        <strong>Remover</strong> tira um aluno do mural na hora.
                        Você só consegue remover alunos{' '}
                        <strong>da sua própria carteira</strong> — nem o
                        organizador mexe em aluno alheio.
                    </li>
                    <li>
                        <strong>Encerrar desafio</strong> congela a janela:
                        ninguém pontua mais, mas o resultado continua visível. É
                        o passo que libera registrar a entrega do{' '}
                        <Link href="#desafios-extras">prêmio</Link>.
                    </li>
                    <li>
                        <strong>Excluir</strong> apaga o desafio e não pode ser
                        desfeito. Para um desafio que terminou, prefira{' '}
                        <em>encerrar</em> — o histórico tem valor para o aluno.
                    </li>
                    <li>
                        <strong>Compartilhar</strong> gera um card do desafio
                        para as suas redes.
                    </li>
                </ul>
                <p className="mb-2">
                    O aluno pode <strong>sair a qualquer momento</strong>, e
                    isso não é um bug a ser contornado: o consentimento dele é
                    revogável por lei e por decisão de produto. Quando alguém
                    sai, some do mural na hora — você recebe o aviso e o lugar
                    dele simplesmente deixa de existir.
                </p>

                <p className="mb-0 small text-muted">
                    <strong>Para aproveitar melhor:</strong> 21 a 30 dias é a
                    janela que funciona — curta o bastante para não cansar,
                    longa o bastante para virar hábito. Convide o grupo inteiro,
                    não só os assíduos: o mural existe para os intermitentes.
                    Combine com a{' '}
                    <GlossaryLink id="janela-de-registro">
                        janela de registro
                    </GlossaryLink>{' '}
                    (ver{' '}
                    <Link href="#janela-de-registro-personal">
                        Janela de registro
                    </Link>
                    ) para que &ldquo;registrar no dia&rdquo; seja um hábito só,
                    e não dois. E anuncie o desafio por{' '}
                    <Link href="#minha-pagina">sua página</Link> ou pelo grupo
                    antes do primeiro dia: desafio que começa sem aviso começa
                    com metade da adesão.
                </p>
            </>
        ),
    },
    {
        id: 'desafios-modalidades',
        title: 'Modalidades e desafio multi-personal',
        pro: true,
        body: (
            <>
                <p className="mb-2">
                    <strong>Por que isso existe:</strong> um desafio só entre os
                    seus alunos tem um limite natural de energia — todo mundo já
                    se conhece, e o número de participantes é o tamanho da sua
                    carteira. Reunir carteiras resolve os dois: dá escala ao
                    mural e cria um evento que nenhum dos profissionais
                    conseguiria sozinho. É também uma parceria comercial barata:
                    dois personais dividem divulgação e prêmio, e cada um aparece
                    para a audiência do outro.
                </p>
                <p className="mb-2">
                    Convidar outro profissional e entrar em qualquer modalidade
                    que reúna carteiras exige{' '}
                    <Link href="#plano-pro">plano PRO</Link> —{' '}
                    <strong>só do organizador</strong>. O colega convidado
                    participa mesmo no plano gratuito, de propósito: cobrar do
                    convidado mataria o efeito de rede e criaria a situação
                    constrangedora de convidar alguém que não consegue aceitar.
                </p>

                <h3 className="h6 mt-3 mb-2">1. As quatro modalidades</h3>
                <ul className="mb-2 ps-3">
                    <li>
                        <strong>Individual</strong> — ranking dos seus alunos,
                        um a um. É o formato de sempre, gratuito, e continua
                        sendo o melhor para carteira pequena.
                    </li>
                    <li>
                        <GlossaryLink id="individual-entre-carteiras">
                            <strong>Individual entre carteiras</strong>
                        </GlossaryLink>{' '}
                        — um ranking único somando os alunos de todos os
                        personais convidados, sem quadro de equipes. Quem disputa
                        é o aluno; o personal dele é só uma etiqueta ao lado do
                        nome. Use quando o objetivo é volume de gente no mural,
                        e não rivalidade entre profissionais.
                    </li>
                    <li>
                        <strong>Equipes (personal x personal)</strong> — cada
                        personal é uma equipe formada pelos alunos que ele
                        inscreveu, com o mural individual continuando por baixo.
                        É o formato mais &ldquo;evento&rdquo;, e o que mais
                        engaja quando as duas audiências se conhecem.
                    </li>
                    <li>
                        <GlossaryLink id="meta-colaborativa">
                            <strong>Colaborativo</strong>
                        </GlossaryLink>{' '}
                        — sem disputa e sem vencedor: todos somam dias rumo a uma
                        meta única do grupo. É a escolha certa para turmas com
                        muita gente iniciante, em que um ranking exporia sempre
                        as mesmas pessoas no fim da lista.
                    </li>
                </ul>

                <h3 className="h6 mt-3 mb-2">
                    2. A janela de configuração (leia antes de criar)
                </h3>
                <p className="mb-2">
                    Modalidade, meta colaborativa e antifraude só podem ser
                    definidos <strong>até o fim do dia de início</strong> do
                    desafio. Depois disso o botão some. A razão é simples: mudar
                    a regra com o jogo rodando invalida os dias que os alunos já
                    registraram sob a regra anterior, e é o tipo de coisa que
                    nenhuma explicação conserta. Grupo, prêmio e convites de
                    aluno continuam editáveis durante o desafio — o que trava é
                    só a regra do jogo.
                </p>

                <h3 className="h6 mt-3 mb-2">
                    3. Convidar outro personal e formar equipes
                </h3>
                <ol className="mb-2 ps-3">
                    <li>
                        No card do desafio, use{' '}
                        <strong>Convidar outro personal</strong> e busque o
                        profissional. Ele recebe notificação e{' '}
                        <strong>aceita ou recusa</strong> — recusa{' '}
                        <em>gera</em> aviso para você (é decisão comercial entre
                        profissionais, e você precisa saber para convidar
                        outro).
                    </li>
                    <li>
                        Depois de aceitar, cada personal convida os{' '}
                        <strong>próprios</strong> alunos. A equipe de um aluno é
                        congelada no convite: se ele é aluno de dois personais do
                        mesmo desafio, conta uma vez só, na equipe de{' '}
                        <strong>quem convidou primeiro</strong>.
                    </li>
                    <li>
                        <strong>Renomear minha equipe</strong> troca o rótulo
                        que aparece no quadro (sem nome, vale o nome do
                        personal). Cada um renomeia a própria equipe.
                    </li>
                    <li>
                        O organizador pode <strong>remover</strong> um personal;
                        um membro pode <strong>sair</strong>. Nos dois casos os
                        alunos daquela equipe saem do mural na mesma operação — a
                        exposição de dado precisa cessar junto.
                    </li>
                </ol>
                <p className="mb-2">
                    Limite de <strong>8 personais</strong> por desafio. Uma
                    modalidade multi-personal com um personal só não está fazendo
                    nada — o app avisa isso no card em vez de deixar você achar
                    que o mural quebrou.
                </p>

                <h3 className="h6 mt-3 mb-2">
                    4. O consentimento muda — e você precisa saber disso antes
                </h3>
                <p className="mb-2">
                    Quando um desafio que já estava rodando passa a reunir
                    carteiras, quem enxerga os dados do aluno muda: entram alunos
                    de outros personais e profissionais sem nenhum contrato com
                    ele. O consentimento antigo não cobre esse escopo, então{' '}
                    <strong>todo aluno precisa reconfirmar</strong>.
                </p>
                <ul className="mb-2 ps-3">
                    <li>
                        Antes de o convite ao colega surtir efeito, o app te
                        mostra <strong>quantos alunos</strong> sairão
                        temporariamente do mural. Confirme sabendo o número —
                        sem isso você veria doze alunos sumirem e reportaria
                        como bug.
                    </li>
                    <li>
                        O aluno que ainda não reconfirmou continua inscrito, mas
                        fica <strong>fora do mural</strong>: não expõe e não
                        enxerga. A sequência dele{' '}
                        <strong>não é perdida</strong> e volta intacta na
                        confirmação.
                    </li>
                    <li>
                        Os outros personais do desafio veem apenas o que está no
                        mural — nome, avatar, foto de check-in e sequência.{' '}
                        <strong>Nunca</strong> treino, avaliação, anamnese,
                        telefone ou e-mail dos alunos alheios.
                    </li>
                </ul>
                <p className="mb-2">
                    Converter um desafio já em andamento para multi-personal é,
                    por isso, a operação mais delicada da área. Quando puder,
                    prefira já criá-lo multi-personal.
                </p>

                <h3 className="h6 mt-3 mb-2">
                    5. Como o quadro de equipes pontua
                </h3>
                <p className="mb-2">
                    Comparar equipes de tamanhos diferentes é o problema central
                    da modalidade. Média simples premiaria quem convidou só os
                    três alunos mais assíduos; soma bruta premiaria mecanicamente
                    a maior carteira. Por isso cada equipe recebe{' '}
                    <strong>dois números, sempre exibidos juntos</strong>:
                </p>
                <ul className="mb-2 ps-3">
                    <li>
                        <strong>Taxa bruta</strong> — o percentual direto de
                        dias da janela em que um aluno típico daquela equipe
                        registrou treino com foto. É o número local, que você
                        confere de cabeça.
                    </li>
                    <li>
                        <GlossaryLink id="taxa-ajustada-equipe">
                            <strong>Taxa ajustada</strong>
                        </GlossaryLink>{' '}
                        — a que <em>classifica</em>. Ela mistura a taxa da equipe
                        com a média do desafio, dando mais peso ao número próprio
                        quanto mais alunos a equipe tiver. Uma equipe de 5 confia
                        metade no número dela; uma de 30, quase inteiramente.
                    </li>
                </ul>
                <p className="mb-2">
                    Efeito colateral assumido: como a média do desafio entra na
                    conta, o score de uma equipe se move quando{' '}
                    <em>outra</em> equipe treina. É o preço de comparar times
                    desiguais com honestidade — e é por isso que a taxa bruta
                    aparece do lado. Equipe com menos de{' '}
                    <strong>3 alunos ativos</strong> aparece no quadro mas fica{' '}
                    <strong>fora de classificação</strong>: esconder pareceria
                    bug e tiraria de você a chance de perceber que falta um aluno
                    para entrar na disputa. O quadro é sempre{' '}
                    <strong>parcial</strong> até o desafio encerrar.
                </p>

                <h3 className="h6 mt-3 mb-2">6. A meta do modo colaborativo</h3>
                <ul className="mb-2 ps-3">
                    <li>
                        A meta é o total de{' '}
                        <strong>dias qualificantes somados pelo grupo</strong>.
                        O app sugere um número (cerca de metade dos dias da
                        janela por participante previsto), mas quem decide é
                        você — e ele <strong>não se move sozinho</strong> quando
                        entra mais aluno, justamente para não virar trivial ou
                        impossível sem ninguém ter decidido nada.
                    </li>
                    <li>
                        A meta é <strong>imutável depois do início</strong>, pela
                        mesma razão da modalidade.
                    </li>
                    <li>
                        A barra mostra o percentual, os dias restantes e, a
                        partir do <strong>terceiro dia</strong>, uma projeção de
                        onde o grupo chega no ritmo atual (antes disso a
                        projeção oscilaria demais para significar algo).
                    </li>
                    <li>
                        Ao bater a meta, <strong>todo mundo é notificado uma
                        única vez</strong> e o desafio <em>continua</em> até a
                        data final — o excedente aparece como &ldquo;dias além da
                        meta&rdquo;.
                    </li>
                    <li>
                        Não bater a meta <strong>não gera nada</strong>: nem
                        notificação, nem marca negativa, nem penalidade. O app só
                        registra o percentual alcançado. Transformar o fim da
                        janela em cobrança destruiria o ponto da modalidade.
                    </li>
                    <li>
                        Abaixo da barra aparece a{' '}
                        <strong>contribuição por equipe</strong> — contribuição,
                        não colocação. Não há vencedor no colaborativo.
                    </li>
                </ul>

                <h3 className="h6 mt-3 mb-2">
                    7. Transferir a titularidade
                </h3>
                <p className="mb-2">
                    Só o organizador encerra, exclui, convida profissionais e
                    muda a regra do jogo. Se quem conduz o evento passa a ser
                    outro (ou você vai se ausentar), ofereça a titularidade: a
                    troca acontece em <strong>duas etapas</strong> — você oferece
                    e o colega precisa <strong>aceitar</strong>. Enquanto ele não
                    responde, nada muda, e você pode cancelar a oferta. Depois de
                    aceita, você <strong>continua no desafio</strong> como
                    participante, com os seus alunos — só deixa de poder encerrar
                    e excluir.
                </p>

                <p className="mb-0 small text-muted">
                    <strong>Para aproveitar melhor:</strong> combine com o colega{' '}
                    <em>antes</em> quem organiza, qual a modalidade e quem banca
                    o prêmio — a modalidade não pode ser trocada depois do
                    primeiro dia. Para uma primeira parceria, o{' '}
                    <strong>colaborativo</strong> costuma ser mais seguro que o
                    de equipes: ninguém sai perdedor, e a comparação entre as
                    carteiras não vira assunto.
                </p>
            </>
        ),
    },
    {
        id: 'desafios-antifraude',
        title: 'Antifraude: pose do dia e conferência de fotos',
        body: (
            <>
                <p className="mb-2">
                    <strong>Por que isso existe:</strong> a pontuação do desafio
                    é &ldquo;dias seguidos com foto&rdquo;, e foto, sozinha, não
                    prova nada — o envio aceita qualquer imagem da galeria. Basta
                    um aluno reciclar fotos para o mural virar piada e os que
                    treinaram de verdade perderem o interesse. Esta é a camada
                    que mantém o placar críível, e ela foi desenhada para custar
                    <strong> segundos por dia</strong> da sua rotina, não
                    minutos.
                </p>
                <p className="mb-2">
                    São <strong>duas camadas independentes</strong>: a{' '}
                    <strong>conferência</strong> (você olha as fotos e aceita ou
                    não) e a{' '}
                    <GlossaryLink id="pose-do-dia">pose do dia</GlossaryLink>{' '}
                    (o app sorteia uma pose e gera um código por aluno). Dá para
                    usar só a conferência, sem pose nenhuma.
                </p>

                <h3 className="h6 mt-3 mb-2">1. Ligar e configurar</h3>
                <p className="mb-2">
                    No card do desafio, abra{' '}
                    <strong>Antifraude, prêmio, conteúdo e grupo</strong> → aba{' '}
                    <strong>Antifraude</strong>. Lá você define:
                </p>
                <ul className="mb-2 ps-3">
                    <li>
                        <strong>Conferir as fotos deste desafio</strong> — liga a
                        fila de conferência.
                    </li>
                    <li>
                        <strong>Baralho de poses</strong> — escolha um baralho da
                        plataforma (disponível a todos) ou um baralho{' '}
                        <em>seu</em> (recurso{' '}
                        <Link href="#plano-pro">PRO</Link>). A opção{' '}
                        <strong>Sem pose</strong> mantém só a conferência.
                    </li>
                    <li>
                        <strong>Quando o dia passa a contar</strong> —{' '}
                        <em>Assim que a foto chega</em> (a recusa tira depois) ou{' '}
                        <em>Só depois de eu aceitar</em>.
                    </li>
                    <li>
                        <strong>Aceitar sozinho depois de (horas)</strong> — a
                        folga da política estrita, padrão 72h, máximo 336h (duas
                        semanas). Ela existe por um motivo importante: sem ela,
                        uma viagem sua congelaria o jogo de todos os alunos ao
                        mesmo tempo. A política pune fraude, não a ausência do
                        professor.
                    </li>
                </ul>
                <p className="mb-2">
                    Tudo isso só pode ser mudado{' '}
                    <strong>até o fim do dia de início</strong> — mesma janela da
                    modalidade, e pela mesma razão. Desligar o antifraude depois{' '}
                    <strong>não desfaz</strong> as recusas já feitas: aquela
                    decisão foi sua, olhando cada foto, e apagá-la em massa seria
                    pior.
                </p>

                <h3 className="h6 mt-3 mb-2">2. Como a pose funciona</h3>
                <ul className="mb-2 ps-3">
                    <li>
                        O sorteio é <strong>por dia</strong> e igual para o
                        desafio inteiro — você confere todos contra a{' '}
                        <em>mesma</em> carta.
                    </li>
                    <li>
                        O <strong>código do dia</strong> (quatro caracteres) é{' '}
                        <strong>diferente para cada aluno</strong>. É o que
                        fecha o conluio: a foto de um não serve para o outro.
                    </li>
                    <li>
                        O app estampa código e data na própria imagem no momento
                        da captura. Isso não é prova criptográfica — qualquer um
                        edita imagem. Serve para a foto reciclada ficar{' '}
                        <strong>visível em meio segundo</strong> para quem
                        confere.
                    </li>
                    <li>
                        A pose de <strong>dias futuros nunca é revelada</strong>.
                        É o que impede o aluno de fotografar as quinze poses no
                        domingo.
                    </li>
                    <li>
                        A mesma carta sempre vale para o mesmo dia, então
                        qualquer discussão de &ldquo;qual era a pose de
                        terça?&rdquo; tem resposta única.
                    </li>
                </ul>

                <h3 className="h6 mt-3 mb-2">3. A fila de conferência</h3>
                <p className="mb-2">
                    O botão <strong>Conferir fotos</strong> aparece no card
                    quando o antifraude está ligado — para o organizador{' '}
                    <em>e</em> para os personais membros, cada um vendo{' '}
                    <strong>apenas os próprios alunos</strong>. Na fila você tem:
                </p>
                <ul className="mb-2 ps-3">
                    <li>
                        A <strong>pose esperada ao lado da foto enviada</strong>:
                        conferir é olhar, não investigar.
                    </li>
                    <li>
                        <strong>Sinais automáticos</strong> como avisos — parece
                        repetida, relógio do aparelho fora de hora, registro
                        tardio, sem data de captura, data da foto não bate,
                        treino sem exercícios, sem pose (registrado offline).
                        Eles são <strong>avisos, nunca veredito</strong>: nada é
                        recusado automaticamente, a decisão é sempre sua.
                    </li>
                    <li>
                        <strong>Aceitar em lote</strong> tudo o que não tem
                        nenhum sinal — é o que faz a rotina caber em quem tem
                        vinte alunos.
                    </li>
                    <li>
                        Ao recusar, escolha o motivo (pose não confere, foto
                        parece repetida, código não aparece, não dá para
                        identificar o aluno, foto fora do contexto do treino,
                        outro) e, se quiser, escreva uma observação. O aluno vê
                        esse motivo.
                    </li>
                </ul>
                <p className="mb-2">
                    Recusar <strong>parte a sequência do aluno em duas</strong>,
                    e isso é intencional. Como a pontuação é calculada na
                    leitura, o mural reflete a sua decisão imediatamente.
                </p>

                <h3 className="h6 mt-3 mb-2">4. O lado do aluno</h3>
                <p className="mb-2">
                    O aluno vê um bloco <strong>Fotos não aceitas</strong> com a
                    data e o motivo de cada uma, e um botão{' '}
                    <strong>Discordo</strong>. Discordar{' '}
                    <strong>não reverte nada</strong>: marca a discordância e põe
                    o caso no topo da sua fila, para abrir conversa. A ideia é
                    que ninguém perca dias sem entender por quê — sem isso, a
                    feature vira sensação de perseguição e o aluno abandona o
                    desafio, que é o pior resultado possível.
                </p>
                <p className="mb-0 small text-muted">
                    <strong>Para aproveitar melhor:</strong> comece por{' '}
                    <em>Assim que a foto chega</em> — é o modo que não frustra
                    ninguém, e a recusa continua disponível. Guarde a política
                    estrita para desafios com prêmio de valor real. Confira em
                    lote uma vez por dia, no mesmo horário, e use a observação ao
                    recusar: uma linha de explicação evita a maior parte das
                    discordâncias. E não trate &ldquo;sem pose&rdquo; como
                    fraude: quase sempre é o aluno que registrou offline, o que o
                    app já permite de propósito.
                </p>
            </>
        ),
    },
    {
        id: 'desafios-extras',
        title: 'Prêmio e conteúdo exclusivo do desafio',
        body: (
            <>
                <p className="mb-2">
                    <strong>Por que isso existe:</strong> o mural dá ao aluno um
                    motivo para <em>continuar</em>; o prêmio e o material
                    exclusivo dão um motivo para <em>entrar</em> — e, no caso do
                    consentimento, para aceitar expor a própria foto. Os dois
                    ficam no card do desafio →{' '}
                    <strong>Antifraude, prêmio, conteúdo e grupo</strong>, ao
                    lado do{' '}
                    <Link href="#grupo-do-desafio">grupo e das redes</Link>.
                </p>

                <h3 className="h6 mt-3 mb-2">1. Prêmio</h3>
                <ul className="mb-2 ps-3">
                    <li>
                        O prêmio é sempre <strong>por mérito</strong> — a
                        classificação do mural. O app{' '}
                        <strong>não sorteia</strong>, e essa ausência é
                        deliberada e jurídica: distribuição gratuita de prêmio
                        mediante sorte é promoção comercial e depende de
                        autorização prévia. Não há, e não deve passar a haver,
                        caminho de sorteio nesta área.
                    </li>
                    <li>
                        Quem promete e entrega é <strong>você</strong>. A
                        plataforma registra, exibe no convite e no mural, e{' '}
                        <strong>cobra a entrega</strong> quando o desafio
                        termina.
                    </li>
                    <li>
                        Escolha quantas colocações ganham: só o campeão ou até o
                        pódio (máximo 3). No modo colaborativo o prêmio é do{' '}
                        <strong>grupo inteiro</strong>.
                    </li>
                    <li>
                        Antes do início, edição livre. Depois do início, só{' '}
                        <strong>para melhor</strong>: dá para aumentar o número
                        de premiados e corrigir o texto, nunca reduzir nem apagar.
                        Aumentar no meio do jogo é festa; diminuir é quebra de
                        promessa com quem já está competindo.
                    </li>
                    <li>
                        A entrega é registrada <strong>depois de encerrar</strong>{' '}
                        o desafio (premiar com o jogo rodando premiaria uma
                        classificação que ainda vai mudar), com um campo de
                        observação de como foi entregue. Depois de registrada, o
                        prêmio congela.
                    </li>
                    <li>
                        Desafio encerrado com prêmio prometido e sem entrega
                        registrada fica <strong>destacado na sua lista</strong>.
                        Prêmio prometido e não entregue faz mais mal à retenção
                        do que nunca ter havido prêmio.
                    </li>
                </ul>

                <h3 className="h6 mt-3 mb-2">2. Conteúdo exclusivo</h3>
                <ul className="mb-2 ps-3">
                    <li>
                        <strong>Treino geral do desafio</strong> — uma lista de
                        exercícios (séries, reps, descanso, observações) igual
                        para todos os participantes. É{' '}
                        <strong>leitura, não prescrição</strong>: não vira
                        registro de treino, não entra na periodização de ninguém
                        e não tem carga por aluno. Os exercícios se vinculam à{' '}
                        <Link href="#exercicios">biblioteca</Link> para herdar
                        nome e mídia, em vez de virarem links soltos que
                        dessincronizam.
                    </li>
                    <li>
                        <strong>Guia alimentar</strong> — material{' '}
                        <strong>educativo</strong> de apoio (hábitos, hidratação,
                        lista de alimentos), com título, texto e um PDF ou imagem
                        opcional. É <strong>um só para o desafio inteiro</strong>,
                        e nunca por aluno: conteúdo individualizado é justamente
                        o que caracterizaria prescrição dietética, ato privativo
                        de nutricionista. A tela do aluno exibe um aviso fixo e
                        não editável de que não substitui consulta — e este bloco
                        não se mistura com o{' '}
                        <Link href="#plano-alimentar-personal">
                            plano alimentar
                        </Link>
                        , que é individual.
                    </li>
                    <li>
                        Quem só foi convidado vê que existe material exclusivo,
                        mas <strong>bloqueado</strong>. É o gancho do convite.
                    </li>
                </ul>

                <h3 className="h6 mt-3 mb-2">3. E o grupo do desafio</h3>
                <p className="mb-2">
                    O terceiro gancho — o link do grupo de WhatsApp/Telegram e o
                    seu Instagram — tem seção própria, com as regras de quais
                    endereços são aceitos e o que o aluno enxerga antes de
                    entrar: ver{' '}
                    <Link href="#grupo-do-desafio">
                        Grupo e redes do desafio
                    </Link>
                    . Diferente do prêmio, esses links podem ser trocados a
                    qualquer momento, inclusive com o desafio em andamento.
                </p>

                <p className="mb-0 small text-muted">
                    <strong>Para aproveitar melhor:</strong> prêmio pequeno e
                    certo vale mais que prêmio grande e vago — uma sessão extra,
                    uma avaliação, um mês de acompanhamento. Deixe o prêmio e o
                    grupo prontos <em>antes</em> de convidar: os dois aparecem no
                    convite e mudam a taxa de aceite. E use o grupo para publicar
                    a pose do dia e o mural — é o que transforma um placar em
                    evento.
                </p>
            </>
        ),
    },
    {
        id: 'grupo-do-desafio',
        title: 'Grupo e redes do desafio (WhatsApp e Instagram)',
        body: (
            <>
                <p className="mb-2">
                    No desafio <strong>entre alunos</strong>, abra{' '}
                    <strong>Antifraude, prêmio, conteúdo e grupo</strong> e vá
                    até a aba <strong>Grupo</strong>. Ali você cola até três
                    links: o convite do grupo de WhatsApp ou Telegram e o seu
                    Instagram (perfil ou convite de grupo). Eles aparecem na
                    tela do desafio de quem já aceitou participar — o convidado
                    que ainda não aceitou não vê.
                </p>
                <p className="mb-2">
                    Só aceitamos endereços em https de{' '}
                    <code>chat.whatsapp.com</code>, <code>t.me</code>,{' '}
                    <code>instagram.com</code> e <code>ig.me</code>. É uma
                    restrição de segurança: esse link é exibido aos seus alunos
                    com a credibilidade do app, e um endereço qualquer ali
                    viraria porta de golpe.
                </p>
                <p className="mb-0">
                    A Venafit não modera esses grupos, e quem sai do desafio
                    continua dentro do grupo — remover é trabalho manual seu.
                    Os links ficam visíveis no card do desafio para você
                    conferir se ainda funcionam (convite de grupo expira).
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
        id: 'minha-pagina',
        title: 'Minha Página (vitrine)',
        pro: true,
        body: (
            <>
                <p className="mb-2">
                    <strong>Minha Página</strong> é a sua vitrine: a tela que
                    os seus alunos vinculados veem ao entrar no app. Nela você
                    apresenta sua foto, bio, especialidades, resultados,
                    números (alunos, anos de experiência, avaliação) e links
                    de Instagram, YouTube e WhatsApp.
                </p>
                <p className="mb-0">
                    As cores vêm de paletas prontas, escolhidas na aba{' '}
                    <Link href="#personalizacao">Personalização</Link>. É um
                    recurso do <Link href="#plano-pro">plano PRO</Link> — no
                    gratuito, o aluno entra direto na lista de treinos.
                </p>
            </>
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
        id: 'conta',
        title: 'Minha Conta e privacidade',
        body: (
            <>
                <p className="mb-2">
                    Em <strong>Minha Conta</strong> você corrige os dados do
                    seu cadastro — nome, e-mail e telefone. O CPF fica
                    visível, mas não é editável por aqui.
                </p>
                <p className="mb-0">
                    Na mesma tela você baixa uma cópia de todos os seus dados
                    (perfil, alunos, histórico e assinatura) ou pede a
                    exclusão definitiva da conta, que anonimiza seus dados de
                    forma irreversível. Os detalhes estão na{' '}
                    <Link href="/politica-privacidade">
                        Política de Privacidade
                    </Link>
                    .
                </p>
            </>
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
