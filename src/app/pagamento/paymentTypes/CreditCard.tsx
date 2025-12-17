import { ReactNode, useState, useEffect } from 'react';
import { Api } from '@/app/utils/api';

export const CreditCardPayment = (): ReactNode => {
    const [loading, setLoading] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [error, setError] = useState<string>('');
    const [success, setSuccess] = useState<boolean>(false);
    const [userData, setUserData] = useState({
        name: '',
        cpf: '',
        email: '',
        phone: '',
    });

    useEffect(() => {
        setMounted(true);
        if (typeof window === 'undefined') return;

        const user_data = localStorage.getItem('user');
        const parsed_user = user_data ? JSON.parse(user_data) : {};
        const storedName = parsed_user.name || '';
        const storedCpf = parsed_user.cpf || '';
        const storedEmail = parsed_user.email || '';
        const storedPhone = parsed_user.mobile_phone || parsed_user.phone || '';

        setUserData({
            name: storedName,
            cpf: storedCpf,
            email: storedEmail,
            phone: storedPhone,
        });
    }, []);

    const submitForm = async (e: React.FormEvent<HTMLFormElement>) => {
        // Função para processar assinatura via API
        // Envia dados do cartão e informações do titular para /user/subscribe
        let subscriptionData: any = null;
        try {
            e.preventDefault();
            setLoading(true);
            setError('');
            setSuccess(false);

            const formData = new FormData(e.currentTarget);
            const formFields = Object.fromEntries(formData.entries());
            console.log('formFields', formFields);
            console.log('localStorage token', localStorage.getItem('token'));
            console.log('localStorage user', localStorage.getItem('user'));
            if (!formFields.indication_receiver) {
                setError('Selecione se foi indicação ou não.');
                setLoading(false);
                return;
            }

            // Obter dados do usuário e token do localStorage
            const token = localStorage.getItem('token');
            const user_data = localStorage.getItem('user');

            if (!token) {
                throw new Error('Token de autenticação não encontrado');
            }

            if (!user_data) {
                throw new Error('Dados do usuário não encontrados');
            }

            const parsed_user = JSON.parse(user_data);
            const user_id = parsed_user.id || parsed_user._id;

            if (!user_id) {
                throw new Error('ID do usuário não encontrado');
            }

            // Limpar e formatar dados antes de enviar
            const cleanCPF = String(formFields.holder_cpf).replace(/\D/g, '');
            const cleanPhone = String(formFields.holder_phone).replace(
                /\D/g,
                '',
            );
            const cleanCEP = String(formFields.holder_postal_code).replace(
                /\D/g,
                '',
            );
            const cleanCardNumber = String(formFields.card_number).replace(
                /\s/g,
                '',
            );

            // Converter ano para 2 dígitos (ex: "2026" -> "26")
            const expiryYear = String(formFields.card_expiry_year);
            const cleanExpiryYear =
                expiryYear.length === 4 ? expiryYear.slice(-2) : expiryYear;

            // Validar CEP
            if (cleanCEP.length !== 8) {
                setError('CEP deve conter 8 dígitos');
                setLoading(false);
                return;
            }

            // Preparar payload para a API conforme estrutura esperada pelo backend
            subscriptionData = {
                plan_value: 100.0,
                plan_cycle: 'BIMONTHLY',
                card_holder_name: formFields.card_holder_name,
                card_number: cleanCardNumber,
                card_expiry_month: formFields.card_expiry_month,
                card_expiry_year: cleanExpiryYear,
                card_ccv: formFields.card_ccv,
                holder_name: formFields.holder_name,
                holder_email: formFields.holder_email,
                holder_cpf: cleanCPF,
                holder_postal_code: cleanCEP,
                holder_address_num: formFields.holder_address_num,
                holder_phone: cleanPhone,
            };

            console.log('Enviando dados de assinatura:', subscriptionData);
            console.log('subscriptionData', subscriptionData);

            // Fazer requisição para API de assinatura
            const response = await Api.post(
                '/user/subscribe',
                subscriptionData,
                {
                    headers: {
                        Authorization: `${token}`,
                    },
                },
            );

            console.log('Assinatura criada com sucesso:', response.data);

            setSuccess(true);

            // Redirecionar após sucesso
            setTimeout(() => {
                if (typeof window !== 'undefined') {
                    window.location.href = '/app';
                }
            }, 2000);
        } catch (error: any) {
            console.error('Erro ao processar assinatura:', error);
            console.log('subscriptionData (no catch):', subscriptionData);
            console.log('Error response:', error.response);
            console.log('Error response data:', error.response?.data);
            console.log('Error response status:', error.response?.status);

            let errorMessage = 'Erro ao processar pagamento. Tente novamente.';

            if (error.response?.status === 500) {
                errorMessage =
                    'Erro no servidor ao processar o pagamento. Por favor, contate o suporte ou tente novamente mais tarde.';
            } else if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            } else if (error.response?.data?.error) {
                errorMessage = error.response.data.error;
            } else if (error.response?.data && error.response.data !== '') {
                errorMessage = JSON.stringify(error.response.data);
            } else if (error.message) {
                errorMessage = error.message;
            }

            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            {/* Mensagem de Erro */}
            {error && (
                <div
                    className="alert alert-danger alert-dismissible fade show"
                    role="alert"
                >
                    <i className="fa-solid fa-exclamation-triangle me-2"></i>
                    {error}
                    <button
                        type="button"
                        className="btn-close"
                        onClick={() => setError('')}
                        aria-label="Close"
                    ></button>
                </div>
            )}

            {/* Mensagem de Sucesso */}
            {success && (
                <div className="alert alert-success" role="alert">
                    <i className="fa-solid fa-check-circle me-2"></i>
                    Assinatura realizada com sucesso! Redirecionando...
                </div>
            )}

            <form className="row g-4 mt-2" onSubmit={submitForm}>
                {/* Dados do Cartão */}
                <div className="col-12">
                    <h6 className="text-gold mb-3">Dados do Cartão</h6>
                </div>
                <div className="col-12">
                    <div className="form-floating">
                        <input
                            type="text"
                            className="form-control"
                            id="card_number"
                            name="card_number"
                            placeholder="Número do Cartão"
                            maxLength={19}
                            required
                        />
                        <label htmlFor="card_number">Número do Cartão</label>
                    </div>
                </div>
                <div className="col-12">
                    <div className="form-floating">
                        <input
                            type="text"
                            className="form-control"
                            id="card_holder_name"
                            name="card_holder_name"
                            placeholder="Nome do Titular do Cartão"
                            required
                        />
                        <label htmlFor="card_holder_name">
                            Nome do Titular do Cartão
                        </label>
                    </div>
                </div>
                <div className="col-12 col-md-4">
                    <div className="form-floating">
                        <input
                            type="text"
                            className="form-control"
                            id="card_expiry_month"
                            name="card_expiry_month"
                            placeholder="Mês"
                            maxLength={2}
                            required
                        />
                        <label htmlFor="card_expiry_month">Mês</label>
                    </div>
                </div>
                <div className="col-12 col-md-4">
                    <div className="form-floating">
                        <input
                            type="text"
                            className="form-control"
                            id="card_expiry_year"
                            name="card_expiry_year"
                            placeholder="Ano"
                            maxLength={4}
                            required
                        />
                        <label htmlFor="card_expiry_year">Ano</label>
                    </div>
                </div>
                <div className="col-12 col-md-4">
                    <div className="form-floating">
                        <input
                            type="text"
                            className="form-control"
                            id="card_ccv"
                            name="card_ccv"
                            placeholder="CVV"
                            maxLength={4}
                            required
                        />
                        <label htmlFor="card_ccv">CVV</label>
                    </div>
                </div>

                {/* Dados do Titular */}
                <div className="col-12 mt-4">
                    <h6 className="text-gold mb-3">Dados do Titular</h6>
                </div>
                <div className="col-12">
                    <div className="form-floating">
                        <input
                            type="text"
                            className="form-control"
                            id="holder_name"
                            name="holder_name"
                            placeholder="Nome Completo"
                            defaultValue={userData.name}
                            required
                        />
                        <label htmlFor="holder_name">Nome Completo</label>
                    </div>
                </div>
                <div className="col-12 col-md-6">
                    <div className="form-floating">
                        <input
                            type="text"
                            className="form-control"
                            id="holder_cpf"
                            name="holder_cpf"
                            placeholder="CPF"
                            defaultValue={userData.cpf}
                            maxLength={14}
                            required
                        />
                        <label htmlFor="holder_cpf">CPF</label>
                    </div>
                </div>
                <div className="col-12 col-md-6">
                    <div className="form-floating">
                        <input
                            type="tel"
                            className="form-control"
                            id="holder_phone"
                            name="holder_phone"
                            placeholder="Telefone"
                            defaultValue={userData.phone}
                            required
                        />
                        <label htmlFor="holder_phone">Telefone</label>
                    </div>
                </div>
                <div className="col-12">
                    <div className="form-floating">
                        <input
                            type="email"
                            className="form-control"
                            id="holder_email"
                            name="holder_email"
                            placeholder="E-mail"
                            defaultValue={userData.email}
                            required
                        />
                        <label htmlFor="holder_email">E-mail</label>
                    </div>
                </div>

                {/* Endereço */}
                <div className="col-12 mt-4">
                    <h6 className="text-gold mb-3">Endereço de Cobrança</h6>
                </div>
                <div className="col-12 col-md-8">
                    <div className="form-floating">
                        <input
                            type="text"
                            className="form-control"
                            id="holder_postal_code"
                            name="holder_postal_code"
                            placeholder="CEP"
                            maxLength={9}
                            required
                        />
                        <label htmlFor="holder_postal_code">CEP</label>
                    </div>
                </div>
                <div className="col-12 col-md-4">
                    <div className="form-floating">
                        <input
                            type="text"
                            className="form-control"
                            id="holder_address_num"
                            name="holder_address_num"
                            placeholder="Número"
                            required
                        />
                        <label htmlFor="holder_address_num">Número</label>
                    </div>
                </div>
                <div className="col-12">
                    <div className="form-floating">
                        <input
                            type="text"
                            className="form-control"
                            id="holder_complement"
                            name="holder_complement"
                            placeholder="Complemento (opcional)"
                        />
                        <label htmlFor="holder_complement">
                            Complemento (opcional)
                        </label>
                    </div>
                </div>
                <div className="col-12 mt-3">
                    <select
                        className="form-select"
                        id="indication_receiver"
                        name="indication_receiver"
                        arial-label="Veio por meio de qual parceria?"
                        defaultValue=""
                        required
                    >
                        <option value="" disabled>
                            Veio por meio de qual parceria?
                        </option>
                        <option value="indication">Nenhuma Indicação</option>
                        <option value="instagram">Instagram</option>
                        <option value="facebook">Facebook</option>
                        <option value="youtube">YouTube</option>
                        <option>Ana Leopoldino</option>
                        <option>Ana Leticia Aleixo</option>
                        <option>Ana Paula</option>
                        <option>Anny Natos</option>
                        <option>Carla Vitória</option>
                        <option>Cecilya</option>
                        <option>Charlotte Bucher</option>
                        <option>Ellen Bosi</option>
                        <option>Esther Oliveira</option>
                        <option>Fabricia</option>
                        <option>Gabriela Maria</option>
                        <option>Giovanna Angelim</option>
                        <option>Heloa Marques</option>
                        <option>Isa Lira</option>
                        <option>Julia Forgiarini</option>
                        <option>Kamilly Lisandra</option>
                        <option>Kenia</option>
                        <option>Maisa Amorim</option>
                        <option>Manoela Vieira</option>
                        <option>Manu Amorim</option>
                        <option>Maria Clara Araújo</option>
                        <option>Clarinha Simoes</option>
                        <option>Marina Duarte</option>
                        <option>Valquiria Cardoso</option>
                        <option>Wanessa Castro</option>
                        <option>Victoria Fill</option>
                        <option>Viviane Varjão</option>
                        <option>Yasmin Cruz</option>
                    </select>
                </div>

                <div className="col-12 mt-4">
                    <button
                        type="submit"
                        className="btn btn-lg btn-gold w-100"
                        disabled={loading || success}
                    >
                        {loading ? (
                            <>
                                <div
                                    className="spinner-border spinner-border-sm text-light me-2"
                                    role="status"
                                >
                                    <span className="visually-hidden">
                                        Loading...
                                    </span>
                                </div>
                                Processando Pagamento...
                            </>
                        ) : success ? (
                            <>
                                <i className="fa-solid fa-check me-2"></i>
                                Assinatura Confirmada
                            </>
                        ) : (
                            'Finalizar Pagamento'
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};
