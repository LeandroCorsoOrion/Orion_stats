// Orion.AI - Floating AI Assistant Widget

import { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Sparkles, Zap, Brain, Minimize2, Maximize2 } from 'lucide-react';
import { HELP_TOPICS, findHelpTopic, type HelpTopic } from '@/lib/helpTopics';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

const INITIAL_MESSAGES: Message[] = [
    {
        id: '1',
        role: 'assistant',
        content:
            'Ola! Eu sou o **Orion.AI**, seu assistente dentro do Orion Analytics.\n\n' +
            'Eu explico (em linguagem simples):\n' +
            '• o que cada numero significa (media, DP, IC, p-valor, etc.)\n' +
            '• o que e "significativo" e "nao significativo"\n' +
            '• qual teste usar (t-test, ANOVA, Qui-quadrado, etc.)\n' +
            '• como transformar um treino em **Projeto Operacional**\n\n' +
            'Ex: "o que e p-valor?"',
        timestamp: new Date(),
    },
];

const QUICK_ACTIONS = [
    { label: 'p-valor', question: 'O que e p-valor?' },
    { label: 'Significancia', question: 'O que significa "significativo"?' },
    { label: 'IC 95%', question: 'O que e intervalo de confianca (IC 95%)?' },
    { label: 'Normalidade', question: 'Como interpretar testes de normalidade?' },
    { label: 'Qui-quadrado', question: 'Como interpretar o teste qui-quadrado no crosstab?' },
    { label: 'R²', question: 'O que e R²?' },
    { label: 'RMSE', question: 'O que e RMSE?' },
    { label: 'Projetos', question: 'O que e um Projeto Operacional?' },
];

type AskDetail = { topicId?: string; question?: string; autoSend?: boolean };

