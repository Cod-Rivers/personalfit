import { ApiResponse, ApiTrainingProgress, User } from '../components/types'; // Ajuste o caminho

interface ProtocolData {
  [protocolId: string]: ApiResponse;
}

const allProtocolsData: ProtocolData = {
  "1": { // protocolId "1"
    user: { id: "user1", name: "Usuário Protocolo 1" },
    trainings_progress: [
      { id: "tp1-p1", user_id: "user1", training_id: "t1", reference: "A", exercise_logs: [] },
      { id: "tp2-p1", user_id: "user1", training_id: "t2", reference: "B", exercise_logs: [] },
    ]
  },
  "outroProtocolo": { // protocolId "outroProtocolo"
    user: { id: "userOther", name: "Usuário Outro Protocolo" },
    trainings_progress: [
      { id: "tp4-op", user_id: "userOther", training_id: "t1", reference: "X", exercise_logs: [] },
    ]
  },
  // ... outros protocolos
};

export const getProtocolDataById = async (protocolId: string): Promise<ApiResponse | null> => {
  await new Promise(resolve => setTimeout(resolve, 100)); // Simula atraso
  return allProtocolsData[protocolId] || null;
};