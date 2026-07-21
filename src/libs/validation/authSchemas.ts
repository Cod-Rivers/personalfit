import { z } from 'zod';

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
        name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
        email: z.string().email('E-mail inválido'),
        phone: z.string().min(10, 'Telefone inválido'),
        cpf: z
            .string()
            .transform((val) => val.replace(/\D/g, ''))
            .refine(
                (val) => /^\d{11}$/.test(val),
                'CPF deve conter 11 dígitos numéricos',
            ),
        password: strongPassword,
        confirm_password: z.string(),
    })
    .refine((d) => d.password === d.confirm_password, {
        message: 'As senhas não coincidem',
        path: ['confirm_password'],
    });

export type SignUpFormData = z.infer<typeof signUpSchema>;
