import { useState, useEffect } from 'react';
import { Api } from '@/app/utils/api';

interface AnamnesisStatus {
    can_register: boolean;
    has_early_release: boolean;
    last_anamnesis_date?: string;
    next_available_date?: string;
    days_remaining?: number;
    early_release_cost: number;
    can_purchase_release: boolean;
}

export function useAnamnesisStatus() {
    const [status, setStatus] = useState<AnamnesisStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchStatus();
    }, []);

    const fetchStatus = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');

            if (!token) {
                console.log('[useAnamnesisStatus] Sem token, permitindo anamnese');
                // Sem token, permite fazer anamnese
                setStatus({
                    can_register: true,
                    has_early_release: false,
                    early_release_cost: 29.90,
                    can_purchase_release: false
                });
                setLoading(false);
                return;
            }

            console.log('[useAnamnesisStatus] Buscando status...');
            const response = await Api.get('/user/anamnesis/status', {
                headers: { Authorization: `Bearer ${token}` },
            });

            console.log('[useAnamnesisStatus] Status recebido:', response.data);
            
            // Se retornar null ou vazio, permite fazer anamnese
            if (!response.data || response.data === null) {
                console.log('[useAnamnesisStatus] Status null, permitindo anamnese');
                setStatus({
                    can_register: true,
                    has_early_release: false,
                    early_release_cost: 29.90,
                    can_purchase_release: false
                });
            } else {
                setStatus(response.data);
            }
            setError(null);
        } catch (err: any) {
            console.error('[useAnamnesisStatus] Erro ao verificar status:', err);
            
            // Se endpoint não existe (404) ou erro de servidor (500), permite fazer anamnese
            if (err.response?.status === 404 || err.response?.status === 500 || !err.response) {
                console.log('[useAnamnesisStatus] Endpoint não disponível, permitindo anamnese');
                setStatus({
                    can_register: true,
                    has_early_release: false,
                    early_release_cost: 29.90,
                    can_purchase_release: false
                });
                setError(null);
            } else {
                // Outros erros, ainda permite mas mostra erro
                console.log('[useAnamnesisStatus] Erro mas permitindo anamnese');
                setStatus({
                    can_register: true,
                    has_early_release: false,
                    early_release_cost: 29.90,
                    can_purchase_release: false
                });
                setError(err.response?.data?.error || 'Erro ao verificar status da anamnese');
            }
        } finally {
            setLoading(false);
        }
    };

    return { status, loading, error, refetch: fetchStatus };
}
