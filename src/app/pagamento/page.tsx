'use client';
import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter, useSearchParams } from 'next/navigation';
import axios from 'axios';
import {
    FiAlertCircle,
    FiArrowLeft,
    FiCheck,
    FiCheckCircle,
    FiChevronDown,
    FiUsers,
    FiX,
} from 'react-icons/fi';

import s from './pagamento.module.css';
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
    type ReferralCodeConfirmation,
    checkReferralCode,
    normalizeReferralCode,
} from '@/libs/referralPartnerService';
import { readAcquisitionRef } from '@/libs/acquisition';
import {
    getStoreProgram,
    purchaseStoreProgramCard,
    purchaseStoreProgramPix,
    type StoreProgramDetail,
} from '@/libs/storeService';
import { readStoreSaleRef } from '@/libs/storeSaleRef';
import { STORE_HEALTH_NOTICE } from '@/libs/storeFormat';
import PersonalPlanLadder, { type LadderPlan } from '@/components/features/PersonalPlanLadder';
import {
    getStudentHomeRoute,
    getUser,
    planRank,
    updateSessionPlanType,
} from '@/libs/session';
import { getMyPlannings } from '@/libs/planningService';
import { hasNativeBilling } from '@/libs/nativeBridge';
import { trackTrialStarted } from '@/libs/analytics';
import { useCloseOnBack } from '@/hooks/useCloseOnBack';

// Valor fixo para "sem indicação" — usado tanto aqui quanto interpretado no
// backend/estatísticas (ver ReferralPartnerController.GetIndicationStats).
const INDICATION_NONE = 'none';
// Opção "Tenho um código de indicação". Não é enviada ao backend: o que vai
// é o código, depois de confirmado pela rota pública.
const INDICATION_CODE = 'code';

// Origens fixas de "como conheceu", além do código de um parceiro.
const INDICATION_CHANNELS = [
    { value: 'instagram', label: 'Instagram', icon: 'fa-brands fa-instagram' },
    { value: 'facebook', label: 'Facebook', icon: 'fa-brands fa-facebook' },
    { value: 'youtube', label: 'YouTube', icon: 'fa-brands fa-youtube' },
];

// 'pro' e 'personal-plus' são os dois planos do PERSONAL; 'plano' é a compra
// avulsa de um treino da biblioteca e 'plus' é o Aluno Plus (do aluno).
type Produto = 'pro' | 'personal-plus' | 'plano' | 'plus';
type Metodo = 'pix' | 'card' | 'google';

/** Passos do checkout. Cada um ocupa a tela inteira e pede uma coisa só:
 *  antes era tudo numa página longa, com a comparação dos planos rolando de
 *  lado, o seletor de indicação escondido no meio do resumo e o erro do
 *  Google Play aparecendo no topo, fora da vista de quem tinha rolado até o
 *  botão — daí o "apertei e nada aconteceu". */
type Step = 'plan' | 'cycle' | 'indication' | 'review' | 'pay';

const STEP_TITLES: Record<Step, string> = {
    plan: 'Escolha seu plano',
    cycle: 'Escolha o período',
    indication: 'Como você conheceu o Venafit?',
    review: 'Confira seu pedido',
    pay: 'Forma de pagamento',
};

const CYCLE_LABELS: Record<string, string> = {
    MONTHLY: 'Mensal',
    SEMIANNUALLY: 'Semestral',
    YEARLY: 'Anual',
};

const CYCLE_MONTHS: Record<string, number> = {
    MONTHLY: 1,
    SEMIANNUALLY: 6,
    YEARLY: 12,
};

