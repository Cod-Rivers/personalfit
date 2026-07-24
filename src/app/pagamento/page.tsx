'use client';
import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';

import './styles.css';
import { Api } from '@/libs/api';
import {
    CardSubscriptionForm,
    EarlyAnamnesisPixResponse,
    PlanCatalog,
    SubscribePixResponse,
    getPlans,
    isGooglePlayBillingAvailable,
    launchGooglePlayPurchase,
    purchaseEarlyAnamnesisPix,
    purchaseLibraryPlanCard,
    purchaseLibraryPlanPix,
    subscribeProCard,
    subscribeProPix,
    verifyGooglePlayPurchase,
} from '@/libs/paymentService';
import {
    ReferralPartnerPublic,
    getActiveReferralPartners,
} from '@/libs/referralPartnerService';

// Valor fixo para "sem indicação" — usado tanto aqui quanto interpretado no
// backend/estatísticas (ver ReferralPartnerController.GetIndicationStats).
const INDICATION_NONE = 'none';

type Produto = 'pro' | 'anamnese' | 'plano';
type Metodo = 'pix' | 'card' | 'google';

const CYCLE_LABELS: Record<string, string> = {
    MONTHLY: 'Mensal',
    SEMIANNUALLY: 'Semestral',
    YEARLY: 'Anual',
};

// O plano PRO é um recurso do personal trainer. Estes são os benefícios que
// ele desbloqueia — exibidos para o cliente entender o que está pagando.
const PRO_BENEFITS = [
    'Alunos ilimitados (o plano gratuito vai até 3)',
    'Agenda com controle de presença, recorrências e remarcações',
    'Sua marca (logo e identidade) no app dos seus alunos',
    'Monte e gerencie o plano alimentar dos seus alunos',
    'Vídeos e mídia própria nos seus exercícios',
    'Acompanhe a evolução dos alunos: medidas e fotos',
    'Seus ciclos de treino ficam privados (fora da biblioteca pública)',
    'Sem anúncios para você e para seus alunos',
];

// Benefícios da compra avulsa de um novo plano de treino (nova anamnese +
// treino gerado na hora), disponível para qualquer aluno.
const ANAMNESE_BENEFITS = [
    'Nova anamnese completa para atualizar seu perfil',
    'Um treino novo, gerado automaticamente para você',
    'Liberado na hora — sem esperar os 2 meses do plano gratuito',
];

// Benefícios da compra avulsa de um plano da biblioteca "estilo-famosos".
const PLANO_BENEFITS = [
    'Um plano de treino completo, pronto para começar',
    'Vira o seu treino ativo assim que o pagamento é confirmado',
    'Baixe para treinar offline, onde e quando quiser',
];

