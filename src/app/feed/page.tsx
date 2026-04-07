'use client';

import React, { useState, useRef, useEffect } from 'react';
import Header from '@/components/organism/Header';
import Image from 'next/image';
import styles from './styles.module.css';

interface Post {
    id: string;
    authorName: string;
    authorInitials: string;
    avatarColor: string;
    content: string;
    imageUrl?: string;
    timestamp: Date;
    likes: number;
    likedByMe: boolean;
    comments: Comment[];
}

interface Comment {
    id: string;
    authorName: string;
    authorInitials: string;
    avatarColor: string;
    content: string;
    timestamp: Date;
}

const AVATAR_COLORS = [
    '#3eb489', '#1B3F7A', '#2A5BA8', '#e05c74', '#7c5ce4',
    '#f39c12', '#16a085', '#8e44ad',
];

const MOCK_POSTS: Post[] = [
    {
        id: '1',
        authorName: 'Carlos Mendes',
        authorInitials: 'CM',
        avatarColor: '#1B3F7A',
        content: '💪 Treino A concluído! Supino reto com 80kg hoje, superei meu recorde pessoal. Não parem nunca!',
        timestamp: new Date(Date.now() - 1000 * 60 * 12),
        likes: 14,
        likedByMe: false,
        comments: [
            {
                id: 'c1',
                authorName: 'Ana Paula',
                authorInitials: 'AP',
                avatarColor: '#e05c74',
                content: 'Arrasando! Que motivação 🔥',
                timestamp: new Date(Date.now() - 1000 * 60 * 5),
            },
        ],
    },
    {
        id: '2',
        authorName: 'Fernanda Lima',
        authorInitials: 'FL',
        avatarColor: '#e05c74',
        content: '🏃‍♀️ 5km em 28 minutos antes do treino de pernas! Disciplina é tudo. Bom treino a todos!',
        timestamp: new Date(Date.now() - 1000 * 60 * 45),
        likes: 22,
        likedByMe: true,
        comments: [],
    },
    {
        id: '3',
        authorName: 'Rafael Costa',
        authorInitials: 'RC',
        avatarColor: '#7c5ce4',
        content: '🥗 Meal prep do domingo feito! Proteínas e carboidratos organizados para a semana. Quem disse que não dá tempo? É questão de prioridade.',
        timestamp: new Date(Date.now() - 1000 * 60 * 120),
        likes: 8,
        likedByMe: false,
        comments: [
            {
                id: 'c2',
                authorName: 'Carlos Mendes',
                authorInitials: 'CM',
                avatarColor: '#1B3F7A',
                content: 'Me manda a receita! 😅',
                timestamp: new Date(Date.now() - 1000 * 60 * 100),
            },
            {
                id: 'c3',
                authorName: 'Fernanda Lima',
                authorInitials: 'FL',
                avatarColor: '#e05c74',
                content: 'Inspiração total! 💚',
                timestamp: new Date(Date.now() - 1000 * 60 * 90),
            },
        ],
    },
    {
        id: '4',
        authorName: 'Juliana Reis',
        authorInitials: 'JR',
        avatarColor: '#16a085',
        content: '🎯 Semana 8 do protocolo concluída! Quando comecei mal conseguia fazer 5 flexões. Hoje foram 3 séries de 20. A evolução é real, confiem no processo!',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3),
        likes: 37,
        likedByMe: false,
        comments: [],
    },
];

