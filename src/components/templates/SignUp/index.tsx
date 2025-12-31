'use client';
import { useTranslations } from 'next-intl';
import React, { FC, FormEvent, useState } from 'react';
import Input from '@/components/molecules/Input';
import Image from 'next/image';
import Link from 'next/link';
import './styles.css';
import { Api } from '@/app/utils/api';

interface SignUpForm {
    name: string;
    email: string;
    phone: string;
    cpf: string;
    password: string;
    confirm_password: string;
}

const TSignUp: FC = () => {
    const t = useTranslations('SignUpPage');
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    const [form, setForm] = useState<SignUpForm>({
        name: '',
        email: '',
        phone: '',
        cpf: '',
        password: '',
        confirm_password: '',
    });

    const login = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(''); // Limpar erro anterior

        // Validação básica
        if (
            !form.name ||
            !form.email ||
            !form.phone ||
            !form.cpf ||
            !form.password
        ) {
            setError('Preencha todos os campos obrigatórios');
            setLoading(false);
            return;
        }

        if (form.password !== form.confirm_password) {
            setError('As senhas não coincidem');
            setLoading(false);
            return;
        }

        const payload = {
            name: form.name,
            email: form.email,
            password: form.password,
            cpf: form.cpf.replace(/\D/g, ''), // Remove formatação do CPF
            phone: form.phone,
        };

        console.log('[SignUp] Enviando cadastro para /users:', payload);

        try {
            const { data } = await Api.post('/users', payload);

            console.log('[SignUp] Cadastro realizado com sucesso:', data);

            // Armazenar token e usuário se o backend retornar
            if (data.token) {
                localStorage.setItem('token', data.token);
            }
            if (data.user) {
                localStorage.setItem('user', JSON.stringify(data.user));
            }

            // Redirecionar para login ou home
            window.location.href = '/';
        } catch (error: any) {
            console.error('[SignUp] Erro completo:', error);
            console.error('[SignUp] Response:', error.response);
            console.error('[SignUp] Status:', error.response?.status);
            console.error('[SignUp] Data:', error.response?.data);

            // Capturar mensagem de erro do backend
            if (error.response?.data?.error) {
                setError(error.response.data.error);
            } else if (error.response?.status === 404) {
                setError(
                    'Serviço de cadastro indisponível. Verifique se o backend está rodando na URL correta.',
                );
            } else if (error.response?.status === 409) {
                setError('Email ou CPF já cadastrado. Tente fazer login.');
            } else if (error.response?.status === 400) {
                setError(
                    'Dados inválidos. Verifique os campos e tente novamente.',
                );
            } else {
                setError('Erro ao realizar cadastro. Tente novamente.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handlechange = (e: any) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

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
                        placeholder={t('nameInput')}
                        name="name"
                        onChange={handlechange}
                    />
                    <Input
                        placeholder={t('emailInput')}
                        name="email"
                        onChange={handlechange}
                    />
                    <Input
                        placeholder={t('phoneInput')}
                        name="phone"
                        onChange={handlechange}
                    />
                    <Input
                        placeholder={t('cpfInput')}
                        name="cpf"
                        onChange={handlechange}
                    />
                    <Input
                        placeholder={t('passwordInput')}
                        name="password"
                        type="password"
                        onChange={handlechange}
                    />
                    <Input
                        placeholder={t('passwordConfirmInput')}
                        name="confirm_password"
                        type="password"
                        onChange={handlechange}
                    />
                    {error && (
                        <div className="alert alert-danger" role="alert">
                            {error}
                        </div>
                    )}
                    {loading && (
                        <div className="text-center">
                            <span className="spinner-border spinner-border-sm"></span>
                            <span className="ms-2">Cadastrando...</span>
                        </div>
                    )}
                    <button className="btn btn-gold" disabled={loading}>
                        {loading ? 'Cadastrando...' : t('btn.signup')}
                    </button>
                </form>
                <span>
                    Já tem conta? <Link href={`/`}>fazer o login</Link>
                </span>
            </div>
        </div>
    );
};

export default TSignUp;
