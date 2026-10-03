import type { ReactNode } from 'react';
import StudentOverflowGate from '@/components/features/StudentOverflowGate';

/**
 * Layout da área do personal: só a trava do excedente de alunos do plano
 * gratuito (StudentOverflowGate) em volta das páginas. Um layout não remonta
 * entre as páginas de /personal, então o status é consultado uma vez.
 */
export default function PersonalLayout({ children }: { children: ReactNode }) {
    return <StudentOverflowGate>{children}</StudentOverflowGate>;
}
