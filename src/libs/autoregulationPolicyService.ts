import { Api } from '@/libs/api';
import { PartialAutoregulationPolicy } from '@/libs/autoregulationPolicy';

/** Atualiza os parâmetros do Controle de Microciclo do personal autenticado.
 * Campos omitidos (undefined) voltam a usar o padrão do app — o corpo
 * enviado é sempre o objeto completo de overrides desejado, nunca um patch
 * parcial em cima do que já estava salvo. */
export async function updateMyAutoregulationPolicy(
    policy: PartialAutoregulationPolicy,
): Promise<PartialAutoregulationPolicy | null> {
    const res = await Api.put<{
        autoregulation_policy: PartialAutoregulationPolicy | null;
    }>('/personal/autoregulation-policy', policy);
    return res.data.autoregulation_policy;
}

/** Retorna os overrides configurados pelo personal autenticado. */
export async function getMyAutoregulationPolicy(): Promise<
    PartialAutoregulationPolicy | null
> {
    const res = await Api.get<{
        autoregulation_policy: PartialAutoregulationPolicy | null;
    }>('/personal/autoregulation-policy');
    return res.data.autoregulation_policy;
}

/** Retorna os overrides relevantes para o usuário autenticado: os próprios
 * (personal) ou os do personal vinculado (aluno). Nulo quando não há
 * override nenhum — o cliente deve então usar só o padrão do app. */
export async function getEffectiveAutoregulationPolicy(): Promise<
    PartialAutoregulationPolicy | null
> {
    const res = await Api.get<{
        autoregulation_policy: PartialAutoregulationPolicy | null;
    }>('/autoregulation-policy');
    return res.data.autoregulation_policy;
}
