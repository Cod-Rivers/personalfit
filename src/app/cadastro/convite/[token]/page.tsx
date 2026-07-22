'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Api } from '@/libs/api';
import s from './convite.module.css';
import { PersonalBranding } from '@/libs/brandingService';
import { ANDROID_APP_LIVE, ANDROID_PLAY_STORE_URL, isAndroidBrowser } from '@/libs/androidApp';

interface InviteInfo {
    personal_name: string;
    expires_at: string;
    valid: boolean;
    branding?: PersonalBranding;
}

export default function InviteRegisterPage() {
    const { token } = useParams<{ token: string }>();
    const router = useRouter();

    const [redirectingToStore, setRedirectingToStore] = useState(false);

    // Chegar nesta página pelo navegador do Android (não pelo WebView do
    // app) só acontece quando o App Link não abriu o app — ou seja, o app
    // não está instalado. Manda direto para a Play Store em vez de mostrar
    // o formulário de cadastro no navegador.
    useEffect(() => {
        if (ANDROID_APP_LIVE && isAndroidBrowser()) {
            setRedirectingToStore(true);
            window.location.replace(ANDROID_PLAY_STORE_URL);
        }
    }, []);

    const [checking, setChecking] = useState(true);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [userData, setUserData] = useState<{
        name: string;
        email: string;
        role: string;
    } | null>(null);
    const [confirmNonStudent, setConfirmNonStudent] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [info, setInfo] = useState<InviteInfo | null>(null);
    const [form, setForm] = useState({
        name: '',
        email: '',
        cpf: '',
        phone: '',
        mobile_phone: '',
        password: '',
        confirm_password: '',
    });
    // Local state for link-password — avoids uncontrolled updates via handleChange
    const [linkPassword, setLinkPassword] = useState('');

    useEffect(() => {
        // Já indo para a Play Store — não precisa buscar dados do convite.
        if (ANDROID_APP_LIVE && isAndroidBrowser()) return;

        let cancelled = false;

        const fetchData = async () => {
            try {
                // 1. Check Auth — use auth token from localStorage (different from route param)
                const authToken = localStorage.getItem('token');
                if (authToken) {
                    try {
                        const res = await Api.get<{ name: string; email: string; role: string }>('/me');
                        setUserData({
                            name: res.data.name,
                            email: res.data.email,
                            role: res.data.role,
                        });
                        setIsLoggedIn(true);
                    } catch {
                        if (!cancelled) setIsLoggedIn(false);
                    }
                }

                // 2. Fetch Invite Info — ALWAYS use route param token (not auth token)
                if (token) {
                    try {
                        const res = await Api.get(`/invite/${token}`);

                        let inviteData;
                        if (typeof res.data === 'object') {
                            inviteData = res.data;
                        } else if (typeof res.data === 'string') {
                            try {
                                inviteData = JSON.parse(res.data);
                            } catch {
                                console.error('Cannot parse response:', res.data.substring(0, 128));
                                throw new Error('Invalid API response format');
                            }
                        } else if (typeof window !== 'undefined') {
                            inviteData = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
                        }

                        setInfo(inviteData);

                        const root = document.documentElement;
                        if (inviteData?.branding?.primary_color) {
                            root.style.setProperty('--mint', inviteData.branding.primary_color);
                            root.style.setProperty(
                                '--grad-mint',
                                `linear-gradient(135deg, ${inviteData.branding.primary_color}, ${inviteData.branding.secondary_color ?? inviteData.branding.primary_color})`,
                            );
                        }
                        if (inviteData?.branding?.secondary_color) {
                            root.style.setProperty('--coral', inviteData.branding.secondary_color);
                        }
                    } catch (err: unknown) {
                        const errMsg = err instanceof Error ? err.message : String(err);
                        console.error('Error fetching invite info:', errMsg, err);
                        if (!cancelled) setInfo({ personal_name: '', expires_at: '', valid: false });
                    }
                } else {
                    if (!cancelled) setInfo({ personal_name: '', expires_at: '', valid: false });
                }
            } catch (err) {
                console.error('Fatal fetchData error:', err);
                if (!cancelled) setInfo({ personal_name: '', expires_at: '', valid: false });
            } finally {
                if (!cancelled) setChecking(false);
            }
        };

        fetchData();
        return () => { cancelled = true; };
    }, [token]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    // Safe confirm-link handler — only sends when password is filled
    const handleConfirmLink = useCallback(async () => {
        if (!linkPassword.trim()) {
            setError('Senha é obrigatória para vincular.');
            setSubmitting(false);
            return;
        }

        // Vincular uma conta que não é de aluno (admin/personal) exige
        // confirmação explícita — evita vínculos acidentais.
        if (userData?.role && userData.role !== 'student' && !confirmNonStudent) {
            setError('Confirme a caixa de seleção acima para continuar.');
            return;
        }

        setSubmitting(true);
        setError('');

        // Validate that we have user data before sending
        if (!userData?.name || !userData?.email) {
            setError('Dados do usuário não disponíveis. Recarregue a página.');
            setSubmitting(false);
            return;
        }

        try {
            // Build payload — only include optional fields if they have values
            const payload: Record<string, string | boolean> = {
                name: userData.name,
                email: userData.email,
                password: linkPassword,
            };
            if (form.cpf) payload.cpf = form.cpf;
            if (form.phone) payload.phone = form.phone;
            if (form.mobile_phone) payload.mobile_phone = form.mobile_phone;
            if (userData.role !== 'student') payload.confirm_non_student = true;

            await Api.post(`/invite/${token}/register`, payload);

            // Atualiza o localStorage.user com os dados frescos (has_personal/
            // link_status/role) para que Header e as demais páginas já
            // reflitam o novo vínculo sem precisar de um novo login.
            try {
                const fresh = await Api.get('/me');
                const stored = localStorage.getItem('user');
                if (stored) {
                    const parsed = JSON.parse(stored);
                    localStorage.setItem(
                        'user',
                        JSON.stringify({ ...parsed, ...fresh.data }),
                    );
                }
            } catch {
                /* não bloqueia o sucesso do vínculo */
            }

            setSuccess(true);
        } catch (err: unknown) {
            // Extract error message more robustly — handle various response shapes
            let msg = '';
            const axiosErr = err as { response?: { data?: unknown; status?: number }; message?: string };
            if (axiosErr.response?.data) {
                const data = axiosErr.response.data;
                // Try common error shapes
                if (typeof data === 'string') msg = data;
                else if (data && typeof data === 'object' && !Array.isArray(data)) {
                    const obj = data as Record<string, unknown>;
                    // Direct message property
                    if ('message' in obj) msg = String(obj.message);
                    // Flat error object (e.g. {error: "erro de validação"})
                    else if ('error' in obj) msg = String(obj.error);
                } else if (Array.isArray(data)) {
                    msg = data
                        .map((e: unknown) => {
                            if (e && typeof e === 'object' && 'message' in e) {
                                return String((e as Record<string, unknown>).message);
                            }
                            return String(e);
                        })
                        .join('; ');
                }
            }

            console.log('[INVITE] Registration failed:', err, 'Response:', msg);

            // Detailed debug logging for 400 errors
            console.error('[INVITE DEBUG] Payload:', {
                token,
                name: userData?.name ?? '',
                email: userData?.email ?? '',
                password: linkPassword ? '[HIDDEN]' : '[EMPTY]',
                cpf: form.cpf ?? '',
                phone: form.phone ?? '',
                mobile_phone: form.mobile_phone ?? '',
            });

            // Log the full error response for debugging
            if (axiosErr.response?.status) {
                console.error('[INVITE DEBUG] Full error:', JSON.stringify(axiosErr.response.data, null, 2), 'Status:', axiosErr.response.status);
            }

            setError(msg || 'Erro ao vincular conta. Tente novamente.');
            setSubmitting(false);
        }
    }, [token, userData, linkPassword, form, confirmNonStudent]);

    // Redirect to home on success — reliable vs setTimeout (React Concurrent Mode safe)
    useEffect(() => {
        if (!success) return;
        const timer = setTimeout(() => router.push('/'), 3000);
        return () => clearTimeout(timer);
    }, [success, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!form.name?.trim() || !form.email?.trim()) {
            setError('Nome e Email são obrigatórios.');
            return;
        }
        if (form.password !== form.confirm_password) {
            setError('As senhas não coincidem.');
            return;
        }

        setSubmitting(true);
        try {
            await Api.post('/auth/register', {
                Name: form.name,
                Email: form.email,
                Password: form.password,
                CPF: form.cpf,
                Phone: form.phone,
                MobilePhone: form.mobile_phone,
            });
            setSuccess(true);
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })
                ?.response?.data?.message;
            setError(msg || 'Erro ao criar conta. Tente novamente.');
            setSubmitting(false);
        } finally {
            // handled by success redirect useEffect below
        }
    };

    // Link "já tem cadastro" leva ao login e volta pra cá depois — sem
    // isso o usuário perde o convite ao tentar entrar com a conta existente.
    const loginHref = `/?redirect=${encodeURIComponent(`/cadastro/convite/${token}`)}`;

    if (redirectingToStore) {
        return (
            <div className={s.page}>
                <p className={s.loading}>Abrindo na Play Store...</p>
            </div>
        );
    }

    if (checking) {
        return (
            <div className={s.page}>
                <p className={s.loading}>Carregando...</p>
            </div>
        );
    }

    if (info && !info.valid) {
        return (
            <div className={s.page}>
                <div className={`${s.card} ${s.invalidCard}`}>
                    <div className={s.invalidIcon}>⚠️</div>
                    <h1 className={s.invalidTitle}>Convite inválido ou expirado</h1>
                    <p className={s.invalidText}>
                        Peça um novo link de convite ao seu personal trainer.
                    </p>
                    <Link href="/" className={s.linkLogin}>Ir para o login</Link>
                </div>
            </div>
        );
    }

    // If already logged in, show link confirmation UI — WITH password field
    if (isLoggedIn && userData) {
        const isNonStudentAccount = !!userData.role && userData.role !== 'student';
        return (
            <div className={s.page}>
                <div className={s.card}>
                    <div className={s.logo}>
                        <Image src="/assets/images/logo.png" alt="logo" width={200} height={95} />
                    </div>
                    <h1 className={s.title}>Vincular à conta existente</h1>
                    {info?.personal_name && (
                        <p className={s.personalBadge}>Convite de {info.personal_name}</p>
                    )}

                    {!success ? (
                        <>
                            <p className={s.welcomeBanner}>Bem-vindo(a), {userData.name}!</p>

                            <div className={s.form}>
                                <div className={s.formGroup}>
                                    <label className={s.formLabel} htmlFor="link-password">
                                        Confirme sua senha para vincular
                                    </label>
                                    <input
                                        type="password"
                                        name="_link_password_"
                                        className={s.formInput}
                                        placeholder="Sua senha"
                                        value={linkPassword}
                                        onChange={(e) => setLinkPassword(e.target.value)}
                                        id="link-password"
                                    />
                                </div>

                                {isNonStudentAccount && (
                                    <label
                                        style={{
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            gap: 8,
                                            fontSize: '0.85rem',
                                            color: 'var(--text-muted)',
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={confirmNonStudent}
                                            onChange={(e) =>
                                                setConfirmNonStudent(e.target.checked)
                                            }
                                        />
                                        <span>
                                            Esta é uma conta de {userData.role}. Ao confirmar,
                                            ela também passa a ter um perfil de aluno
                                            vinculado a{' '}
                                            {info?.personal_name || 'este personal'}, sem
                                            deixar de ser {userData.role}.
                                        </span>
                                    </label>
                                )}

                                {error && <p className={s.errorMsg}>{error}</p>}
                                <button
                                    className={s.btnSubmit}
                                    onClick={handleConfirmLink}
                                    disabled={
                                        submitting ||
                                        (isNonStudentAccount && !confirmNonStudent)
                                    }
                                >
                                    {submitting
                                        ? 'Vinculando...'
                                        : `Vincular ${info?.personal_name || 'Personal'} ao seu perfil`}
                                </button>
                            </div>
                        </>
                    ) : (
                        <p className={s.successMsg}>Vínculo realizado com sucesso!</p>
                    )}
                </div>
            </div>
        );
    }

    // Show registration form
    return (
        <div className={s.page}>
            <form className={s.card} onSubmit={handleSubmit}>
                <div className={s.logo}>
                    <Image src="/assets/images/logo.png" alt="logo" width={200} height={95} />
                </div>
                <h1 className={s.title}>Criar conta</h1>
                {info?.personal_name && (
                    <p className={s.personalBadge}>Convite de {info.personal_name}</p>
                )}
                {!success ? (
                    <>
                        <div className={s.form}>
                            <input
                                type="text"
                                name="name"
                                className={s.formInput}
                                placeholder="Nome completo"
                                onChange={handleChange}
                                required
                            />
                            <input
                                type="email"
                                name="email"
                                className={s.formInput}
                                placeholder="Email"
                                onChange={handleChange}
                                required
                            />
                            <input
                                type="text"
                                name="cpf"
                                className={s.formInput}
                                placeholder="CPF (apenas números)"
                                onChange={handleChange}
                                pattern="[0-9]{11}"
                                maxLength={11}
                            />
                            <input
                                type="tel"
                                name="phone"
                                className={s.formInput}
                                placeholder="Telefone fixo"
                                onChange={handleChange}
                            />
                            <input
                                type="tel"
                                name="mobile_phone"
                                className={s.formInput}
                                placeholder="Celular (WhatsApp)"
                                onChange={handleChange}
                            />
                            <input
                                type="password"
                                name="password"
                                className={s.formInput}
                                placeholder="Senha"
                                onChange={handleChange}
                                required
                            />
                            <input
                                type="password"
                                name="confirm_password"
                                className={s.formInput}
                                placeholder="Confirme a senha"
                                onChange={handleChange}
                                required
                            />
                            {error && <p className={s.errorMsg}>{error}</p>}
                            <button type="submit" className={s.btnSubmit} disabled={submitting}>
                                {submitting ? 'Cadastrando...' : 'Cadastrar'}
                            </button>
                        </div>
                        <p style={{ textAlign: 'center', marginTop: 16 }}>
                            Já tem cadastro?{' '}
                            <Link href={loginHref} className={s.linkLogin}>Faça login.</Link>
                        </p>
                    </>
                ) : (
                    <p className={s.successMsg}>Cadastro realizado com sucesso!</p>
                )}
            </form>
        </div>
    );
}
