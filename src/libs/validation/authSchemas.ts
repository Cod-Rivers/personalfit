import { z } from 'zod';

export const loginSchema = z.object({
    email: z.string().email('E-mail inválido'),
    password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

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
        password: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres'),
        confirm_password: z.string(),
    })
    .refine((d) => d.password === d.confirm_password, {
        message: 'As senhas não coincidem',
        path: ['confirm_password'],
    });

export type SignUpFormData = z.infer<typeof signUpSchema>;
