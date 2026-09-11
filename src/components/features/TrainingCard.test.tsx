import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import TrainingCard from './TrainingCard';
import type { TrainingCardProps } from './types';

/**
 * O card já sabia derivar "Hoje" / "Concluído" / "Em andamento" / "Pulado",
 * mas `/meus-treinos` não repassava `status`, `completedDate` nem
 * `scheduledToday` — o enriquecimento feito em `buildMesoGroups` (que paga um
 * `getNewWorkoutLogs` por mesociclo) era calculado e jogado fora, e o aluno
 * ficava sem saber qual treino era o da vez sem abrir um por um.
 *
 * Estes testes travam a derivação do badge para que a regressão não volte
 * silenciosa: se alguém apagar de novo as props no call site, o teste de
 * integração abaixo ("prioridade") continua passando, mas a prop some do
 * tipo — por isso o foco aqui é a REGRA de precedência, que é a lógica que
 * de fato decide o que o aluno lê.
 */

function renderCard(props: Partial<TrainingCardProps> = {}) {
    return render(
        <TrainingCard
            id="t1"
            label="Treino A"
            exerciseCount={6}
            seriesCount={18}
            estimatedMinutes={45}
            {...props}
        />,
    );
}

describe('TrainingCard — badge de status', () => {
    it('não mostra badge nenhum quando não há log nem agendamento para hoje', () => {
        renderCard();
        expect(screen.queryByText('Hoje')).not.toBeInTheDocument();
        expect(screen.queryByText('Concluído')).not.toBeInTheDocument();
        expect(screen.queryByText('Em andamento')).not.toBeInTheDocument();
        expect(screen.queryByText('Pulado')).not.toBeInTheDocument();
    });

    it('marca "Hoje" quando o treino está agendado para o dia corrente', () => {
        renderCard({ scheduledToday: true });
        expect(screen.getByText('Hoje')).toBeInTheDocument();
    });

    it('marca "Concluído" e troca a estimativa pela última vez que foi feito', () => {
        const ontem = new Date(Date.now() - 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0];
        renderCard({ status: 'completed', completedDate: ontem });

        expect(screen.getByText('Concluído')).toBeInTheDocument();
        // Concluído substitui "~45 min" pela recência — é a informação útil
        // depois que o treino já foi feito.
        expect(screen.queryByText(/~45 min/)).not.toBeInTheDocument();
        expect(screen.getByText(/última vez:/)).toBeInTheDocument();
    });

    it('"Concluído" tem precedência sobre "Hoje" quando o aluno já treinou hoje', () => {
        renderCard({
            status: 'completed',
            scheduledToday: true,
            completedDate: new Date().toISOString().split('T')[0],
        });

        expect(screen.getByText('Concluído')).toBeInTheDocument();
        expect(screen.queryByText('Hoje')).not.toBeInTheDocument();
    });

    it('"Hoje" tem precedência sobre um registro ainda pendente', () => {
        renderCard({ status: 'pending', scheduledToday: true });

        expect(screen.getByText('Hoje')).toBeInTheDocument();
        expect(screen.queryByText('Em andamento')).not.toBeInTheDocument();
    });

    it('mostra "Em andamento" e "Pulado" quando não é o treino de hoje', () => {
        const { unmount } = renderCard({ status: 'pending' });
        expect(screen.getByText('Em andamento')).toBeInTheDocument();
        unmount();

        renderCard({ status: 'skipped' });
        expect(screen.getByText('Pulado')).toBeInTheDocument();
    });

    it('mantém a estimativa de duração enquanto o treino não foi concluído', () => {
        renderCard({ status: 'pending' });
        expect(screen.getByText(/~45 min/)).toBeInTheDocument();
    });
});
