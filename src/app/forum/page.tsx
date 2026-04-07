'use client';

import React, { useState, useEffect } from 'react';
import Header from '@/components/organism/Header';
import styles from './styles.module.css';

interface Reply {
    id: string;
    authorName: string;
    authorInitials: string;
    avatarColor: string;
    content: string;
    timestamp: Date;
    likes: number;
    likedByMe: boolean;
}

interface Thread {
    id: string;
    category: Category;
    title: string;
    authorName: string;
    authorInitials: string;
    avatarColor: string;
    content: string;
    timestamp: Date;
    replies: Reply[];
    views: number;
    pinned?: boolean;
}

type Category = 'Treino' | 'Nutrição' | 'Motivação' | 'Dúvidas' | 'Geral';

const CATEGORIES: Category[] = ['Treino', 'Nutrição', 'Motivação', 'Dúvidas', 'Geral'];

const CATEGORY_COLORS: Record<Category, string> = {
    'Treino': '#3eb489',
    'Nutrição': '#2A5BA8',
    'Motivação': '#e05c74',
    'Dúvidas': '#7c5ce4',
    'Geral': '#f39c12',
};

const MOCK_THREADS: Thread[] = [
    {
        id: '1',
        category: 'Treino',
        title: 'Qual a melhor divisão de treino para hipertrofia?',
        authorName: 'Carlos Mendes',
        authorInitials: 'CM',
        avatarColor: '#1B3F7A',
        content: 'Pessoal, estou em dúvida entre ABC e ABCDE. Quem tem experiência com as duas e pode me ajudar a decidir? Treino há 1 ano e estou estagnado.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
        views: 48,
        pinned: true,
        replies: [
            {
                id: 'r1',
                authorName: 'Fernanda Lima',
                authorInitials: 'FL',
                avatarColor: '#e05c74',
                content: 'Para quem treina há 1 ano, ABCDE pode ser excelente! Permite mais volume por grupo muscular. Mas certifique-se que consegue ir 5x por semana de forma consistente.',
                timestamp: new Date(Date.now() - 1000 * 60 * 90),
                likes: 7,
                likedByMe: false,
            },
            {
                id: 'r2',
                authorName: 'Rafael Costa',
                authorInitials: 'RC',
                avatarColor: '#7c5ce4',
                content: 'Concordo com a Fernanda. Mas se a frequência for irregular, o ABC é mais seguro. O que importa mesmo é a progressão de carga semana a semana.',
                timestamp: new Date(Date.now() - 1000 * 60 * 45),
                likes: 4,
                likedByMe: true,
            },
        ],
    },
    {
        id: '2',
        category: 'Nutrição',
        title: 'Quanto de proteína devo consumir por dia?',
        authorName: 'Ana Paula',
        authorInitials: 'AP',
        avatarColor: '#e05c74',
        content: 'Vi muita informação conflitante na internet. Alguns dizem 1g/kg, outros 2g/kg. O que vocês seguem no dia a dia?',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5),
        views: 112,
        replies: [
            {
                id: 'r3',
                authorName: 'Juliana Reis',
                authorInitials: 'JR',
                avatarColor: '#16a085',
                content: 'A literatura científica atual aponta para 1.6 a 2.2g por kg de peso corporal para praticantes de musculação. Eu sigo 2g/kg e os resultados são ótimos!',
                timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4),
                likes: 12,
                likedByMe: false,
            },
        ],
    },
    {
        id: '3',
        category: 'Motivação',
        title: '6 meses de protocolo — minha transformação',
        authorName: 'Juliana Reis',
        authorInitials: 'JR',
        avatarColor: '#16a085',
        content: 'Quando comecei não conseguia fazer nem 5 flexões. Hoje bato 3 séries de 20 sem dificuldade. Perdi 8kg, ganhei disposição e autoestima. Não desistam! Cada treino conta, mesmo os dias difíceis.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
        views: 230,
        pinned: true,
        replies: [],
    },
    {
        id: '4',
        category: 'Dúvidas',
        title: 'Treinar com dor muscular residual é OK?',
        authorName: 'Pedro Souza',
        authorInitials: 'PS',
        avatarColor: '#7c5ce4',
        content: 'Sempre fico na dúvida quando acordo com a musculatura dolorida do treino anterior. Devo esperar passar ou posso treinar normalmente?',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 10),
        views: 67,
        replies: [
            {
                id: 'r4',
                authorName: 'Carlos Mendes',
                authorInitials: 'CM',
                avatarColor: '#1B3F7A',
                content: 'Depende da intensidade da dor. Dor leve (DOMS) é normal e pode treinar. Dor forte ou articular, melhor descansar. Não confunda musculação com sofrimento!',
                timestamp: new Date(Date.now() - 1000 * 60 * 60 * 8),
                likes: 9,
                likedByMe: false,
            },
        ],
    },
    {
        id: '5',
        category: 'Geral',
        title: 'Dicas para manter a consistência nos dias preguiçosos',
        authorName: 'Rafael Costa',
        authorInitials: 'RC',
        avatarColor: '#7c5ce4',
        content: 'Compartilha aqui o que faz você ir treinar mesmo sem vontade. Pra mim funciona deixar a roupa de treino pronta na noite anterior e colocar música animada assim que acordo.',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 36),
        views: 95,
        replies: [],
    },
];

