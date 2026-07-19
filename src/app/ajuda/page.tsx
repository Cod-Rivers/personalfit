import type { Metadata } from 'next';
import Link from 'next/link';
import { microcycleHelpTopics } from '@/libs/microcycleHelpContent';

export const metadata: Metadata = {
    title: 'Central de Ajuda — Venafit',
};

interface HelpSection {
    id: string;
    title: string;
    body: React.ReactNode;
}

const generalSections: HelpSection[] = [
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
                Em <strong>Planos estilo famosos</strong> (disponível para
                assinantes PRO), você pode escolher um modelo de treino
                pronto e aplicá-lo como seu plano ativo — o plano em
                andamento é marcado como concluído e o novo entra no lugar.
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

export default function AjudaPage() {
    const tocSections = [
        { id: 'autorregulacao', title: 'Controle do Microciclo' },
        ...generalSections.map((s) => ({ id: s.id, title: s.title })),
    ];

    return (
        <div className="container py-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h1 className="h4 mb-0">Central de Ajuda</h1>
                <Link
                    href="/meus-treinos"
                    className="btn btn-outline-secondary btn-sm"
                >
                    Voltar
                </Link>
            </div>

            <p className="text-muted mb-4">
                Aqui você encontra uma explicação rápida de cada funcionalidade
                do Venafit. Toque em um tópico para ir direto até ele.
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
                        </a>
                    ))}
                </div>
            </nav>

            <section id="autorregulacao" className="card mb-3">
                <div className="card-body">
                    <h2 className="h6">Controle do Microciclo (Autorregulação)</h2>
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

            {generalSections.map((section) => (
                <section
                    id={section.id}
                    key={section.id}
                    className="card mb-3"
                >
                    <div className="card-body">
                        <h2 className="h6">{section.title}</h2>
                        {section.body}
                    </div>
                </section>
            ))}

            <div className="text-muted small mt-4">
                Não encontrou o que precisava? Fale com seu personal trainer
                pelo app ou entre em contato pelo suporte.
            </div>
        </div>
    );
}
