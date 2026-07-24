import { Api } from '@/libs/api';

export interface ExerciseDTO {
    id?: string;
    name: string;
    series: number[];
    variations: string;
    comments?: string | null;
    video_url: string;
    video_thumb: string;
    timed: boolean;
    series_label?: string | null;
    load_percentage?: number | null;
    load_kg?: number | null;
    rest_seconds?: number | null;
    tempo_seconds?: number | null;
    rpe_target?: number | null;
    muscle_group?: string;
}

export interface TrainingDTO {
    id?: string;
    reference: string;
    exercises: ExerciseDTO[];
    weekday?: number | null;
}

export interface Protocol {
    id: string;
    folder_id: string;
    difficulty: string;
    order: number;
    periodicity: number;
    muscle_emphasis: string;
    notes: string;
    trainings: TrainingDTO[];
}

export interface ProtocolFolder {
    id: string;
    difficulty: string;
    protocols: Protocol[];
}

export interface CreateProtocolRequest {
    difficulty: string;
    periodicity: number;
    muscle_emphasis: string;
    notes: string;
    trainings: TrainingDTO[];
}

export interface UpdateProtocolRequest {
    periodicity: number;
    muscle_emphasis: string;
    notes: string;
    trainings: TrainingDTO[];
}

/** Admin: lista todas as pastas de protocolo (iniciante/intermediário/avançado) com seus protocolos */
export async function getAllProtocolFolders(): Promise<ProtocolFolder[]> {
    const res = await Api.get<ProtocolFolder[]>('/protocol-folders');
    return res.data;
}

/** Admin: busca um protocolo específico pelo ID */
export async function getProtocolById(id: string): Promise<Protocol> {
    const res = await Api.get<Protocol>(`/protocols/${id}`);
    return res.data;
}

/** Admin: cria um novo protocolo (só permitido para difficulty === "avançado") */
export async function createProtocol(
    data: CreateProtocolRequest,
): Promise<Protocol> {
    const res = await Api.post<Protocol>('/protocols', data);
    return res.data;
}

/** Admin: atualiza o conteúdo de um protocolo existente (Order e difficulty nunca mudam) */
export async function updateProtocol(
    id: string,
    data: UpdateProtocolRequest,
): Promise<Protocol> {
    const res = await Api.put<Protocol>(`/protocols/${id}`, data);
    return res.data;
}

/** Admin: exclui um protocolo (só permitido para difficulty === "avançado" e sem usuários atribuídos) */
export async function deleteProtocol(id: string): Promise<void> {
    await Api.delete(`/protocols/${id}`);
}
