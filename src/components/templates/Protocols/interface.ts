export interface IProtocol {
    id: number;
    reference: string;
    exercise_logs: {
        id: number;
        name: string;
        sets: number;
        repetitions: number;
        rest_time: number;
        weight: number;
    }[];
}