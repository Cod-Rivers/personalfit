'use client';
import React, { useState } from 'react';
import Header from '@/components/organism/Header';
import styles from './styles.module.css';

type Category = 'Todos' | 'Treino' | 'Nutrição' | 'Saúde' | 'Motivação' | 'Ciência';

interface Article {
    id: number;
    category: Category;
    emoji: string;
    title: string;
    summary: string;
    content: string;
    readTime: number;
    source: string;
    date: string;
    featured?: boolean;
}

const CATEGORY_COLORS: Record<string, string> = {
    Treino: '#3eb489',
    Nutrição: '#2A5BA8',
    Saúde: '#e05c74',
    Motivação: '#f39c12',
    Ciência: '#7c5ce4',
};

const ARTICLES: Article[] = [
    {
        id: 1,
        category: 'Ciência',
        emoji: '🧬',
        title: 'Treino em jejum realmente queima mais gordura?',
        summary: 'Pesquisas recentes revelam o que realmente acontece com o metabolismo durante o exercício em jejum e quando essa estratégia pode (ou não) funcionar.',
        content: `Treinar em jejum é uma das estratégias mais debatidas no mundo fitness. A ideia é que, sem glicose disponível, o corpo seria forçado a usar gordura como combustível principal.

Uma meta-análise publicada no *Journal of Functional Morphology and Kinesiology* (2024) revisou 27 estudos e concluiu que o treino em jejum de fato aumenta a oxidação de gordura durante o exercício — mas isso não se traduz automaticamente em mais perda de gordura no longo prazo.

**O que importa mais é o balanço calórico total do dia.** Se você treina em jejum mas compensa com mais calorias depois, o resultado é o mesmo. No entanto, para atletas de resistência, o jejum pode melhorar a eficiência no uso de substratos energéticos.

**Conclusão prática:** Se você se sente bem treinando em jejum e mantém a intensidade, pode ser uma boa estratégia. Mas não é uma "chave mágica" para queimar gordura.`,
        readTime: 4,
        source: 'Journal of Functional Morphology',
        date: '05 Abr 2026',
        featured: true,
    },
    {
        id: 2,
        category: 'Treino',
        emoji: '💪',
        title: 'Quantos sets por semana você realmente precisa para hipertrofia?',
        summary: 'O volume de treino ideal para ganho muscular ainda gera debate. Veja o que a ciência diz sobre o mínimo eficaz e o máximo recuperável.',
        content: `A pergunta clássica de todo praticante: mais series = mais músculo?

Estudos de Brad Schoenfeld e outros pesquisadores mostram que a relação entre volume e hipertrofia é de uma curva em U invertido. Há um volume mínimo eficaz (MEV), um volume máximo adaptável (MAV) e um ponto máximo recuperável (MRV).

**Para a maioria dos praticantes intermediários:**
- MEV: 10–12 sets/músculo/semana
- MAV: 15–20 sets/músculo/semana  
- MRV: 20–25 sets/músculo/semana (varia muito por indivíduo)

**Dica prática:** Inicie com 10 sets por grupo muscular por semana e aumente progressivamente. Monitore sinais de overtraining: queda de força, sono ruim e irritabilidade são alertas para reduzir o volume.`,
        readTime: 3,
        source: 'Sports Medicine',
        date: '04 Abr 2026',
    },
    {
        id: 3,
        category: 'Nutrição',
        emoji: '🥗',
        title: 'Proteína vegetal é tão eficaz quanto a animal para ganhos musculares?',
        summary: 'Com o crescimento das dietas plant-based, entender a qualidade proteica de fontes vegetais se tornou essencial para atletas.',
        content: `A proteína animal historicamente foi considerada superior para hipertrofia por seu perfil completo de aminoácidos e alto teor de leucina. Mas a ciência está revisando esse quadro.

Um estudo publicado no *American Journal of Clinical Nutrition* (2023) acompanhou 40 praticantes divididos em grupos com proteína animal e vegetal, igualando total proteico em 1,6g/kg/dia. Após 12 semanas, ambos os grupos tiveram ganhos musculares estatisticamente similares.

**Chave para funcionar com proteína vegetal:**
- Combinar fontes (arroz + feijão, por exemplo) para completar aminoácidos
- Ingerir quantidade ligeiramente maior (10–20% a mais) para compensar menor digestibilidade
- Incluir proteína de soja e ervilha, que têm melhor perfil de aminoácidos

**Bottom line:** Com planejamento adequado, dietas plant-based suportam hipertrofia eficientemente.`,
        readTime: 5,
        source: 'Am. Journal of Clinical Nutrition',
        date: '03 Abr 2026',
    },
    {
        id: 4,
        category: 'Saúde',
        emoji: '❤️',
        title: 'Exercício e saúde cardiovascular: quanto é suficiente?',
        summary: 'A OMS revisou suas diretrizes. Descubra o mínimo semanal de atividade física para proteger seu coração.',
        content: `As diretrizes da OMS recomendam pelo menos 150–300 minutos de atividade aeróbica moderada por semana, ou 75–150 minutos de atividade vigorosa.

Uma pesquisa do *European Heart Journal* (2024) com mais de 90.000 participantes revelou que atingir apenas 50% dessas metas já reduz o risco cardiovascular em 20%. Além disso, o treino de força 2x/semana adiciona proteção extra independente do cardio.

**Destaques do estudo:**
- Caminhar 30 min/dia já oferece benefícios significativos
- Qualquer atividade é melhor que nenhuma
- Treino de força reduz pressão arterial e melhora lipídios
- Exercícios de alta intensidade (HIIT) têm efeito equivalente em menos tempo

**Mensagem principal:** Não espere ter tempo "perfeito" para treinar. Consistência supera perfeição.`,
        readTime: 4,
        source: 'European Heart Journal',
        date: '02 Abr 2026',
    },
    {
        id: 5,
        category: 'Motivação',
        emoji: '🔥',
        title: '5 estratégias psicológicas usadas por atletas de elite para manter consistência',
        summary: 'A diferença entre amadores e atletas de alto rendimento não é só física — é mental. Veja as técnicas que realmente funcionam.',
        content: `A psicologia do esporte tem acumulado evidências sobre o que separa atletas consistentes dos que abandonam treinos. Aqui estão as 5 estratégias mais respaldadas pela ciência:

**1. Implementação de intenções ("Se-então")**
Em vez de "vou treinar mais", defina: "Se for segunda-feira às 18h, então vou à academia". Estudos mostram aumento de 91% na taxa de execução.

**2. Identidade, não metas**
Substitua "quero perder 5kg" por "sou uma pessoa que cuida do corpo". A identidade molda comportamento de forma mais duradoura.

**3. Celebrar pequenas vitórias**
O sistema dopaminérgico responde a progressos imediatos. Registre treinos, pesos e medidas — ver evolução alimenta a motivação.

**4. Ambiente antes de força de vontade**
Deixe a roupa de treino separada, gym bag pronta. Reduzir o atrito para começar é mais eficaz que tentar aumentar motivação.

**5. Accountability partner**
Ter alguém para reportar seus treinos aumenta a adesão em até 65% segundo estudos da American Society of Training.`,
        readTime: 6,
        source: 'Journal of Sport Psychology',
        date: '01 Abr 2026',
    },
    {
        id: 6,
        category: 'Ciência',
        emoji: '😴',
        title: 'Sono e hipertrofia: a janela anabólica que você está ignorando',
        summary: 'Estudos indicam que dormir mal pode zerar até 60% dos seus ganhos musculares, mesmo com treino e dieta perfeitos.',
        content: `O sono é frequentemente chamado de "a janela anabólica mais importante", e com razão.

Durante o sono profundo (fase N3), o organismo libera ~70% do GH (hormônio do crescimento) diário. Essa liberação é fundamental para síntese proteica muscular, queima de gordura e recuperação tecidual.

**O que a privação faz:**
- Reduz síntese proteica em até 18%
- Aumenta cortisol (hormônio catabólico) em 21%
- Diminui testosterona livre em 10–15%
- Prejudica resistência à insulina em músculos

**Recomendações práticas:**
- 7–9 horas por noite são o alvo para praticantes de musculação
- Mantenha horário regular de sono (mesmo fins de semana)
- Evite cafeína após 14h
- Temperatura do quarto entre 18–20°C melhora qualidade do sono`,
        readTime: 4,
        source: 'Sleep Medicine Reviews',
        date: '31 Mar 2026',
    },
    {
        id: 7,
        category: 'Nutrição',
        emoji: '⚡',
        title: 'Creatina: o que a ciência diz em 2026',
        summary: 'O suplemento mais estudado do mundo segue surpreendendo. Novas pesquisas mostram benefícios além da performance muscular.',
        content: `A creatina monoidratada continua sendo o suplemento com mais evidências científicas para performance esportiva. Mas pesquisas recentes revelam benefícios além da musculação.

**Benefícios confirmados:**
- Aumento de força e potência muscular (8–14%)
- Maior volume de treino sustentável
- Recuperação acelerada entre sets e entre sessões

**Novidades (2024–2026):**
- Estudos indicam benefícios cognitivos, especialmente em situações de estresse mental e privação de sono
- Pode mitigar perda muscular associada ao envelhecimento (sarcopenia)
- Pesquisas preliminares sugerem efeito neuroprotetor em esportes de contato

**Dosagem prática:**
- 3–5g/dia, sem necessidade de fase de saturação 
- Pode ser tomada a qualquer hora
- Não é necessário ciclar

**Contra-indicações:** Disfunção renal pré-existente — nesse caso consulte médico.`,
        readTime: 5,
        source: 'Journal of the International Society of Sports Nutrition',
        date: '29 Mar 2026',
    },
    {
        id: 8,
        category: 'Treino',
        emoji: '🏃',
        title: 'Cardio antes ou depois da musculação? A resposta definitiva',
        summary: 'A sequência do treino impacta resultados? Pesquisas recentes trazem dados surpreendentes sobre o efeito interferência.',
        content: `O chamado "efeito interferência" sugere que combinar treino aeróbico e de força no mesmo dia pode comprometer adaptações — mas a realidade é mais nuançada.

**O que as pesquisas mostram:**
- Para hipertrofia como objetivo principal: musculação ANTES do cardio
- Para resistência aeróbica como objetivo: cardio ANTES da musculação
- Para saúde geral e manutenção: a ordem importa pouco

**Se cardio e musculação são no mesmo dia:**
- Separe por pelo menos 6 horas quando possível
- Se não for possível, faça musculação primeiro
- Prefira cardio de baixa intensidade (caminhada, bicicleta leve) após musculação

**Situação ideal:** Treinos em dias alternados. Isso maximiza adaptações para ambos os tipos de treino e otimiza recuperação.`,
        readTime: 3,
        source: 'Strength & Conditioning Research',
        date: '28 Mar 2026',
    },
];