function timeAgo(date: Date): string {
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diff < 60) return `${diff}s atrás`;
    if (diff < 3600) return `${Math.floor(diff / 60)}min atrás`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`;
    return `${Math.floor(diff / 86400)}d atrás`;
}

function getInitials(name: string): string {
    return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
}

export default function ForumPage() {
    const [threads, setThreads] = useState<Thread[]>(MOCK_THREADS);
    const [activeCategory, setActiveCategory] = useState<Category | 'Todos'>('Todos');
    const [openThread, setOpenThread] = useState<string | null>(null);
    const [replyInputs, setReplyInputs] = useState<Record<string, string>>({});
    const [showNewThread, setShowNewThread] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newContent, setNewContent] = useState('');
    const [newCategory, setNewCategory] = useState<Category>('Geral');
    const [currentUser, setCurrentUser] = useState({ name: 'Você', id: 'me' });

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const raw = localStorage.getItem('user');
        if (raw) {
            const u = JSON.parse(raw);
            setCurrentUser({ name: u.name || 'Você', id: u.id || 'me' });
        }
    }, []);

    const myInitials = getInitials(currentUser.name);

    const filteredThreads = (activeCategory === 'Todos'
        ? threads
        : threads.filter((t) => t.category === activeCategory)
    ).sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return b.timestamp.getTime() - a.timestamp.getTime();
    });

    const handleOpenThread = (id: string) => {
        setOpenThread(id);
        setThreads((prev) =>
            prev.map((t) => (t.id === id ? { ...t, views: t.views + 1 } : t)),
        );
    };

    const handleReply = (threadId: string) => {
        const content = (replyInputs[threadId] || '').trim();
        if (!content) return;
        const reply: Reply = {
            id: Date.now().toString(),
            authorName: currentUser.name,
            authorInitials: myInitials,
            avatarColor: '#3eb489',
            content,
            timestamp: new Date(),
            likes: 0,
            likedByMe: false,
        };
        setThreads((prev) =>
            prev.map((t) =>
                t.id === threadId ? { ...t, replies: [...t.replies, reply] } : t,
            ),
        );
        setReplyInputs((prev) => ({ ...prev, [threadId]: '' }));
    };

    const handleLikeReply = (threadId: string, replyId: string) => {
        setThreads((prev) =>
            prev.map((t) =>
                t.id === threadId
                    ? {
                          ...t,
                          replies: t.replies.map((r) =>
                              r.id === replyId
                                  ? {
                                        ...r,
                                        likedByMe: !r.likedByMe,
                                        likes: r.likedByMe ? r.likes - 1 : r.likes + 1,
                                    }
                                  : r,
                          ),
                      }
                    : t,
            ),
        );
    };

    const handleCreateThread = () => {
        if (!newTitle.trim() || !newContent.trim()) return;
        const thread: Thread = {
            id: Date.now().toString(),
            category: newCategory,
            title: newTitle.trim(),
            authorName: currentUser.name,
            authorInitials: myInitials,
            avatarColor: '#3eb489',
            content: newContent.trim(),
            timestamp: new Date(),
            views: 0,
            replies: [],
        };
        setThreads([thread, ...threads]);
        setNewTitle('');
        setNewContent('');
        setNewCategory('Geral');
        setShowNewThread(false);
    };

    const activeThread = threads.find((t) => t.id === openThread);

    // ── Thread detail view ──
    if (activeThread) {
        return (
            <>
                <Header />
                <div className={styles.container}>
                    <button className={styles.backBtn} onClick={() => setOpenThread(null)}>
                        <i className="fa-solid fa-arrow-left"></i> Voltar ao fórum
                    </button>

                    <div className={styles.threadDetail}>
                        <div className={styles.categoryTag} style={{ backgroundColor: CATEGORY_COLORS[activeThread.category] }}>
                            {activeThread.category}
                        </div>
                        {activeThread.pinned && (
                            <span className={styles.pinnedBadge}>
                                <i className="fa-solid fa-thumbtack"></i> Fixado
                            </span>
                        )}
                        <h2 className={styles.threadTitle}>{activeThread.title}</h2>
                        <div className={styles.threadMeta}>
                            <div className={styles.avatar} style={{ backgroundColor: activeThread.avatarColor }}>
                                {activeThread.authorInitials}
                            </div>
                            <div>
                                <p className={styles.authorName}>{activeThread.authorName}</p>
                                <p className={styles.timestamp}>{timeAgo(activeThread.timestamp)} · {activeThread.views} visualizações</p>
                            </div>
                        </div>
                        <p className={styles.threadContent}>{activeThread.content}</p>
                    </div>

                    {/* Respostas */}
                    <p className={styles.replyCount}>
                        {activeThread.replies.length} {activeThread.replies.length === 1 ? 'resposta' : 'respostas'}
                    </p>

                    {activeThread.replies.map((reply) => (
                        <div key={reply.id} className={styles.replyCard}>
                            <div className={styles.replyHeader}>
                                <div className={styles.avatarSm} style={{ backgroundColor: reply.avatarColor }}>
                                    {reply.authorInitials}
                                </div>
                                <div>
                                    <p className={styles.authorName}>{reply.authorName}</p>
                                    <p className={styles.timestamp}>{timeAgo(reply.timestamp)}</p>
                                </div>
                            </div>
                            <p className={styles.replyContent}>{reply.content}</p>
                            <button
                                className={`${styles.likeBtn} ${reply.likedByMe ? styles.liked : ''}`}
                                onClick={() => handleLikeReply(activeThread.id, reply.id)}
                            >
                                <i className={`fa-${reply.likedByMe ? 'solid' : 'regular'} fa-heart`}></i>
                                <span>{reply.likes}</span>
                            </button>
                        </div>
                    ))}

                    {/* Input de resposta */}
                    <div className={styles.replyInputCard}>
                        <div className={styles.avatarSm} style={{ backgroundColor: '#3eb489' }}>
                            {myInitials}
                        </div>
                        <div className={styles.replyInputCol}>
                            <textarea
                                className={styles.replyTextarea}
                                placeholder="Escreva sua resposta..."
                                value={replyInputs[activeThread.id] || ''}
                                onChange={(e) =>
                                    setReplyInputs((prev) => ({ ...prev, [activeThread.id]: e.target.value }))
                                }
                                rows={3}
                            />
                            <button
                                className={styles.replyBtn}
                                onClick={() => handleReply(activeThread.id)}
                                disabled={!(replyInputs[activeThread.id] || '').trim()}
                            >
                                Responder
                            </button>
                        </div>
                    </div>
                </div>
            </>
        );
    }

    // ── Thread list view ──
    return (
        <>
            <Header />
            <div className={styles.container}>
                <div className={styles.forumHeader}>
                    <div>
                        <h1 className={styles.forumTitle}>
                            <i className="fa-solid fa-comments"></i> Fórum
                        </h1>
                        <p className={styles.forumSubtitle}>Tire dúvidas, compartilhe conhecimento e motive a comunidade</p>
                    </div>
                    <button className={styles.newThreadBtn} onClick={() => setShowNewThread(true)}>
                        <i className="fa-solid fa-plus"></i> Nova
                    </button>
                </div>

                {/* Filtro de categorias */}
                <div className={styles.categoryFilter}>
                    <button
                        className={`${styles.catChip} ${activeCategory === 'Todos' ? styles.catChipActive : ''}`}
                        onClick={() => setActiveCategory('Todos')}
                    >
                        Todos
                    </button>
                    {CATEGORIES.map((cat) => (
                        <button
                            key={cat}
                            className={`${styles.catChip} ${activeCategory === cat ? styles.catChipActive : ''}`}
                            style={activeCategory === cat ? { backgroundColor: CATEGORY_COLORS[cat], borderColor: CATEGORY_COLORS[cat] } : {}}
                            onClick={() => setActiveCategory(cat)}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                {/* Modal novo tópico */}
                {showNewThread && (
                    <div className={styles.modalOverlay} onClick={() => setShowNewThread(false)}>
                        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                            <div className={styles.modalHeader}>
                                <h3>Novo Tópico</h3>
                                <button className={styles.modalClose} onClick={() => setShowNewThread(false)}>
                                    <i className="fa-solid fa-xmark"></i>
                                </button>
                            </div>
                            <select
                                className={styles.selectCategory}
                                value={newCategory}
                                onChange={(e) => setNewCategory(e.target.value as Category)}
                            >
                                {CATEGORIES.map((c) => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                            <input
                                className={styles.titleInput}
                                placeholder="Título do tópico..."
                                value={newTitle}
                                onChange={(e) => setNewTitle(e.target.value)}
                            />
                            <textarea
                                className={styles.contentTextarea}
                                placeholder="Descreva sua dúvida ou mensagem..."
                                value={newContent}
                                onChange={(e) => setNewContent(e.target.value)}
                                rows={5}
                            />
                            <button
                                className={styles.createBtn}
                                onClick={handleCreateThread}
                                disabled={!newTitle.trim() || !newContent.trim()}
                            >
                                Publicar Tópico
                            </button>
                        </div>
                    </div>
                )}

                {/* Lista de tópicos */}
                {filteredThreads.map((thread) => (
                    <button
                        key={thread.id}
                        className={styles.threadCard}
                        onClick={() => handleOpenThread(thread.id)}
                    >
                        <div className={styles.threadCardTop}>
                            <span
                                className={styles.categoryTag}
                                style={{ backgroundColor: CATEGORY_COLORS[thread.category] }}
                            >
                                {thread.category}
                            </span>
                            {thread.pinned && (
                                <span className={styles.pinnedBadge}>
                                    <i className="fa-solid fa-thumbtack"></i>
                                </span>
                            )}
                        </div>
                        <h3 className={styles.threadCardTitle}>{thread.title}</h3>
                        <p className={styles.threadCardPreview}>{thread.content}</p>
                        <div className={styles.threadCardMeta}>
                            <div className={styles.avatarXs} style={{ backgroundColor: thread.avatarColor }}>
                                {thread.authorInitials}
                            </div>
                            <span className={styles.metaText}>{thread.authorName}</span>
                            <span className={styles.metaDot}>·</span>
                            <span className={styles.metaText}>{timeAgo(thread.timestamp)}</span>
                            <span className={styles.metaDot}>·</span>
                            <i className="fa-regular fa-comment" style={{ color: '#8fa3be', fontSize: '0.78rem' }}></i>
                            <span className={styles.metaText}>{thread.replies.length}</span>
                            <span className={styles.metaDot}>·</span>
                            <i className="fa-regular fa-eye" style={{ color: '#8fa3be', fontSize: '0.78rem' }}></i>
                            <span className={styles.metaText}>{thread.views}</span>
                        </div>
                    </button>
                ))}

                {filteredThreads.length === 0 && (
                    <div className={styles.empty}>
                        <i className="fa-regular fa-folder-open"></i>
                        <p>Nenhum tópico nesta categoria ainda. Seja o primeiro!</p>
                    </div>
                )}
            </div>
        </>
    );
}
