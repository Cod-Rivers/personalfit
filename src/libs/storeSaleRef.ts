/** O `?ref=` do link de um programa da loja, guardado para ir junto com a
 *  compra (Todo/PLANO_LOJA_DE_TREINOS.md §5.4).
 *
 *  Diferente de `acquisition.ts` (primeiro toque, gravado só no cadastro):
 *  quem já tem conta também chega pelo link de um autor, e a venda precisa
 *  saber disso. Aqui vale o ÚLTIMO link de programa aberto — quem clicou no
 *  link do autor B depois do link do autor A está comprando pela divulgação
 *  de B. Validade de 30 dias.
 *
 *  O backend só usa este código quando o comprador não tem indicação
 *  nenhuma (não passa na frente de um parceiro que já indicou), e só se for
 *  de um parceiro ativo.
 */

const STORAGE_KEY = 'venafit_store_sale_ref';
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias
const MAX_LENGTH = 40;

interface StoredSaleRef {
    ref: string;
    savedAt: number;
}

/** Guarda o código do link (sobrescreve o anterior). Silencioso. */
export function saveStoreSaleRef(
    raw: string | null | undefined,
    now = Date.now(),
): void {
    try {
        const ref = (raw ?? '').trim();
        if (!ref || ref.length > MAX_LENGTH) return;
        const payload: StoredSaleRef = { ref, savedAt: now };
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
        // Modo privado, storage bloqueado — a venda só fica sem o código.
    }
}

/** Lê o código guardado, se ainda dentro dos 30 dias. */
export function readStoreSaleRef(now = Date.now()): string | null {
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as Partial<StoredSaleRef>;
        if (!parsed.ref || typeof parsed.savedAt !== 'number') return null;
        if (now - parsed.savedAt > TTL_MS) {
            window.localStorage.removeItem(STORAGE_KEY);
            return null;
        }
        return parsed.ref;
    } catch {
        return null;
    }
}
