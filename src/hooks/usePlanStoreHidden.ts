'use client';
import { useBranding } from '@/context/BrandingContext';

/**
 * A loja de planos (planos "Treine como os famosos") fica escondida para o
 * aluno de personal PRO — quem paga o PRO não quer o app vendendo outro
 * treino para o aluno dele. Aluno de personal free e aluno sem personal veem.
 *
 * Fonte: GET /branding (BrandingContext). Para o aluno vinculado,
 * effective_plan_type é o plano do PERSONAL e personal_name vem preenchido;
 * sem personal, effective_plan_type é o do próprio aluno e personal_name não
 * vem — por isso o "pro" só conta junto com o personal.
 *
 * - `true`: esconder. `false`: mostrar.
 * - `null`: ainda não se sabe (o /branding não respondeu) e o aluno tem
 *   personal pela sessão — quem usa decide; a tela de Meus Treinos esconde
 *   até saber, para a loja não aparecer e sumir em seguida.
 *
 * Só esconde: a compra em si não é bloqueada no servidor.
 */
export function usePlanStoreHidden(hasPersonal: boolean): boolean | null {
    const { effectivePlanType, personalName } = useBranding();
    if (effectivePlanType === null) return hasPersonal ? null : false;
    return !!personalName && effectivePlanType === 'pro';
}
