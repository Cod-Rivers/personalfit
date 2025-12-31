'use client';
import { ReactNode, useState, useEffect } from 'react';
import { Api } from '@/app/utils/api';
import { useRouter } from 'next/navigation';

interface PixPaymentProps {
    planValue: number;
    planCycle: 'BIMONTHLY' | 'SEMIANNUALLY' | 'YEARLY';
}

interface PixPaymentResponse {
    payment_id: string;
    qr_image_url: string;
    qr_code_payload: string;
    expires_at: string;
    status: string;
    message: string;
}

const PIX_STORAGE_KEY = 'pix_payment_data';

export const PixPayment = ({
    planValue,
    planCycle,
}: PixPaymentProps): ReactNode => {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string>('');
    const [pixData, setPixData] = useState<PixPaymentResponse | null>(null);
    const [timeLeft, setTimeLeft] = useState<string>('');
    const [copied, setCopied] = useState(false);
    const [pollingCount, setPollingCount] = useState(0);

    // Carregar dados do localStorage ao montar o componente
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const storedData = localStorage.getItem(PIX_STORAGE_KEY);
        if (!storedData) return;

        try {
            const parsed: PixPaymentResponse = JSON.parse(storedData);

            // Verificar se ainda não expirou
            const now = new Date().getTime();
            const expiry = new Date(parsed.expires_at).getTime();

            if (expiry > now) {
                setPixData(parsed);
                setPollingCount(0);
            } else {
                // Limpar dados expirados
                localStorage.removeItem(PIX_STORAGE_KEY);
            }
        } catch (error) {
            console.error(
                '[PixPayment] Erro ao carregar dados do localStorage:',
                error,
            );
            localStorage.removeItem(PIX_STORAGE_KEY);
        }
    }, []);

    // Salvar dados no localStorage quando pixData mudar
    useEffect(() => {
        if (!pixData) {
            localStorage.removeItem(PIX_STORAGE_KEY);
            return;
        }

        localStorage.setItem(PIX_STORAGE_KEY, JSON.stringify(pixData));
    }, [pixData]);

    // Contador de expiração
    useEffect(() => {
        if (!pixData?.expires_at) return;

        const interval = setInterval(() => {
            const now = new Date().getTime();
            const expiry = new Date(pixData.expires_at).getTime();
            const diff = expiry - now;

            if (diff <= 0) {
                setTimeLeft('Expirado');
                clearInterval(interval);
                // Limpar dados expirados do localStorage
                localStorage.removeItem(PIX_STORAGE_KEY);
                setPixData(null);
                return;
            }

            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
        }, 1000);

        return () => clearInterval(interval);
    }, [pixData?.expires_at]);

    // Polling para verificar pagamento (otimizado para reduzir custos Cloud Run)
    useEffect(() => {
        if (!pixData) return;

        // Limite de 40 tentativas = 2 minutos (otimizado para custos)
        // Após isso, usuário usa o botão de verificação manual
        const MAX_POLLING_ATTEMPTS = 40;

        if (pollingCount >= MAX_POLLING_ATTEMPTS) {
            console.log(
                '[PixPayment] Limite de polling atingido (2min). Use verificação manual.',
            );
            return;
        }

        console.log('[PixPayment] Iniciando polling...');
        const interval = setInterval(async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    console.log('[PixPayment] Token não encontrado');
                    return;
                }

                console.log(
                    '[PixPayment] Verificando pagamento... tentativa:',
                    pollingCount + 1,
                );
                const { data } = await Api.get('/me', {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                console.log('[PixPayment] User active status:', data.active);

                if (data.active === true) {
                    console.log(
                        '[PixPayment] Pagamento confirmado! Redirecionando...',
                    );
                    clearInterval(interval);
                    localStorage.setItem('user', JSON.stringify(data));
                    // Limpar dados do PIX após confirmação do pagamento
                    localStorage.removeItem(PIX_STORAGE_KEY);
                    router.push('/app');
                } else {
                    setPollingCount((prev) => prev + 1);
                }
            } catch (error) {
                console.error('[PixPayment] Erro no polling:', error);
                setPollingCount((prev) => prev + 1);
            }
        }, 3000);

        return () => {
            console.log('[PixPayment] Limpando interval de polling');
            clearInterval(interval);
        };
    }, [pixData, pollingCount, router]);

    const handleGenerateQRCode = async (
        e: React.MouseEvent<HTMLButtonElement>,
    ) => {
        try {
            e.preventDefault();
            setLoading(true);
            setError('');

            const token = localStorage.getItem('token');
            if (!token) {
                setError('Token de autenticação não encontrado');
                return;
            }

            const { data } = await Api.post<PixPaymentResponse>(
                '/user/subscribe',
                {
                    payment_method: 'PIX',
                    plan_value: planValue,
                    plan_cycle: planCycle,
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                },
            );

            setPixData(data);
            setPollingCount(0);
        } catch (error: any) {
            console.error('[PixPayment] Erro ao gerar QR Code:', error);
            setError(
                error.response?.data?.error ||
                    'Erro ao gerar QR Code. Tente novamente.',
            );
        } finally {
            setLoading(false);
        }
    };

    const handleCopyCode = async () => {
        if (!pixData?.qr_code_payload) return;

        try {
            await navigator.clipboard.writeText(pixData.qr_code_payload);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error('[PixPayment] Erro ao copiar código:', error);
        }
    };

    const handleCheckPayment = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            if (!token) {
                setError('Token de autenticação não encontrado');
                return;
            }

            console.log('[PixPayment] Verificação manual do pagamento...');
            const { data } = await Api.get('/me', {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            console.log('[PixPayment] Status do usuário:', data);

            if (data.active === true) {
                console.log('[PixPayment] Pagamento confirmado!');
                localStorage.setItem('user', JSON.stringify(data));
                localStorage.removeItem(PIX_STORAGE_KEY);
                router.push('/app');
            } else {
                setError(
                    'Pagamento ainda não confirmado. Aguarde alguns instantes e tente novamente.',
                );
                setTimeout(() => setError(''), 3000);
            }
        } catch (error: any) {
            console.error('[PixPayment] Erro ao verificar pagamento:', error);
            setError(
                error.response?.data?.error || 'Erro ao verificar pagamento',
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="card">
            <div className="card-body">
                <h5 className="card-title mb-3">Pagamento via PIX</h5>

                {error && (
                    <div className="alert alert-danger" role="alert">
                        {error}
                    </div>
                )}

                {!pixData ? (
                    <div className="text-center">
                        <p className="text-muted mb-3">
                            Gere o QR Code para realizar o pagamento
                        </p>
                        <button
                            className="btn btn-lg btn-gold w-100"
                            onClick={handleGenerateQRCode}
                            disabled={loading}
                        >
                            {loading ? (
                                <div
                                    className="spinner-border text-light"
                                    role="status"
                                >
                                    <span className="visually-hidden">
                                        Carregando...
                                    </span>
                                </div>
                            ) : (
                                'Gerar QR Code PIX'
                            )}
                        </button>
                    </div>
                ) : (
                    <div className="text-center">
                        {pixData.message && (
                            <div className="alert alert-info mb-3">
                                {pixData.message}
                            </div>
                        )}

                        {/* QR Code Image */}
                        <div className="mb-3">
                            <img
                                src={pixData.qr_image_url}
                                alt="QR Code PIX"
                                className="img-fluid"
                                style={{ maxWidth: '300px' }}
                            />
                        </div>

                        {/* Tempo restante */}
                        {timeLeft && (
                            <div className="mb-3">
                                <p className="text-muted mb-1">
                                    Tempo para pagamento:
                                </p>
                                <p
                                    className={`h5 ${timeLeft === 'Expirado' ? 'text-danger' : 'text-success'}`}
                                >
                                    {timeLeft}
                                </p>
                            </div>
                        )}

                        {/* Código PIX copiável */}
                        <div className="mb-3">
                            <label className="form-label fw-bold">
                                Ou copie o código PIX:
                            </label>
                            <div className="input-group">
                                <input
                                    type="text"
                                    className="form-control"
                                    value={pixData.qr_code_payload}
                                    readOnly
                                    style={{
                                        fontSize: '0.85rem',
                                        fontFamily: 'monospace',
                                    }}
                                />
                                <button
                                    className="btn btn-outline-secondary"
                                    type="button"
                                    onClick={handleCopyCode}
                                >
                                    {copied ? (
                                        '✓ Copiado'
                                    ) : (
                                        <span>📋 Copiar</span>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Instruções */}
                        <div className="alert alert-light border">
                            <h6 className="alert-heading">
                                Como pagar com PIX:
                            </h6>
                            <ol className="text-start mb-0 small">
                                <li>Abra o app do seu banco</li>
                                <li>
                                    Escolha pagar com PIX QR Code ou Pix Copia e
                                    Cola
                                </li>
                                <li>Escaneie o código ou cole o texto acima</li>
                                <li>Confirme o pagamento</li>
                                <li>
                                    Aguarde a confirmação (geralmente
                                    instantânea)
                                </li>
                            </ol>
                        </div>

                        {/* Status de polling */}
                        <div className="mt-3">
                            {pollingCount > 0 && pollingCount < 40 && (
                                <div className="text-muted small mb-2">
                                    <div
                                        className="spinner-border spinner-border-sm me-2"
                                        role="status"
                                    >
                                        <span className="visually-hidden">
                                            Aguardando...
                                        </span>
                                    </div>
                                    Aguardando confirmação do pagamento...
                                    (tentativa {pollingCount}/40)
                                </div>
                            )}

                            {pollingCount >= 40 && (
                                <div className="alert alert-warning small mb-2">
                                    ⏱️ Tempo de verificação automática
                                    encerrado. Clique no botão abaixo para
                                    verificar manualmente.
                                </div>
                            )}

                            {/* Botão de verificação manual */}
                            <button
                                className="btn btn-primary w-100"
                                onClick={handleCheckPayment}
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <div
                                            className="spinner-border spinner-border-sm me-2"
                                            role="status"
                                        >
                                            <span className="visually-hidden">
                                                Verificando...
                                            </span>
                                        </div>
                                        Verificando...
                                    </>
                                ) : (
                                    '🔄 Já paguei - Verificar agora'
                                )}
                            </button>
                            <p className="text-muted small mt-2 mb-0">
                                Clique aqui após efetuar o pagamento
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
