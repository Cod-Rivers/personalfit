import { ApiTrainingProgress } from '@/components/features/types';

// IProtocol é um alias de ApiTrainingProgress: cada entrada de
// trainings_progress do usuário é, na prática, um "protocolo" nessa tela legada.
export type IProtocol = ApiTrainingProgress;