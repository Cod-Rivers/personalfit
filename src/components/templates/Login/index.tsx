'use client';
import { useTranslations } from 'next-intl';
import React, { FC, FormEvent, useEffect, useState } from 'react';
import Input from '@/components/molecules/Input';
import Image from 'next/image';
import Link from 'next/link';
import './styles.css';
import { Api } from '@/app/utils/api';
import { useRouter } from 'next/navigation';

const TLogin: FC = () => {
    const router = useRouter();
    const t = useTranslations('LoginPage');
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    const [form, setForm] = useState({
        email: '',
        password: '',
    });

    const login = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { data } = await Api.post('/login', form);
            if (data.error) {
                setError(data.error);
                return;
            }

            // Salvar token
            if (data.token) {
                localStorage.setItem('token', data.token);

                // Buscar dados completos do usuário (incluindo exercícios de dor)
                try {
                    const userResponse = await Api.get('/me', {
                        headers: { Authorization: `Bearer ${data.token}` },
                    });
                    localStorage.setItem(
                        'user',
                        JSON.stringify(userResponse.data),
                    );
                } catch (err) {
                    console.error(
                        '[LOGIN] Erro ao buscar dados do usuário:',
                        err,
                    );
                    // Fallback: usar dados do login
                    localStorage.setItem('user', JSON.stringify(data.user));
                }
            }

            // Redirecionar para pagamento se não estiver ativo
            if (!data.user.active) {
                window.location.href = '/pagamento';
                return;
            }

            // Usuário ativo, redirecionar para app
            window.location.href = '/app';
        } catch (error) {
            setError('Erro ao realizar login');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const token = localStorage.getItem('token');
        if (token) {
            window.location.href = '/app';
        }
    }, []);

    return (
        <div className="login_main_container">
            <div className="login_box">
                <Image
                    src="/assets/images/logo.png"
                    alt="logo"
                    sizes="cover"
                    width={200}
                    height={95}
                />
                <h1>{t('title')}</h1>
                <form
                    onSubmit={login}
                    className="w-100 d-flex flex-column gap-4 my-3"
                >
                    <Input
                        placeholder={t('usermameInput')}
                        onChange={(e) =>
                            setForm({ ...form, email: e.target.value })
                        }
                    />
                    <Input
                        placeholder={t('passwordInput')}
                        type="password"
                        onChange={(e) =>
                            setForm({ ...form, password: e.target.value })
                        }
                    />
                    <button className="btn btn-gold">{t('btn.login')}</button>
                    <div className="w-100 d-flex flex-column align-items-center">
                        {loading && (
                            <span className="spinner-border spinner-border-sm"></span>
                        )}
                        {error && (
                            <p className="w-100 alert alert-danger text-center">
                                {error}
                            </p>
                        )}
                    </div>
                </form>
                <span>
                    Não tem conta? <Link href={`/cadastro`}>cadastre-se</Link>
                </span>
            </div>
        </div>
    );
};

export default TLogin;
