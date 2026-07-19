'use client';
import { Api } from '@/libs/api';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const schema = z
    .object({
        new_password: z.string().min(6, 'Mínimo de 6 caracteres'),
        confirm_password: z.string(),
    })
    .refine((d) => d.new_password === d.confirm_password, {
        message: 'As senhas não coincidem',
        path: ['confirm_password'],
    });

type FormData = z.infer<typeof schema>;

export default function RedefinirSenhaPage() {
    const params = useParams();
    const router = useRouter();
    const token = params?.token as string;

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
            await Api.post('/reset-password', {
                token,
                new_password: form.new_password,
            });
            router.push('/?reason=password_reset');
        } catch (err: unknown) {
            const msg =
                (err as { response?: { data?: { error?: string } } })?.response
                    ?.data?.error ?? 'Link inválido ou expirado.';
            setError(msg);
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
                <h4 className="mb-3 fw-semibold">Redefinir senha</h4>

                <form
                    onSubmit={handleSubmit(submit)}
                    className="d-flex flex-column gap-3"
                >
                    <div>
                        <input
                            type="password"
                            className="form-control"
                            placeholder="Nova senha"
                            {...register('new_password')}
                        />
                        {errors.new_password && (
                            <small className="text-danger">
                                {errors.new_password.message}
                            </small>
                        )}
                    </div>

                    <div>
                        <input
                            type="password"
                            className="form-control"
                            placeholder="Confirmar nova senha"
                            {...register('confirm_password')}
                        />
                        {errors.confirm_password && (
                            <small className="text-danger">
                                {errors.confirm_password.message}
                            </small>
                        )}
                    </div>

                    {error && (
                        <div className="alert alert-danger py-2">{error}</div>
                    )}

                    <button
                        className="btn btn-primary w-100"
                        disabled={loading}
                    >
                        {loading ? (
                            <span className="spinner-border spinner-border-sm" />
                        ) : (
                            'Redefinir senha'
                        )}
                    </button>
                </form>

                <div className="mt-3 text-center">
                    <Link href="/">Voltar ao login</Link>
                </div>
            </div>
        </div>
    );
}
