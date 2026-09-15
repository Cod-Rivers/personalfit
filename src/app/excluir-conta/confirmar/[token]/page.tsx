'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Api } from '@/libs/api';

/**
 * Confirmação final da exclusão pedida pelo canal público (/excluir-conta).
 *
 * O token chega pela URL do e-mail, mas a exclusão só dispara no clique do
 * botão: um link que apagasse a conta ao ser aberto seria acionado por
 * qualquer pré-visualizador de e-mail que busca a URL antes do usuário ver a
 * mensagem.
 */
export default function ConfirmarExclusaoPage() {
    const params = useParams();
    const token = (params?.token as string) ?? '';

    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState('');

    const confirm = async () => {
        setLoading(true);
        setError('');
        try {
            await Api.post('/account-deletion-request/confirm', { token });
            // Se o aparelho ainda tinha uma sessão desta conta guardada, ela
            // acabou de virar lixo: o backend revogou tudo no servidor.
            try {
                localStorage.removeItem('user');
                localStorage.removeItem('token');
                localStorage.removeItem('refresh_token');
            } catch {
                // Navegador sem storage disponível — nada a limpar.
            }
            setDone(true);
        } catch (err: unknown) {
            const msg = (
                err as { response?: { data?: { error?: string } } } | undefined
            )?.response?.data?.error;
            setError(msg ?? 'Link inválido ou expirado. Peça um novo.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container py-5" style={{ maxWidth: 600 }}>
            <h1 className="h3 mb-3 fw-bold">Confirmar exclusão da conta</h1>

            {done ? (
                <>
                    <div className="alert alert-success">
                        <p className="fw-semibold mb-1">Conta excluída.</p>
                        <p className="mb-0">
                            Seus dados de identificação foram anonimizados, seus
                            dados de saúde e de treino foram apagados de forma
                            permanente e todos os aparelhos foram desconectados.
                        </p>
                    </div>
                    <p className="text-secondary">
                        Se você tinha uma assinatura ativa pelo Google Play,
                        lembre-se de cancelá-la na Play Store: a exclusão da
                        conta não interrompe a cobrança da loja.
                    </p>
                    <Link href="/" className="btn btn-outline-secondary btn-sm">
                        Voltar ao início
                    </Link>
                </>
            ) : (
                <>
                    <p>
                        Este é o último passo. Ao confirmar, seus dados de
                        identificação (nome, e-mail, CPF, telefone e foto) são
                        anonimizados e seus dados de saúde e de treino
                        (anamnese, restrições, avaliações, fotos, planos e
                        histórico de treinos) são apagados de forma{' '}
                        <strong>permanente e irreversível</strong>.
                    </p>
                    <p className="text-secondary">
                        Os prazos do que precisa ser retido por obrigação legal
                        estão descritos na{' '}
                        <Link href="/excluir-conta">
                            página de exclusão de conta
                        </Link>
                        .
                    </p>

                    {error && (
                        <div className="alert alert-danger py-2">
                            {error}{' '}
                            <Link href="/excluir-conta">
                                Pedir um novo link.
                            </Link>
                        </div>
                    )}

                    <div className="d-flex flex-wrap gap-2 mt-4">
                        <Link
                            href="/"
                            className="btn btn-secondary"
                            style={{ flexShrink: 0 }}
                        >
                            Cancelar
                        </Link>
                        <button
                            className="btn btn-danger"
                            style={{ flexShrink: 0 }}
                            onClick={confirm}
                            disabled={loading || !token}
                        >
                            {loading ? (
                                <>
                                    <span className="spinner-border spinner-border-sm me-2" />
                                    Excluindo...
                                </>
                            ) : (
                                'Sim, excluir minha conta'
                            )}
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
