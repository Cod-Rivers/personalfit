import { ReactNode, useState } from "react";

export const PixPayment = (): ReactNode => {

    const [loading, setLoading] = useState(false);
    const [qrcode, setQRCode] = useState<string>("https://placehold.co/250x250?text=QRCode");

    const handleGenerateQRCode = async (e: React.MouseEvent<HTMLButtonElement>) => {
        try {
            e.preventDefault();
            setLoading(true);
            // api para gerar qrcode
            await new Promise(resolve => setTimeout(resolve, 2000));
            const qrcode = "https://placehold.co/250x250?text=QRCode+gerado";
            setQRCode(qrcode);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="text-center">
            <div className="my-3">
                {qrcode && <img src={qrcode} alt="QR Code" />}
            </div>
            <button className="btn btn-lg btn-gold w-100 " onClick={handleGenerateQRCode} disabled={loading ?? qrcode}>
                {loading ? <div className="spinner-border text-light" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div> : "Gerar QR Code"}
            </button>
        </div>
    );
}