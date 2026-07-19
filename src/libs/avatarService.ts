import { Api } from '@/libs/api';


/** Faz upload de uma foto de perfil como data URI base64.
 *  @param dataURI - string no formato "data:image/jpeg;base64,..."
 *  @returns a data URI salva no servidor
 */
export async function uploadAvatar(dataURI: string): Promise<string> {
    const res = await Api.patch<{ avatar: string }>(
        '/me/avatar',
        { avatar: dataURI },
    );
    return res.data.avatar;
}

/** Converte um File em data URI base64. */
export function fileToDataURI(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}
