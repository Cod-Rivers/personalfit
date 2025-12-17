/**
 * Utility functions for handling exercise GIFs and videos
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8888';

/**
 * Constructs the full URL for a GIF based on the path from the API
 * 
 * @param gifPath - The path returned by the API (e.g., "static/gifs/nome.gif", "gifs/nome.gif", or "nome.gif")
 * @returns The complete URL to access the GIF
 * 
 * @example
 * ```typescript
 * const url = getGifUrl("static/gifs/Agachamento_Livre_HBL.gif");
 * // Returns: "http://localhost:8888/static/gifs/Agachamento_Livre_HBL.gif"
 * ```
 */
export function getGifUrl(gifPath: string): string {
  if (!gifPath) return '';

  // Se já começa com http, retorna como está
  if (gifPath.startsWith('http://') || gifPath.startsWith('https://')) {
    return gifPath;
  }

  // Se começa com "static/", usa diretamente
  if (gifPath.startsWith('static/')) {
    return `${API_BASE}/${gifPath}`;
  }

  // Se começa com "gifs/", adiciona "static/"
  if (gifPath.startsWith('gifs/')) {
    return `${API_BASE}/static/${gifPath}`;
  }

  // Se é apenas o nome do arquivo, adiciona o caminho completo
  return `${API_BASE}/static/gifs/${gifPath}`;
}

/**
 * Checks if a file is a GIF based on its path/name
 * 
 * @param path - The file path or name
 * @returns true if the file is a GIF
 */
export function isGifFile(path: string): boolean {
  if (!path) return false;
  return path.toLowerCase().includes('.gif') || path.toLowerCase().endsWith('gif');
}

/**
 * Gets the API base URL
 * 
 * @returns The configured API base URL
 */
export function getApiBaseUrl(): string {
  return API_BASE;
}

/**
 * Lists all available GIFs from the backend
 * 
 * @returns Promise with array of available GIF names
 */
export async function listAvailableGifs(): Promise<string[]> {
  try {
    const response = await fetch(`${API_BASE}/api/gifs`);
    if (!response.ok) {
      throw new Error('Failed to fetch GIF list');
    }
    const data = await response.json();
    return data.gifs || [];
  } catch (error) {
    console.error('[GifUtils] Error listing GIFs:', error);
    return [];
  }
}

/**
 * Validates if a GIF exists and is accessible
 * 
 * @param gifPath - The GIF path to validate
 * @returns Promise<boolean> indicating if the GIF is accessible
 */
export async function validateGifExists(gifPath: string): Promise<boolean> {
  try {
    const url = getGifUrl(gifPath);
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    console.error('[GifUtils] Error validating GIF:', error);
    return false;
  }
}
