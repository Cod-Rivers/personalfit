'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    type StudentPlusStatus,
    cancelStudentPlus,
    getStudentPlusStatus,
} from '@/libs/paymentService';

function formatBRL(value: number): string {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/**
 * Aluno Plus em Minha conta: situação, assinar e cancelar.
 *
 * Cancelar precisa ser tão fácil quanto assinar (CDC) — por isso o botão
 * mora aqui, e não só na tela de pagamento. Assinatura feita pelo Google Play
 * só é cancelada pela própria loja; o backend recusa e a tela explica.
 */
export default function StudentPlusCard() {
    const router = useRouter();
    const [status, setStatus] = useState<StudentPlusStatus | null>(null);
    const [canceling, setCanceling] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        getStudentPlusStatus()
            .then(setStatus)
            .catch(() => setStatus(null));
    }, []);

    if (!status) return null;

    const handleCancel = async () => {
        if (!confirm('Cancelar o Aluno Plus? Os anúncios voltam e a Substituição Inteligente deixa de funcionar.')) return;
        setCanceling(true);
        setError('');
        try {
            await cancelStudentPlus();
            setStatus(await getStudentPlusStatus());
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
            setError(msg || 'Não foi possível cancelar. Tente novamente.');
        } finally {
            setCanceling(false);
        }
    };

    const viaGooglePlay = status.billing_type === 'GOOGLE_PLAY';

    return (
        <div className="card mb-4">
            <div className="card-header fw-semibold d-flex justify-content-between align-items-center">
                Aluno Plus
                {status.active && <span className="badge bg-success">Ativo</span>}
            </div>
            <div className="card-body">
                {error && <div className="alert alert-danger py-2">{error}</div>}

                {status.own_pro ? (
                    <p className="text-secondary mb-0" style={{ fontSize: '0.9rem' }}>
                        Sua conta já tem os benefícios do Aluno Plus.
                    </p>
                ) : status.active ? (
                    <>
                        <p className="text-secondary mb-3" style={{ fontSize: '0.9rem' }}>
                            Sem anúncios, Substituição Inteligente de Exercícios, links do
                            Instagram e do TikTok e 2 importações de PDF por mês.
                            {viaGooglePlay && ' Assinatura feita pelo Google Play: para cancelar, use o app da Play Store.'}
                        </p>
                        {!viaGooglePlay && (
                            <button
                                className="btn btn-outline-secondary"
                                onClick={handleCancel}
                                disabled={canceling}
                            >
                                {canceling ? 'Cancelando...' : 'Cancelar assinatura'}
                            </button>
                        )}
                    </>
                ) : !status.eligible ? (
                    <p className="text-secondary mb-0" style={{ fontSize: '0.9rem' }}>
                        Você treina com personal: os recursos extras vêm do plano dele.
                    </p>
                ) : (
                    <>
                        {status.status === 'SUSPENDED' && (
                            <div className="alert alert-warning py-2">
                                Sua assinatura está suspensa por falta de pagamento.
                            </div>
                        )}
                        <p className="text-secondary mb-3" style={{ fontSize: '0.9rem' }}>
                            App sem anúncios, Substituição Inteligente de Exercícios, links
                            do Instagram e do TikTok no treino que você monta e 2
                            importações de PDF por mês, por {formatBRL(status.price)}/mês.
                            Cancele quando quiser.
                        </p>
                        <button
                            className="btn btn-primary"
                            onClick={() => router.push('/pagamento?produto=plus')}
                        >
                            Assinar o Aluno Plus
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
