import Link from 'next/link';

export default function AutorregulacaoInfoPage() {
    return (
        <div className="container py-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h1 className="h4 mb-0">
                    Como funciona o Controle de Microciclo
                </h1>
                <Link
                    href="/meus-treinos"
                    className="btn btn-outline-secondary btn-sm"
                >
                    Voltar
                </Link>
            </div>

            <div className="alert alert-info mb-4">
                Este painel ajuda a ajustar seu treino semanal (microciclo) de
                forma inteligente. Ele não substitui seu personal, mas oferece
                suporte diário para treinar com segurança e consistência.
            </div>

            <div className="card mb-3">
                <div className="card-body">
                    <h2 className="h6">1. O que o app observa</h2>
                    <ul className="mb-0">
                        <li>Prontidão (como você acordou no dia)</li>
                        <li>Sono (quantidade e qualidade)</li>
                        <li>Estresse e dor muscular</li>
                        <li>Delta de VFC (quando disponível)</li>
                        <li>RPE do treino anterior (esforço percebido)</li>
                    </ul>
                </div>
            </div>

            <div className="card mb-3">
                <div className="card-body">
                    <h2 className="h6">2. Decisão de ajuste</h2>
                    <p className="mb-2">
                        Com base nesses dados, o sistema classifica o momento em
                        3 zonas:
                    </p>
                    <ul className="mb-0">
                        <li>
                            <strong>Supercompensação:</strong> pode progredir
                            levemente carga/volume.
                        </li>
                        <li>
                            <strong>Manutenção:</strong> seguir o plano previsto
                            do microciclo.
                        </li>
                        <li>
                            <strong>Fadiga:</strong> reduzir carga total para
                            recuperar melhor.
                        </li>
                    </ul>
                </div>
            </div>

            <div className="card mb-3">
                <div className="card-body">
                    <h2 className="h6">3. Intrassessão e intersessão</h2>
                    <ul className="mb-0">
                        <li>
                            <strong>Intrassessão:</strong> ajuste durante o
                            treino (ex: baixar 5% a 10% da carga).
                        </li>
                        <li>
                            <strong>Intersessão:</strong> ajuste para os
                            próximos dias (ex: cortar 20% de volume).
                        </li>
                    </ul>
                </div>
            </div>

            <div className="card mb-4">
                <div className="card-body">
                    <h2 className="h6">4. Gatilho de deload</h2>
                    <p className="mb-0">
                        Se a fadiga se mantiver alta por dias consecutivos e o
                        rendimento cair, o sistema pode sugerir deload no
                        próximo microciclo para proteger sua recuperação e
                        evitar estagnação.
                    </p>
                </div>
            </div>

            <div className="text-muted small">
                Dica: preencha os campos diariamente com honestidade para
                receber recomendações mais úteis.
            </div>
        </div>
    );
}
