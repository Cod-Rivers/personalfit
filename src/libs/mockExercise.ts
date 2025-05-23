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
  't1': [ // Treino ID 1
    {
      id: '1',
      name: 'Supino Reto',
      series: [12, 10, 8],
      variations: 'Barra livre',
      video_url: 'https://www.youtube.com/watch?v=EZMYCLKuGow',
      video_thumb: 'https://i.ytimg.com/vi/WwXS2TeFmeg/hq720.jpg?sqp=-oaymwFBCNAFEJQDSFryq4qpAzMIARUAAIhCGAHYAQHiAQoIGBACGAY4AUAB8AEB-AH-CYAC0AWKAgwIABABGF8gXyhfMA8=&rs=AOn4CLCv77lzlua7EokRr-_k66BIQzkJNg',
      weight: 60,
      notes: 'Manter a postura correta e controlar a descida da barra.', // <-- CORRIGIDO: notes como string
      restTime: 90 // <-- ADICIONADO: Exemplo de 90 segundos de descanso
    },
    {
      id: '2',
      name: 'Rosca Direta',
      series: [12, 10, 8],
      variations: 'Barra livre',
      video_url: 'https://www.youtube.com/watch?v=FHyZEuRpSg4', // Exemplo, idealmente um vídeo de rosca direta
      video_thumb: 'https://i.ytimg.com/vi/FHyZEuRpSg4/hq720.jpg?sqp=-oaymwEnCNAFEJQDSFryq4qpAxkIARUAAIhCGAHYAQHiAQoIGBACGAY4AUAB&rs=AOn4CLDjHtizR010lqxg5PRwjKFfrcOv4Q', // Exemplo, idealmente thumb de rosca direta
      weight: 20, // Peso ajustado para exemplo
      // 'notes' pode ser omitido se não houver anotações
      restTime: 60 // <-- ADICIONADO: Exemplo de 60 segundos de descanso
    },
    {
      id: '3',
      name: 'Agachamento',
      series: [12, 10, 8],
      variations: 'Barra livre',
      video_url: 'https://www.youtube.com/watch?v=4L5nBs8Eq7g', // Exemplo, idealmente um vídeo de rosca direta
      video_thumb: 'https://i.ytimg.com/vi/4L5nBs8Eq7g/hq720.jpg?sqp=-oaymwEnCNAFEJQDSFryq4qpAxkIARUAAIhCGAHYAQHiAQoIGBACGAY4AUAB&rs=AOn4CLD7Sb-CpjQqpc1dAHtGQlJ5nRcOHQ', // Exemplo, idealmente thumb de rosca direta
      weight: 20, // Peso ajustado para exemplo
      // 'notes' pode ser omitido se não houver anotações
      restTime: 60 // <-- ADICIONADO: Exemplo de 60 segundos de descanso
    }
  ],
  't2': [ // Treino ID 2
    {
      id: '1', // ID ajustado para ser único, se necessário entre diferentes treinos
      name: 'Levantamento Terra',
      series: [15, 12, 10],
      variations: 'Peso corporal',
      video_url: 'https://www.youtube.com/watch?v=zH1QFLtuep0', // Mantenha como está se for um vídeo local
      video_thumb: 'https://i.ytimg.com/vi/zH1QFLtuep0/hq720.jpg?sqp=-oaymwEnCNAFEJQDSFryq4qpAxkIARUAAIhCGAHYAQHiAQoIGBACGAY4AUAB&rs=AOn4CLA2kaagBLTGIBQq_GzFOJ3rqZPxBQ', // Mantenha como está se for local
      weight: 0,
      notes: 'Atenção à profundidade e à postura da coluna.', // <-- ADICIONADO: Exemplo de anotação
      restTime: 75 // <-- ADICIONADO: Exemplo de 75 segundos de descanso
    },
   {
      id: '2',
      name: 'Rosca Direta',
      series: [12, 10, 8],
      variations: 'Barra livre',
      video_url: 'https://www.youtube.com/watch?v=FHyZEuRpSg4', // Exemplo, idealmente um vídeo de rosca direta
      video_thumb: 'https://i.ytimg.com/vi/FHyZEuRpSg4/hq720.jpg?sqp=-oaymwEnCNAFEJQDSFryq4qpAxkIARUAAIhCGAHYAQHiAQoIGBACGAY4AUAB&rs=AOn4CLDjHtizR010lqxg5PRwjKFfrcOv4Q', // Exemplo, idealmente thumb de rosca direta
      weight: 20, // Peso ajustado para exemplo
      // 'notes' pode ser omitido se não houver anotações
      restTime: 60 // <-- ADICIONADO: Exemplo de 60 segundos de descanso
    },
      {
      id: '3',
      name: 'Agachamento',
      series: [12, 10, 8],
      variations: 'Barra livre',
      video_url: 'https://www.youtube.com/watch?v=4L5nBs8Eq7g', // Exemplo, idealmente um vídeo de rosca direta
      video_thumb: 'https://i.ytimg.com/vi/4L5nBs8Eq7g/hq720.jpg?sqp=-oaymwEnCNAFEJQDSFryq4qpAxkIARUAAIhCGAHYAQHiAQoIGBACGAY4AUAB&rs=AOn4CLD7Sb-CpjQqpc1dAHtGQlJ5nRcOHQ', // Exemplo, idealmente thumb de rosca direta
      weight: 20, // Peso ajustado para exemplo
      // 'notes' pode ser omitido se não houver anotações
      restTime: 60 // <-- ADICIONADO: Exemplo de 60 segundos de descanso
    }
  ],
    't3': [ // Treino ID 2
 {
      id: '1', // ID ajustado para ser único, se necessário entre diferentes treinos
      name: 'Levantamento Terra',
      series: [15, 12, 10],
      variations: 'Peso corporal',
      video_url: 'https://www.youtube.com/watch?v=zH1QFLtuep0', // Mantenha como está se for um vídeo local
      video_thumb: 'https://i.ytimg.com/vi/zH1QFLtuep0/hq720.jpg?sqp=-oaymwEnCNAFEJQDSFryq4qpAxkIARUAAIhCGAHYAQHiAQoIGBACGAY4AUAB&rs=AOn4CLA2kaagBLTGIBQq_GzFOJ3rqZPxBQ', // Mantenha como está se for local
      weight: 0,
      notes: 'Atenção à profundidade e à postura da coluna.', // <-- ADICIONADO: Exemplo de anotação
      restTime: 75 // <-- ADICIONADO: Exemplo de 75 segundos de descanso
    },
  {
      id: '2',
      name: 'Rosca Direta',
      series: [12, 10, 8],
      variations: 'Barra livre',
      video_url: 'https://www.youtube.com/watch?v=FHyZEuRpSg4', // Exemplo, idealmente um vídeo de rosca direta
      video_thumb: 'https://i.ytimg.com/vi/FHyZEuRpSg4/hq720.jpg?sqp=-oaymwEnCNAFEJQDSFryq4qpAxkIARUAAIhCGAHYAQHiAQoIGBACGAY4AUAB&rs=AOn4CLDjHtizR010lqxg5PRwjKFfrcOv4Q', // Exemplo, idealmente thumb de rosca direta
      weight: 20, // Peso ajustado para exemplo
      // 'notes' pode ser omitido se não houver anotações
      restTime: 60 // <-- ADICIONADO: Exemplo de 60 segundos de descanso
    },
      {
      id: '3',
      name: 'Agachamento',
      series: [12, 10, 8],
      variations: 'Barra livre',
      video_url: 'https://www.youtube.com/watch?v=4L5nBs8Eq7g', // Exemplo, idealmente um vídeo de rosca direta
      video_thumb: 'https://i.ytimg.com/vi/4L5nBs8Eq7g/hq720.jpg?sqp=-oaymwEnCNAFEJQDSFryq4qpAxkIARUAAIhCGAHYAQHiAQoIGBACGAY4AUAB&rs=AOn4CLD7Sb-CpjQqpc1dAHtGQlJ5nRcOHQ', // Exemplo, idealmente thumb de rosca direta
      weight: 20, // Peso ajustado para exemplo
      // 'notes' pode ser omitido se não houver anotações
      restTime: 60 // <-- ADICIONADO: Exemplo de 60 segundos de descanso
    }
  ],
    't4': [ // Treino ID 2
   {
      id: '1', // ID ajustado para ser único, se necessário entre diferentes treinos
      name: 'Levantamento Terra',
      series: [15, 12, 10],
      variations: 'Peso corporal',
      video_url: 'https://www.youtube.com/watch?v=zH1QFLtuep0', // Mantenha como está se for um vídeo local
      video_thumb: 'https://i.ytimg.com/vi/zH1QFLtuep0/hq720.jpg?sqp=-oaymwEnCNAFEJQDSFryq4qpAxkIARUAAIhCGAHYAQHiAQoIGBACGAY4AUAB&rs=AOn4CLA2kaagBLTGIBQq_GzFOJ3rqZPxBQ', // Mantenha como está se for local
      weight: 0,
      notes: 'Atenção à profundidade e à postura da coluna.', // <-- ADICIONADO: Exemplo de anotação
      restTime: 75 // <-- ADICIONADO: Exemplo de 75 segundos de descanso
    },
  {
      id: '2',
      name: 'Rosca Direta',
      series: [12, 10, 8],
      variations: 'Barra livre',
      video_url: 'https://www.youtube.com/watch?v=FHyZEuRpSg4', // Exemplo, idealmente um vídeo de rosca direta
      video_thumb: 'https://i.ytimg.com/vi/FHyZEuRpSg4/hq720.jpg?sqp=-oaymwEnCNAFEJQDSFryq4qpAxkIARUAAIhCGAHYAQHiAQoIGBACGAY4AUAB&rs=AOn4CLDjHtizR010lqxg5PRwjKFfrcOv4Q', // Exemplo, idealmente thumb de rosca direta
      weight: 20, // Peso ajustado para exemplo
      // 'notes' pode ser omitido se não houver anotações
      restTime: 60 // <-- ADICIONADO: Exemplo de 60 segundos de descanso
    },
      {
      id: '3',
      name: 'Agachamento',
      series: [12, 10, 8],
      variations: 'Barra livre',
      video_url: 'https://www.youtube.com/watch?v=4L5nBs8Eq7g', // Exemplo, idealmente um vídeo de rosca direta
      video_thumb: 'https://i.ytimg.com/vi/4L5nBs8Eq7g/hq720.jpg?sqp=-oaymwEnCNAFEJQDSFryq4qpAxkIARUAAIhCGAHYAQHiAQoIGBACGAY4AUAB&rs=AOn4CLD7Sb-CpjQqpc1dAHtGQlJ5nRcOHQ', // Exemplo, idealmente thumb de rosca direta
      weight: 20, // Peso ajustado para exemplo
      // 'notes' pode ser omitido se não houver anotações
      restTime: 60 // <-- ADICIONADO: Exemplo de 60 segundos de descanso
    }
  ],
    't5': [ // Treino ID 2
{
      id: '1', // ID ajustado para ser único, se necessário entre diferentes treinos
      name: 'Levantamento Terra',
      series: [15, 12, 10],
      variations: 'Peso corporal',
      video_url: 'https://www.youtube.com/watch?v=zH1QFLtuep0', // Mantenha como está se for um vídeo local
      video_thumb: 'https://i.ytimg.com/vi/zH1QFLtuep0/hq720.jpg?sqp=-oaymwEnCNAFEJQDSFryq4qpAxkIARUAAIhCGAHYAQHiAQoIGBACGAY4AUAB&rs=AOn4CLA2kaagBLTGIBQq_GzFOJ3rqZPxBQ', // Mantenha como está se for local
      weight: 0,
      notes: 'Atenção à profundidade e à postura da coluna.', // <-- ADICIONADO: Exemplo de anotação
      restTime: 75 // <-- ADICIONADO: Exemplo de 75 segundos de descanso
    },
  {
      id: '2',
      name: 'Rosca Direta',
      series: [12, 10, 8],
      variations: 'Barra livre',
      video_url: 'https://www.youtube.com/watch?v=FHyZEuRpSg4', // Exemplo, idealmente um vídeo de rosca direta
      video_thumb: 'https://i.ytimg.com/vi/FHyZEuRpSg4/hq720.jpg?sqp=-oaymwEnCNAFEJQDSFryq4qpAxkIARUAAIhCGAHYAQHiAQoIGBACGAY4AUAB&rs=AOn4CLDjHtizR010lqxg5PRwjKFfrcOv4Q', // Exemplo, idealmente thumb de rosca direta
      weight: 20, // Peso ajustado para exemplo
      // 'notes' pode ser omitido se não houver anotações
      restTime: 60 // <-- ADICIONADO: Exemplo de 60 segundos de descanso
    },
      {
      id: '3',
      name: 'Agachamento',
      series: [12, 10, 8],
      variations: 'Barra livre',
      video_url: 'https://www.youtube.com/watch?v=4L5nBs8Eq7g', // Exemplo, idealmente um vídeo de rosca direta
      video_thumb: 'https://i.ytimg.com/vi/4L5nBs8Eq7g/hq720.jpg?sqp=-oaymwEnCNAFEJQDSFryq4qpAxkIARUAAIhCGAHYAQHiAQoIGBACGAY4AUAB&rs=AOn4CLD7Sb-CpjQqpc1dAHtGQlJ5nRcOHQ', // Exemplo, idealmente thumb de rosca direta
      weight: 20, // Peso ajustado para exemplo
      // 'notes' pode ser omitido se não houver anotações
      restTime: 60 // <-- ADICIONADO: Exemplo de 60 segundos de descanso
    }
  ]
  // Adicione mais treinos e exercícios conforme necessário
};

// Função para buscar exercícios mockados
export const getExercisesByTrainingId = async (trainingId: string): Promise<ExerciseLog[]> => {
  return mockExercises[trainingId] || [];
};