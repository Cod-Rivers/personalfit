import Link from 'next/link';

export const metadata = {
    title: 'Política de Privacidade — Venafit',
};

export default function PoliticaPrivacidadePage() {
    return (
        <div className="container py-5" style={{ maxWidth: 800 }}>
            <h1 className="mb-1 fw-bold">Política de Privacidade</h1>
            <p className="text-secondary mb-4">
                Última atualização: a preencher.
            </p>

            <div className="alert alert-warning" role="alert">
                <strong>Aviso interno — remover antes de publicar:</strong> o
                texto abaixo descreve, de forma técnica, os dados que o
                Venafit efetivamente coleta e trata hoje. Ele ainda{' '}
                <strong>não passou por revisão jurídica</strong> e não deve
                ser tratado como uma política de privacidade juridicamente
                válida até que um advogado especializado em proteção de dados
                a revise e complete os campos marcados como &ldquo;a
                preencher&rdquo;.
            </div>

            <section className="mb-4">
                <h2 className="h5 fw-semibold">1. Quem somos</h2>
                <p>
                    O Venafit é uma plataforma de acompanhamento de
                    treinos que conecta personal trainers e alunos.
                    Controlador dos dados: a preencher (razão social, CNPJ,
                    endereço).
                </p>
            </section>

            <section className="mb-4">
                <h2 className="h5 fw-semibold">2. Quais dados coletamos</h2>
                <ul>
                    <li>
                        <strong>Dados de identificação:</strong> nome,
                        e-mail, CPF, telefone e foto de perfil.
                    </li>
                    <li>
                        <strong>Dados de saúde (dado pessoal sensível):</strong>{' '}
                        respostas da anamnese e restrições/dores relatadas
                        para adaptação dos treinos.
                    </li>
                    <li>
                        <strong>Dados de treino:</strong> protocolos
                        atribuídos, progresso de exercícios, cargas e
                        observações registradas durante o treino.
                    </li>
                    <li>
                        <strong>Dados de pagamento:</strong> processados pelo
                        Asaas (nosso processador de pagamentos); não
                        armazenamos número completo de cartão de crédito.
                    </li>
                    <li>
                        <strong>Dados técnicos:</strong> tokens de
                        notificação push (Firebase Cloud Messaging), usados
                        apenas para envio de notificações do app.
                    </li>
                </ul>
            </section>

            <section className="mb-4">
                <h2 className="h5 fw-semibold">
                    3. Para que usamos seus dados
                </h2>
                <p>
                    Para viabilizar o acompanhamento de treinos entre você e
                    seu personal trainer, adaptar recomendações às suas
                    condições de saúde, processar pagamentos de assinatura e
                    enviar notificações relacionadas ao seu uso do app.
                </p>
            </section>

            <section className="mb-4">
                <h2 className="h5 fw-semibold">
                    4. Compartilhamento com terceiros
                </h2>
                <p>
                    Compartilhamos dados estritamente necessários com:{' '}
                    <strong>Asaas</strong> (processamento de pagamentos e
                    assinaturas) e <strong>Firebase/Google</strong> (envio de
                    notificações push). Não vendemos dados pessoais a
                    terceiros.
                </p>
            </section>

            <section className="mb-4">
                <h2 className="h5 fw-semibold">5. Seus direitos (Art. 18 LGPD)</h2>
                <ul>
                    <li>
                        <strong>Acesso e portabilidade:</strong> você pode
                        baixar uma cópia de todos os seus dados a qualquer
                        momento em{' '}
                        <Link href="/minha-conta">Minha Conta</Link>.
                    </li>
                    <li>
                        <strong>Eliminação:</strong> você pode excluir sua
                        conta a qualquer momento em{' '}
                        <Link href="/minha-conta">Minha Conta</Link>. Seus
                        dados de identificação e de saúde são anonimizados
                        imediatamente.
                    </li>
                    <li>
                        <strong>Correção:</strong> a preencher — descrever
                        como corrigir dados cadastrais incorretos.
                    </li>
                    <li>
                        <strong>Revogação de consentimento:</strong> a
                        preencher.
                    </li>
                </ul>
            </section>

            <section className="mb-4">
                <h2 className="h5 fw-semibold">6. Retenção de dados</h2>
                <p>
                    Ao excluir sua conta, seus dados de identificação e de
                    saúde são anonimizados imediatamente. Dados financeiros
                    ligados à assinatura são mantidos por 5 anos, conforme
                    obrigação fiscal (Lei 9.249/95).
                </p>
            </section>

            <section className="mb-4">
                <h2 className="h5 fw-semibold">7. Segurança</h2>
                <p>
                    Senhas são armazenadas com hash (bcrypt) e nunca em texto
                    puro. A preencher: detalhes de criptografia em repouso e
                    em trânsito, conforme configuração de infraestrutura.
                </p>
            </section>

            <section className="mb-4">
                <h2 className="h5 fw-semibold">
                    8. Encarregado de dados (DPO)
                </h2>
                <p>
                    A preencher: nome/contato do encarregado responsável por
                    solicitações relacionadas a dados pessoais.
                </p>
            </section>

            <Link href="/minha-conta" className="btn btn-outline-secondary btn-sm">
                ← Voltar para Minha Conta
            </Link>
        </div>
    );
}
