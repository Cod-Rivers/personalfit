// src/components/TrainingProtocolList.tsx
'use client';

import React from 'react';
import Link from 'next/link'; // Para navegação semântica
// import { useRouter } from 'next/navigation'; // Alternativa para navegação programática
import { TrainingProtocolProps } from './types'; // Ajuste o caminho
import TrainingCard from './TrainingCard'; // Seu componente TrainingCard
import styles from './TrainingProtocolList.module.css'; // Se estiver usando CSS Modules
import { BsClipboardData } from 'react-icons/bs';

const TrainingProtocol: React.FC<TrainingProtocolProps> = ({
    protocolId, // ID do protocolo atual (da URL da página anterior)
    protocolNumber,
    trainings, // Agora é TrainingCardProps[] (id e label)
}) => {
    // const router = useRouter(); // Descomente se preferir router.push
    const handleBackButtonClick = () => {
        // Esta função é chamada apenas no cliente quando o botão é clicado.
        // A referência a 'window' aqui é geralmente segura.
        window.history.back();
    };
    // Não precisamos mais de handleCardClick aqui se usarmos <Link> diretamente no map

    return (
        <div className={styles.cardButton}>
            <div className={styles.contentWrapper}>
                <div className={styles.header}>
                    <button
                        onClick={handleBackButtonClick} // Ou router.back()
                        className={styles.backButton}
                        aria-label="Voltar"
                    >
                        <BsClipboardData size={24} color="#eab308" />
                    </button>
                    <h1 className={styles.title}>
                        Meus treinos do protocolo {protocolNumber}:
                    </h1>
                </div>
                {trainings.length > 0 ? (
                    trainings.map((training) => (
                        // Envolver o TrainingCard com o componente Link do Next.js
                        <Link
                            href={`/treinamento/${protocolId}/${training.id}`} // Constrói a URL para a página de detalhes
                            key={training.id}
                            passHref // Recomendado para passar o href para componentes customizados como TrainingCard se ele for um <a> internamente
                            // (Se TrainingCard for um <button>, passHref não é estritamente necessário aqui, mas não prejudica)
                        >
                            {/* O componente TrainingCard não precisa mais da prop onClick para esta navegação */}
                            <div className={styles.protocolButton}>
                                <TrainingCard
                                    id={training.id}
                                    label={training.label}
                                />
                            </div>
                        </Link>
                        // Alternativa com router.push (TrainingCard precisaria de onClick):
                        // <TrainingCard
                        //   key={training.id}
                        //   id={training.id}
                        //   label={training.label}
                        //   onClick={() => router.push(`/treinamento/${protocolId}/${training.id}`)}
                        // />
                    ))
                ) : (
                    <p className={styles.noTrainingsMessage}>
                        Nenhum treino encontrado para este protocolo.
                    </p>
                )}
            </div>
        </div>
    );
};

export default TrainingProtocol;
