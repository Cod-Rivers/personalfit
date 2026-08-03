import { Api } from '@/libs/api';
import { PartialAutoregulationPolicy } from '@/libs/autoregulationPolicy';

// O backend Go usa tags JSON snake_case (ex: "super_balance_threshold"),
// enquanto o restante do código TS usa camelCase para os mesmos campos
// (ver AutoregulationPolicy em autoregulationPolicy.ts). Sem esta conversão
// na borda da API, nenhum campo do corpo bate com o esperado por
// encoding/json no Go (ele não reconhece "superBalanceThreshold" como
// equivalente a "super_balance_threshold") — todo PUT persistia uma policy
// vazia (silenciosamente, sem erro) e todo GET vinha sem nenhum campo
// populado. Objeto é raso (só números), então a conversão não precisa ser
// recursiva.
type ApiAutoregulationPolicy = Record<string, number>;

const camelToSnake = (key: string): string =>
    key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);

const snakeToCamel = (key: string): string =>
    key.replace(/_([a-z0-9])/g, (_, char: string) => char.toUpperCase());

function toApiPolicy(
    policy: PartialAutoregulationPolicy,
): ApiAutoregulationPolicy {
    const out: ApiAutoregulationPolicy = {};
    for (const [key, value] of Object.entries(policy)) {
        if (value != null) out[camelToSnake(key)] = value;
    }
    return out;
}

function fromApiPolicy(
    raw: ApiAutoregulationPolicy | null,
): PartialAutoregulationPolicy | null {
    if (!raw) return null;
    const out: PartialAutoregulationPolicy = {};
    for (const [key, value] of Object.entries(raw)) {
        if (value != null) {
            (out as Record<string, number>)[snakeToCamel(key)] = value;
        }
    }
    return out;
}

/** Atualiza os parâmetros do Controle de Microciclo do personal autenticado.
 * Campos omitidos (undefined) voltam a usar o padrão do app — o corpo
 * enviado é sempre o objeto completo de overrides desejado, nunca um patch
 * parcial em cima do que já estava salvo. */
export async function updateMyAutoregulationPolicy(
    policy: PartialAutoregulationPolicy,
): Promise<PartialAutoregulationPolicy | null> {
    const res = await Api.put<{
        autoregulation_policy: ApiAutoregulationPolicy | null;
    }>('/personal/autoregulation-policy', toApiPolicy(policy));
    return fromApiPolicy(res.data.autoregulation_policy);
}

/** Retorna os overrides configurados pelo personal autenticado. */
export async function getMyAutoregulationPolicy(): Promise<
    PartialAutoregulationPolicy | null
> {
    const res = await Api.get<{
        autoregulation_policy: ApiAutoregulationPolicy | null;
    }>('/personal/autoregulation-policy');
    return fromApiPolicy(res.data.autoregulation_policy);
}

/** Retorna os overrides relevantes para o usuário autenticado: os próprios
 * (personal) ou os do personal vinculado (aluno). Nulo quando não há
 * override nenhum — o cliente deve então usar só o padrão do app. */
export async function getEffectiveAutoregulationPolicy(): Promise<
    PartialAutoregulationPolicy | null
> {
    const res = await Api.get<{
        autoregulation_policy: ApiAutoregulationPolicy | null;
    }>('/autoregulation-policy');
    return fromApiPolicy(res.data.autoregulation_policy);
}
