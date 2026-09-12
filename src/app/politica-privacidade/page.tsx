import Link from 'next/link';
import { FiArrowLeft } from 'react-icons/fi';
import ExternalLink from '@/components/atoms/ExternalLink';

export const metadata = {
    title: 'Política de Privacidade — Venafit',
    description:
        'Como o Venafit coleta, usa, compartilha e protege dados pessoais, incluindo dados de saúde, conforme a LGPD.',
    alternates: { canonical: '/politica-privacidade' },
};

const CONTATO_PRIVACIDADE = 'riversonsmorais@gmail.com';

export default function PoliticaPrivacidadePage() {
    return (
        <div className="container py-5" style={{ maxWidth: 800 }}>
            <h1 className="mb-1 fw-bold">Política de Privacidade</h1>
            <p className="text-secondary mb-4">
                Última atualização: 10 de setembro de 2026.
            </p>

            <section className="mb-4">
                <h2 className="h5 fw-semibold">1. Quem somos</h2>
                <p>
                    O Venafit é uma plataforma de acompanhamento de treinos que
                    conecta personal trainers e alunos, disponível como
                    aplicativo Android e como site.
                </p>
                <p>
                    O controlador dos dados, nos termos do Art. 5º, VI da Lei
                    13.709/2018 (LGPD), é <strong>Riverson Morais</strong>,
                    pessoa física responsável pelo desenvolvimento e pela
                    operação do Venafit, contatável pelo e-mail{' '}
                    <a href={`mailto:${CONTATO_PRIVACIDADE}`}>
                        {CONTATO_PRIVACIDADE}
                    </a>
                    .
                </p>
            </section>

            <section className="mb-4">
                <h2 className="h5 fw-semibold">2. Quais dados coletamos</h2>
                <ul>
                    <li>
                        <strong>Dados de identificação:</strong> nome, e-mail,
                        CPF, telefone e foto de perfil.
                    </li>
                    <li>
                        <strong>Dados de saúde (dado pessoal sensível):</strong>{' '}
                        respostas da anamnese, restrições e dores relatadas,
                        medidas e avaliações físicas, e fotos de avaliação que
                        você opte por enviar.
                    </li>
                    <li>
                        <strong>Dados de treino:</strong> protocolos atribuídos,
                        progresso de exercícios, cargas, séries, repetições,
                        percepção de esforço e observações registradas durante o
                        treino.
                    </li>
                    <li>
                        <strong>Fotos de check-in:</strong> quando você confirma
                        a realização de um treino com foto, a imagem fica
                        visível para o seu personal trainer.
                    </li>
                    <li>
                        <strong>Dados de pagamento:</strong> processados pelo
                        Asaas e pelo Google Play. Não armazenamos número
                        completo de cartão de crédito.
                    </li>
                    <li>
                        <strong>Dados técnicos:</strong> tokens de notificação
                        push (Firebase Cloud Messaging), registros de acesso e
                        identificadores de sessão, usados para operar e proteger
                        o serviço.
                    </li>
                </ul>
                <p>
                    O aplicativo Android solicita apenas as permissões de
                    internet, estado da rede, vibração e envio de notificações.
                    Não acessamos sua agenda, seus contatos, seu microfone nem
                    sua localização em segundo plano.
                </p>
            </section>

            <section className="mb-4">
                <h2 className="h5 fw-semibold">3. Para que usamos seus dados</h2>
                <p>
                    Para viabilizar o acompanhamento de treinos entre você e seu
                    personal trainer, adaptar recomendações às suas condições de
                    saúde, processar pagamentos de assinatura, enviar
                    notificações relacionadas ao seu uso do app e manter a
                    segurança da plataforma.
                </p>
                <p>
                    As bases legais são a <strong>execução de contrato</strong>{' '}
                    (Art. 7º, V) para a prestação do serviço, o{' '}
                    <strong>consentimento específico e destacado</strong> (Art.
                    11, I) para os dados de saúde coletados na anamnese, o{' '}
                    <strong>cumprimento de obrigação legal</strong> (Art. 7º, II)
                    para registros fiscais, e o{' '}
                    <strong>legítimo interesse</strong> (Art. 7º, IX) para
                    segurança e prevenção a fraude.
                </p>
            </section>

            <section className="mb-4">
                <h2 className="h5 fw-semibold">
                    4. Compartilhamento com terceiros
                </h2>
                <p>
                    Compartilhamos apenas os dados estritamente necessários, com
                    os seguintes operadores:
                </p>
                <ul>
                    <li>
                        <strong>Seu personal trainer:</strong> profissional que
                        você escolhe vincular à sua conta. Ele acessa sua
                        anamnese, avaliações, fotos de check-in e histórico de
                        treinos para prescrever e acompanhar seu plano.
                    </li>
                    <li>
                        <strong>Asaas:</strong> processamento de pagamentos e
                        assinaturas.
                    </li>
                    <li>
                        <strong>Google Play Billing:</strong> processamento de
                        compras feitas dentro do aplicativo Android.
                    </li>
                    <li>
                        <strong>Google Firebase Cloud Messaging:</strong> envio
                        de notificações push.
                    </li>
                    <li>
                        <strong>Google Cloud Platform:</strong> hospedagem da
                        aplicação.
                    </li>
                    <li>
                        <strong>MongoDB Atlas:</strong> banco de dados.
                    </li>
                    <li>
                        <strong>Cloudflare R2:</strong> armazenamento de imagens
                        e vídeos.
                    </li>
                    <li>
                        <strong>Google Gemini:</strong> sugestão de substituição
                        de exercícios, conforme a seção 6.
                    </li>
                    <li>
                        <strong>Google AdSense:</strong> exibição de anúncios no
                        plano gratuito, conforme a seção 5.
                    </li>
                </ul>
                <p>
                    Não vendemos dados pessoais a terceiros e não compartilhamos
                    dados de saúde com anunciantes.
                </p>
            </section>

            <section className="mb-4">
                <h2 className="h5 fw-semibold">5. Anúncios</h2>
                <p>
                    Usuários do plano gratuito veem anúncios servidos pelo
                    Google AdSense. Para isso, o Google pode usar cookies e
                    identificadores de publicidade a fim de exibir e medir
                    anúncios. Assinantes do plano PRO não recebem anúncios, e o
                    script de anúncios não é carregado para eles.
                </p>
                <p>
                    Você pode gerenciar suas preferências de anúncios do Google
                    em{' '}
                    <ExternalLink href="https://myadcenter.google.com/">
                        myadcenter.google.com
                    </ExternalLink>
                    . Seus dados de saúde e de treino nunca são enviados ao
                    AdSense nem usados para segmentar anúncios.
                </p>
            </section>

            <section className="mb-4">
                <h2 className="h5 fw-semibold">
                    6. Uso de inteligência artificial
                </h2>
                <p>
                    O Venafit usa o Google Gemini para sugerir substituições de
                    exercícios quando um movimento não é adequado a você. Nesse
                    processo enviamos apenas o contexto técnico necessário, como
                    nome do exercício, grupo muscular, equipamento disponível e
                    a restrição informada.
                </p>
                <p>
                    Não enviamos seu nome, e-mail, CPF, telefone, fotos nem
                    qualquer dado que identifique você diretamente. As sugestões
                    são recomendações automatizadas de apoio e não substituem a
                    avaliação do seu personal trainer ou de um profissional de
                    saúde. Você pode pedir a revisão humana de qualquer sugestão
                    falando com seu personal trainer ou escrevendo para{' '}
                    <a href={`mailto:${CONTATO_PRIVACIDADE}`}>
                        {CONTATO_PRIVACIDADE}
                    </a>
                    .
                </p>
            </section>

            <section className="mb-4">
                <h2 className="h5 fw-semibold">
                    7. Transferência internacional
                </h2>
                <p>
                    Os operadores listados na seção 4 podem processar e
                    armazenar dados em servidores fora do Brasil. Essas
                    transferências ocorrem com base no Art. 33 da LGPD e são
                    limitadas ao necessário para a prestação do serviço.
                </p>
            </section>

            <section className="mb-4">
                <h2 className="h5 fw-semibold">
                    8. Seus direitos (Art. 18 LGPD)
                </h2>
                <ul>
                    <li>
                        <strong>Acesso e portabilidade:</strong> você pode
                        baixar uma cópia de todos os seus dados a qualquer
                        momento em <Link href="/minha-conta">Minha Conta</Link>.
                    </li>
                    <li>
                        <strong>Eliminação:</strong> você pode excluir sua conta
                        a qualquer momento em{' '}
                        <Link href="/minha-conta">Minha Conta</Link>. Seus dados
                        de identificação e de saúde são anonimizados
                        imediatamente.
                    </li>
                    <li>
                        <strong>Correção:</strong> dados cadastrais como nome,
                        telefone e foto podem ser editados diretamente em{' '}
                        <Link href="/minha-conta">Minha Conta</Link>. Respostas
                        da anamnese e avaliações físicas são corrigidas pelo seu
                        personal trainer. Se algum dado não puder ser corrigido
                        pelo app, escreva para{' '}
                        <a href={`mailto:${CONTATO_PRIVACIDADE}`}>
                            {CONTATO_PRIVACIDADE}
                        </a>{' '}
                        e faremos a correção.
                    </li>
                    <li>
                        <strong>Revogação de consentimento:</strong> o
                        consentimento para o tratamento dos dados de saúde da
                        anamnese pode ser revogado a qualquer momento pelo
                        e-mail acima. A revogação apaga suas respostas de
                        anamnese e interrompe a adaptação automática dos treinos
                        às suas restrições, o que significa que o serviço passa
                        a funcionar de forma limitada. Excluir a conta revoga
                        todos os consentimentos de uma vez.
                    </li>
                    <li>
                        <strong>
                            Informação sobre compartilhamento e oposição:
                        </strong>{' '}
                        você pode solicitar a lista de com quem seus dados foram
                        compartilhados, ou se opor a um tratamento específico,
                        pelo e-mail acima.
                    </li>
                </ul>
                <p>
                    Respondemos a solicitações de privacidade em até 15 dias.
                    Para confirmar sua identidade, pedimos que o contato venha
                    do mesmo e-mail cadastrado na conta.
                </p>
            </section>

            <section className="mb-4">
                <h2 className="h5 fw-semibold">
                    9. Biblioteca pública de modelos de treino (personal
                    trainers)
                </h2>
                <p>
                    Personal trainers podem salvar planos de treino como{' '}
                    <strong>modelos reutilizáveis</strong> (templates), fora do
                    plano de um aluno específico.
                </p>
                <ul>
                    <li>
                        <strong>Plano gratuito:</strong> todo modelo criado ou
                        salvo é automaticamente tornado{' '}
                        <strong>público</strong> e entra em fila de revisão da
                        equipe Venafit antes de aparecer na biblioteca pública
                        para outros usuários. Não é possível manter modelos
                        privados no plano gratuito.
                    </li>
                    <li>
                        <strong>Plano PRO:</strong> você escolhe livremente se
                        cada modelo fica público (sujeito à mesma revisão) ou
                        privado (visível só para você, sem revisão).
                    </li>
                </ul>
                <p>
                    Essa regra vale apenas para modelos e templates salvos
                    separadamente da biblioteca pública. Modelos publicados não
                    carregam dados pessoais de alunos, e os planos de treino que
                    você monta para um aluno específico nunca são tornados
                    públicos por essa regra.
                </p>
            </section>

            <section className="mb-4">
                <h2 className="h5 fw-semibold">10. Retenção de dados</h2>
                <p>
                    Ao excluir sua conta, seus dados de identificação e de saúde
                    são anonimizados imediatamente. Dados financeiros ligados à
                    assinatura são mantidos por 5 anos, conforme obrigação
                    fiscal (Lei 9.249/95). Registros de acesso são mantidos por
                    6 meses, conforme o Art. 15 do Marco Civil da Internet.
                </p>
            </section>

            <section className="mb-4">
                <h2 className="h5 fw-semibold">11. Segurança</h2>
                <p>
                    Todo o tráfego entre o aplicativo e nossos servidores usa
                    HTTPS com TLS, com HSTS habilitado. Senhas são armazenadas
                    com hash bcrypt e nunca em texto puro. O banco de dados e o
                    armazenamento de mídia ficam criptografados em repouso pelos
                    provedores MongoDB Atlas e Cloudflare R2. O acesso
                    administrativo é restrito, e as ações sobre dados pessoais
                    ficam registradas em log de auditoria.
                </p>
                <p>
                    Nenhum sistema é totalmente imune a incidentes. Em caso de
                    incidente de segurança que possa acarretar risco relevante a
                    você, comunicaremos você e a Autoridade Nacional de Proteção
                    de Dados conforme o Art. 48 da LGPD.
                </p>
            </section>

            <section className="mb-4">
                <h2 className="h5 fw-semibold">12. Crianças e adolescentes</h2>
                <p>
                    O Venafit não é destinado a menores de 18 anos. O uso por
                    adolescentes só é permitido com o consentimento e o
                    acompanhamento de pelo menos um dos pais ou do responsável
                    legal, nos termos do Art. 14 da LGPD. Se identificarmos uma
                    conta de menor sem esse consentimento, ela é excluída.
                </p>
            </section>

            <section className="mb-4">
                <h2 className="h5 fw-semibold">13. Encarregado e contato</h2>
                <p>
                    O encarregado pelo tratamento de dados pessoais, nos termos
                    do Art. 41 da LGPD, é <strong>Riverson Morais</strong>.
                    Pedidos de acesso, correção, exclusão, portabilidade,
                    revogação de consentimento e qualquer dúvida sobre esta
                    política devem ser enviados para{' '}
                    <a href={`mailto:${CONTATO_PRIVACIDADE}`}>
                        {CONTATO_PRIVACIDADE}
                    </a>
                    .
                </p>
            </section>

            <section className="mb-4">
                <h2 className="h5 fw-semibold">14. Alterações desta política</h2>
                <p>
                    Podemos atualizar esta política para refletir mudanças no
                    serviço ou na legislação. A data no topo da página indica a
                    última revisão. Mudanças relevantes são comunicadas dentro do
                    aplicativo antes de entrarem em vigor.
                </p>
            </section>

            <Link
                href="/minha-conta"
                className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center gap-2"
            >
                <FiArrowLeft /> Voltar para Minha Conta
            </Link>
        </div>
    );
}
