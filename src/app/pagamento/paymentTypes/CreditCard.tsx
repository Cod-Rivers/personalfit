import { ReactNode, useState } from "react";

export const CreditCardPayment = (): ReactNode => {
    const [loading, setLoading] = useState(false);

    const submitForm = async (e: React.FormEvent<HTMLFormElement>) => {
        try {
            e.preventDefault();
            setLoading(true);
            const formData = new FormData(e.currentTarget);
            const data = Object.fromEntries(formData.entries());
            console.log(data);
            // api para processar pagamento
            await new Promise(resolve => setTimeout(resolve, 2000));

        }
        catch (error) {
            console.error(error);
        }
        finally {
            setLoading(false);
        }
    }

    return (<div>
            <form className="row g-4 mt-2" onSubmit={submitForm}>
                <div className="col-12">
                    <div className="form-floating">
                        <input
                            type="text"
                            className="form-control"
                            id="cardNumber"
                            name="cardNumber"
                            placeholder="Número do Cartão"
                        />
                        <label htmlFor="cardNumber">Número do Cartão</label>
                    </div>
                </div>
                <div className="col-12">
                    <div className="form-floating">
                        <input
                            type="text"
                            className="form-control"
                            id="cardName"
                            name="cardName"
                            placeholder="Nome do Titular"
                        />
                        <label htmlFor="cardName">Nome do Titular</label>
                    </div>
                </div>
                <div className="col-12 col-md-6">
                    <div className="form-floating">
                        <input
                            type="text"
                            className="form-control"
                            id="cardExpiration"
                            name="cardExpiration"
                            placeholder="Validade"
                        />
                        <label htmlFor="cardExpiration">Validade</label>
                    </div>
                </div>
                <div className="col-12 col-md-6">
                    <div className="form-floating">
                        <input
                            type="text"
                            className="form-control"
                            id="cardCVV"
                            name="cardCVV"
                            placeholder="CVV"
                        />
                        <label htmlFor="cardCVV">CVV</label>
                    </div>
                </div>
                <div className="col-12">
                    <button type="submit" className="btn btn-lg btn-gold w-100 " disabled={loading}>
                        {loading ? <div className="spinner-border text-light" role="status">
                            <span className="visually-hidden">Loading...</span>
                        </div> : "Pagar"}
                    </button>
                </div>
            </form>
        </div>
    );
};
