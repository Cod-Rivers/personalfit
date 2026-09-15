import Link from 'next/link';
import ExcluirContaForm from './ExcluirContaForm';

export const metadata = {
    title: 'Excluir conta e dados — Venafit',
    description:
        'Como pedir a exclusão da sua conta Venafit e dos seus dados, o que é apagado, o que é retido e por quanto tempo.',
    alternates: { canonical: '/excluir-conta' },
};

const CONTATO_PRIVACIDADE = 'riversonsmorais@gmail.com';

/**
 * Página PÚBLICA de exclusão de conta e de dados.
 *
 * Existe para atender a política de exclusão de dados do Google Play, que
 * exige uma URL acessível SEM instalar o app e SEM fazer login, onde o usuário
 * possa pedir a exclusão da conta e saber o que é apagado, o que é retido e
 * por quanto tempo. É esta URL que vai declarada no Play Console, em
 * Política → Segurança de dados → Exclusão de conta.
 *
 * Por isso a página é um Server Component estático, sem nenhum guard de sessão
 * e sem nada que dependa de estar logado: o revisor da loja precisa abri-la
 * direto, anônimo, e ler tudo.
 */
export default function ExcluirContaPage() {
    return (
        <div className="container py-5" style={{ maxWidth: 800 }}>
            <h1 className="mb-1 fw-bold">Excluir conta e dados</h1>
            <p className="text-secondary mb-4">
                Aplicativo <strong>Venafit</strong>, desenvolvido por{' '}
                <strong>Riverson Morais</strong>. Esta página explica como pedir
                a exclusão da sua conta e dos seus dados, o que é apagado e o
                que precisa ser guardado por obrigação legal.
            </p>

            <section className="mb-4">
                <h2 className="h5 fw-semibold">
                    Opção 1 — Excluir pelo aplicativo (imediato)
                </h2>
                <p>
                    Se você ainda consegue entrar na sua conta, este é o caminho
                    mais rápido. A exclusão acontece na hora, sem espera e sem
                    precisar falar com ninguém.
                </p>
                <ol>
                    <li>
                        Abra o aplicativo Venafit ou acesse o site e faça login.
                    </li>
                    <li>
                        Toque no seu perfil e escolha <strong>Minha Conta</strong>
                        .
                    </li>
                    <li>
                        Desça até <strong>Zona de perigo</strong> e toque em{' '}
                        <strong>Excluir minha conta</strong>.
                    </li>
                    <li>
                        Confirme em <strong>Sim, excluir minha conta</strong>.
                    </li>
                </ol>
                <p className="mb-0">
                    Antes de excluir, você pode baixar uma cópia de todos os seus
                    dados na mesma tela, em <strong>Baixar meus dados</strong>.
                </p>
            </section>

            <section className="mb-4">
                <h2 className="h5 fw-semibold">
                    Opção 2 — Pedir a exclusão por aqui (sem login)
                </h2>
                <p>
                    Use esta opção se você desinstalou o aplicativo, perdeu a
                    senha ou não consegue mais acessar sua conta. Informe o
                    e-mail cadastrado e enviaremos um link de confirmação para
                    ele. Só quem tem acesso a essa caixa de entrada consegue
                    concluir a exclusão, e nada é apagado antes da confirmação.
                </p>
                <div className="card">
                    <div className="card-body">
                        <ExcluirContaForm />
                    </div>
                </div>
                <p
                    className="text-secondary mt-3 mb-0"
                    style={{ fontSize: '0.9rem' }}
                >
                    Não recebeu o e-mail? Confira a caixa de spam ou escreva para{' '}
                    <a href={`mailto:${CONTATO_PRIVACIDADE}`}>
                        {CONTATO_PRIVACIDADE}
                    </a>
                    . Pedidos enviados por e-mail são respondidos em até 15 dias.
                    Para confirmarmos sua identidade, escreva do mesmo e-mail
                    cadastrado na conta.
                </p>
            </section>

            <section className="mb-4">
                <h2 className="h5 fw-semibold">O que é apagado</h2>
                <p>
                    Assim que a exclusão é confirmada, estes dados são apagados
                    ou substituídos por valores anônimos, de forma permanente e
                    irreversível:
                </p>
                <ul>
                    <li>
                        <strong>Identificação:</strong> nome, e-mail, CPF,
                        telefone e foto de perfil.
                    </li>
                    <li>
                        <strong>Dados de saúde:</strong> respostas da anamnese,
                        dores e restrições relatadas, liberações, avaliações
                        físicas (peso, medidas e percentual de gordura) e plano
                        alimentar.
                    </li>
                    <li>
                        <strong>Fotos e arquivos:</strong> fotos de check-in de
                        treino, inclusive as que apareciam no mural de um
                        desafio, fotos das avaliações físicas e os PDFs de plano
                        alimentar e de treino importado.
                    </li>
                    <li>
                        <strong>Treinos:</strong> planos de treino, protocolo
                        atribuído, observações do seu personal trainer,
                        histórico de treinos executados (séries, cargas, esforço
                        e anotações), cargas salvas e as notas que você deu aos
                        treinos.
                    </li>
                    <li>
                        <strong>Inteligência artificial:</strong> as
                        substituições de exercício sugeridas para você, com o
                        nível e as restrições usados para escolhê-las.
                    </li>
                    <li>
                        <strong>Credenciais e acesso:</strong> senha e todas as
                        sessões ativas. Todos os aparelhos são desconectados na
                        hora.
                    </li>
                    <li>
                        <strong>Notificações:</strong> os identificadores usados
                        para enviar notificações push ao seu aparelho e as
                        notificações recebidas.
                    </li>
                    <li>
                        <strong>Personal trainer:</strong> vitrine, marca,
                        biografia, redes sociais e depoimentos publicados,
                        inclusive fotos e nomes de alunos que apareciam nela.
                    </li>
                </ul>
                <p className="mb-0">
                    Sua conta deixa de existir para efeito de uso: o login para
                    de funcionar, seu personal trainer deixa de ver você e você
                    sai de qualquer desafio em andamento.
                </p>
            </section>

            <section className="mb-4">
                <h2 className="h5 fw-semibold">
                    O que é retido, por quanto tempo e por quê
                </h2>
                <div className="table-responsive">
                    <table className="table table-sm align-middle">
                        <thead>
                            <tr>
                                <th scope="col">Dado</th>
                                <th scope="col">Prazo</th>
                                <th scope="col">Motivo</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>
                                    Registros financeiros da assinatura
                                    (cobranças e pagamentos)
                                </td>
                                <td>5 anos</td>
                                <td>
                                    Obrigação fiscal (Lei 9.249/95). Depois desse
                                    prazo o cadastro é apagado em definitivo.
                                </td>
                            </tr>
                            <tr>
                                <td>Registros de acesso ao sistema</td>
                                <td>6 meses</td>
                                <td>
                                    Art. 15 do Marco Civil da Internet (Lei
                                    12.965/14).
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    Agendamentos com o personal trainer (data,
                                    horário e observações), faturas lançadas
                                    por ele e o registro do vínculo entre vocês
                                </td>
                                <td>Sem prazo definido</td>
                                <td>
                                    Fazem parte da agenda e do controle
                                    financeiro do personal trainer. Ficam
                                    ligados a um cadastro que não tem mais nome,
                                    e-mail, CPF nem telefone.
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    Quantidade de uso dos recursos de
                                    inteligência artificial
                                </td>
                                <td>Sem prazo definido</td>
                                <td>
                                    Entra só na conta de custo da plataforma,
                                    sem nenhuma ligação com o seu cadastro.
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    Registro da própria exclusão (data e ação)
                                </td>
                                <td>Enquanto durar o log de auditoria</td>
                                <td>
                                    Prova de que o seu pedido foi atendido,
                                    conforme o Art. 18 da LGPD.
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </section>

            <section className="mb-4">
                <h2 className="h5 fw-semibold">Antes de excluir, atenção</h2>
                <ul>
                    <li>
                        <strong>A exclusão não pode ser desfeita.</strong> Não há
                        período de arrependimento nem como recuperar a conta
                        depois. Para voltar a usar o Venafit será preciso criar
                        um cadastro novo, do zero.
                    </li>
                    <li>
                        <strong>
                            Excluir a conta não cancela sua assinatura.
                        </strong>{' '}
                        Se você assina pelo Google Play, cancele antes na{' '}
                        <strong>Play Store → Pagamentos e assinaturas</strong>.
                        Se assina por cartão ou PIX, cancele antes em Minha Conta
                        ou escreva para o e-mail de contato abaixo. Sem isso a
                        cobrança pode continuar.
                    </li>
                    <li>
                        <strong>Compras não são reembolsadas</strong> pela
                        exclusão da conta. O reembolso de compras feitas na Play
                        Store segue a política do Google.
                    </li>
                </ul>
            </section>

            <section className="mb-4">
                <h2 className="h5 fw-semibold">
                    Apagar só alguns dados, sem excluir a conta
                </h2>
                <p>
                    Você não precisa excluir tudo para retirar um dado
                    específico. Nome, e-mail e telefone podem ser alterados por
                    você mesmo em <strong>Minha Conta</strong>. Para revogar o
                    consentimento dos dados de saúde da anamnese, apagar suas
                    respostas ou pedir a remoção de uma foto ou avaliação
                    específica, escreva para{' '}
                    <a href={`mailto:${CONTATO_PRIVACIDADE}`}>
                        {CONTATO_PRIVACIDADE}
                    </a>
                    . Respondemos em até 15 dias.
                </p>
            </section>

            <section className="mb-4">
                <h2 className="h5 fw-semibold">Contato</h2>
                <p className="mb-0">
                    Encarregado pelo tratamento de dados pessoais (Art. 41 da
                    LGPD): <strong>Riverson Morais</strong> —{' '}
                    <a href={`mailto:${CONTATO_PRIVACIDADE}`}>
                        {CONTATO_PRIVACIDADE}
                    </a>
                    . Detalhes completos sobre o tratamento dos seus dados estão
                    na{' '}
                    <Link href="/politica-privacidade">
                        Política de Privacidade
                    </Link>
                    .
                </p>
            </section>

            <Link href="/" className="btn btn-outline-secondary btn-sm">
                Voltar ao início
            </Link>
        </div>
    );
}