const CYCLE_CHARGE: Record<string, string> = {
    MONTHLY: 'cobrado todo mês',
    SEMIANNUALLY: 'cobrado a cada 6 meses',
    YEARLY: 'cobrado uma vez por ano',
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

const CARD_FORM_ID = 'pay-card-form';

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
    // 'programa' (loja de programas) é a mesma compra avulsa de 'plano', com
    // o preço da faixa do programa.
    const initialProduto: Produto =
        produtoParam === 'plano' || produtoParam === 'programa'
            ? 'plano'
            : produtoParam === 'plus' || produtoParam === 'ia-substituicao'
              ? 'plus'
              : produtoParam === 'personal-plus'
                ? 'personal-plus'
                : 'pro';
    // Trocar entre Plus e PRO é estado da tela, não navegação: o antigo
    // "Quero o PRO" fazia router.push para a própria URL e não acontecia nada.
    const [produto, setProduto] = useState<Produto>(initialProduto);
    // Os dois planos do personal compartilham quase tudo nesta tela (volta
    // para /personal, indicação, tela de confirmação). O que é só do PRO
    // (ciclo de cobrança e teste grátis) segue testando `produto === 'pro'`.
    const isPersonalPlan = produto === 'pro' || produto === 'personal-plus';
    const isStudentPlus = produto === 'plus';
    // Plano que a conta já tem, do cache da sessão — serve só para marcar
    // "seu plano atual" nos cartões. Não bloqueia nada: "Renovar" (PIX
    // pré-pago) e "Assinar de novo" (cancelado ainda no período) chegam aqui
    // com o plano ativo. Lido em efeito, não na renderização: localStorage
    // não existe no servidor e ler direto daria divergência de hidratação.
    const [currentPlan, setCurrentPlan] = useState<LadderPlan>('free');
    const templateId = searchParams.get('templateId') ?? '';
    // Com planId, a compra do plano avulso mantém o plano bloqueado do
    // personal em vez de aplicar um modelo da loja (mesmo produto e preço).
    const lockedPlanId = searchParams.get('planId') ?? '';
    const keepsPlan = produto === 'plano' && lockedPlanId !== '';
    // Programa da loja (produto=programa&programId=...): preço, produto do
    // Google Play e título vêm dele; a compra leva o ?ref= do link do
    // programa (storeSaleRef).
    const programId =
        produtoParam === 'programa' ? (searchParams.get('programId') ?? '') : '';
    const [storeProgram, setStoreProgram] = useState<StoreProgramDetail | null>(null);
    const [programMissing, setProgramMissing] = useState(false);
    // Planos que o aluno já tinha ANTES da compra: no polling do PIX, a compra
    // confirmada (o webhook aplica o plano) aparece como um plano novo. Não
    // dá para comparar "o plano ativo": com personal, a compra não encerra o
    // plano dele, e o ativo mais recente pode continuar sendo o do personal
    // (ex.: plano agendado para começar no futuro). null = ainda não se sabe.
    const plansBefore = useRef<Set<string> | null>(null);

    const [step, setStep] = useState<Step>(
        initialProduto === 'pro' || initialProduto === 'personal-plus' ? 'plan' : 'review',
    );
    const [catalog, setCatalog] = useState<PlanCatalog | null>(null);
    const [cycle, setCycle] = useState('MONTHLY');
    const [metodo, setMetodo] = useState<Metodo>(initialProduto === 'plus' ? 'card' : 'pix');
    const [googleAvailable, setGoogleAvailable] = useState(false);
    // Enquanto não se sabe se é o app, o botão de pagar espera: decidir
    // antes mostraria PIX/cartão dentro do app.
    const [googleChecked, setGoogleChecked] = useState(false);
    // Token da tela de escolha do Google: o usuário escolheu pagar pelo
    // Asaas. Vai junto da compra para o backend informar o Google. '' = não
    // escolheu (ou está no site).
    const [altToken, setAltToken] = useState('');
    // Resposta de "como você conheceu": uma origem fixa ou INDICATION_CODE.
    // '' = ainda não respondeu. A resposta é obrigatória (com "Ninguém me
    // indicou" valendo como resposta): é dela que sai a comissão do parceiro.
    const [indicationChoice, setIndicationChoice] = useState('');
    // Código de indicação: o digitado e o confirmado pelo servidor. Só o
    // confirmado vale como resposta — é ele que prova que a parceria existe.
    const [codeInput, setCodeInput] = useState('');
    const [confirmedCode, setConfirmedCode] = useState<ReferralCodeConfirmation | null>(null);
    const [codeCheck, setCodeCheck] = useState<'idle' | 'checking' | 'notFound' | 'failed'>('idle');
    const [codeCheckError, setCodeCheckError] = useState('');
    const indicationReceiver =
        indicationChoice === INDICATION_CODE ? (confirmedCode?.code ?? '') : indicationChoice;
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
    const [benefitsOpen, setBenefitsOpen] = useState(false);
    const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const bodyRef = useRef<HTMLDivElement>(null);
    const titleRef = useRef<HTMLHeadingElement>(null);
    const errorRef = useRef<HTMLDivElement>(null);
    // O passo vai por portal para o <body>: um ancestral com transform ou
    // filter prenderia o position:fixed dentro dele.
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        getPlans()
            .then(setCatalog)
            .catch(() => setError('Não foi possível carregar os planos. Tente novamente.'));
        // Dentro do app o caminho é SEMPRE o Google Play, mesmo que o
        // BillingClient ainda não tenha conectado (a resposta de
        // isAvailable seria false logo depois de abrir o app, e a tela
        // mostraria PIX/cartão, o que a política do Play proíbe). Se ele não
        // conectar, a compra devolve um erro que aparece junto do botão.
        if (hasNativeBilling()) {
            setGoogleAvailable(true);
            setGoogleChecked(true);
        } else {
            void isGooglePlayBillingAvailable()
                .then(setGoogleAvailable)
                .finally(() => setGoogleChecked(true));
        }
        return () => {
            if (pollingRef.current) clearInterval(pollingRef.current);
        };
    }, []);

    useEffect(() => {
        if (!programId) return;
        getStoreProgram(programId)
            .then(setStoreProgram)
            .catch(() => setProgramMissing(true));
    }, [programId]);

    useEffect(() => {
        const rank = planRank(getUser()?.plan_type);
        setCurrentPlan(rank >= 2 ? 'pro' : rank >= 1 ? 'plus' : 'free');
    }, []);

    // Teste grátis (PRO, só personal) e situação do Plus (aluno): ambos são
    // complementos — se falharem, a compra continua disponível.
    useEffect(() => {
        const role = getUser()?.role;
        if (isPersonalPlan && role === 'personal') {
            getProTrialStatus().then(setTrial).catch(() => setTrial(null));
        }
        if (isStudentPlus) {
            getStudentPlusStatus().then(setPlusStatus).catch(() => setPlusStatus(null));
        }
        // Plus↔PRO não muda a resposta do teste: depende só do tipo de produto.
    }, [isPersonalPlan, isStudentPlus]);

    // Chegou pelo link de um parceiro (?ref= do primeiro acesso, ou o Install
    // Referrer da Play Store): se o ref for o código de um parceiro ativo, a
    // resposta já vem marcada e confirmada, e a pessoa ainda pode trocar. Ref
    // que não é parceiro ("share_card") não marca nada. Uma vez por visita, e
    // só nos planos do personal (únicos com o passo de indicação).
    const refChecked = useRef(false);
    useEffect(() => {
        if (!isPersonalPlan || refChecked.current) return;
        refChecked.current = true;
        const ref = readAcquisitionRef();
        if (!ref) return;
        checkReferralCode(ref)
            .then((found) => {
                if (!found) return;
                setIndicationChoice((current) => current || INDICATION_CODE);
                setCodeInput(found.code);
                setConfirmedCode(found);
            })
            .catch(() => {
                // Sem confirmação, sem pré-marcação: a pessoa digita ou escolhe.
            });
    }, [isPersonalPlan]);

    /** O servidor recusou o código na hora de pagar (parceiro desativado no
     *  meio-tempo): o passo de indicação volta a pedir um código válido. */
    const dropRefusedCode = (err: unknown) => {
        if (apiErrorCode(err) !== 'referral_code_not_found') return;
        setConfirmedCode(null);
        setCodeCheck('notFound');
    };

    /** Confere o código digitado na rota pública. true = confirmado. */
    const applyCode = async (): Promise<boolean> => {
        const code = normalizeReferralCode(codeInput);
        if (!code) return false;
        setCodeCheck('checking');
        setCodeCheckError('');
        setConfirmedCode(null);
        try {
            const found = await checkReferralCode(code);
            if (!found) {
                setCodeCheck('notFound');
                return false;
            }
            setConfirmedCode(found);
            setCodeInput(found.code);
            setCodeCheck('idle');
            return true;
        } catch (err: unknown) {
            setCodeCheck('failed');
            setCodeCheckError(
                axios.isAxiosError(err) && !err.response
                    ? 'Sem conexão para conferir o código. Verifique a internet e tente de novo.'
                    : axios.isAxiosError(err) && err.response?.status === 429
                      ? 'Muitas tentativas seguidas. Aguarde um minuto e tente de novo.'
                      : 'Não foi possível conferir o código agora. Tente de novo.',
            );
            return false;
        }
    };

    // Tela cheia: a página de trás não rola enquanto o checkout está aberto.
    // No Safari iOS o teclado encolhe só o visual viewport; espelhar a altura
    // real mantém o botão de pagar à vista com o teclado aberto (mesma
    // técnica do components/system/Modal).
    useEffect(() => {
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const vv = window.visualViewport;
        const update = () => {
            if (vv) document.documentElement.style.setProperty('--pay-vh', `${vv.height}px`);
        };
        update();
        vv?.addEventListener('resize', update);
        return () => {
            document.body.style.overflow = previousOverflow;
            vv?.removeEventListener('resize', update);
            document.documentElement.style.removeProperty('--pay-vh');
        };
    }, []);

    const methods = methodsFor(produto, googleAvailable, altToken !== '');
    // O meio escolhido precisa existir para o produto (ex.: dentro do app,
    // antes da tela de escolha do Google, só o botão do Google Play).
    useEffect(() => {
        if (!methods.includes(metodo)) setMetodo(methods[0]);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [produto, googleAvailable, altToken]);
    // PIX gerado, escolha feita na tela do Google ou cartão em análise: a
    // compra já está amarrada a este plano e ciclo. Daí em diante não se
    // volta para antes do resumo.
    const lockedByChoice = !!pix || altToken !== '' || cardPending;
    const alt = altToken || undefined;
    // Dentro do app, antes da tela de escolha do Google: pagar = Google Play.
    const useGoogle = googleAvailable && !altToken;

    // ── Passos ────────────────────────────────────────────────────────────
    const needsPayStep = googleChecked && (!googleAvailable || altToken !== '');
    const steps: Step[] = [];
    if (isPersonalPlan) steps.push('plan');
    if (produto === 'pro') steps.push('cycle');
    if (isPersonalPlan) steps.push('indication');
    steps.push('review');
    if (needsPayStep) steps.push('pay');
    const stepIndex = Math.max(0, steps.indexOf(step));
    const currentStep = steps[stepIndex];
    const firstIndex = lockedByChoice ? steps.indexOf('review') : 0;
    const done = confirmed || !!trialStarted;
    const canGoBack = stepIndex > firstIndex && !done;

    const goTo = useCallback((next: Step) => {
        setError('');
        setStep(next);
    }, []);
    const goBack = () => {
        if (stepIndex > 0) goTo(steps[stepIndex - 1]);
    };
    const goNext = () => {
        if (stepIndex < steps.length - 1) goTo(steps[stepIndex + 1]);
    };
    const leave = () => router.push(isPersonalPlan ? '/personal' : getStudentHomeRoute());

    // Voltar do Android/navegador volta um passo. No primeiro passo o hook
    // sai de cena e o voltar deixa a página, como em qualquer tela.
    useCloseOnBack(canGoBack, goBack);

    // Passo novo começa do topo, com o foco no título (leitor de tela anuncia
    // o passo). Não no primeiro render: o foco ficaria preso no título.
    const firstRender = useRef(true);
    useEffect(() => {
        bodyRef.current?.scrollTo?.(0, 0);
        if (firstRender.current) {
            firstRender.current = false;
            return;
        }
        titleRef.current?.focus({ preventScroll: true });
    }, [currentStep, done]);

    // O erro fica no rodapé, colado no botão que o causou.
    useEffect(() => {
        if (error) errorRef.current?.scrollIntoView?.({ block: 'nearest' });
    }, [error]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && canGoBack) goBack();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    });

    // ── Preço e textos do produto ─────────────────────────────────────────
    const selectedProPlan = catalog?.pro.find((p) => p.cycle === cycle);
    const proMonthly = catalog?.pro.find((p) => p.cycle === 'MONTHLY')?.value;
    const price =
        produto === 'pro'
            ? selectedProPlan?.value
            : produto === 'personal-plus'
              ? catalog?.personal_plus.value
              : produto === 'plano'
                ? programId
                    ? storeProgram?.price
                    : catalog?.library_plan.value
                : catalog?.student_plus.value;
    // Menor preço por mês do PRO entre os ciclos longos, para o cartão do PRO.
    const proFromMonthly = (() => {
        if (!catalog || proMonthly === undefined) return undefined;
        const perMonth = catalog.pro
            .filter((p) => (CYCLE_MONTHS[p.cycle ?? ''] ?? 1) > 1)
            .map((p) => p.value / CYCLE_MONTHS[p.cycle ?? '']);
        const min = perMonth.length ? Math.min(...perMonth) : undefined;
        return min !== undefined && min < proMonthly ? min : undefined;
    })();
    const productTitle =
        produto === 'pro'
            ? `Plano PRO — ${CYCLE_LABELS[cycle] ?? cycle}`
            : produto === 'personal-plus'
              ? 'Personal Plus — Mensal'
              : keepsPlan
                ? 'Manter o plano do seu personal'
                : programId
                  ? storeProgram
                      ? `Programa ${storeProgram.title}`
                      : 'Programa de treino'
                  : produto === 'plano'
                    ? 'Plano de treino selecionado'
                    : 'Aluno Plus — Mensal';
    const priceNote =
        produto === 'pro'
            ? CYCLE_CHARGE[cycle]
            : produto === 'plano'
              ? 'pagamento único'
              : 'cobrado todo mês';
    const benefits =
        produto === 'pro'
            ? PRO_BENEFITS
            : produto === 'personal-plus'
              ? PERSONAL_PLUS_BENEFITS
              : keepsPlan
                ? MANTER_BENEFITS
                : programId
                  ? [
                        storeProgram?.author
                            ? `Montado por ${storeProgram.author.name} (${storeProgram.author.cref})`
                            : 'Da Coleção Venafit',
                        ...PLANO_BENEFITS,
                    ]
                  : produto === 'plano'
                    ? PLANO_BENEFITS
                    : PLUS_BENEFITS;
    const indicationLabel =
        indicationChoice === INDICATION_CODE
            ? confirmedCode
                ? `${confirmedCode.partner_name} (código ${confirmedCode.code})`
                : ''
            : indicationChoice === INDICATION_NONE
              ? 'Ninguém me indicou'
              : (INDICATION_CHANNELS.find((c) => c.value === indicationChoice)?.label ??
                indicationChoice);

    // Motivo para não vender agora (produto fora de venda ou fora do perfil).
    const unavailableReason =
        programId && programMissing
            ? 'Este programa não está à venda no momento.'
            : produto === 'plus' && plusStatus?.active
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
                    indicationReceiver || INDICATION_NONE,
                    produto === 'personal-plus' ? 'personal_plus' : 'pro',
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
                    : programId
                      ? await purchaseStoreProgramPix(programId, readStoreSaleRef(), alt)
                      : await purchaseLibraryPlanPix(templateId, alt);
                setPix({
                    qrImageUrl: res.qr_image_url,
                    payload: res.qr_code_payload,
                    expiresAt: res.expires_at,
                });
            }
            startPolling();
        } catch (err: unknown) {
            dropRefusedCode(err);
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
                        ? programId
                            ? (storeProgram?.play_product_id ?? '')
                            : (catalog?.library_plan.play_product_id ?? '')
                        : (catalog?.student_plus.play_product_id ?? '');
            const productType = isPersonalPlan || produto === 'plus' ? 'subs' : 'inapp';
            if (!productId) throw new Error('Produto indisponível');

            const result = await launchGooglePlayPurchase(productId, productType, accountId);
            if (result.status === 'alternative') {
                // Escolheu o Asaas na tela do Google: nada foi cobrado.
                // Aparecem PIX/cartão, e a compra leva o token.
                setAltToken(result.externalTransactionToken ?? '');
                setStep('pay');
                return;
            }
            const baseArgs = [
                productId,
                result.purchaseToken!,
                productType,
                produto === 'plano' && !keepsPlan && !programId ? templateId : undefined,
                keepsPlan ? lockedPlanId : undefined,
                isPersonalPlan ? indicationReceiver || INDICATION_NONE : undefined,
            ] as const;
            // O programa da loja (e o ?ref= do link) só vai quando há programa.
            const verify = programId
                ? await verifyGooglePlayPurchase(...baseArgs, {
                      programId,
                      ref: readStoreSaleRef(),
                  })
                : await verifyGooglePlayPurchase(...baseArgs);
            if (verify.success) {
                if (isPersonalPlan) {
                    updateSessionPlanType(produto === 'personal-plus' ? 'plus' : 'pro');
                }
                setConfirmed(true);
            } else {
                setError(verify.message || 'Compra não confirmada pelo Google Play.');
            }
        } catch (err: unknown) {
            setError(friendlyGooglePlayError(err));
        } finally {
            setLoading(false);
        }
    };

    const handleCardSubmit = async (form: CardSubscriptionForm) => {
        setError('');
        setLoading(true);
        try {
            if (isPersonalPlan) {
                const res = await subscribeProCard(
                    cycle,
                    form,
                    indicationReceiver || INDICATION_NONE,
                    produto === 'personal-plus' ? 'personal_plus' : 'pro',
                    alt,
                );
                // Só plan_active é pagamento confirmado. "ACTIVE" é o status
                // da assinatura (cartão validado), e foi ele que fez esta tela
                // dizer "Seu Personal Plus está ativo" para quem continuou no
                // free (2026-10-05).
                if (res.plan_active) {
                    updateSessionPlanType(produto === 'personal-plus' ? 'plus' : 'pro');
                    setConfirmed(true);
                } else {
                    setCardPending(true);
                    startPolling();
                }
            } else if (produto === 'plano') {
                const res = keepsPlan
                    ? await purchaseLockedPlanCard(lockedPlanId, form, alt)
                    : programId
                      ? await purchaseStoreProgramCard(programId, form, readStoreSaleRef(), alt)
                      : await purchaseLibraryPlanCard(templateId, form, alt);
                if (res.applied) {
                    setConfirmed(true);
                } else {
                    setError(res.message || 'Pagamento não aprovado. Tente outro cartão ou use PIX.');
                }
            } else {
                const res = await subscribeStudentPlusCard(form, alt);
                if (res.status === 'ACTIVE') {
                    setConfirmed(true);
                } else {
                    startPolling();
                }
            }
        } catch (err: unknown) {
            dropRefusedCode(err);
            setError(extractApiError(err));
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

    const selectPlan = (plan: LadderPlan) => {
        if (plan === 'free') return;
        setProduto(plan === 'plus' ? 'personal-plus' : 'pro');
    };

    const spinner = (
        <span className="spinner-border spinner-border-sm" role="status">
            <span className="visually-hidden">Carregando…</span>
        </span>
    );

    const renderSheet = (parts: {
        title: string;
        progress?: { index: number; total: number };
        body: React.ReactNode;
        footer: React.ReactNode;
    }) => {
        if (!mounted) return null;
        return createPortal(
            <div className={s.overlay}>
                <section className={s.sheet} aria-labelledby="payStepTitle">
                    <header className={s.head}>
                        {canGoBack ? (
                            <button
                                type="button"
                                className={s.iconBtn}
                                onClick={goBack}
                                aria-label="Voltar ao passo anterior"
                            >
                                <FiArrowLeft />
                            </button>
                        ) : (
                            <span className={s.iconSpacer} aria-hidden="true" />
                        )}
                        <div className={s.headText}>
                            {parts.progress && (
                                <span className={s.stepCount}>
                                    Passo {parts.progress.index + 1} de {parts.progress.total}
                                </span>
                            )}
                            <h1 id="payStepTitle" ref={titleRef} tabIndex={-1} className={s.title}>
                                {parts.title}
                            </h1>
                        </div>
                        <button
                            type="button"
                            className={s.iconBtn}
                            onClick={leave}
                            aria-label="Fechar e sair do pagamento"
                        >
                            <FiX />
                        </button>
                    </header>
                    {parts.progress && (
                        <div className={s.progress} aria-hidden="true">
                            {Array.from({ length: parts.progress.total }, (_, i) => (
                                <span
                                    key={i}
                                    className={i <= parts.progress!.index ? s.progressDone : s.progressTodo}
                                />
                            ))}
                        </div>
                    )}
                    <div className={s.body} ref={bodyRef}>
                        <div className={s.bodyInner}>{parts.body}</div>
                    </div>
                    {(parts.footer || error) && (
                        <footer className={s.foot}>
                            <div className={s.footInner}>
                                {error && (
                                    <div
                                        ref={errorRef}
                                        className="alert alert-danger mb-0 py-2"
                                        role="alert"
                                    >
                                        {error}
                                    </div>
                                )}
                                {parts.footer}
                            </div>
                        </footer>
                    )}
                </section>
            </div>,
            document.body,
        );
    };

    // ── Telas finais ──────────────────────────────────────────────────────
    if (trialStarted || confirmed) {
        const doneBody = trialStarted ? (
            <>
                <h2 className={s.doneTitle}>Seu teste do PRO começou!</h2>
                <p>
                    Você tem todos os recursos do PRO até{' '}
                    <strong>{formatDate(trialStarted.pro_trial_ends_at)}</strong>. Sem cartão e
                    sem cobrança: se não assinar, a conta volta ao plano gratuito sozinha, e o que
                    você configurar fica guardado.
                </p>
            </>
        ) : (
            <>
                <h2 className={s.doneTitle}>Pagamento confirmado!</h2>
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
                    <p className={s.hint}>
                        Pago por PIX até{' '}
                        <strong>{new Date(paidUntil).toLocaleDateString('pt-BR')}</strong>. O PIX
                        não renova sozinho: avisamos 3 dias antes, e para continuar é só pagar um
                        novo em Minha conta.
                    </p>
                )}
            </>
        );
        const doneCta = trialStarted
            ? { label: 'Ir para o painel', href: '/personal' }
            : isPersonalPlan
              ? { label: 'Ir para o início', href: '/' }
              : { label: 'Ver meus treinos', href: '/meus-treinos' };
        return renderSheet({
            title: trialStarted ? 'Teste grátis' : 'Tudo certo',
            body: (
                <div className={s.done}>
                    <FiCheckCircle className={s.doneIcon} aria-hidden="true" />
                    {doneBody}
                </div>
            ),
            footer: (
                <button
                    type="button"
                    className={`btn btn-gold ${s.cta}`}
                    onClick={() => router.push(doneCta.href)}
                >
                    {doneCta.label}
                </button>
            ),
        });
    }

    // ── Conteúdo de cada passo ────────────────────────────────────────────
    let body: React.ReactNode = null;
    let footer: React.ReactNode = null;

    if (currentStep === 'plan') {
        body = (
            <>
                <p className={s.lead}>
                    Toque no plano que você quer. Sem fidelidade: cancele quando quiser.
                </p>
                <PersonalPlanLadder
                    plusPrice={catalog?.personal_plus.value}
                    proPrice={proMonthly}
                    proFromMonthly={proFromMonthly}
                    selected={produto === 'personal-plus' ? 'plus' : 'pro'}
                    currentPlan={currentPlan}
                    onSelect={selectPlan}
                />
                {produto === 'pro' && trial?.pro_trial_eligible && (
                    <div className={s.callout} role="status">
                        <div>
                            <p className={s.calloutTitle}>Teste o PRO por 14 dias, de graça</p>
                            <p className={s.calloutText}>
                                Sem cartão e sem cobrança. Se não assinar até o fim, a conta volta
                                ao plano gratuito sozinha. Vale uma vez por conta.
                            </p>
                        </div>
                        <button
                            type="button"
                            className="btn btn-outline-secondary btn-sm"
                            onClick={handleStartTrial}
                            disabled={loading}
                        >
                            Começar teste grátis
                        </button>
                    </div>
                )}
                {produto === 'pro' && trial?.pro_trial_active && (
                    <div className="alert alert-info mb-0" role="status">
                        Você está no teste grátis do PRO até{' '}
                        <strong>{formatDate(trial.pro_trial_ends_at)}</strong> (
                        {daysUntil(trial.pro_trial_ends_at)} dia(s)). Assine para não perder os
                        recursos quando ele acabar.
                    </div>
                )}
            </>
        );
        footer = (
            <button
                type="button"
                className={`btn btn-gold ${s.cta}`}
                onClick={goNext}
                disabled={!catalog}
            >
                Continuar com o {produto === 'personal-plus' ? 'Plus' : 'PRO'}
            </button>
        );
    } else if (currentStep === 'cycle') {
        body = (
            <>
                <p className={s.lead}>
                    Pagando mais meses de uma vez, o mês sai mais barato. O PRO é o mesmo em todos.
                </p>
                <div className={s.options} role="radiogroup" aria-label="Período do PRO">
                    {(catalog?.pro ?? []).map((p) => {
                        const key = p.cycle ?? '';
                        const months = CYCLE_MONTHS[key] ?? 1;
                        const perMonth = p.value / months;
                        const saving =
                            proMonthly && months > 1
                                ? Math.floor((1 - p.value / (proMonthly * months)) * 100)
                                : 0;
                        const isSelected = cycle === key;
                        return (
                            <button
                                key={key}
                                type="button"
                                role="radio"
                                aria-checked={isSelected}
                                className={`${s.option} ${isSelected ? s.optionSelected : ''}`}
                                onClick={() => setCycle(key)}
                            >
                                <span className={s.radio} aria-hidden="true">
                                    {isSelected && <FiCheck />}
                                </span>
                                <span className={s.optionMain}>
                                    <span className={s.optionTop}>
                                        <span className={s.optionName}>
                                            {CYCLE_LABELS[key] ?? key}
                                        </span>
                                        {saving >= 1 && (
                                            <span className={s.badgeSave}>
                                                Economize {saving}%
                                            </span>
                                        )}
                                    </span>
                                    <span className={s.optionSub}>
                                        {formatBRL(p.value)}, {CYCLE_CHARGE[key]}
                                    </span>
                                </span>
                                <span className={s.optionAside}>
                                    <strong>{formatBRL(perMonth)}</strong>
                                    <span>por mês</span>
                                </span>
                            </button>
                        );
                    })}
                </div>
            </>
        );
        footer = (
            <button type="button" className={`btn btn-gold ${s.cta}`} onClick={goNext}>
                Continuar
            </button>
        );
    } else if (currentStep === 'indication') {
        const option = (value: string, label: React.ReactNode, icon?: React.ReactNode) => {
            const isSelected = indicationChoice === value;
            return (
                <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    className={`${s.option} ${s.optionCompact} ${isSelected ? s.optionSelected : ''}`}
                    onClick={() => setIndicationChoice(value)}
                >
                    <span className={s.radio} aria-hidden="true">
                        {isSelected && <FiCheck />}
                    </span>
                    {icon && <span className={s.optionIcon}>{icon}</span>}
                    <span className={s.optionName}>{label}</span>
                </button>
            );
        };
        const codeChosen = indicationChoice === INDICATION_CODE;
        const typedCode = normalizeReferralCode(codeInput);
        // Código digitado e ainda não conferido: "Continuar" confere e segue,
        // sem a pessoa precisar achar o "Aplicar".
        const canApply =
            codeChosen &&
            !confirmedCode &&
            typedCode !== '' &&
            codeCheck !== 'checking' &&
            codeCheck !== 'notFound';
        const continueIndication = async () => {
            if (indicationReceiver) {
                goNext();
                return;
            }
            if (canApply && (await applyCode())) goNext();
        };
        const footHint = !indicationChoice
            ? 'Escolha uma opção para continuar.'
            : codeChosen && !confirmedCode && !typedCode
              ? 'Digite o código que você recebeu.'
              : codeChosen && codeCheck === 'notFound'
                ? 'Confira o código ou escolha outra opção.'
                : '';
        body = (
            <>
                <div className={s.indicationHero}>
                    <FiUsers className={s.indicationIcon} aria-hidden="true" />
                    <p className={s.indicationText}>
                        <strong>Alguém te indicou o Venafit?</strong> Digite o código de
                        indicação que você recebeu: é assim que o parceiro ou profissional que
                        indicou recebe o crédito pela indicação. Você não paga nada a mais por
                        isso.
                    </p>
                </div>
                <div className={s.optionGroups} role="radiogroup" aria-label="Como você conheceu o Venafit">
                    <div className={s.optionGroup}>
                        <p className={s.groupLabel}>Fui indicado</p>
                        {option(INDICATION_CODE, 'Tenho um código de indicação')}
                        {codeChosen && (
                            <div className={s.codeBox}>
                                <label htmlFor="referralCode" className={s.codeLabel}>
                                    Código de indicação
                                </label>
                                <div className={s.codeRow}>
                                    <input
                                        id="referralCode"
                                        type="text"
                                        className={`form-control ${s.codeInput}`}
                                        placeholder="Ex.: JOAO10"
                                        autoComplete="off"
                                        autoCapitalize="characters"
                                        spellCheck={false}
                                        maxLength={40}
                                        aria-describedby="referralCodeStatus"
                                        aria-invalid={codeCheck === 'notFound'}
                                        value={codeInput}
                                        onChange={(e) => {
                                            setCodeInput(e.target.value);
                                            setConfirmedCode(null);
                                            setCodeCheck('idle');
                                            setCodeCheckError('');
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                void applyCode();
                                            }
                                        }}
                                    />
                                    <button
                                        type="button"
                                        className={`btn btn-outline-secondary ${s.codeApply}`}
                                        onClick={() => void applyCode()}
                                        disabled={!typedCode || codeCheck === 'checking' || !!confirmedCode}
                                    >
                                        {codeCheck === 'checking' ? spinner : 'Aplicar'}
                                    </button>
                                </div>
                                <p
                                    id="referralCodeStatus"
                                    role="status"
                                    aria-live="polite"
                                    className={
                                        confirmedCode
                                            ? s.codeOk
                                            : codeCheck === 'notFound' || codeCheck === 'failed'
                                              ? s.codeBad
                                              : s.codeHint
                                    }
                                >
                                    {confirmedCode ? (
                                        <>
                                            <FiCheckCircle aria-hidden="true" />
                                            <span>
                                                Indicação de <strong>{confirmedCode.partner_name}</strong>
                                            </span>
                                        </>
                                    ) : codeCheck === 'notFound' ? (
                                        <>
                                            <FiAlertCircle aria-hidden="true" />
                                            <span>Código não encontrado. Confira com quem te indicou.</span>
                                        </>
                                    ) : codeCheck === 'failed' ? (
                                        <>
                                            <FiAlertCircle aria-hidden="true" />
                                            <span>{codeCheckError}</span>
                                        </>
                                    ) : (
                                        'Maiúsculas, espaços e hífens não fazem diferença.'
                                    )}
                                </p>
                            </div>
                        )}
                    </div>
                    <div className={s.optionGroup}>
                        <p className={s.groupLabel}>Conheci pelas redes</p>
                        {INDICATION_CHANNELS.map((c) =>
                            option(c.value, c.label, <i className={c.icon} aria-hidden="true" />),
                        )}
                    </div>
                    <div className={s.optionGroup}>
                        {option(INDICATION_NONE, 'Ninguém me indicou')}
                    </div>
                </div>
            </>
        );
        footer = (
            <>
                {footHint && <p className={s.footHint}>{footHint}</p>}
                <button
                    type="button"
                    className={`btn btn-gold ${s.cta}`}
                    onClick={() => void continueIndication()}
                    disabled={!indicationReceiver && !canApply}
                >
                    Continuar
                </button>
            </>
        );
    } else if (currentStep === 'review') {
        const editable = !lockedByChoice;
        body = (
            <>
                <div className={s.summary}>
                    <p className={s.summaryProduct}>{productTitle}</p>
                    <p className={s.summaryPrice}>
                        <strong>{price != null ? formatBRL(price) : '—'}</strong>
                        <span>{priceNote}</span>
                    </p>
                    {isPersonalPlan && (
                        <dl className={s.summaryRows}>
                            <SummaryRow
                                label="Plano"
                                value={produto === 'personal-plus' ? 'Plus' : 'PRO'}
                                onEdit={editable ? () => goTo('plan') : undefined}
                            />
                            {produto === 'pro' && (
                                <SummaryRow
                                    label="Período"
                                    value={CYCLE_LABELS[cycle] ?? cycle}
                                    onEdit={editable ? () => goTo('cycle') : undefined}
                                />
                            )}
                            <SummaryRow
                                label="Indicação"
                                value={indicationLabel || '—'}
                                onEdit={editable ? () => goTo('indication') : undefined}
                            />
                        </dl>
                    )}
                </div>

                {unavailableReason ? (
                    <div className="alert alert-info mb-0" role="status">
                        {unavailableReason}
                    </div>
                ) : (
                    <>
                        <div className={s.nextInfo}>
                            {useGoogle ? (
                                <>
                                    <i className="fa-brands fa-google-play" aria-hidden="true"></i>
                                    <p>
                                        Ao continuar, abre a tela do <strong>Google Play</strong>{' '}
                                        com as formas de pagamento.
                                        {produto !== 'plano' &&
                                            ' Quem nunca assinou nada no Venafit ganha 1 mês grátis: a cobrança só começa depois, e dá para cancelar antes pelo Google Play.'}
                                    </p>
                                </>
                            ) : (
                                <>
                                    <i className="fa-solid fa-lock" aria-hidden="true"></i>
                                    <p>
                                        No próximo passo você escolhe{' '}
                                        {methods.length > 1 ? 'PIX ou cartão' : 'o cartão'}.
                                        Pagamento processado pelo Asaas.
                                    </p>
                                </>
                            )}
                        </div>
                        {isPersonalPlan ? (
                            <div>
                                <button
                                    type="button"
                                    className={s.disclosure}
                                    aria-expanded={benefitsOpen}
                                    onClick={() => setBenefitsOpen((v) => !v)}
                                >
                                    <span>O que o plano desbloqueia ({benefits.length})</span>
                                    <FiChevronDown
                                        aria-hidden="true"
                                        className={benefitsOpen ? s.chevronOpen : s.chevron}
                                    />
                                </button>
                                {benefitsOpen && <BenefitList items={benefits} />}
                            </div>
                        ) : (
                            <div>
                                <p className={s.sectionLabel}>O que você recebe</p>
                                <BenefitList items={benefits} />
                            </div>
                        )}
                        {programId && <p className={s.hint}>{STORE_HEALTH_NOTICE}</p>}
                        {produto === 'pro' && (
                            <p className={s.hint}>
                                Seus alunos registram a própria evolução (medidas e fotos) de
                                graça. O plano alimentar fica liberado para os alunos vinculados a
                                você.
                            </p>
                        )}
                    </>
                )}
            </>
        );
        footer = unavailableReason ? (
            <button type="button" className={`btn btn-outline-secondary ${s.cta}`} onClick={leave}>
                Voltar
            </button>
        ) : useGoogle ? (
            <button
                type="button"
                className={`btn btn-gold ${s.cta}`}
                onClick={handleGooglePlay}
                disabled={loading || !catalog || !googleChecked || (!!programId && !storeProgram)}
            >
                {loading ? spinner : 'Continuar para o pagamento'}
            </button>
        ) : (
            <button
                type="button"
                className={`btn btn-gold ${s.cta}`}
                onClick={goNext}
                disabled={!catalog || !googleChecked || (!!programId && !storeProgram)}
            >
                {googleChecked ? 'Escolher forma de pagamento' : spinner}
            </button>
        );
    } else if (currentStep === 'pay') {
        const payLabel = `${produto === 'plano' ? 'Pagar' : 'Assinar'}${price != null ? ` · ${formatBRL(price)}` : ''}`;
        body = (
            <>
                <div className={s.payTotal}>
                    <span>{productTitle}</span>
                    <strong>{price != null ? formatBRL(price) : '—'}</strong>
                </div>
                {altToken && !pix && (
                    <p className={s.hint}>
                        Você escolheu pagar direto ao Venafit. Escolha PIX ou cartão.
                    </p>
                )}
                {!pix && !cardPending && methods.length > 1 && (
                    <div className={s.methods} role="radiogroup" aria-label="Forma de pagamento">
                        {methods.includes('pix') && (
                            <button
                                type="button"
                                role="radio"
                                aria-checked={metodo === 'pix'}
                                className={`${s.method} ${metodo === 'pix' ? s.methodSelected : ''}`}
                                onClick={() => setMetodo('pix')}
                            >
                                <i className="fa-solid fa-qrcode" aria-hidden="true"></i>
                                PIX
                            </button>
                        )}
                        {methods.includes('card') && (
                            <button
                                type="button"
                                role="radio"
                                aria-checked={metodo === 'card'}
                                className={`${s.method} ${metodo === 'card' ? s.methodSelected : ''}`}
                                onClick={() => setMetodo('card')}
                            >
                                <i className="fa-solid fa-credit-card" aria-hidden="true"></i>
                                Cartão
                            </button>
                        )}
                    </div>
                )}

                {metodo === 'pix' && !pix && (
                    <p className={s.hint}>
                        {isPersonalPlan ? (
                            <>
                                O PIX paga{' '}
                                {produto === 'pro' && cycle === 'SEMIANNUALLY'
                                    ? '6 meses'
                                    : produto === 'pro' && cycle === 'YEARLY'
                                      ? '12 meses'
                                      : '1 mês'}{' '}
                                e não renova sozinho: avisamos 3 dias antes do fim. Para cobrança
                                automática todo mês, use o cartão.
                            </>
                        ) : (
                            'Pagamento único. Assim que o PIX cair, o plano é liberado sozinho.'
                        )}
                    </p>
                )}
                {metodo === 'pix' && pix && (
                    <div className={s.pixBox}>
                        {pix.qrImageUrl && (
                            // QR vem como data URI base64 do Asaas — <img> nativo,
                            // next/image não otimiza data URIs.
                            <img
                                src={pix.qrImageUrl}
                                alt="QR Code PIX"
                                width={220}
                                height={220}
                                className={s.qr}
                            />
                        )}
                        <p className={s.hint}>Escaneie o QR Code ou use o copia e cola:</p>
                        <div className="input-group">
                            <input
                                className="form-control form-control-sm"
                                readOnly
                                value={pix.payload ?? ''}
                                aria-label="Código PIX copia e cola"
                            />
                            <button
                                type="button"
                                className="btn btn-outline-secondary btn-sm"
                                onClick={handleCopyPix}
                            >
                                {copied ? 'Copiado!' : 'Copiar'}
                            </button>
                        </div>
                    </div>
                )}

                {metodo === 'card' && cardPending && (
                    <div className={s.pending}>
                        {spinner}
                        <p>
                            O cartão foi aceito e a cobrança está em análise. O plano é ativado
                            sozinho assim que ela for aprovada: pode fechar esta tela. Não assine de
                            novo.
                        </p>
                    </div>
                )}
                {metodo === 'card' && !cardPending && (
                    <>
                        {produto === 'plus' && (
                            <p className={s.hint}>
                                Assinatura mensal no cartão de crédito. Cancele quando quiser em
                                Minha conta.
                            </p>
                        )}
                        <CardForm id={CARD_FORM_ID} disabled={loading} onSubmit={handleCardSubmit} />
                    </>
                )}
            </>
        );
        footer =
            metodo === 'pix' && !pix ? (
                <button
                    type="button"
                    className={`btn btn-gold ${s.cta}`}
                    onClick={handlePix}
                    disabled={loading || !catalog}
                >
                    {loading ? spinner : 'Gerar QR Code PIX'}
                </button>
            ) : metodo === 'pix' && pix ? (
                <p className={s.waiting} role="status">
                    {spinner} Aguardando a confirmação do pagamento…
                </p>
            ) : metodo === 'card' && !cardPending ? (
                <button
                    type="submit"
                    form={CARD_FORM_ID}
                    className={`btn btn-gold ${s.cta}`}
                    disabled={loading}
                >
                    {loading ? spinner : payLabel}
                </button>
            ) : null;
    }

    return renderSheet({
        title: STEP_TITLES[currentStep],
        progress: steps.length > 1 ? { index: stepIndex, total: steps.length } : undefined,
        body,
        footer,
    });
}

