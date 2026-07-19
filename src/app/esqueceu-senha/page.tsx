'use client';
import { Api } from '@/libs/api';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const schema = z.object({
    email: z.string().email('E-mail inválido'),
});

type FormData = z.infer<typeof schema>;

export default function EsqueceuSenhaPage() {
    const [sent, setSent] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<FormData>({ resolver: zodResolver(schema) });

    const submit = async (form: FormData) => {
        setLoading(true);
        setError('');
        try {
            await Api.post('/forgot-password', form);
            setSent(true);
        } catch {
            setError('Erro ao enviar. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-vh-100 d-flex justify-content-center align-items-center bg-light">
            <div
                className="card shadow p-4"
                style={{ maxWidth: 420, width: '100%' }}
            >
                <h4 className="mb-3 fw-semibold">Recuperar senha</h4>

                {sent ? (
                    <div className="alert alert-success">
                        Se o e-mail existir na plataforma, você receberá um link
                        para redefinir a senha em breve.
                    </div>
                ) : (
                    <form
                        onSubmit={handleSubmit(submit)}
                        className="d-flex flex-column gap-3"
                    >
                        <div>
                            <input
                                type="email"
                                className="form-control"
                                placeholder="Seu e-mail"
                                {...register('email')}
                            />
                            {errors.email && (
                                <small className="text-danger">
                                    {errors.email.message}
                                </small>
                            )}
                        </div>

                        {error && (
                            <div className="alert alert-danger py-2">
                                {error}
                            </div>
                        )}

                        <button
                            className="btn btn-primary w-100"
                            disabled={loading}
                        >
                            {loading ? (
                                <span className="spinner-border spinner-border-sm" />
                            ) : (
                                'Enviar link de recuperação'
                            )}
                        </button>
                    </form>
                )}

                <div className="mt-3 text-center">
                    <Link href="/">Voltar ao login</Link>
                </div>
            </div>
        </div>
    );
}
