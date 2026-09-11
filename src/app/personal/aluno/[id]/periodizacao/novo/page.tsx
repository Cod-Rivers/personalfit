'use client';
import { useRouter, useParams } from 'next/navigation';
import NewMacrocycleModal from '@/app/personal/_shared/periodizacao/components/NewMacrocycleModal';

/**
 * A criação de macrociclo virou um modal de dois cards aberto direto da lista
 * de planos. Esta rota continua existindo porque o link pode estar salvo:
 * renderiza o MESMO componente e, ao fechar, volta para a lista.
 */
export default function NovoPeriodizacaoPage() {
    const router = useRouter();
    const params = useParams<{ id: string }>();
    const studentId = params.id;

    return (
        <NewMacrocycleModal
            studentId={studentId}
            onClose={() =>
                router.replace(`/personal/aluno/${studentId}/periodizacao`)
            }
            onCreated={(macro) =>
                router.replace(
                    `/personal/aluno/${studentId}/periodizacao/${macro.id}?created=1`,
                )
            }
        />
    );
}
