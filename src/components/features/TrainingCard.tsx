// src/components/TrainingCard.tsx
import React from 'react';
import { TrainingCardProps } from './types'; // Caminho OK se types.ts estiver no mesmo diretório
import styles from './TrainingCard.module.css'; // Caminho CORRIGIDO (assumindo que .module.css está no mesmo diretório)

// MODIFICADO: Removido 'onClick' das props e o elemento raiz é um <div>
const TrainingCard: React.FC<TrainingCardProps> = ({ id, label }) => {
    // O 'id' da prop não está sendo usado diretamente neste componente para funcionalidade,
    // mas é bom tê-lo se, no futuro, o card precisar do seu próprio ID para algo.
    // Atualmente, é usado pelo Link no componente pai para a navegação.

    return (
        // MODIFICADO: de <button> para <div>
        // O <Link> que envolve este componente no TrainingProtocolList.tsx cuidará da interatividade de clique.
        <div
            className={styles.cardButton} // Esta classe ainda define a aparência de "botão/card"
            aria-label={`Meus Treinos de ${label}`} // aria-label ainda é útil para acessibilidade
            role="listitem" // Adicionado para semântica, já que é um item em uma lista de links
        >
            {/* MODIFICADO: Usando styles.cardLabel se definido, ou fallback para classes Tailwind */}
            <span className={styles.cardLabel}>{label}</span>
            <svg
                xmlns="http://www.w3.org/2000/svg"
                className={styles.cardIcon}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true" // Ícone é decorativo
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7" // Seta para a direita
                />
            </svg>
        </div>
    );
};

export default TrainingCard;
