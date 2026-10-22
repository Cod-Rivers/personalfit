/**
 * Termo de autorização do mural de resultados, versão 2026-10-15
 * (RESULT_TERMS_VERSION ↔ results.TermsVersion no backend). Mudar o texto
 * exige mudar a versão nos dois lados: o aceite guarda a versão.
 *
 * Texto preparado pela equipe técnica, AINDA SEM revisão jurídica
 * (Todo/PLANO_MURAL_DE_RESULTADOS.md §7, fase 0).
 */
import s from './results.module.css';

export default function ResultTerms() {
    return (
        <div className={s.terms} tabIndex={0} aria-label="Termo de autorização de uso de imagem e dados">
            <h4>Termo de autorização de uso de imagem e dados — mural de resultados</h4>
            <p>
                Ao publicar, você autoriza a Venafit a exibir, de graça e por tempo
                indeterminado, as duas fotos que escolheu (o recorte que você fez) e as
                informações que marcou, nos lugares abaixo. Você pode desfazer isso a
                qualquer momento.
            </p>
            <h4>O que aparece</h4>
            <ul>
                <li>As fotos de antes e depois, recortadas por você. A área que você marcar para esconder sai coberta.</li>
                <li>Seu primeiro nome, só se você escolher; senão, “Aluno(a) Venafit”.</li>
                <li>As semanas entre as fotos, o objetivo e o texto que você escrever.</li>
                <li>Peso, % de gordura e medidas, só os que você marcar. A Venafit calcula as diferenças a partir da sua Evolução.</li>
                <li>Quantos treinos você registrou no período e, se for o caso, o programa da loja que você fazia.</li>
            </ul>
            <h4>Onde aparece</h4>
            <ul>
                <li><strong>Mural de resultados</strong> (obrigatório para publicar): página pública, aberta a qualquer pessoa, com ou sem conta no app.</li>
                <li><strong>Página do programa da loja</strong> (opcional): como exemplo de resultado de quem fez o programa.</li>
                <li><strong>Divulgação do autor do programa</strong> (opcional): o profissional que criou o programa pode mostrar seu resultado nas redes dele, sem mudar o que você escolheu mostrar.</li>
            </ul>
            <h4>Dados sensíveis</h4>
            <p>
                Fotos do corpo, peso e medidas são dados de saúde (art. 11 da LGPD). Você
                os está tornando públicos por vontade própria, só com o que marcou. A
                página de cada resultado não é enviada ao Google para indexação.
            </p>
            <h4>Revisão e regras</h4>
            <ul>
                <li>Nada fica público antes da revisão da equipe Venafit.</li>
                <li>Use roupa de treino ou de banho. Não são aceitas nudez, poses sensuais, fotos de outra pessoa ou de menores de 18 anos.</li>
                <li>Qualquer pessoa pode denunciar uma publicação. A publicação denunciada sai do ar até a revisão.</li>
            </ul>
            <h4>Como desfazer</h4>
            <p>
                Em Evolução → Resultados você apaga a publicação ou tira autorizações
                quando quiser, sem precisar de revisão. A publicação sai do ar na hora. Apagar a
                foto da Evolução ou excluir sua conta também apaga a publicação.
            </p>
            <p>
                Atenção: a Venafit tira do ar o que ela mesma exibe, mas não consegue apagar
                cópias que outras pessoas já tenham salvado ou compartilhado enquanto a
                publicação estava no ar.
            </p>
            <h4>Sem pagamento</h4>
            <p>
                A autorização é gratuita. A Venafit não paga e não dá prêmio por
                publicação. Os resultados são individuais e não são promessa de
                resultado para outras pessoas.
            </p>
        </div>
    );
}