function formatBRL(value: number): string {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
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
    const produto: Produto =
        produtoParam === 'anamnese'
            ? 'anamnese'
            : produtoParam === 'plano'
              ? 'plano'
              : 'pro';
    const templateId = searchParams.get('templateId') ?? '';
    // Guarda o macrociclo ativo ANTES da compra de um plano, para detectar a
    // troca (webhook aplica o plano comprado) durante o polling do PIX.
    const planoActiveBefore = useRef<string | null>(null);

    const [catalog, setCatalog] = useState<PlanCatalog | null>(null);
    const [cycle, setCycle] = useState('MONTHLY');
    const [metodo, setMetodo] = useState<Metodo>('pix');
    const [googleAvailable, setGoogleAvailable] = useState(false);
    const [partners, setPartners] = useState<ReferralPartnerPublic[]>([]);
    const [indicationReceiver, setIndicationReceiver] = useState(INDICATION_NONE);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [pix, setPix] = useState<PixData | null>(null);
    const [copied, setCopied] = useState(false);
    const [confirmed, setConfirmed] = useState(false);
    const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        getPlans()
            .then(setCatalog)
            .catch(() => setError('Não foi possível carregar os planos. Tente novamente.'));
        setGoogleAvailable(isGooglePlayBillingAvailable());
        // Lista de parceiros é só um complemento do seletor de indicação — se
        // falhar, o checkout continua normalmente com apenas as opções fixas.
        getActiveReferralPartners()
            .then(setPartners)
            .catch(() => setPartners([]));
        return () => {
            if (pollingRef.current) clearInterval(pollingRef.current);
        };
    }, []);

    const selectedProPlan = catalog?.pro.find((p) => p.cycle === cycle);
    const price =
        produto === 'pro'
            ? selectedProPlan?.value
            : produto === 'plano'
              ? catalog?.library_plan.value
              : catalog?.early_anamnesis.value;
    const productTitle =
        produto === 'pro'
            ? `Plano PRO — ${CYCLE_LABELS[cycle] ?? cycle}`
            : produto === 'plano'
              ? 'Plano de treino selecionado'
              : 'Novo plano de treino';
    const benefits =
        produto === 'pro'
            ? PRO_BENEFITS
            : produto === 'plano'
              ? PLANO_BENEFITS
              : ANAMNESE_BENEFITS;
    const benefitsTitle =
        produto === 'pro'
            ? 'O que o PRO desbloqueia para você (personal):'
            : 'O que você recebe:';

    /** Confirma via polling se o pagamento foi processado pelo webhook. */
    const startPolling = useCallback(() => {
        if (pollingRef.current) clearInterval(pollingRef.current);
        pollingRef.current = setInterval(async () => {
            try {
                if (produto === 'pro') {
                    const { data } = await Api.get<{ plan_type?: string; active?: boolean }>('/me');
                    if (data.plan_type === 'pro') {
                        setConfirmed(true);
                        if (pollingRef.current) clearInterval(pollingRef.current);
                        // Atualiza o cache local de usuário para refletir o plano novo
                        const stored = localStorage.getItem('user');
                        if (stored) {
                            const parsed = JSON.parse(stored);
                            parsed.plan_type = 'pro';
                            localStorage.setItem('user', JSON.stringify(parsed));
                        }
                    }
                } else if (produto === 'plano') {
                    // O webhook troca o macrociclo ativo pelo plano comprado.
                    const { data } = await Api.get<{ id?: string }>('/my-planning/active');
                    if (data?.id && data.id !== planoActiveBefore.current) {
                        setConfirmed(true);
                        if (pollingRef.current) clearInterval(pollingRef.current);
                    }
                } else {
                    const { data } = await Api.get<{ has_early_release?: boolean; can_register?: boolean }>(
                        '/user/anamnesis/status',
                    );
                    if (data.has_early_release || data.can_register) {
                        setConfirmed(true);
                        if (pollingRef.current) clearInterval(pollingRef.current);
                    }
                }
            } catch {
                // erros transitórios de polling são ignorados
            }
        }, 5000);
    }, [produto]);

    const handlePix = async () => {
        setError('');
        setLoading(true);
        try {
            if (produto === 'pro') {
                const res: SubscribePixResponse = await subscribeProPix(
                    cycle,
                    indicationReceiver,
                );
                setPix({
                    qrImageUrl: res.qr_image_url,
                    payload: res.qr_code_payload,
                    expiresAt: res.expires_at,
                });
            } else if (produto === 'plano') {
                // Captura o plano ativo atual para detectar a troca no polling.
                try {
                    const { data } = await Api.get<{ id?: string }>('/my-planning/active');
                    planoActiveBefore.current = data?.id ?? null;
                } catch {
                    planoActiveBefore.current = null;
                }
                const res = await purchaseLibraryPlanPix(templateId);
                setPix({
                    qrImageUrl: res.qr_image_url,
                    payload: res.qr_code_payload,
                    expiresAt: res.expires_at,
                });
            } else {
                const res: EarlyAnamnesisPixResponse = await purchaseEarlyAnamnesisPix();
                setPix({
                    qrImageUrl: res.qr_image_url,
                    payload: res.qr_code_payload,
                    expiresAt: res.expires_at,
                });
            }
            startPolling();
        } catch (err: unknown) {
            const axiosMsg =
                (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
            setError(axiosMsg || 'Erro ao gerar cobrança PIX. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    const handleGooglePlay = async () => {
        setError('');
        setLoading(true);
        try {
            const stored = localStorage.getItem('user');
            const accountId: string = stored ? (JSON.parse(stored)?.id ?? '') : '';
            const productId =
                produto === 'pro'
                    ? (selectedProPlan?.play_product_id ?? '')
                    : produto === 'plano'
                      ? (catalog?.library_plan.play_product_id ?? '')
                      : (catalog?.early_anamnesis.play_product_id ?? '');
            const productType = produto === 'pro' ? 'subs' : 'inapp';
            if (!productId) throw new Error('Produto indisponível');

            const result = await launchGooglePlayPurchase(productId, productType, accountId);
            const verify = await verifyGooglePlayPurchase(
                productId,
                result.purchaseToken!,
                productType,
                produto === 'plano' ? templateId : undefined,
            );
            if (verify.success) {
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

    if (confirmed) {
        return (
            <div className="container-box">
                <div className="main_box p-4 text-center">
                    <i className="fa-solid fa-circle-check text-success fa-3x mb-3"></i>
                    <h2 className="h4">Pagamento confirmado!</h2>
                    <p>
                        {produto === 'pro'
                            ? 'Seu plano PRO está ativo. Aproveite todos os recursos.'
                            : produto === 'plano'
                              ? 'Seu novo plano de treino está ativo. Bora treinar!'
                              : 'Sua nova anamnese foi liberada. Você já pode preenchê-la.'}
                    </p>
                    <button
                        className="btn btn-gold mt-2"
                        onClick={() =>
                            router.push(
                                produto === 'pro'
                                    ? '/'
                                    : produto === 'plano'
                                      ? '/meus-treinos'
                                      : '/anamnese',
                            )
                        }
                    >
                        {produto === 'pro'
                            ? 'Ir para o início'
                            : produto === 'plano'
                              ? 'Ver meus treinos'
                              : 'Fazer nova anamnese'}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="container-box">
            <div className="main_box">
                <header className="m-3 d-flex align-items-center gap-4">
                    <Image
                        src="/assets/images/logo.png"
                        alt="logo"
                        sizes="cover"
                        width={150}
                        height={70}
                    />
                    <h1 className="h3 mt-2">Pagamento</h1>
                </header>

                {error && (
                    <div className="alert alert-danger m-3" role="alert">
                        {error}
                    </div>
                )}

                <div className="row g-3 m-3 py-3">
                    <div className="col-12 col-md-6 order-first order-md-last">
                        <div className="card">
                            <div className="card-body">
                                <h5 className="card-title">Resumo do Pedido</h5>
                                <p className="card-text fw-semibold">{productTitle}</p>

                                <p className="small text-muted mb-2">{benefitsTitle}</p>
                                <ul className="list-unstyled mb-3">
                                    {benefits.map((b) => (
                                        <li
                                            key={b}
                                            className="d-flex align-items-start gap-2 mb-2"
                                        >
                                            <i className="fa-solid fa-circle-check text-success mt-1"></i>
                                            <span>{b}</span>
                                        </li>
                                    ))}
                                </ul>

                                {produto === 'pro' && (
                                    <p className="small text-muted mb-3">
                                        Seus alunos têm a evolução (medidas e fotos)
                                        gratuita. O plano alimentar fica liberado para
                                        os alunos vinculados a você.
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
                                            disabled={!!pix}
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
                                            disabled={!!pix}
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
                                <p className="card-text fw-bold">
                                    Total: {price != null ? formatBRL(price) : '—'}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="col-12 col-md-6">
                        {!pix && (
                            <div className="d-flex gap-2 flex-wrap">
                                <button
                                    className={`btn btn-${metodo !== 'pix' ? 'outline-' : ''}gold flex-fill`}
                                    onClick={() => setMetodo('pix')}
                                >
                                    <h6 className="mb-1">Pix</h6>
                                    <i className="fa-solid fa-qrcode fa-lg"></i>
                                </button>
                                {produto !== 'anamnese' && (
                                    <button
                                        className={`btn btn-${metodo !== 'card' ? 'outline-' : ''}gold flex-fill`}
                                        onClick={() => setMetodo('card')}
                                    >
                                        <h6 className="mb-1">Cartão</h6>
                                        <i className="fa-solid fa-credit-card fa-lg"></i>
                                    </button>
                                )}
                                {googleAvailable && (
                                    <button
                                        className={`btn btn-${metodo !== 'google' ? 'outline-' : ''}gold flex-fill`}
                                        onClick={() => setMetodo('google')}
                                    >
                                        <h6 className="mb-1">Google Play</h6>
                                        <i className="fa-brands fa-google-play fa-lg"></i>
                                    </button>
                                )}
                            </div>
                        )}

                        {/* PIX */}
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

                        {/* Cartão de crédito — assinatura PRO (recorrente) */}
                        {metodo === 'card' && produto === 'pro' && (
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
                                        );
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

                        {/* Cartão de crédito — compra avulsa de plano (única) */}
                        {metodo === 'card' && produto === 'plano' && (
                            <CardForm
                                disabled={loading}
                                submitLabel="Pagar"
                                onSubmit={async (form) => {
                                    setError('');
                                    setLoading(true);
                                    try {
                                        const res = await purchaseLibraryPlanCard(templateId, form);
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
                                        'Pagar pelo Google Play'
                                    )}
                                </button>
                                <p className="small text-muted mt-2">
                                    A cobrança é feita pela sua conta Google Play.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

/** Extrai a mensagem de erro da API (axios) com um fallback amigável. */
function extractApiError(err: unknown): string {
    const axiosMsg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
    return axiosMsg || 'Erro ao processar pagamento. Verifique os dados do cartão.';
}

/** Formulário de cartão. Os dados são tokenizados/processados pelo gateway;
 *  nunca são logados nem persistidos localmente. O pai decide o que fazer com
 *  o formulário via onSubmit (assinatura PRO ou compra avulsa de plano). */
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
    <Suspense fallback={<div className="container-box p-5 text-center">Carregando…</div>}>
        <PaymentPageInner />
    </Suspense>
);

export default Payment;
