/** Máscara de CPF (000.000.000-00) aplicada enquanto o usuário digita.
 * Aceita colar/digitar com ou sem pontuação — descarta tudo que não for
 * dígito antes de reaplicar a máscara. A validação em si (checksum,
 * obrigatoriedade) fica a cargo do schema zod; isto é só formatação visual. */
export function formatCpfInput(raw: string): string {
    const digits = raw.replace(/\D/g, '').slice(0, 11);
    if (digits.length > 9) {
        return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
    }
    if (digits.length > 6) {
        return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    }
    if (digits.length > 3) {
        return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    }
    return digits;
}
