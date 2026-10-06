'use client';
import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { FiArrowLeft } from 'react-icons/fi';

import './styles.css';
import {
    CardSubscriptionForm,
    PlanCatalog,
    ProTrialStatus,
    StudentPlusStatus,
    SubscribePixResponse,
    daysUntil,
    getPlans,
    getProTrialStatus,
    getStudentPlusStatus,
    isGooglePlayBillingAvailable,
    isPersonalPlanPaymentConfirmed,
    getProPlanStatus,
    pixPlanPaymentConfirmed,
    launchGooglePlayPurchase,
    purchaseLibraryPlanCard,
    purchaseLibraryPlanPix,
    purchaseLockedPlanCard,
    purchaseLockedPlanPix,
    startProTrial,
    subscribeProCard,
    subscribeProPix,
    subscribeStudentPlusCard,
    verifyGooglePlayPurchase,
} from '@/libs/paymentService';
import {
    ReferralPartnerPublic,
    getActiveReferralPartners,
} from '@/libs/referralPartnerService';
import PersonalPlanLadder, { type LadderPlan } from '@/components/features/PersonalPlanLadder';
import {
    getStudentHomeRoute,
    getUser,
    planRank,
    updateSessionPlanType,
} from '@/libs/session';
import { getMyPlannings } from '@/libs/planningService';
import { trackTrialStarted } from '@/libs/analytics';

// Valor fixo para "sem indicação" — usado tanto aqui quanto interpretado no
// backend/estatísticas (ver ReferralPartnerController.GetIndicationStats).
const INDICATION_NONE = 'none';

// 'pro' e 'personal-plus' são os dois planos do PERSONAL; 'plano' é a compra
// avulsa de um treino da biblioteca e 'plus' é o Aluno Plus (do aluno).
type Produto = 'pro' | 'personal-plus' | 'plano' | 'plus';
type Metodo = 'pix' | 'card' | 'google';

const CYCLE_LABELS: Record<string, string> = {
    MONTHLY: 'Mensal',
    SEMIANNUALLY: 'Semestral',
    YEARLY: 'Anual',
};

// Os planos do personal e o que cada um desbloqueia — exibidos para o cliente
// entender o que está pagando.
//
// Benefícios do Personal Plus: o que tem custo marginal perto de zero para a
// nossa infraestrutura (texto no banco), e por isso cabe num preço menor.
// Ver Todo/PLANO_PERSONAL_PLUS.md §1.
const PERSONAL_PLUS_BENEFITS = [
    'Alunos ilimitados (o plano gratuito vai até 3)',
    'Sua marca no app do aluno: logo, cores e vitrine de divulgação',
    'Financeiro: mensalidade automática, lembretes aos alunos e bloqueio de quem atrasar',
    'Painel de retenção completo: quem está parando de treinar e há quanto tempo',
    'Sem anúncios para você e para seus alunos',
    'Links de vídeo do YouTube e do Vimeo nos seus exercícios',
    'Cancele quando quiser, sem fidelidade',
];

// O que o PRO acrescenta ao Plus (IA, mídia própria, agenda, plano alimentar)
// não é repetido aqui: quem compara os dois planos lê a tabela do
// PersonalPlanLadder, que é a fonte única da comparação.
const PRO_BENEFITS = [
    'Alunos ilimitados (o plano gratuito vai até 3)',
    'Agenda com controle de presença, recorrências e remarcações',
    'Financeiro: mensalidade automática, lembretes aos alunos e bloqueio de quem atrasar',
    'Painel de retenção completo: quem está parando de treinar e há quanto tempo',
    'Sua marca (logo e identidade) no app dos seus alunos',
    'Monte e gerencie o plano alimentar dos seus alunos',
    'Vídeos e mídia própria nos seus exercícios',
    'Substituição Inteligente de Exercícios para os seus alunos',
    'Fotos nas avaliações físicas dos alunos (medidas e gráficos são grátis)',
    'Evolução de carga: comparar exercícios, cruzar com a avaliação e relatório para o aluno',
    'Seus ciclos de treino ficam privados (fora da biblioteca pública)',
    'Sem anúncios para você e para seus alunos',
];

// Benefícios da compra avulsa de um plano da biblioteca "estilo-famosos".
const PLANO_BENEFITS = [
    'Um plano de treino completo, pronto para começar',
    'Vira o seu treino ativo assim que o pagamento é confirmado',
    'Baixe para treinar offline, onde e quando quiser',
];

// Manter o plano que o personal montou, bloqueado no desvínculo do fim da
// espera do plano gratuito (produto=plano&planId=...). Mesmo produto e preço.
const MANTER_BENEFITS = [
    'O mesmo treino que o seu personal montou, com tudo o que você já registrou',
    'Volta para Meus Treinos assim que o pagamento é confirmado',
    'Fica com você: baixe para treinar offline quando quiser',
];

