'use client';
import { Api } from '@/libs/api';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
    getRefreshToken,
    getToken,
    getUser,
    landingRouteFor,
    saveSession,
} from '@/libs/session';

const schema = z
    .object({
        current_password: z.string().min(1, 'Informe a senha temporária'),
        new_password: z.string().min(6, 'Mínimo de 6 caracteres'),
        confirm_password: z.string(),
    })
    .refine((d) => d.new_password === d.confirm_password, {
        message: 'As senhas não coincidem',
        path: ['confirm_password'],
    });

type FormData = z.infer<typeof schema>;

export default function TrocarSenhaTemporariaPage() {
    const router = useRouter();

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<FormData>({ resolver: zodResolver(schema) });

    useEffect(() => {
        if (!getToken()) router.replace('/login');
    }, [router]);

    const submit = async (form: FormData) => {
        setLoading(true);
        setError('');
        try {
            await Api.post('/change-password', {
                current_password: form.current_password,
                new_password: form.new_password,
            });

            const token = getToken();
            const user = getUser();
            if (token && user) {
                const updatedUser = { ...user, must_change_password: false };
                saveSession(
                    token,
                    updatedUser,
                    getRefreshToken() ?? undefined,
                );
                router.replace(landingRouteFor(updatedUser));
            } else {
                router.replace('/login');
            }
        } catch (err: unknown) {
            const msg =
                (err as { response?: { data?: { error?: string } } })
                    ?.response?.data?.error ??
                'Não foi possível trocar a senha. Confira a senha temporária.';
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
                <h4 className="mb-2 fw-semibold">Troque sua senha</h4>
                <p className="text-muted mb-3">
                    Este é seu primeiro acesso. Por segurança, defina uma
                    nova senha para continuar.
                </p>

                <form
                    onSubmit={handleSubmit(submit)}
                    className="d-flex flex-column gap-3"
                >
                    <div>
                        <input
                            type="password"
                            className="form-control"
                            placeholder="Senha temporária (recebida por e-mail)"
                            {...register('current_password')}
                        />
                        {errors.current_password && (
                            <small className="text-danger">
                                {errors.current_password.message}
                            </small>
                        )}
                    </div>

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
                            'Trocar senha e continuar'
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
