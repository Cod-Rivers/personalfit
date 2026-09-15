import { FiLock } from 'react-icons/fi';
import s from './OverdueBlockNotice.module.css';

interface OverdueBlockNoticeProps {
    /** O que ficou pausado, para completar a frase ("ao seu treino"). */
    what: string;
}

/**
 * Aviso mostrado no lugar do conteúdo quando o personal pausou o acesso do
 * aluno por mensalidade vencida (403 student_blocked_overdue, ver
 * libs/overdueBlock.ts). Explica o que aconteceu e como sai disso, em vez de
 * um erro genérico de carregamento.
 */
export default function OverdueBlockNotice({ what }: OverdueBlockNoticeProps) {
    return (
        <div className={s.notice} role="alert">
            <FiLock className={s.icon} aria-hidden="true" />
            <div>
                <p className={s.title}>Acesso pausado</p>
                <p className={s.text}>
                    Seu personal trainer pausou o acesso {what} porque há uma
                    mensalidade vencida. Assim que ele registrar o pagamento, o
                    acesso volta sozinho. Se você já pagou, fale com ele.
                </p>
            </div>
        </div>
    );
}
