import React from 'react';

/**
 * Termo do Autor da loja de treinos (Todo/PLANO_LOJA_DE_TREINOS.md, fase 2).
 *
 * AUTHOR_TERMS_VERSION precisa ficar em sincronia com
 * Personal-fit-Back/internal/domain/referralpartner/author.go
 * (AuthorTermsVersion): mudar o texto é subir a versão nos dois lados, e todo
 * autor aceita de novo no painel antes de publicar.
 *
 * O texto segue as decisões da §9 do plano. A revisão jurídica e a do
 * contador (forma de recebimento e nota fiscal) estão pendentes em
 * Todo/TAREFAS_PENDENTES.md: ajustar aqui e subir a versão.
 */
export const AUTHOR_TERMS_VERSION = 'v1';

export const AUTHOR_TERMS_UPDATED_AT = '8 de outubro de 2026';

/** O texto do termo, sem cabeçalho de página (a página pública e o modal de
 *  aceite do painel põem o título). */
export function AuthorTermsText() {
    return (
        <>
            <section>
                <h2>1. Quem pode ser autor</h2>
                <p>
                    Profissional de Educação Física com registro ativo no CREF.
                    A equipe do Venafit confere o registro na consulta pública
                    do CONFEF antes de aprovar o autor. Você se compromete a
                    manter o registro ativo e a avisar a equipe se ele for
                    suspenso ou cancelado: nesse caso, seus programas saem da
                    loja.
                </p>
            </section>

            <section>
                <h2>2. O que você publica</h2>
                <ul>
                    <li>
                        Programas de treino montados por você. Eles são
                        genéricos: não substituem uma avaliação individual, e o
                        nível, o público e os pré-requisitos da ficha precisam
                        corresponder ao treino.
                    </li>
                    <li>
                        Sem promessa de resultado (&ldquo;perca 10 kg em 30
                        dias&rdquo;), que é publicidade enganosa pelo Código de
                        Defesa do Consumidor (art. 37).
                    </li>
                    <li>
                        Sem nome, imagem ou conteúdo de outras pessoas ou marcas
                        sem autorização.
                    </li>
                </ul>
            </section>

            <section>
                <h2>3. Seus vídeos</h2>
                <ul>
                    <li>
                        Os vídeos que você envia são seus, ou você tem a
                        autorização por escrito de quem aparece neles.
                    </li>
                    <li>
                        Sem música protegida por direito autoral (o app reproduz
                        o áudio) e sem marca d&rsquo;água de outro aplicativo.
                    </li>
                    <li>
                        Você autoriza o Venafit a guardar uma cópia de cada
                        vídeo junto do programa e a exibi-la a quem comprou,
                        inclusive depois que o programa sair da loja, porque
                        quem comprou continua com o plano.
                    </li>
                </ul>
            </section>

            <section>
                <h2>4. Revisão</h2>
                <p>
                    A equipe revisa cada programa antes de ele ir à venda, e
                    cada alteração depois disso (ficha, preço, capa ou
                    conteúdo). A revisão pode recusar com um motivo, que chega
                    por e-mail. A equipe também pode pausar ou encerrar um
                    programa que descumpra este termo.
                </p>
            </section>

            <section>
                <h2>5. Preço e a sua parte</h2>
                <ul>
                    <li>
                        Você escolhe o preço numa das faixas da loja. Depois de
                        publicado, o preço muda no máximo uma vez a cada 30
                        dias.
                    </li>
                    <li>
                        A sua parte é uma porcentagem do valor líquido de cada
                        venda (o valor pago menos a taxa da Google Play ou do
                        meio de pagamento): uma porcentagem na venda pela
                        vitrine e outra, maior, quando o comprador chega pelo
                        seu link ou código. As porcentagens do seu cadastro
                        aparecem no seu painel e ficam registradas em cada
                        venda.
                    </li>
                    <li>
                        Cada valor fica 30 dias em carência e é repassado no
                        repasse mensal, a partir do valor mínimo do programa de
                        parceiros. A forma de recebimento e a documentação
                        fiscal são combinadas com a equipe antes do primeiro
                        repasse; os tributos sobre a sua parte são de sua
                        responsabilidade.
                    </li>
                </ul>
            </section>

            <section>
                <h2>6. Reembolso e estorno</h2>
                <p>
                    Quem compra pode pedir reembolso em até 7 dias (Código de
                    Defesa do Consumidor, art. 49). Reembolso ou contestação do
                    pagamento anula a sua parte daquela venda; se ela já tinha
                    sido repassada, o valor é descontado do repasse seguinte.
                </p>
            </section>

            <section>
                <h2>7. Quem comprou mantém o plano</h2>
                <p>
                    Pausar ou encerrar um programa tira ele da vitrine. Quem já
                    comprou continua com a versão que comprou, e uma versão nova
                    vale só para as compras seguintes.
                </p>
            </section>

            <section>
                <h2>8. Dados de quem compra</h2>
                <p>
                    Você não recebe nome, e-mail nem nenhum outro dado pessoal
                    de quem compra (Lei Geral de Proteção de Dados). O painel
                    mostra só as vendas, os valores e as avaliações.
                </p>
            </section>

            <section>
                <h2>9. Mudanças e saída</h2>
                <p>
                    Você pode pausar seus programas no painel a qualquer
                    momento; para sair da loja, fale com a equipe. Se este termo
                    mudar, a versão nova aparece no seu painel e precisa ser
                    aceita antes de você enviar programas ou alterações.
                </p>
            </section>
        </>
    );
}
