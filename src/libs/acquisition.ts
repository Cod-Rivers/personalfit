/** Atribuição de "primeiro toque": de onde veio a pessoa que chegou no site,
 *  ANTES de ela se cadastrar.
 *
 *  Fluxo: alguém clica num link com `?ref=CODIGO` (card de conquista, post,
 *  link de afiliado, campanha paga) → cai numa página qualquer do site →
 *  este valor é guardado no navegador → sobrevive à navegação até o
 *  `/cadastro` → vai junto no POST /users como `ref` (ver
 *  commands.RegisterUser.Ref no backend) → vira `user.AcquisitionRef`.
 *
 *  Separado de `indicationReceiver` (app/pagamento), a resposta do checkout.
 *  No relatório de parcerias (backend: referralpartner.ResolveAttribution) a
 *  resposta do checkout vence; este ref só atribui a venda quando a pessoa
 *  não respondeu (o aluno não passa por esse passo) E o valor é o código de
 *  um parceiro cadastrado. No checkout, ele pré-marca o parceiro.
 *
 *  No app, quem instala pela Play Store com `&referrer=ref%3DCODIGO` recebe
 *  o mesmo valor neste storage, gravado pelo app (InstallReferrer.kt).
 *
 *  Primeiro toque, não último: se a pessoa passar por dois links diferentes
 *  antes de se cadastrar, vale o primeiro (o valor já salvo não é
 *  sobrescrito). É o link de quem trouxe ela originalmente, não o último
 *  lembrete.
 */

const STORAGE_KEY = 'venafit_acquisition_ref';
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias

interface StoredRef {
    ref: string;
    savedAt: number;
}

/** Chama-se em toda navegação (ver AcquisitionCapture). Silencioso: nunca
 *  deve quebrar o carregamento da página por causa disto. */
export function captureAcquisitionRef(search: string): void {
    try {
        const ref = new URLSearchParams(search).get('ref');
        if (!ref) return;

        // Guardado como veio: nem todo ref é código de parceiro ("share_card"
        // é canal). Quem compara com o parceiro normaliza os dois lados
        // (normalizeReferralCode aqui, NormalizeCode no backend).
        const trimmed = ref.trim().slice(0, 60);
        if (!trimmed) return;

        // Já existe um primeiro toque salvo e ainda válido: não sobrescreve.
        if (readAcquisitionRef()) return;

        const payload: StoredRef = { ref: trimmed, savedAt: Date.now() };
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
        // Modo privado, storage bloqueado, etc. — sem atribuição, sem crash.
    }
}

/** Lê o ref salvo, se ainda dentro da validade de 30 dias. Usado no envio do
 *  cadastro (SignUp) e pode ser reusado no futuro por outros formulários de
 *  entrada (ex.: pré-cadastro aceito pelo próprio aluno). */
export function readAcquisitionRef(): string | null {
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;

        const parsed = JSON.parse(raw) as Partial<StoredRef>;
        if (!parsed.ref || !parsed.savedAt) return null;

        if (Date.now() - parsed.savedAt > TTL_MS) {
            window.localStorage.removeItem(STORAGE_KEY);
            return null;
        }

        return parsed.ref;
    } catch {
        return null;
    }
}