// Benefícios do Aluno Plus (aluno sem personal). Ver
// Todo/PLANO_MONETIZACAO_FREE_PRO.md §5.2.
const PLUS_BENEFITS = [
    'Sem anúncios',
    'Substituição Inteligente de Exercícios: sugestões de troca quando o aparelho do seu treino está ocupado',
    'Links de vídeo do Instagram e do TikTok no treino que você monta',
    'Mais importações de treino por PDF: 2 por mês em vez de 1',
    'Cancele quando quiser, sem fidelidade',
];

function formatBRL(value: number): string {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(iso?: string): string {
    return iso ? new Date(iso).toLocaleDateString('pt-BR') : '';
}

/** Meios de pagamento de cada produto.
 *
 *  Dentro do app Android, todo produto daqui é digital e a política da loja
 *  exige passar pelo Google: o caminho começa SEMPRE pelo botão do Google
 *  Play, que abre a tela de escolha do faturamento por escolha do usuário
 *  (Google Play ou Asaas). Só depois de o usuário escolher o Asaas lá
 *  (`altChosen`) o PIX e o cartão aparecem — nunca antes, nem lado a lado.
 *
 *  No site: o Aluno Plus só no cartão (PIX no Asaas é cobrança única, não
 *  assinatura); o resto em PIX ou cartão. O Personal Plus aceita os mesmos
 *  meios do PRO: o PIX de assinatura é cobrança única que o webhook converte
 *  em plano (ver handlePixPayment no backend). */
function methodsFor(produto: Produto, googleAvailable: boolean, altChosen: boolean): Metodo[] {
    if (googleAvailable && !altChosen) return ['google'];
    return produto === 'plus' ? ['card'] : ['pix', 'card'];
}

interface PixData {
    qrImageUrl?: string;
    payload?: string;
    expiresAt?: string;
}

function PaymentPageInner() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const produtoParam = searchParams.get('produto');
    // 'ia-substituicao' é o nome antigo do produto (links anteriores a
    // 2026-09-27): a assinatura avulsa de IA virou o Aluno Plus.
    const produto: Produto =
        produtoParam === 'plano'
            ? 'plano'
            : produtoParam === 'plus' || produtoParam === 'ia-substituicao'
              ? 'plus'
              : produtoParam === 'personal-plus'
                ? 'personal-plus'
                : 'pro';
    // Os dois planos do personal compartilham quase tudo nesta tela (volta
    // para /personal, indicação, tela de confirmação). O que é só do PRO
    // (ciclo de cobrança e teste grátis) segue testando `produto === 'pro'`.
    const isPersonalPlan = produto === 'pro' || produto === 'personal-plus';
    // Plano que a conta já tem, do cache da sessão — serve só para marcar
    // "seu plano atual" na comparação. Quem decide acesso é o backend.
    // Lido em efeito, não na renderização: localStorage não existe no
    // servidor e ler direto daria divergência de hidratação.
    const [currentPlan, setCurrentPlan] = useState<LadderPlan>('free');
    const templateId = searchParams.get('templateId') ?? '';
    // Com planId, a compra do plano avulso mantém o plano bloqueado do
    // personal em vez de aplicar um modelo da loja (mesmo produto e preço).
    const lockedPlanId = searchParams.get('planId') ?? '';
    const keepsPlan = produto === 'plano' && lockedPlanId !== '';
    // Planos que o aluno já tinha ANTES da compra: no polling do PIX, a compra
    // confirmada (o webhook aplica o plano) aparece como um plano novo. Não
    // dá para comparar "o plano ativo": com personal, a compra não encerra o
    // plano dele, e o ativo mais recente pode continuar sendo o do personal
    // (ex.: plano agendado para começar no futuro). null = ainda não se sabe.
    const plansBefore = useRef<Set<string> | null>(null);

    const [catalog, setCatalog] = useState<PlanCatalog | null>(null);
    const [cycle, setCycle] = useState('MONTHLY');
    const [metodo, setMetodo] = useState<Metodo>(produto === 'plus' ? 'card' : 'pix');
    const [googleAvailable, setGoogleAvailable] = useState(false);
    // Token da tela de escolha do Google: o usuário escolheu pagar pelo
    // Asaas. Vai junto da compra para o backend informar o Google. '' = não
    // escolheu (ou está no site).
    const [altToken, setAltToken] = useState('');
    const [partners, setPartners] = useState<ReferralPartnerPublic[]>([]);
    const [indicationReceiver, setIndicationReceiver] = useState(INDICATION_NONE);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [pix, setPix] = useState<PixData | null>(null);
    const [copied, setCopied] = useState(false);
    const [confirmed, setConfirmed] = useState(false);
    // Cartão aceito, cobrança ainda sem confirmação (análise de risco): o
    // formulário some e o polling do /me espera o plano subir.
    const [cardPending, setCardPending] = useState(false);
    // PIX de plano do personal: fim do período pago ANTES do QR Code ('' se
    // não havia). null = a compra em andamento não é PIX de plano. Ver
    // pixPlanPaymentConfirmed.
    const prepaidBefore = useRef<string | null>(null);
    const [paidUntil, setPaidUntil] = useState('');
    const [trial, setTrial] = useState<ProTrialStatus | null>(null);
    const [trialStarted, setTrialStarted] = useState<ProTrialStatus | null>(null);
    const [plusStatus, setPlusStatus] = useState<StudentPlusStatus | null>(null);
    const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        getPlans()
            .then(setCatalog)
            .catch(() => setError('Não foi possível carregar os planos. Tente novamente.'));
        // Assíncrono: no app atual a pergunta vira mensagem ao Android.
        void isGooglePlayBillingAvailable().then(setGoogleAvailable);
        // Lista de parceiros é só um complemento do seletor de indicação — se
        // falhar, o checkout continua normalmente com apenas as opções fixas.
        getActiveReferralPartners()
            .then(setPartners)
            .catch(() => setPartners([]));
        return () => {
            if (pollingRef.current) clearInterval(pollingRef.current);
        };
    }, []);

    // Teste grátis (PRO, só personal) e situação do Plus (aluno): ambos são
    // complementos — se falharem, a compra continua disponível.
    useEffect(() => {
        const rank = planRank(getUser()?.plan_type);
        setCurrentPlan(rank >= 2 ? 'pro' : rank >= 1 ? 'plus' : 'free');
    }, []);

    useEffect(() => {
        const role = getUser()?.role;
        if (isPersonalPlan && role === 'personal') {
            getProTrialStatus().then(setTrial).catch(() => setTrial(null));
        }
        if (produto === 'plus') {
            getStudentPlusStatus().then(setPlusStatus).catch(() => setPlusStatus(null));
        }
    }, [produto, isPersonalPlan]);

    const methods = methodsFor(produto, googleAvailable, altToken !== '');
    // O meio escolhido precisa existir para o produto (ex.: dentro do app,
    // antes da tela de escolha do Google, só o botão do Google Play).
    useEffect(() => {
        if (!methods.includes(metodo)) setMetodo(methods[0]);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [produto, googleAvailable, altToken]);
    // O token vale para o produto escolhido na tela do Google: trocar de
    // plano ou de ciclo depois disso exigiria outra escolha.
    const lockedByChoice = !!pix || altToken !== '';
    const alt = altToken || undefined;

    const selectedProPlan = catalog?.pro.find((p) => p.cycle === cycle);
    const price =
        produto === 'pro'
            ? selectedProPlan?.value
            : produto === 'personal-plus'
              ? catalog?.personal_plus.value
              : produto === 'plano'
                ? catalog?.library_plan.value
                : catalog?.student_plus.value;
    const productTitle =
        produto === 'pro'
            ? `Plano PRO — ${CYCLE_LABELS[cycle] ?? cycle}`
            : produto === 'personal-plus'
              ? 'Personal Plus — Mensal'
              : keepsPlan
                ? 'Manter o plano do seu personal'
                : produto === 'plano'
                  ? 'Plano de treino selecionado'
                  : 'Aluno Plus — Mensal';
    const benefits =
        produto === 'pro'
            ? PRO_BENEFITS
            : produto === 'personal-plus'
              ? PERSONAL_PLUS_BENEFITS
              : keepsPlan
                ? MANTER_BENEFITS
                : produto === 'plano'
                  ? PLANO_BENEFITS
                  : PLUS_BENEFITS;
    const benefitsTitle = isPersonalPlan
        ? 'O que este plano desbloqueia para você (personal):'
        : 'O que você recebe:';

    // Motivo para não vender agora (produto fora de venda ou fora do perfil).
    const unavailableReason =
        produto === 'plus' && plusStatus?.active
            ? 'Você já tem o Aluno Plus ativo. Para cancelar, vá em Minha conta.'
            : produto === 'plus' && plusStatus?.own_pro
              ? 'Sua conta já tem os benefícios do Aluno Plus.'
              : produto === 'plus' && plusStatus && !plusStatus.eligible
                ? 'O Aluno Plus é para quem treina sem personal. Com personal vinculado, os recursos vêm do plano dele.'
                : '';

    /** Confirma via polling se o pagamento foi processado pelo webhook. */
    const startPolling = useCallback(() => {
        if (pollingRef.current) clearInterval(pollingRef.current);
        pollingRef.current = setInterval(async () => {
            try {
                if (isPersonalPlan) {
                    const wasOnTrial = !!(trial?.pro_trial_active || trialStarted?.pro_trial_active);
                    const tier = produto === 'personal-plus' ? 'plus' : 'pro';
                    if (prepaidBefore.current !== null) {
                        const paid = await pixPlanPaymentConfirmed(tier, prepaidBefore.current);
                        if (paid) {
                            setPaidUntil(paid.prepaid_until ?? '');
                            setConfirmed(true);
                            if (pollingRef.current) clearInterval(pollingRef.current);
                            if (paid.plan_type) updateSessionPlanType(paid.plan_type);
                        }
                    } else if (await isPersonalPlanPaymentConfirmed(tier, wasOnTrial)) {
                        setConfirmed(true);
                        if (pollingRef.current) clearInterval(pollingRef.current);
                        // Atualiza o cache local de usuário para refletir o plano novo
                        updateSessionPlanType(tier);
                    }
                } else if (produto === 'plano') {
                    // O webhook aplica o plano comprado: ele aparece na lista.
                    const ids = (await getMyPlannings()).map((p) => p.id);
                    if (!plansBefore.current) {
                        // A foto de antes falhou: tira agora, sem confirmar —
                        // melhor esperar mais um ciclo que confirmar à toa.
                        plansBefore.current = new Set(ids);
                    } else if (ids.some((id) => !plansBefore.current!.has(id))) {
                        setConfirmed(true);
                        if (pollingRef.current) clearInterval(pollingRef.current);
                    }
                } else {
                    const status = await getStudentPlusStatus();
                    if (status.active) {
                        setConfirmed(true);
                        if (pollingRef.current) clearInterval(pollingRef.current);
                    }
                }
            } catch {
                // erros transitórios de polling são ignorados
            }
        }, 5000);
    }, [produto, isPersonalPlan, trial, trialStarted]);

    const handleStartTrial = async () => {
        setError('');
        setLoading(true);
        try {
            const res = await startProTrial();
            updateSessionPlanType(res.plan_type);
            setTrialStarted(res);
            trackTrialStarted();
        } catch (err: unknown) {
            setError(extractApiError(err, 'Não foi possível começar o teste. Tente novamente.'));
        } finally {
            setLoading(false);
        }
    };

    const handlePix = async () => {
        setError('');
        setLoading(true);
        try {
            if (isPersonalPlan) {
                // Foto do período pago antes do QR Code: é a data mudar que
                // confirma o PIX (renovação já está no plano).
                const before = await getProPlanStatus().catch(() => null);
                prepaidBefore.current = before?.prepaid_until ?? '';
                const res: SubscribePixResponse = await subscribeProPix(
                    cycle,
                    indicationReceiver,
                    produto === "personal-plus" ? "personal_plus" : "pro",
                    alt,
                );
                setPix({
                    qrImageUrl: res.qr_image_url,
                    payload: res.qr_code_payload,
                    expiresAt: res.expires_at,
                });
            } else {
                // Foto dos planos de antes, para reconhecer o comprado no polling.
                try {
                    const plans = await getMyPlannings();
                    plansBefore.current = new Set(plans.map((p) => p.id));
                } catch {
                    plansBefore.current = null;
                }
                const res = keepsPlan
                    ? await purchaseLockedPlanPix(lockedPlanId, alt)
                    : await purchaseLibraryPlanPix(templateId, alt);
                setPix({
                    qrImageUrl: res.qr_image_url,
                    payload: res.qr_code_payload,
                    expiresAt: res.expires_at,
                });
            }
            startPolling();
        } catch (err: unknown) {
            setError(extractApiError(err, 'Erro ao gerar cobrança PIX. Tente novamente.'));
        } finally {
            setLoading(false);
        }
    };

    const handleGooglePlay = async () => {
        setError('');
        setLoading(true);
        try {
            const accountId = getUser()?.id ?? '';
            const productId =
                produto === 'pro'
                    ? (selectedProPlan?.play_product_id ?? '')
                    : produto === 'personal-plus'
                      ? (catalog?.personal_plus.play_product_id ?? '')
                      : produto === 'plano'
                        ? (catalog?.library_plan.play_product_id ?? '')
                        : (catalog?.student_plus.play_product_id ?? '');
            const productType = isPersonalPlan || produto === 'plus' ? 'subs' : 'inapp';
            if (!productId) throw new Error('Produto indisponível');

            const result = await launchGooglePlayPurchase(productId, productType, accountId);
            if (result.status === 'alternative') {
                // Escolheu o Asaas na tela do Google: nada foi cobrado.
                // Aparecem PIX/cartão, e a compra leva o token.
                setAltToken(result.externalTransactionToken ?? '');
                return;
            }
            const verify = await verifyGooglePlayPurchase(
                productId,
                result.purchaseToken!,
                productType,
                produto === 'plano' && !keepsPlan ? templateId : undefined,
                keepsPlan ? lockedPlanId : undefined,
            );
            if (verify.success) {
                if (isPersonalPlan) {
                    updateSessionPlanType(produto === 'personal-plus' ? 'plus' : 'pro');
                }
                setConfirmed(true);
            } else {
                setError(verify.message || 'Compra não confirmada pelo Google Play.');
            }
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Falha na compra pelo Google Play.');
        } finally {
            setLoading(false);
        }
    };

    const handleCopyPix = async () => {
        if (!pix?.payload) return;
        try {
            await navigator.clipboard.writeText(pix.payload);
            setCopied(true);
            setTimeout(() => setCopied(false), 3000);
        } catch {
            setError('Não foi possível copiar. Selecione o código manualmente.');
        }
    };

    if (trialStarted) {
        return (
            <div className="pay-page">
                <div className="pay-box pay-box--narrow text-center">
                    <i className="fa-solid fa-circle-check text-success fa-3x mb-3"></i>
                    <h2 className="h4">Seu teste do PRO começou!</h2>
                    <p>
                        Você tem todos os recursos do PRO até{' '}
                        <strong>{formatDate(trialStarted.pro_trial_ends_at)}</strong>. Sem
                        cartão e sem cobrança: se não assinar, a conta volta ao plano
                        gratuito sozinha, e o que você configurar fica guardado.
                    </p>
                    <button className="btn btn-gold mt-2" onClick={() => router.push('/personal')}>
                        Ir para o painel
                    </button>
                </div>
            </div>
        );
    }

    if (confirmed) {
        return (
            <div className="pay-page">
                <div className="pay-box pay-box--narrow text-center">
                    <i className="fa-solid fa-circle-check text-success fa-3x mb-3"></i>
                    <h2 className="h4">Pagamento confirmado!</h2>
                    <p>
                        {produto === 'pro'
                            ? 'Seu plano PRO está ativo. Aproveite todos os recursos.'
                            : produto === 'personal-plus'
                            ? 'Seu Personal Plus está ativo: alunos ilimitados, sua marca no app e o financeiro liberados.'
                            : keepsPlan
                              ? 'O plano que o seu personal montou voltou para você. Bora treinar!'
                              : produto === 'plano'
                              ? 'Seu novo plano de treino está ativo. Bora treinar!'
                              : 'Seu Aluno Plus está ativo: sem anúncios, com a Substituição Inteligente de Exercícios e os links do Instagram e do TikTok.'}
                    </p>
                    {paidUntil && (
                        <p className="small text-muted">
                            Pago por PIX até{' '}
                            <strong>{new Date(paidUntil).toLocaleDateString('pt-BR')}</strong>. O PIX
                            não renova sozinho: avisamos 3 dias antes, e para continuar é só
                            pagar um novo em Minha conta.
                        </p>
                    )}
                    <button
                        className="btn btn-gold mt-2"
                        onClick={() =>
                            router.push(
                                isPersonalPlan ? '/' : '/meus-treinos',
                            )
                        }
                    >
                        {isPersonalPlan ? 'Ir para o início' : 'Ver meus treinos'}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="pay-page">
            <div className="pay-box">
                <header className="pay-header">
                    <Image
                        src="/assets/images/logo.png"
                        alt="logo"
                        width={150}
                        height={70}
                    />
                    <h1 className="h3">Pagamento</h1>
                </header>

                <div className="mb-3">
                    <button
                        className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center gap-2"
                        onClick={() =>
                            router.push(
                                isPersonalPlan
                                    ? '/personal'
                                    : getStudentHomeRoute(),
                            )
                        }
                    >
                        <FiArrowLeft /> Voltar
                    </button>
                </div>

                {error && (
                    <div className="alert alert-danger" role="alert">
                        {error}
                    </div>
                )}

                {/* Comparação dos três planos: o Plus só se explica ao lado do
                    que ele NÃO tem. Enquanto o PIX está em aberto, trocar de
                    plano invalidaria a cobrança já gerada — daí o onSelect
                    sair de cena nesse caso. */}
                {isPersonalPlan && (
                    <div className="pay-section">
                        <PersonalPlanLadder
                            plusPrice={catalog?.personal_plus.value}
                            proPrice={catalog?.pro.find((p) => p.cycle === 'MONTHLY')?.value}
                            selected={produto === 'personal-plus' ? 'plus' : 'pro'}
                            currentPlan={currentPlan}
                            onSelect={
                                lockedByChoice || cardPending
                                    ? undefined
                                    : (plan) =>
                                          router.push(
                                              plan === 'plus'
                                                  ? '/pagamento?produto=personal-plus'
                                                  : '/pagamento?produto=pro',
                                          )
                            }
                        />
                    </div>
                )}

                {produto === 'pro' && trial?.pro_trial_eligible && (
                    <div className="alert alert-success pay-section mb-0" role="status">
                        <div className="pay-trial">
                            <div className="pay-trial-text">
                                <p className="fw-semibold mb-1">Teste o PRO por 14 dias, de graça</p>
                                <p className="small">
                                    Sem cartão e sem cobrança. Se não assinar até o fim, a conta
                                    volta ao plano gratuito sozinha. Vale uma vez por conta.
                                </p>
                            </div>
                            <button
                                className="btn btn-gold btn-sm"
                                onClick={handleStartTrial}
                                disabled={loading}
                            >
                                Começar teste grátis
                            </button>
                        </div>
                    </div>
                )}
                {produto === 'pro' && trial?.pro_trial_active && (
                    <div className="alert alert-info pay-section mb-0" role="status">
                        Você está no teste grátis do PRO até{' '}
                        <strong>{formatDate(trial.pro_trial_ends_at)}</strong> (
                        {daysUntil(trial.pro_trial_ends_at)} dia(s)). Assine para não
                        perder os recursos quando ele acabar.
                    </div>
                )}

                <div className="pay-grid">
                    <aside className="pay-summary" aria-labelledby="summaryTitle">
                        <h2 id="summaryTitle">Resumo do pedido</h2>
                        <p className="pay-summary-product">{productTitle}</p>

                        <p className="small text-muted mb-2">{benefitsTitle}</p>
                        <ul className="pay-benefits">
                            {benefits.map((b) => (
                                <li key={b}>
                                    <i className="fa-solid fa-circle-check" aria-hidden="true"></i>
                                    <span>{b}</span>
                                </li>
                            ))}
                        </ul>

                        {produto === 'pro' && (
                            <p className="small text-muted mb-3">
                                Seus alunos registram a própria evolução
                                (medidas e fotos) de graça. O plano
                                alimentar fica liberado para os alunos
                                vinculados a você.
                            </p>
                        )}

                        {produto === 'pro' && catalog && (
                            <div className="mb-3">
                                <label htmlFor="cycleSelect" className="form-label">
                                    Ciclo de cobrança
                                </label>
                                <select
                                    id="cycleSelect"
                                    className="form-select"
                                    value={cycle}
                                    disabled={lockedByChoice}
                                    onChange={(e) => setCycle(e.target.value)}
                                >
                                    {catalog.pro.map((p) => (
                                        <option key={p.cycle} value={p.cycle}>
                                            {CYCLE_LABELS[p.cycle ?? ''] ?? p.cycle} —{' '}
                                            {formatBRL(p.value)}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {produto === 'pro' && (
                            <div className="mb-3">
                                <label
                                    htmlFor="indicationSelect"
                                    className="form-label"
                                >
                                    Como você conheceu a plataforma?
                                </label>
                                <select
                                    id="indicationSelect"
                                    className="form-select"
                                    value={indicationReceiver}
                                    disabled={lockedByChoice}
                                    onChange={(e) =>
                                        setIndicationReceiver(e.target.value)
                                    }
                                >
                                    <option value={INDICATION_NONE}>
                                        Nenhuma Indicação
                                    </option>
                                    <option value="instagram">Instagram</option>
                                    <option value="facebook">Facebook</option>
                                    <option value="youtube">YouTube</option>
                                    {partners.map((p) => (
                                        <option key={p.id} value={p.code}>
                                            {p.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <p className="pay-total">
                            Total: {price != null ? formatBRL(price) : '—'}
                            {produto === 'plus' && price != null ? ' por mês' : ''}
                        </p>
                    </aside>

                    <div className="pay-checkout">
                        {unavailableReason ? (
                            <div className="alert alert-info" role="status">
                                {unavailableReason}
                            </div>
                        ) : (
                            <>
                                {!pix && methods.length > 1 && (
                                    <div className="pay-methods">
                                        {methods.includes('pix') && (
                                            <button
                                                className={`btn btn-${metodo !== 'pix' ? 'outline-' : ''}gold`}
                                                onClick={() => setMetodo('pix')}
                                            >
                                                <h6 className="mb-1">Pix</h6>
                                                <i className="fa-solid fa-qrcode fa-lg"></i>
                                            </button>
                                        )}
                                        {methods.includes('card') && (
                                            <button
                                                className={`btn btn-${metodo !== 'card' ? 'outline-' : ''}gold`}
                                                onClick={() => setMetodo('card')}
                                            >
                                                <h6 className="mb-1">Cartão</h6>
                                                <i className="fa-solid fa-credit-card fa-lg"></i>
                                            </button>
                                        )}
                                        {methods.includes('google') && (
                                            <button
                                                className={`btn btn-${metodo !== 'google' ? 'outline-' : ''}gold`}
                                                onClick={() => setMetodo('google')}
                                            >
                                                <h6 className="mb-1">Google Play</h6>
                                                <i className="fa-brands fa-google-play fa-lg"></i>
                                            </button>
                                        )}
                                    </div>
                                )}
                                {altToken && !pix && (
                                    <p className="small text-muted mb-2">
                                        Você escolheu pagar direto ao Venafit. Escolha PIX ou cartão
                                        abaixo.
                                    </p>
                                )}
                                {produto === 'plus' && metodo === 'card' && (
                                    <p className="small text-muted mb-2">
                                        Assinatura mensal no cartão de crédito. Cancele quando quiser
                                        em Minha conta.
                                    </p>
                                )}

                                {/* PIX */}
                                {metodo === 'pix' && isPersonalPlan && !pix && (
                                    <p className="small text-muted mt-3 mb-0">
                                        O PIX paga{' '}
                                        {produto === 'pro' && cycle === 'SEMIANNUALLY'
                                            ? '6 meses'
                                            : produto === 'pro' && cycle === 'YEARLY'
                                              ? '12 meses'
                                              : '1 mês'}{' '}
                                        e não renova sozinho: avisamos 3 dias antes do fim. Para
                                        cobrança automática todo mês, use o cartão.
                                    </p>
                                )}
                                {metodo === 'pix' && (
                                    <div className="text-center mt-3">
                                        {!pix ? (
                                            <button
                                                className="btn btn-lg btn-gold w-100"
                                                onClick={handlePix}
                                                disabled={loading || !catalog}
                                            >
                                                {loading ? (
                                                    <div className="spinner-border text-light" role="status">
                                                        <span className="visually-hidden">Carregando…</span>
                                                    </div>
                                                ) : (
                                                    'Gerar QR Code PIX'
                                                )}
                                            </button>
                                        ) : (
                                            <div>
                                                {pix.qrImageUrl && (
                                                    // QR vem como data URI base64 do Asaas — <img> nativo,
                                                    // next/image não otimiza data URIs.
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img
                                                        src={pix.qrImageUrl}
                                                        alt="QR Code PIX"
                                                        width={230}
                                                        height={230}
                                                        className="border rounded"
                                                    />
                                                )}
                                                <p className="mt-3 mb-1 small text-muted">
                                                    Escaneie o QR Code ou use o copia-e-cola:
                                                </p>
                                                <div className="input-group mb-2">
                                                    <input
                                                        className="form-control form-control-sm"
                                                        readOnly
                                                        value={pix.payload ?? ''}
                                                    />
                                                    <button
                                                        className="btn btn-outline-gold btn-sm"
                                                        onClick={handleCopyPix}
                                                    >
                                                        {copied ? 'Copiado!' : 'Copiar'}
                                                    </button>
                                                </div>
                                                <div className="d-flex align-items-center justify-content-center gap-2 text-muted small">
                                                    <div
                                                        className="spinner-border spinner-border-sm"
                                                        role="status"
                                                    ></div>
                                                    Aguardando confirmação do pagamento…
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Cartão de crédito — assinatura do personal (recorrente) */}
                                {metodo === 'card' && isPersonalPlan && cardPending && (
                                    <div className="text-center mt-3">
                                        <div className="d-flex align-items-center justify-content-center gap-2 text-muted small">
                                            <div
                                                className="spinner-border spinner-border-sm"
                                                role="status"
                                            ></div>
                                            Confirmando o pagamento…
                                        </div>
                                        <p className="small text-muted mt-2 mb-0">
                                            O cartão foi aceito e a cobrança está em análise. O plano é
                                            ativado sozinho assim que ela for aprovada: pode fechar esta
                                            tela. Não assine de novo.
                                        </p>
                                    </div>
                                )}
                                {metodo === 'card' && isPersonalPlan && !cardPending && (
                                    <CardForm
                                        disabled={loading}
                                        submitLabel="Assinar"
                                        onSubmit={async (form) => {
                                            setError('');
                                            setLoading(true);
                                            try {
                                                const res = await subscribeProCard(
                                                    cycle,
                                                    form,
                                                    indicationReceiver,
                                                    produto === 'personal-plus'
                                                        ? 'personal_plus'
                                                        : 'pro',
                                                    alt,
                                                );
                                                setLoading(false);
                                                // Só plan_active é pagamento confirmado. "ACTIVE" é
                                                // o status da assinatura (cartão validado), e foi ele
                                                // que fez esta tela dizer "Seu Personal Plus está
                                                // ativo" para quem continuou no free (2026-10-05).
                                                if (res.plan_active) {
                                                    updateSessionPlanType(
                                                        produto === 'personal-plus'
                                                            ? 'plus'
                                                            : 'pro',
                                                    );
                                                    setConfirmed(true);
                                                } else {
                                                    setCardPending(true);
                                                    startPolling();
                                                }
                                            } catch (err: unknown) {
                                                setLoading(false);
                                                setError(extractApiError(err));
                                            }
                                        }}
                                    />
                                )}

                                {/* Cartão de crédito — compra avulsa de plano (única) */}
                                {metodo === 'card' && produto === 'plano' && (
                                    <CardForm
                                        disabled={loading}
                                        submitLabel="Pagar"
                                        onSubmit={async (form) => {
                                            setError('');
                                            setLoading(true);
                                            try {
                                                const res = keepsPlan
                                                    ? await purchaseLockedPlanCard(lockedPlanId, form, alt)
                                                    : await purchaseLibraryPlanCard(templateId, form, alt);
                                                setLoading(false);
                                                if (res.applied) {
                                                    setConfirmed(true);
                                                } else {
                                                    setError(
                                                        res.message ||
                                                            'Pagamento não aprovado. Tente outro cartão ou use PIX.',
                                                    );
                                                }
                                            } catch (err: unknown) {
                                                setLoading(false);
                                                setError(extractApiError(err));
                                            }
                                        }}
                                    />
                                )}

                                {/* Cartão de crédito — Aluno Plus (recorrente, só no site) */}
                                {metodo === 'card' && produto === 'plus' && (
                                    <CardForm
                                        disabled={loading}
                                        submitLabel="Assinar"
                                        onSubmit={async (form) => {
                                            setError('');
                                            setLoading(true);
                                            try {
                                                const res = await subscribeStudentPlusCard(form, alt);
                                                setLoading(false);
                                                if (res.status === 'ACTIVE') {
                                                    setConfirmed(true);
                                                } else {
                                                    startPolling();
                                                }
                                            } catch (err: unknown) {
                                                setLoading(false);
                                                setError(extractApiError(err));
                                            }
                                        }}
                                    />
                                )}

                                {/* Google Play */}
                                {metodo === 'google' && (
                                    <div className="text-center mt-3">
                                        <button
                                            className="btn btn-lg btn-gold w-100"
                                            onClick={handleGooglePlay}
                                            disabled={loading || !catalog}
                                        >
                                            {loading ? (
                                                <div className="spinner-border text-light" role="status">
                                                    <span className="visually-hidden">Carregando…</span>
                                                </div>
                                            ) : (
                                                'Continuar para o pagamento'
                                            )}
                                        </button>
                                        <p className="small text-muted mt-2">
                                            Na próxima tela o Google mostra como você pode pagar
                                            {produto !== 'plano'
                                                ? '. Quem nunca assinou nada no Venafit ganha 1 mês grátis: a assinatura só é cobrada depois, e você pode cancelar antes pelo Google Play'
                                                : ''}
                                            .
                                        </p>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

/** Extrai a mensagem de erro da API (axios) com um fallback amigável. */
function extractApiError(
    err: unknown,
    fallback = 'Erro ao processar pagamento. Verifique os dados do cartão.',
): string {
    const axiosMsg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
    return axiosMsg || fallback;
}

/** Formulário de cartão. Os dados são tokenizados/processados pelo gateway;
 *  nunca são logados nem persistidos localmente. O pai decide o que fazer com
 *  o formulário via onSubmit (assinatura PRO, Aluno Plus ou compra avulsa). */
function CardForm(props: {
    disabled: boolean;
    submitLabel: string;
    onSubmit: (form: CardSubscriptionForm) => Promise<void>;
}) {
    const { disabled, submitLabel, onSubmit } = props;
    const [form, setForm] = useState<CardSubscriptionForm>({
        card_holder_name: '',
        card_number: '',
        card_expiry_month: '',
        card_expiry_year: '',
        card_ccv: '',
        holder_name: '',
        holder_email: '',
        holder_cpf: '',
        holder_postal_code: '',
        holder_address_num: '',
        holder_phone: '',
    });

    const set = (field: keyof CardSubscriptionForm) =>
        (e: React.ChangeEvent<HTMLInputElement>) =>
            setForm((f) => ({ ...f, [field]: e.target.value }));

    const submit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        await onSubmit(form);
    };

    const field = (
        id: keyof CardSubscriptionForm,
        label: string,
        col = 'col-12',
        type = 'text',
    ) => (
        <div className={col}>
            <div className="form-floating">
                <input
                    type={type}
                    className="form-control"
                    id={id}
                    placeholder={label}
                    value={form[id]}
                    onChange={set(id)}
                    required
                    autoComplete="off"
                />
                <label htmlFor={id}>{label}</label>
            </div>
        </div>
    );

    return (
        <form className="row g-3 mt-2" onSubmit={submit}>
            {field('card_number', 'Número do Cartão')}
            {field('card_holder_name', 'Nome impresso no cartão')}
            {field('card_expiry_month', 'Mês (MM)', 'col-4')}
            {field('card_expiry_year', 'Ano (AAAA)', 'col-4')}
            {field('card_ccv', 'CVV', 'col-4', 'password')}
            <hr className="mt-4" />
            {field('holder_name', 'Nome do titular', 'col-12 col-md-6')}
            {field('holder_cpf', 'CPF do titular', 'col-12 col-md-6')}
            {field('holder_email', 'E-mail', 'col-12 col-md-6', 'email')}
            {field('holder_phone', 'Telefone', 'col-12 col-md-6')}
            {field('holder_postal_code', 'CEP', 'col-6')}
            {field('holder_address_num', 'Número (endereço)', 'col-6')}
            <div className="col-12">
                <button type="submit" className="btn btn-lg btn-gold w-100" disabled={disabled}>
                    {disabled ? (
                        <div className="spinner-border text-light" role="status">
                            <span className="visually-hidden">Carregando…</span>
                        </div>
                    ) : (
                        submitLabel
                    )}
                </button>
            </div>
        </form>
    );
}

const Payment: React.FC = () => (
    <Suspense fallback={<div className="pay-page text-center">Carregando…</div>}>
        <PaymentPageInner />
    </Suspense>
);

export default Payment;
