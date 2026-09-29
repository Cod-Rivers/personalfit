/**
 * Eventos do funil de marketing (Todo/PLANO_MARKETING_ADMOB.md, §5), num só
 * lugar para não espalhar nome de evento solto pelas telas — quem for medir
 * no Firebase precisa achar a lista aqui, não caçar `nativeLogEvent(`.
 *
 * Hoje só chega ao Firebase Analytics quando dentro do app Android (ver
 * nativeLogEvent em libs/nativeBridge.ts). No navegador/PWA, é um no-op —
 * cobrir web/PWA com GA4 é trabalho futuro, não desta função.
 */

import { nativeLogEvent } from './nativeBridge';

export function trackSignUp(role: 'personal' | 'student'): void {
    nativeLogEvent('sign_up', { method: role });
}

/** Todo aluno adicionado, não só o primeiro: a ativação do personal
 *  ("1º aluno em até 7 dias") sai do funil do Firebase, que já trabalha com
 *  a primeira ocorrência do evento por usuário. Deduzir "é o primeiro" aqui
 *  dependeria da lista carregada na tela, que pode estar desatualizada. */
export function trackStudentAdded(linkedExistingAccount: boolean): void {
    nativeLogEvent('student_added', { linked_existing: linkedExistingAccount });
}

/** `assisted` = o personal registrou pelo /acompanhar (presencial). */
export function trackWorkoutCompleted(assisted: boolean): void {
    nativeLogEvent('workout_completed', { assisted });
}

export function trackTrialStarted(): void {
    nativeLogEvent('trial_started');
}

export function trackShareCard(surface: string): void {
    nativeLogEvent('share_card', { surface });
}

export function trackChallengeJoin(): void {
    nativeLogEvent('challenge_join');
}
