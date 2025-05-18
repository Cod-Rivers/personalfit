// Defina o tipo ExerciseLog atualizado
export interface ExerciseLog {
  id: string;
  name: string;
  series: number[];
  variations: string;
  video_url: string;
  video_thumb: string;
  weight: number;
  notes?: string;     // <-- ADICIONADO: notes como string opcional
  restTime?: number;  // <-- ADICIONADO: restTime como número opcional (em segundos)
}

// Mock de exercícios para diferentes treinos
const mockExercises: Record<string, ExerciseLog[]> = {
  'superior': [ // Treino ID 1
    {
      id: '1',
      name: 'Supino Reto',
      series: [12, 10, 8],
      variations: 'Barra livre',
      video_url: 'https://youtu.be/_j5a0E8IX-g',
      video_thumb: 'https://i.ytimg.com/vi/sqOw2Y6uDWQ/hqdefault.jpg',
      weight: 60,
      notes: 'Manter a postura correta e controlar a descida da barra.', // <-- CORRIGIDO: notes como string
      restTime: 90 // <-- ADICIONADO: Exemplo de 90 segundos de descanso
    },
    {
      id: '2',
      name: 'Rosca Direta',
      series: [12, 10, 8],
      variations: 'Barra livre',
      video_url: 'https://youtu.be/_j5a0E8IX-g', // Exemplo, idealmente um vídeo de rosca direta
      video_thumb: 'https://i.ytimg.com/vi/kwG2soxOZ8A/hqdefault.jpg', // Exemplo, idealmente thumb de rosca direta
      weight: 20, // Peso ajustado para exemplo
      // 'notes' pode ser omitido se não houver anotações
      restTime: 60 // <-- ADICIONADO: Exemplo de 60 segundos de descanso
    }
  ],
  't2': [ // Treino ID 2
    {
      id: '3', // ID ajustado para ser único, se necessário entre diferentes treinos
      name: 'Agachamento Livre',
      series: [15, 12, 10],
      variations: 'Peso corporal',
      video_url: '/videos/agachamento.mp4', // Mantenha como está se for um vídeo local
      video_thumb: '/thumbs/agachamento.jpg', // Mantenha como está se for local
      weight: 0,
      notes: 'Atenção à profundidade e à postura da coluna.', // <-- ADICIONADO: Exemplo de anotação
      restTime: 75 // <-- ADICIONADO: Exemplo de 75 segundos de descanso
    }
  ]
  // Adicione mais treinos e exercícios conforme necessário
};

// Função para buscar exercícios mockados
export const getExercisesByTrainingId = async (trainingId: string): Promise<ExerciseLog[]> => {
  return mockExercises[trainingId] || [];
};