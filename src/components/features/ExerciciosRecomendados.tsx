'use client';

import { ExerciciosDor, User } from '@/components/features/types';
import { Api } from '@/app/utils/api';
import React, { useEffect, useState } from 'react';

export default function ExerciciosRecomendados() {
    const [exercicios, setExercicios] = useState<ExerciciosDor[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        async function fetchUser() {
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    setError('Usuário não autenticado.');
                    setLoading(false);
                    return;
                }
                const { data } = await Api.get<User>('/me', {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setExercicios(data.exercicios_dor_selecionados || []);
            } catch (err: any) {
                console.error(
                    '[ExerciciosRecomendados] Erro ao buscar /me:',
                    err,
                );
                let msg = 'Erro ao carregar exercícios recomendados.';
                if (err?.response?.data?.error) {
                    msg += ' ' + err.response.data.error;
                } else if (err?.message) {
                    msg += ' ' + err.message;
                }
                setError(msg);
            } finally {
                setLoading(false);
            }
        }
        fetchUser();
    }, []);

    if (loading) return <div>Carregando exercícios recomendados...</div>;
    if (error) return <div className="alert alert-danger">{error}</div>;
    if (!exercicios.length)
        return <div>Nenhum exercício recomendado encontrado.</div>;

    // Agrupa por dor
    const agrupado: { [dor: string]: ExerciciosDor[] } = {};
    exercicios.forEach((ex) => {
        if (!agrupado[ex.dor]) agrupado[ex.dor] = [];
        agrupado[ex.dor].push(ex);
    });

    return (
        <div>
            <h4>Exercícios recomendados para suas dores:</h4>
            {Object.entries(agrupado).map(([dor, lista]) => (
                <div key={dor} style={{ marginBottom: 24 }}>
                    <h5 style={{ textTransform: 'capitalize' }}>{dor}</h5>
                    <ul>
                        {lista.map((ex, index) => (
                            <li
                                key={ex.id || `${dor}-${index}`}
                                style={{ marginBottom: 12 }}
                            >
                                <strong>{ex.nome}</strong>
                                {ex.descricao && <div>{ex.descricao}</div>}
                                {ex.video_url && (
                                    <video
                                        width="320"
                                        controls
                                        style={{ marginTop: 8 }}
                                    >
                                        <source
                                            src={ex.video_url}
                                            type="video/mp4"
                                        />
                                        Seu navegador não suporta vídeo.
                                    </video>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
            ))}
        </div>
    );
}