const CATEGORIES: Category[] = ['Todos', 'Treino', 'Nutrição', 'Saúde', 'Motivação', 'Ciência'];

const CURIOSITY = {
    emoji: '🤔',
    text: 'Você sabia? Músculo não é mais pesado que gordura — 1kg de músculo pesa exatamente igual a 1kg de gordura. A diferença é que o músculo ocupa muito menos volume, por isso corpos musculosos parecem mais "secos" mesmo no mesmo peso.',
};

function timeAgo(dateStr: string): string {
    return dateStr;
}

export default function NoticiasPage() {
    const [selectedCategory, setSelectedCategory] = useState<Category>('Todos');
    const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const filtered = ARTICLES.filter((a) => {
        const matchCat = selectedCategory === 'Todos' || a.category === selectedCategory;
        const matchSearch =
            searchQuery.trim() === '' ||
            a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            a.summary.toLowerCase().includes(searchQuery.toLowerCase());
        return matchCat && matchSearch;
    });

    const featuredArticle = ARTICLES.find((a) => a.featured);

    if (selectedArticle) {
        return (
            <div className={styles.detailContainer}>
                <Header />
                <button className={styles.backBtn} onClick={() => setSelectedArticle(null)}>
                    <i className="fa-solid fa-arrow-left"></i> Voltar
                </button>

                <div className={styles.detailHeader}>
                    <span
                        className={styles.detailCategory}
                        style={{ backgroundColor: CATEGORY_COLORS[selectedArticle.category] }}
                    >
                        {selectedArticle.category}
                    </span>
                    <div className={styles.detailEmoji}>{selectedArticle.emoji}</div>
                    <h1 className={styles.detailTitle}>{selectedArticle.title}</h1>
                    <div className={styles.detailMeta}>
                        <span>
                            <i className="fa-regular fa-clock"></i> {selectedArticle.readTime} min de leitura
                        </span>
                        <span>
                            <i className="fa-regular fa-calendar"></i> {selectedArticle.date}
                        </span>
                        <span>
                            <i className="fa-solid fa-book-open"></i> {selectedArticle.source}
                        </span>
                    </div>
                </div>

                <div className={styles.detailBody}>
                    {selectedArticle.content.split('\n\n').map((paragraph, i) => {
                        if (paragraph.startsWith('**') && paragraph.endsWith('**') && !paragraph.includes('\n')) {
                            return (
                                <p key={i} className={styles.detailBold}>
                                    {paragraph.replace(/\*\*/g, '')}
                                </p>
                            );
                        }
                        const rendered = paragraph
                            .split(/(\*\*[^*]+\*\*)/g)
                            .map((chunk, j) =>
                                chunk.startsWith('**') ? (
                                    <strong key={j}>{chunk.replace(/\*\*/g, '')}</strong>
                                ) : (
                                    chunk
                                )
                            );
                        return (
                            <p key={i} className={styles.detailParagraph}>
                                {rendered}
                            </p>
                        );
                    })}
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <Header />

            <div className={styles.pageHeader}>
                <h1 className={styles.pageTitle}>
                    <i className="fa-solid fa-newspaper"></i> Notícias & Curiosidades
                </h1>
                <p className={styles.pageSubtitle}>Fique por dentro do mundo fitness com ciência</p>
            </div>

            {/* Curiosidade do dia */}
            <div className={styles.curiosityCard}>
                <div className={styles.curiosityLabel}>
                    <i className="fa-solid fa-lightbulb"></i> Curiosidade do dia
                </div>
                <p className={styles.curiosityText}>
                    {CURIOSITY.emoji} {CURIOSITY.text}
                </p>
            </div>

            {/* Search */}
            <div className={styles.searchWrapper}>
                <i className={`fa-solid fa-magnifying-glass ${styles.searchIcon}`}></i>
                <input
                    className={styles.searchInput}
                    type="text"
                    placeholder="Buscar artigos..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                    <button className={styles.searchClear} onClick={() => setSearchQuery('')}>
                        <i className="fa-solid fa-xmark"></i>
                    </button>
                )}
            </div>

            {/* Category chips */}
            <div className={styles.categoryFilter}>
                {CATEGORIES.map((cat) => (
                    <button
                        key={cat}
                        className={`${styles.catChip} ${selectedCategory === cat ? styles.catChipActive : ''}`}
                        style={
                            selectedCategory === cat && cat !== 'Todos'
                                ? { backgroundColor: CATEGORY_COLORS[cat], borderColor: CATEGORY_COLORS[cat] }
                                : {}
                        }
                        onClick={() => setSelectedCategory(cat)}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* Featured article */}
            {selectedCategory === 'Todos' && !searchQuery && featuredArticle && (
                <button className={styles.featuredCard} onClick={() => setSelectedArticle(featuredArticle)}>
                    <div className={styles.featuredTag}>
                        <i className="fa-solid fa-star"></i> Destaque
                    </div>
                    <div className={styles.featuredEmoji}>{featuredArticle.emoji}</div>
                    <span
                        className={styles.featuredCategory}
                        style={{ backgroundColor: CATEGORY_COLORS[featuredArticle.category] }}
                    >
                        {featuredArticle.category}
                    </span>
                    <h2 className={styles.featuredTitle}>{featuredArticle.title}</h2>
                    <p className={styles.featuredSummary}>{featuredArticle.summary}</p>
                    <div className={styles.featuredMeta}>
                        <span>
                            <i className="fa-regular fa-clock"></i> {featuredArticle.readTime} min
                        </span>
                        <span>{featuredArticle.date}</span>
                    </div>
                </button>
            )}

            {/* Article list */}
            <div className={styles.articleList}>
                {filtered.length === 0 ? (
                    <div className={styles.emptyState}>
                        <i className="fa-solid fa-search"></i>
                        <p>Nenhum artigo encontrado</p>
                    </div>
                ) : (
                    filtered
                        .filter((a) => !(selectedCategory === 'Todos' && !searchQuery && a.featured))
                        .map((article) => (
                            <button
                                key={article.id}
                                className={styles.articleCard}
                                onClick={() => setSelectedArticle(article)}
                            >
                                <div className={styles.articleLeft}>
                                    <div className={styles.articleEmoji}>{article.emoji}</div>
                                </div>
                                <div className={styles.articleRight}>
                                    <span
                                        className={styles.articleCategory}
                                        style={{ color: CATEGORY_COLORS[article.category] }}
                                    >
                                        {article.category}
                                    </span>
                                    <h3 className={styles.articleTitle}>{article.title}</h3>
                                    <p className={styles.articleSummary}>{article.summary}</p>
                                    <div className={styles.articleMeta}>
                                        <span>
                                            <i className="fa-regular fa-clock"></i> {article.readTime} min
                                        </span>
                                        <span>{article.date}</span>
                                    </div>
                                </div>
                            </button>
                        ))
                )}
            </div>
        </div>
    );
}
