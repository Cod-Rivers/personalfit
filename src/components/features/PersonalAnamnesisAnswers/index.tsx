'use client';

import { FiAlertTriangle } from 'react-icons/fi';
import {
    formatAnamnesisDate,
    type LegacyAnamnesisView,
    type PersonalAnamnesisView,
} from '@/libs/personalAnamnesisService';
import s from './PersonalAnamnesisAnswers.module.css';

function filledByLabel(view: PersonalAnamnesisView): string {
    if (view.filled_by === 'personal') {
        return view.personal_name
            ? `pelo personal (${view.personal_name})`
            : 'pelo personal';
    }
    return 'pelo aluno';
}

/**
 * Respostas da Anamnese do personal, agrupadas por seção, para o personal
 * ler ao montar as séries. O PAR-Q sem nenhuma resposta de risco vira uma
 * linha só — sete "Não" seguidos só empurravam o que importa para baixo.
 */
export default function PersonalAnamnesisAnswers({
    view,
}: {
    view: PersonalAnamnesisView;
}) {
    const date = formatAnamnesisDate(view.submitted_at);

    return (
        <div className={s.viewer}>
            <p className={s.meta}>
                Respondida{date ? ` em ${date}` : ''} {filledByLabel(view)}
            </p>

            {view.flagged && (
                <div className={s.flagAlert} role="note">
                    <FiAlertTriangle className={s.flagIcon} aria-hidden />
                    <div>
                        <strong>A triagem de segurança (PAR-Q) sinalizou risco.</strong>{' '}
                        Avalie a necessidade de liberação médica antes de
                        prescrever.
                    </div>
                </div>
            )}

            {view.sections.map((section) => {
                const hasRisk = section.answers.some((a) => a.flagged);
                if (section.key === 'seguranca' && !hasRisk) {
                    return (
                        <section key={section.key} className={s.section}>
                            <h3 className={s.sectionTitle}>{section.title}</h3>
                            <p className={s.safeLine}>
                                Nenhuma resposta de risco nas{' '}
                                {section.answers.length} perguntas.
                            </p>
                        </section>
                    );
                }
                return (
                    <section key={section.key} className={s.section}>
                        <h3 className={s.sectionTitle}>{section.title}</h3>
                        <dl className={s.list}>
                            {section.answers.map((answer) => (
                                <div
                                    key={answer.key}
                                    className={`${s.item} ${answer.flagged ? s.itemFlagged : ''}`}
                                >
                                    <dt className={s.question}>
                                        {answer.flagged && (
                                            <FiAlertTriangle className={s.flagIcon} aria-label="Resposta de risco" />
                                        )}
                                        {answer.question}
                                    </dt>
                                    <dd className={s.answer}>
                                        {answer.text ? (
                                            <span className={s.text}>{answer.text}</span>
                                        ) : (
                                            <span className={s.chips}>
                                                {answer.values?.map((value) => (
                                                    <span key={value} className={s.chip}>
                                                        {value}
                                                    </span>
                                                ))}
                                            </span>
                                        )}
                                    </dd>
                                </div>
                            ))}
                        </dl>
                    </section>
                );
            })}
        </div>
    );
}

/** Anamneses do formato antigo, só leitura, recolhidas por padrão. */
export function LegacyAnamnesisList({ items }: { items: LegacyAnamnesisView[] }) {
    if (items.length === 0) return null;
    return (
        <div className={s.legacy}>
            {items.map((item, index) => (
                <details key={`${item.completed_at}-${index}`} className={s.legacyItem}>
                    <summary className={s.legacySummary}>
                        {formatAnamnesisDate(item.completed_at) || 'Sem data'} ·{' '}
                        {item.filled_by === 'personal'
                            ? 'preenchida pelo personal'
                            : 'preenchida pelo aluno'}
                        {item.flagged && (
                            <span className={s.legacyFlag}> · PAR-Q sinalizou risco</span>
                        )}
                    </summary>
                    {item.answers.length === 0 ? (
                        <p className={s.safeLine}>
                            As perguntas deste formato não estão mais disponíveis para exibição.
                        </p>
                    ) : (
                        <dl className={s.list}>
                            {item.answers.map((answer, i) => (
                                <div key={i} className={s.item}>
                                    <dt className={s.question}>{answer.question}</dt>
                                    <dd className={s.answer}>{answer.answer}</dd>
                                </div>
                            ))}
                        </dl>
                    )}
                </details>
            ))}
        </div>
    );
}
