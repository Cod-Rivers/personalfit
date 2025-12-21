export type TPaymentTypes = 'CreditCard'| 'PIX';

export enum EPaymentTypes {
    CreditCard = 'CreditCard',
    PIX = 'PIX'
}

export type TPlanCycle = 'BIMONTHLY' | 'SEMIANNUALLY';

export interface IPlan{
    name: string;
    value: number;
    description: string;
    cycle: TPlanCycle;
}     