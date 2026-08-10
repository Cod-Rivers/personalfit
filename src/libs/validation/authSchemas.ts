import { z } from 'zod';

// Espelha o algoritmo de dígito verificador em
// Personal-fit-Back/internal/domain/user/cpf-validator.go — sem isto, CPFs
// com 11 dígitos mas checksum inválido passavam na validação do formulário e
// só falhavam no backend, que devolvia um erro genérico ao usuário.
export function isValidCpfChecksum(cpf: string): boolean {
    if (!/^\d{11}$/.test(cpf)) return false;
    if (/^(\d)\1{10}$/.test(cpf)) return false;

    const digits = cpf.split('').map(Number);

    let sum = 0;
    for (let i = 0; i < 9; i++) sum += digits[i] * (10 - i);
    let firstDigit = 11 - (sum % 11);
    if (firstDigit >= 10) firstDigit = 0;
    if (firstDigit !== digits[9]) return false;

    sum = 0;
    for (let i = 0; i < 10; i++) sum += digits[i] * (11 - i);
    let secondDigit = 11 - (sum % 11);
    if (secondDigit >= 10) secondDigit = 0;
    return secondDigit === digits[10];
}

export const loginSchema = z.object({
    email: z.string().email('E-mail inválido'),
    // No login validamos apenas a presença — a autenticação é feita pelo
    // servidor. Impor a política de complexidade aqui bloquearia usuários com
    // senhas mais antigas criadas antes da regra atual.
    password: z.string().min(1, 'Informe sua senha'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

// Política de senha do cadastro: mínimo 8 caracteres com ao menos uma letra e um
// número. Aplicada de forma consistente para todo novo cadastro (dados de saúde
// sensíveis justificam um mínimo mais forte).
const strongPassword = z
    .string()
    .min(8, 'Senha deve ter pelo menos 8 caracteres')
    .refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), {
        message: 'A senha deve conter ao menos uma letra e um número',
    });

export const signUpSchema = z
    .object({
        name: z.string().trim().min(2, 'Nome deve ter pelo menos 2 caracteres'),
        email: z.string().trim().email('E-mail inválido'),
        // Antes checava só o comprimento da string bruta (com máscara), então
        // qualquer texto com 10+ caracteres — inclusive letras — passava. Agora
        // normaliza para dígitos e exige DDD + 8 ou 9 dígitos, igual ao CPF.
        phone: z
            .string()
            .transform((val) => val.replace(/\D/g, ''))
            .refine(
                (val) => val.length === 10 || val.length === 11,
                'Telefone inválido',
            ),
        cpf: z
            .string()
            .transform((val) => val.replace(/\D/g, ''))
            .refine(
                (val) => /^\d{11}$/.test(val),
                'CPF deve conter 11 dígitos numéricos',
            )
            .refine(isValidCpfChecksum, 'CPF inválido'),
        password: strongPassword,
        confirm_password: z.string(),
    })
    .refine((d) => d.password === d.confirm_password, {
        message: 'As senhas não coincidem',
        path: ['confirm_password'],
    });

export type SignUpFormData = z.infer<typeof signUpSchema>;
