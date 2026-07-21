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
    subscribeProCard,
    subscribeProPix,
    verifyGooglePlayPurchase,
} from '@/libs/paymentService';

type Produto = 'pro' | 'anamnese';
type Metodo = 'pix' | 'card' | 'google';

const CYCLE_LABELS: Record<string, string> = {
    MONTHLY: 'Mensal',
    SEMIANNUALLY: 'Semestral',
    YEARLY: 'Anual',
};

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
    const produto: Produto = searchParams.get('produto') === 'anamnese' ? 'anamnese' : 'pro';

    const [catalog, setCatalog] = useState<PlanCatalog | null>(null);
    const [cycle, setCycle] = useState('MONTHLY');
    const [metodo, setMetodo] = useState<Metodo>('pix');
    const [googleAvailable, setGoogleAvailable] = useState(false);
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
        return () => {
            if (pollingRef.current) clearInterval(pollingRef.current);
        };
    }, []);

    const selectedProPlan = catalog?.pro.find((p) => p.cycle === cycle);
    const price =
        produto === 'pro' ? selectedProPlan?.value : catalog?.early_anamnesis.value;
    const productTitle =
        produto === 'pro'
            ? `Plano PRO — ${CYCLE_LABELS[cycle] ?? cycle}`
            : 'Nova anamnese + novo treino';

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
                const res: SubscribePixResponse = await subscribeProPix(cycle);
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
                    : (catalog?.early_anamnesis.play_product_id ?? '');
            const productType = produto === 'pro' ? 'subs' : 'inapp';
            if (!productId) throw new Error('Produto indisponível');

            const result = await launchGooglePlayPurchase(productId, productType, accountId);
            const verify = await verifyGooglePlayPurchase(
                productId,
                result.purchaseToken!,
                productType,
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
                            : 'Sua nova anamnese foi liberada. Você já pode preenchê-la.'}
                    </p>
                    <button
                        className="btn btn-gold mt-2"
                        onClick={() => router.push(produto === 'pro' ? '/' : '/anamnese')}
                    >
                        {produto === 'pro' ? 'Ir para o início' : 'Fazer nova anamnese'}
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
                                <p className="card-text">{productTitle}</p>
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
                                {produto === 'pro' && (
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

                        {/* Cartão de crédito (apenas plano Pro) */}
                        {metodo === 'card' && produto === 'pro' && (
                            <CardForm
                                cycle={cycle}
                                disabled={loading}
                                onSubmitStart={() => {
                                    setError('');
                                    setLoading(true);
                                }}
                                onSuccess={(status) => {
                                    setLoading(false);
                                    if (status === 'ACTIVE') {
                                        setConfirmed(true);
                                    } else {
                                        startPolling();
                                    }
                                }}
                                onError={(msg) => {
                                    setLoading(false);
                                    setError(msg);
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

/** Formulário de cartão. Os dados são tokenizados/processados pelo gateway;
 *  nunca são logados nem persistidos localmente. */
function CardForm(props: {
    cycle: string;
    disabled: boolean;
    onSubmitStart: () => void;
    onSuccess: (status: string) => void;
    onError: (msg: string) => void;
}) {
    const { cycle, disabled, onSubmitStart, onSuccess, onError } = props;
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
        onSubmitStart();
        try {
            const res = await subscribeProCard(cycle, form);
            onSuccess(res.status);
        } catch (err: unknown) {
            const axiosMsg =
                (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
            onError(axiosMsg || 'Erro ao processar pagamento. Verifique os dados do cartão.');
        }
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
                        'Assinar'
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