function timeAgo(date: Date): string {
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}min`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
}

function getInitials(name: string): string {
    return name
        .split(' ')
        .slice(0, 2)
        .map((n) => n[0])
        .join('')
        .toUpperCase();
}

export default function FeedPage() {
    const [posts, setPosts] = useState<Post[]>(MOCK_POSTS);
    const [newPostContent, setNewPostContent] = useState('');
    const [newPostImage, setNewPostImage] = useState<string | null>(null);
    const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
    const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
    const [currentUser, setCurrentUser] = useState({ name: 'Você', id: 'me' });
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const raw = localStorage.getItem('user');
        if (raw) {
            const u = JSON.parse(raw);
            setCurrentUser({ name: u.name || 'Você', id: u.id || 'me' });
        }
    }, []);

    const myInitials = getInitials(currentUser.name);

    const handlePost = () => {
        const content = newPostContent.trim();
        if (!content && !newPostImage) return;
        const post: Post = {
            id: Date.now().toString(),
            authorName: currentUser.name,
            authorInitials: myInitials,
            avatarColor: '#3eb489',
            content,
            imageUrl: newPostImage || undefined,
            timestamp: new Date(),
            likes: 0,
            likedByMe: false,
            comments: [],
        };
        setPosts([post, ...posts]);
        setNewPostContent('');
        setNewPostImage(null);
    };

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            setNewPostImage(ev.target?.result as string);
        };
        reader.readAsDataURL(file);
        // reset input so same file can be selected again
        e.target.value = '';
    };

    const handleLike = (postId: string) => {
        setPosts((prev) =>
            prev.map((p) =>
                p.id === postId
                    ? {
                          ...p,
                          likedByMe: !p.likedByMe,
                          likes: p.likedByMe ? p.likes - 1 : p.likes + 1,
                      }
                    : p,
            ),
        );
    };

    const handleComment = (postId: string) => {
        const content = (commentInputs[postId] || '').trim();
        if (!content) return;
        const comment: Comment = {
            id: Date.now().toString(),
            authorName: currentUser.name,
            authorInitials: myInitials,
            avatarColor: '#3eb489',
            content,
            timestamp: new Date(),
        };
        setPosts((prev) =>
            prev.map((p) =>
                p.id === postId
                    ? { ...p, comments: [...p.comments, comment] }
                    : p,
            ),
        );
        setCommentInputs((prev) => ({ ...prev, [postId]: '' }));
    };

    const toggleComments = (postId: string) => {
        setOpenComments((prev) => ({ ...prev, [postId]: !prev[postId] }));
    };

    return (
        <>
            <Header />
            <div className={styles.feedContainer}>
                {/* Caixa de novo post */}
                <div className={styles.newPostCard}>
                    <div className={styles.newPostRow}>
                        <div
                            className={styles.avatar}
                            style={{ backgroundColor: '#3eb489' }}
                        >
                            {myInitials}
                        </div>
                        <textarea
                            className={styles.newPostInput}
                            placeholder="Compartilhe seu treino, conquista ou motivação... 💪"
                            value={newPostContent}
                            onChange={(e) => setNewPostContent(e.target.value)}
                            rows={3}
                        />
                    </div>
                    {/* Preview da imagem selecionada */}
                    {newPostImage && (
                        <div className={styles.imagePreviewWrapper}>
                            <img
                                src={newPostImage}
                                alt="preview"
                                className={styles.imagePreview}
                            />
                            <button
                                className={styles.removeImageBtn}
                                onClick={() => setNewPostImage(null)}
                                aria-label="Remover imagem"
                            >
                                <i className="fa-solid fa-xmark"></i>
                            </button>
                        </div>
                    )}
                    <div className={styles.newPostActions}>
                        {/* Botão de foto */}
                        <button
                            className={styles.photoBtn}
                            onClick={() => fileInputRef.current?.click()}
                            title="Adicionar foto"
                        >
                            <i className="fa-solid fa-image"></i>
                            <span>Foto</span>
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={handleImageSelect}
                        />
                        <button
                            className={styles.postBtn}
                            onClick={handlePost}
                            disabled={!newPostContent.trim() && !newPostImage}
                        >
                            Publicar
                        </button>
                    </div>
                </div>

                {/* Lista de posts */}
                {posts.map((post) => (
                    <div key={post.id} className={styles.postCard}>
                        {/* Cabeçalho do post */}
                        <div className={styles.postHeader}>
                            <div
                                className={styles.avatar}
                                style={{ backgroundColor: post.avatarColor }}
                            >
                                {post.authorInitials}
                            </div>
                            <div>
                                <p className={styles.authorName}>{post.authorName}</p>
                                <p className={styles.timestamp}>{timeAgo(post.timestamp)}</p>
                            </div>
                        </div>

                        {/* Conteúdo */}
                        <p className={styles.postContent}>{post.content}</p>

                        {/* Imagem do post */}
                        {post.imageUrl && (
                            <div className={styles.postImageWrapper}>
                                <img
                                    src={post.imageUrl}
                                    alt="post"
                                    className={styles.postImage}
                                />
                            </div>
                        )}

                        {/* Ações */}
                        <div className={styles.postActions}>
                            <button
                                className={`${styles.actionBtn} ${post.likedByMe ? styles.liked : ''}`}
                                onClick={() => handleLike(post.id)}
                            >
                                <i className={`fa-${post.likedByMe ? 'solid' : 'regular'} fa-heart`}></i>
                                <span>{post.likes}</span>
                            </button>
                            <button
                                className={styles.actionBtn}
                                onClick={() => toggleComments(post.id)}
                            >
                                <i className="fa-regular fa-comment"></i>
                                <span>{post.comments.length}</span>
                            </button>
                        </div>

                        {/* Comentários */}
                        {openComments[post.id] && (
                            <div className={styles.commentsSection}>
                                {post.comments.map((c) => (
                                    <div key={c.id} className={styles.comment}>
                                        <div
                                            className={styles.avatarSm}
                                            style={{ backgroundColor: c.avatarColor }}
                                        >
                                            {c.authorInitials}
                                        </div>
                                        <div className={styles.commentBody}>
                                            <span className={styles.commentAuthor}>{c.authorName}</span>
                                            <span className={styles.commentText}>{c.content}</span>
                                        </div>
                                    </div>
                                ))}
                                <div className={styles.commentInputRow}>
                                    <div
                                        className={styles.avatarSm}
                                        style={{ backgroundColor: '#3eb489' }}
                                    >
                                        {myInitials}
                                    </div>
                                    <input
                                        className={styles.commentInput}
                                        placeholder="Adicione um comentário..."
                                        value={commentInputs[post.id] || ''}
                                        onChange={(e) =>
                                            setCommentInputs((prev) => ({
                                                ...prev,
                                                [post.id]: e.target.value,
                                            }))
                                        }
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleComment(post.id);
                                        }}
                                    />
                                    <button
                                        className={styles.commentSendBtn}
                                        onClick={() => handleComment(post.id)}
                                    >
                                        <i className="fa-solid fa-paper-plane"></i>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </>
    );
}