/** Linha do resumo, com o atalho para o passo onde aquilo foi escolhido. */
function SummaryRow({ label, value, onEdit }: { label: string; value: string; onEdit?: () => void }) {
    return (
        <div className={s.summaryRow}>
            <dt>{label}</dt>
            <dd>
                <span>{value}</span>
                {onEdit && (
                    <button type="button" className={s.linkBtn} onClick={onEdit} aria-label={`Alterar ${label.toLowerCase()}`}>
                        Alterar
                    </button>
                )}
            </dd>
        </div>
    );
}

function BenefitList({ items }: { items: string[] }) {
    return (
        <ul className={s.benefits}>
            {items.map((b) => (
                <li key={b}>
                    <FiCheck aria-hidden="true" />
                    <span>{b}</span>
                </li>
            ))}
        </ul>
    );
}

/** Extrai a mensagem de erro da API (axios) com um fallback amigável. */
function apiErrorCode(err: unknown): string | undefined {
    return (err as { response?: { data?: { code?: string } } })?.response?.data?.code;
}

function extractApiError(
    err: unknown,
    fallback = 'Erro ao processar pagamento. Verifique os dados do cartão.',
): string {
    // PIX e cartão recusam, antes de cobrar, código de parceiro desativado
    // entre a confirmação no passo de indicação e o pagamento.
    if (apiErrorCode(err) === 'referral_code_not_found') {
        return 'O código de indicação não vale mais. Volte ao passo "Como você conheceu o Venafit?" e confira o código ou escolha outra opção. Nada foi cobrado.';
    }
    const axiosMsg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
    return axiosMsg || fallback;
}

