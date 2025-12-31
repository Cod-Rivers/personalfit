/**
 * Mapeamento de exercícios de dor para os GIFs corretos
 * Converte referências antigas (MP4) para os nomes corretos dos GIFs
 */

const exerciseGifMap: Record<string, string> = {
    // Alongamentos
    'along-dorsal-espaldar': 'Alongamento_Dorsal_Espaldar.gif',
    'along-rotadores-internos': 'Alongamento_de_Rotadores_Internos.gif',
    'alongamento-rotadores-internos': 'Alongamento_Rotadores_Internos_De_Ombros.gif',
    'along-quadrado-lombar': 'Alongamento_Quadrado_Lombar_Espaldar.gif',
    'alongamento-quadrado-lombar-solo': 'Alongamento_Quadrado_Lombar_Solo.gif',
    'along-peitoral-espaldar': 'Alongamento_Peitoral_Braco_Estendido.gif',
    'alongamento-peitoral-flexionado': 'Alongamento_Peitoral_Braco_Flexionado.gif',
    'along-posterior-espaldar': 'Alongamento_Posterior_Espaldar.gif',
    'alongamento-posterior-solo': 'Alongamento_Posterior_Uni_solo.gif',
    'along-adutores': 'Alongamento_Adutores.gif',
    'alongamento-flexores-quadril': 'Alongamento_Flexaores_de_Quadril.gif',
    'along-flexores-quadril-espaldar': 'Alongamento_Flexaores_Quadril_Espaldar.gif',
    'along-gluteo-espaldar': 'Alongamento_Gluteo_Espaldar.gif',
    'alongamento-gluteo-solo': 'Alongamento_Gluteo_Solo.gif',
    
    // Rotações
    'rot-externa-ombro-rs': 'Rotagdo_Externa_Ombro_PS_c_Band.gif',
    'rot-externa-ombro': 'Rotagdo_Externa_Ombro_PS_c_Band.gif',
    'rot-completa-ombros': 'Rotacao_Completa_Ombros_c_Elastico.gif',
    'rotacao-completa-ombros': 'Rotacao_Completa_Ombros_c_Elastico.gif',
    'rotacao-punho': 'Rotacao_Punho_HBC.gif',
    
    // Mobilidade
    'mobilidade-4-apoios': 'Mobilidade_4_apoios_C_Rotacao_Tronco.gif',
    'mobilidade-9090': 'Mobilidade_9090.gif',
    'mobilidade-gato-camelo': 'Mobilidade_Gato-camelo.gif',
    'mobilidade-quadril-frontal': 'Mobilidade_Quadril_Frontal.gif',
    'mobilidade-quadril-sagital': 'Mobilidade_Quadril_Sagital.gif',
    
    // Pranchas
    'prancha-dv-solo': 'Prancha_DV_Solo.gif',
    'prancha-dl-braco-estendido': 'Prancha_DL_Braco_Estendido.gif',
    'prancha-dl-braco-flexionado': 'Prancha_DL_Braco_Flexionado.gif',
    'prancha-lateral-rotacao': 'Prancha_Lateral_c_Rotagdo_de_Tronco.gif',
    'prancha-dinamica-locomotiva': 'Prancha_Dinamica_Locomotiva.gif',
    'prancha-tocando-ombros': 'Prancha_Tocando_Ombros.gif',
    
    // Superman e Perdigueiro
    'superman-dinamico': 'Superman_Dinamico.gif',
    'superman-estatico': 'Superman_Estatico.gif',
    'perdigueiro-dinamico': 'Perdigueiro_Dinamico.gif',
    'perdigueiro-estatico': 'Perdigueiro_Estatico.gif',
    
    // Escalador
    'escalador-solo': 'Escalador_Solo.gif',
    
    // Face Pull
    'facepull-corda': 'Facepull_Corda_Cross.gif',
    'face-pull': 'Facepull_Corda_Cross.gif',
};

/**
 * Converte uma referência de vídeo MP4 para o GIF correto
 * 
 * @param videoUrl - URL do vídeo retornada pelo backend
 * @returns Caminho correto do GIF
 * 
 * @example
 * ```typescript
 * mapExerciseGif('/videos/along-dorsal-espaldar.mp4')
 * // Returns: 'static/gifs/Alongamento_Dorsal_Espaldar.gif'
 * 
 * mapExerciseGif('rot-completa-ombros.mp4')
 * // Returns: 'static/gifs/Rotacao_Completa_Ombros_c_Elastico.gif'
 * ```
 */
export function mapExerciseGif(videoUrl: string): string {
    if (!videoUrl) return '';
    
    // Se já é um GIF válido, retorna como está
    if (videoUrl.toLowerCase().endsWith('.gif')) {
        return videoUrl;
    }
    
    // Remove extensão .mp4 e /videos/ do caminho
    let cleanName = videoUrl
        .replace(/\.mp4$/i, '')
        .replace(/^\/videos\//, '')
        .replace(/^videos\//, '')
        .replace(/^static\/gifs\//, '')
        .toLowerCase()
        .trim();
    
    // Busca no mapeamento
    const mappedGif = exerciseGifMap[cleanName];
    
    if (mappedGif) {
        return `static/gifs/${mappedGif}`;
    }
    
    // Se não encontrar, tenta normalizar o nome
    // Converte hífens para underscores e capitaliza
    const normalized = cleanName
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join('_') + '.gif';
    
    console.warn(`[mapExerciseGif] Mapeamento não encontrado para: ${videoUrl}`);
    console.warn(`[mapExerciseGif] Tentando nome normalizado: ${normalized}`);
    
    return `static/gifs/${normalized}`;
}

/**
 * Normaliza um exercício de dor, convertendo a URL do vídeo para GIF
 * 
 * @param exercise - Exercício individual
 * @returns Exercício com video_url corrigida
 */
export function normalizeExerciseGif<T extends { video_url?: string }>(exercise: T): T {
    if (exercise.video_url) {
        return {
            ...exercise,
            video_url: mapExerciseGif(exercise.video_url)
        };
    }
    return exercise;
}
