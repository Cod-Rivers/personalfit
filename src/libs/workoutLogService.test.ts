import { describe, expect, it } from 'vitest';
import { clientCompletedAtNow } from './workoutLogService';

/** Date falsa com fuso controlado. Os campos locais são fixos e
 * getTimezoneOffset() devolve o valor pedido — é o único jeito de testar a
 * formatação do offset sem depender do fuso da máquina que roda o teste. */
function dateEm(offsetMinutesFromUtc: number, campos: {
    ano: number; mes: number; dia: number; hora: number; min: number; seg: number;
}): Date {
    return {
        getFullYear: () => campos.ano,
        getMonth: () => campos.mes - 1,
        getDate: () => campos.dia,
        getHours: () => campos.hora,
        getMinutes: () => campos.min,
        getSeconds: () => campos.seg,
        // A API do JS devolve UTC MENOS local: em Brasília (UTC-3) o valor é
        // +180. É a inversão que o helper precisa desfazer.
        getTimezoneOffset: () => -offsetMinutesFromUtc,
    } as Date;
}

describe('clientCompletedAtNow', () => {
    it('escreve o offset do aparelho, não Z', () => {
        const brasilia = dateEm(-180, { ano: 2026, mes: 9, dia: 4, hora: 22, min: 30, seg: 5 });
        expect(clientCompletedAtNow(brasilia)).toBe('2026-09-04T22:30:05-03:00');
    });

    it('trata fuso positivo e com minutos quebrados', () => {
        // Índia é UTC+5:30 — pega tanto o sinal quanto o resto de 60.
        const india = dateEm(330, { ano: 2026, mes: 1, dia: 7, hora: 6, min: 5, seg: 0 });
        expect(clientCompletedAtNow(india)).toBe('2026-01-07T06:05:00+05:30');
    });

    it('trata UTC sem inventar sinal negativo', () => {
        const utc = dateEm(0, { ano: 2026, mes: 12, dia: 31, hora: 23, min: 59, seg: 59 });
        expect(clientCompletedAtNow(utc)).toBe('2026-12-31T23:59:59+00:00');
    });

    /* A trava de verdade: o instante tem de sobreviver à ida e volta. Um sinal
     * de offset invertido passaria por todos os testes de formato acima se o
     * fuso da máquina fosse UTC, mas quebra aqui em qualquer outro fuso — e
     * seria exatamente o bug que faz um treino no prazo virar tardio. */
    it('preserva o instante ao ser reinterpretado', () => {
        const agora = new Date();
        const reinterpretado = new Date(clientCompletedAtNow(agora));
        // Segundos, porque o formato não carrega milissegundos.
        expect(Math.floor(reinterpretado.getTime() / 1000)).toBe(
            Math.floor(agora.getTime() / 1000),
        );
    });
});