/** Mensagem da compra pelo Google Play. A da ponte nativa é técnica ("Produto
 *  não encontrado no Google Play (0)") e não diz o que fazer; cancelar não é
 *  erro, mas precisa de retorno, senão parece que o botão não fez nada. */
function friendlyGooglePlayError(err: unknown): string {
    const msg = err instanceof Error ? err.message : '';
    if (msg === 'Compra cancelada') {
        return 'Você fechou a tela do Google Play sem concluir. Nada foi cobrado: toque no botão para tentar de novo.';
    }
    if (msg.startsWith('Produto não encontrado') || msg.startsWith('Assinatura sem oferta')) {
        return `Este plano não está disponível no Google Play agora. Atualize o app pela Play Store e tente de novo; se continuar, fale com o suporte. (${msg})`;
    }
    if (msg.includes('indisponível')) {
        return 'O Google Play não respondeu. Confira se você está conectado à sua conta Google na Play Store e tente de novo.';
    }
    return extractApiError(err, msg || 'Falha na compra pelo Google Play.');
}

/** Formulário de cartão. Os dados são tokenizados/processados pelo gateway;
 *  nunca são logados nem persistidos localmente. O botão de enviar fica no
 *  rodapé do passo (atributo form), sempre à vista. */
function CardForm(props: {
    id: string;
    disabled: boolean;
    onSubmit: (form: CardSubscriptionForm) => Promise<void>;
}) {
    const { id, disabled, onSubmit } = props;
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
        fieldId: keyof CardSubscriptionForm,
        label: string,
        col = 'col-12',
        type = 'text',
        inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'],
    ) => (
        <div className={col}>
            <div className="form-floating">
                <input
                    type={type}
                    className="form-control"
                    id={fieldId}
                    placeholder={label}
                    value={form[fieldId]}
                    onChange={set(fieldId)}
                    required
                    autoComplete="off"
                    inputMode={inputMode}
                />
                <label htmlFor={fieldId}>{label}</label>
            </div>
        </div>
    );

    return (
        <form id={id} onSubmit={submit} className={s.cardForm}>
            <fieldset disabled={disabled}>
                <legend className={s.sectionLabel}>Dados do cartão</legend>
                <div className="row g-3">
                    {field('card_number', 'Número do cartão', 'col-12', 'text', 'numeric')}
                    {field('card_holder_name', 'Nome impresso no cartão')}
                    {field('card_expiry_month', 'Mês (MM)', 'col-4', 'text', 'numeric')}
                    {field('card_expiry_year', 'Ano (AAAA)', 'col-4', 'text', 'numeric')}
                    {field('card_ccv', 'CVV', 'col-4', 'password', 'numeric')}
                </div>
            </fieldset>
            <fieldset disabled={disabled}>
                <legend className={s.sectionLabel}>Dados do titular</legend>
                <div className="row g-3">
                    {field('holder_name', 'Nome do titular', 'col-12 col-md-6')}
                    {field('holder_cpf', 'CPF do titular', 'col-12 col-md-6', 'text', 'numeric')}
                    {field('holder_email', 'E-mail', 'col-12 col-md-6', 'email', 'email')}
                    {field('holder_phone', 'Telefone', 'col-12 col-md-6', 'tel', 'tel')}
                    {field('holder_postal_code', 'CEP', 'col-6', 'text', 'numeric')}
                    {field('holder_address_num', 'Número (endereço)', 'col-6')}
                </div>
            </fieldset>
        </form>
    );
}

const Payment: React.FC = () => (
    <Suspense fallback={<div className="text-center p-4">Carregando…</div>}>
        <PaymentPageInner />
    </Suspense>
);

export default Payment;