export function OrionAI() {
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    function buildTopicResponse(topic: HelpTopic): string {
        const related = (topic.related || [])
            .map((id) => HELP_TOPICS.find((t) => t.id === id))
            .filter(Boolean) as HelpTopic[];

        if (related.length === 0) return topic.body;

        const relatedLine = related
            .slice(0, 4)
            .map((t) => t.title)
            .join(' • ');

        return `${topic.body}\n\n**Veja tambem:** ${relatedLine}`;
    }

    function getResponse(query: string): string {
        const q = query.toLowerCase();

        if (q.includes('ajuda') || q.includes('help')) {
            const picks = [
                'p-valor',
                'significancia',
                'intervalo de confianca',
                'normalidade',
                'teste t',
                'anova',
                'qui-quadrado',
                'projetos',
            ];
            return (
                '**Posso te guiar por qualquer termo da tela.**\n\n' +
                'Sugestoes:\n' +
                picks.map((p) => `• ${p}`).join('\n') +
                '\n\nEx: "o que e p-valor?"'
            );
        }

        if (q.includes('obrigado') || q.includes('valeu')) {
            return 'De nada. Se quiser, diga qual tela/resultado voce esta vendo e eu explico passo a passo.';
        }

        const { best, suggestions } = findHelpTopic(query, HELP_TOPICS);
        if (best) return buildTopicResponse(best);

        const suggestionLine =
            suggestions.length > 0
                ? suggestions.map((s) => s.title).join(' • ')
                : 'p-valor • IC 95% • significancia • normalidade • R² • RMSE';

        return (
            'Nao entendi totalmente. Tente perguntar assim:\n' +
            '• "o que e p-valor?"\n' +
            '• "como interpretar IC 95%?"\n' +
            '• "qual teste usar para 2 grupos?"\n\n' +
            `**Sugestoes:** ${suggestionLine}`
        );
    }

    async function sendQuery(query: string, forcedTopic?: HelpTopic) {
        if (!query.trim()) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: query,
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setIsTyping(true);

        // Small typing delay for readability.
        await new Promise((resolve) => setTimeout(resolve, 450));

        const response = forcedTopic ? buildTopicResponse(forcedTopic) : getResponse(query);

        const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: response,
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, assistantMessage]);
        setIsTyping(false);
    }

    async function handleSend() {
        if (!input.trim()) return;
        const q = input;
        setInput('');
        await sendQuery(q);
    }

    function handleKeyPress(e: React.KeyboardEvent) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    }

    function formatMessage(content: string) {
        return content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>');
    }

    useEffect(() => {
        function onAsk(event: Event) {
            const e = event as CustomEvent<AskDetail>;
            const topic = e.detail?.topicId ? HELP_TOPICS.find((t) => t.id === e.detail.topicId) : undefined;

            setIsOpen(true);
            setIsMinimized(false);

            const question = e.detail?.question || (topic ? `Explique: ${topic.title}` : '');
            if (!question) return;

            if (e.detail?.autoSend === false) {
                setInput(question);
                return;
            }

            void sendQuery(question, topic);
        }

        window.addEventListener('orion-ai:ask', onAsk as EventListener);
        return () => window.removeEventListener('orion-ai:ask', onAsk as EventListener);
    }, []);

    return (
        <>
            {/* Floating Button */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="fixed bottom-6 right-6 z-50 w-16 h-16 rounded-full 
                     bg-gradient-to-br from-[#A0D0FF] via-[#7ab8f5] to-[#5a9de0]
                     flex items-center justify-center
                     shadow-lg shadow-[rgba(160,208,255,0.3)]
                     hover:shadow-[rgba(160,208,255,0.5)] hover:scale-110
                     transition-all duration-300 group"
                    style={{
                        animation: 'pulse-glow 2s ease-in-out infinite',
                    }}
                >
                    <Bot size={28} className="text-[#0d1421]" />

                    {/* Glow ring */}
                    <div
                        className="absolute inset-0 rounded-full bg-[rgba(160,208,255,0.3)] animate-ping"
                        style={{ animationDuration: '3s' }}
                    />

                    {/* Sparkle decoration */}
                    <Sparkles size={14} className="absolute -top-1 -right-1 text-warning animate-pulse" />
                </button>
            )}

            {/* Chat Window */}
            {isOpen && (
                <div
                    className={`fixed z-50 bg-[#0d1421] border border-[var(--glass-border)] rounded-2xl shadow-2xl
                      transition-all duration-300 flex flex-col overflow-hidden
                      ${isMinimized ? 'bottom-6 right-6 w-80 h-14' : 'bottom-6 right-6 w-96 h-[560px]'}`}
                    style={{
                        boxShadow: '0 25px 50px rgba(0,0,0,0.5), 0 0 40px rgba(160,208,255,0.15)',
                    }}
                >
                    {/* Header */}
                    <div
                        className="flex items-center justify-between px-4 py-3 
                       bg-gradient-to-r from-[rgba(160,208,255,0.15)] to-[rgba(160,208,255,0.05)]
                       border-b border-[var(--glass-border)]"
                    >
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <div
                                    className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#A0D0FF] to-[#5a9de0] 
                               flex items-center justify-center"
                                >
                                    <Brain size={20} className="text-[#0d1421]" />
                                </div>
                                <div
                                    className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-success rounded-full 
                               border-2 border-[#0d1421]"
                                />
                            </div>
                            <div>
                                <h3 className="font-bold text-sm flex items-center gap-1">
                                    Orion.AI
                                    <Zap size={12} className="text-warning" />
                                </h3>
                                <p className="text-xs text-muted">Assistente Inteligente</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setIsMinimized(!isMinimized)}
                                className="p-1.5 rounded-lg hover:bg-[var(--color-surface)] transition"
                            >
                                {isMinimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
                            </button>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-1.5 rounded-lg hover:bg-[var(--color-surface)] transition"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    </div>

                    {!isMinimized && (
                        <>
                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                {messages.map((msg) => (
                                    <div
                                        key={msg.id}
                                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div
                                            className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                                                msg.role === 'user'
                                                    ? 'bg-gradient-to-r from-[#A0D0FF] to-[#7ab8f5] text-[#0d1421]'
                                                    : 'bg-[var(--color-surface)] border border-[var(--glass-border)]'
                                            }`}
                                        >
                                            {msg.role === 'assistant' && (
                                                <div className="flex items-center gap-1.5 mb-2">
                                                    <Bot size={12} className="text-primary" />
                                                    <span className="text-xs text-primary font-medium">Orion.AI</span>
                                                </div>
                                            )}
                                            <div
                                                className="text-sm leading-relaxed"
                                                dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }}
                                            />
                                        </div>
                                    </div>
                                ))}

                                {isTyping && (
                                    <div className="flex justify-start">
                                        <div
                                            className="bg-[var(--color-surface)] border border-[var(--glass-border)] 
                                   rounded-2xl px-4 py-3 flex items-center gap-2"
                                        >
                                            <div className="flex gap-1">
                                                <span
                                                    className="w-2 h-2 bg-primary rounded-full animate-bounce"
                                                    style={{ animationDelay: '0ms' }}
                                                />
                                                <span
                                                    className="w-2 h-2 bg-primary rounded-full animate-bounce"
                                                    style={{ animationDelay: '150ms' }}
                                                />
                                                <span
                                                    className="w-2 h-2 bg-primary rounded-full animate-bounce"
                                                    style={{ animationDelay: '300ms' }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div ref={messagesEndRef} />
                            </div>

                            {/* Quick Actions */}
                            <div className="px-4 py-2 border-t border-[var(--glass-border)]">
                                <div className="flex gap-2 overflow-x-auto pb-1">
                                    {QUICK_ACTIONS.map((item) => (
                                        <button
                                            key={item.label}
                                            onClick={() => void sendQuery(item.question)}
                                            className="chip text-xs py-1 px-3 whitespace-nowrap hover:bg-[rgba(160,208,255,0.2)]"
                                        >
                                            {item.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Input */}
                            <div className="p-4 pt-2 border-t border-[var(--glass-border)]">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyPress={handleKeyPress}
                                        placeholder="Pergunte qualquer coisa..."
                                        className="input flex-1 text-sm py-2.5"
                                    />
                                    <button
                                        onClick={handleSend}
                                        disabled={!input.trim() || isTyping}
                                        className="btn btn-primary px-4"
                                    >
                                        <Send size={16} />
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Pulse animation keyframes */}
            <style>{`
        @keyframes pulse-glow {
          0%, 100% {
            box-shadow: 0 4px 16px rgba(160, 208, 255, 0.4), 0 0 30px rgba(160, 208, 255, 0.2);
          }
          50% {
            box-shadow: 0 4px 24px rgba(160, 208, 255, 0.6), 0 0 50px rgba(160, 208, 255, 0.3);
          }
        }
      `}</style>
        </>
    );
}

