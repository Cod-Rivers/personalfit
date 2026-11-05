import { FiLock } from 'react-icons/fi';
import s from './OverdueBlockNotice.module.css';

interface LinkInactiveNoticeProps {
    /** O personal pediu para reativar e falta o aluno confirmar. */
    pending?: boolean;
}

/**
 * Aviso no lugar do treino quando o personal desativou o aluno (403
 * student_link_inactive, ver libs/linkInactive.ts, ou link_status do /me).
 * O treino que o personal montou some até o vínculo voltar; o que o aluno
 * comprou na loja continua. Mesmo visual do OverdueBlockNotice.
 */
export default function LinkInactiveNotice({ pending = false }: LinkInactiveNoticeProps) {
    return (
        <div className={s.notice} role="alert">
            <FiLock className={s.icon} aria-hidden="true" />
            <div>
                <p className={s.title}>Acesso ao treino pausado</p>
                <p className={s.text}>
                    {pending
                        ? 'Seu personal trainer pediu para reativar seu acesso. Confirme o pedido no aviso do topo da tela e o treino que ele montou volta a aparecer aqui.'
                        : 'Seu personal trainer desativou seu acesso ao treino que ele montou para você. Quando ele reativar e você confirmar o pedido, o treino volta a aparecer aqui.'}
                </p>
            </div>
        </div>
    );
}
