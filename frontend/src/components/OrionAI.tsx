// Orion.AI - Floating AI Assistant Widget

import { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Sparkles, Zap, Brain, Minimize2, Maximize2 } from 'lucide-react';

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
        content: 'Olá! Eu sou o **Orion.AI**, seu assistente de análise de dados. 🚀\n\nPosso ajudar você com:\n• Interpretação de estatísticas\n• Análise de correlações\n• Dicas sobre modelagem\n• Dúvidas gerais sobre a plataforma\n\nComo posso ajudar?',
        timestamp: new Date()
    }
];

const QUICK_RESPONSES: Record<string, string> = {
    'correlação': 'A **correlação de Pearson** mede a relação linear entre duas variáveis.\n\n📊 **Interpretação:**\n• **0.8 a 1.0**: Correlação forte positiva\n• **0.5 a 0.8**: Correlação média positiva\n• **0.0 a 0.5**: Correlação fraca\n• **-0.5 a 0.0**: Correlação fraca negativa\n• **-0.8 a -0.5**: Correlação média negativa\n• **-1.0 a -0.8**: Correlação forte negativa\n\n⚠️ Lembre-se: correlação não implica causalidade!',
    'r2': 'O **R²** (coeficiente de determinação) indica a % da variância explicada pelo modelo.\n\n📈 **Interpretação:**\n• **> 0.9**: Excelente\n• **0.7 - 0.9**: Bom\n• **0.5 - 0.7**: Moderado\n• **< 0.5**: Pode precisar de mais variáveis\n\nUm R² de 0.85 significa que 85% da variação é explicada pelo modelo.',
    'rmse': 'O **RMSE** (Root Mean Square Error) mede o erro médio do modelo na mesma unidade da variável alvo.\n\n📉 **Quanto menor, melhor!**\n\nPara interpretar, compare com a média da variável-alvo. Se RMSE é muito menor que a média, o modelo está bom.',
    'machine learning': 'A plataforma oferece **5 modelos de ML**:\n\n🔵 **Pro**: Alta performance geral\n🟢 **Alpha**: Ótimo para dados graduais\n🟣 **Sigma**: Robusto para grandes datasets\n🟡 **Delta**: Regularização balanceada\n🔴 **Nova**: Captura padrões complexos\n\nTreine todos e compare as métricas para escolher o melhor!',
    'estatísticas': 'As **estatísticas descritivas** resumem seus dados:\n\n📊 **Medidas de Tendência Central:**\n• Média: valor central típico\n• Mediana: valor do meio\n• Moda: valor mais frequente\n\n📐 **Medidas de Dispersão:**\n• Desvio Padrão: variação típica\n• IQR: distância entre Q1 e Q3\n\nUse filtros para ver por grupos!',
    'default': 'Entendi sua pergunta! 🤔\n\nPara uma resposta mais precisa, você pode me perguntar sobre:\n• Correlação e interpretação\n• Métricas de ML (R², RMSE, MAE)\n• Estatísticas descritivas\n• Machine Learning\n\nDigite um desses tópicos ou descreva seu problema com mais detalhes!'
};

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

    function getResponse(query: string): string {
        const q = query.toLowerCase();

        for (const [keyword, response] of Object.entries(QUICK_RESPONSES)) {
            if (keyword !== 'default' && q.includes(keyword)) {
                return response;
            }
        }

        if (q.includes('ajuda') || q.includes('help')) {
            return 'Claro! Posso ajudar com:\n\n🔹 **Análise de Dados**: correlações, estatísticas\n🔹 **Machine Learning**: métricas, modelos\n🔹 **Uso da Plataforma**: navegação, funcionalidades\n\nO que você gostaria de saber?';
        }

        if (q.includes('obrigado') || q.includes('valeu')) {
            return 'Por nada! 😊 Estou sempre aqui para ajudar. Boa análise! 🚀';
        }

        return QUICK_RESPONSES['default'];
    }

    async function handleSend() {
        if (!input.trim()) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsTyping(true);

        // Simulate typing delay
        await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 700));

        const response = getResponse(input);

        const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: response,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, assistantMessage]);
        setIsTyping(false);
    }

    function handleKeyPress(e: React.KeyboardEvent) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    }

    function formatMessage(content: string) {
        return content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br/>');
    }

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
                        animation: 'pulse-glow 2s ease-in-out infinite'
                    }}
                >
                    <Bot size={28} className="text-[#0d1421]" />

                    {/* Glow ring */}
                    <div className="absolute inset-0 rounded-full bg-[rgba(160,208,255,0.3)] animate-ping"
                        style={{ animationDuration: '3s' }} />

                    {/* Sparkle decoration */}
                    <Sparkles
                        size={14}
                        className="absolute -top-1 -right-1 text-warning animate-pulse"
                    />
                </button>
            )}

            {/* Chat Window */}
            {isOpen && (
                <div
                    className={`fixed z-50 bg-[#0d1421] border border-[var(--glass-border)] rounded-2xl shadow-2xl
                      transition-all duration-300 flex flex-col overflow-hidden
                      ${isMinimized
                            ? 'bottom-6 right-6 w-80 h-14'
                            : 'bottom-6 right-6 w-96 h-[560px]'
                        }`}
                    style={{
                        boxShadow: '0 25px 50px rgba(0,0,0,0.5), 0 0 40px rgba(160,208,255,0.15)'
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
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#A0D0FF] to-[#5a9de0] 
                               flex items-center justify-center">
                                    <Brain size={20} className="text-[#0d1421]" />
                                </div>
                                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-success rounded-full 
                               border-2 border-[#0d1421]" />
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
                                            className={`max-w-[85%] rounded-2xl px-4 py-3 ${msg.role === 'user'
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
                                        <div className="bg-[var(--color-surface)] border border-[var(--glass-border)] 
                                   rounded-2xl px-4 py-3 flex items-center gap-2">
                                            <div className="flex gap-1">
                                                <span className="w-2 h-2 bg-primary rounded-full animate-bounce"
                                                    style={{ animationDelay: '0ms' }} />
                                                <span className="w-2 h-2 bg-primary rounded-full animate-bounce"
                                                    style={{ animationDelay: '150ms' }} />
                                                <span className="w-2 h-2 bg-primary rounded-full animate-bounce"
                                                    style={{ animationDelay: '300ms' }} />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div ref={messagesEndRef} />
                            </div>

                            {/* Quick Actions */}
                            <div className="px-4 py-2 border-t border-[var(--glass-border)]">
                                <div className="flex gap-2 overflow-x-auto pb-1">
                                    {['Correlação', 'R²', 'RMSE', 'ML'].map((topic) => (
                                        <button
                                            key={topic}
                                            onClick={() => setInput(`O que é ${topic}?`)}
                                            className="chip text-xs py-1 px-3 whitespace-nowrap hover:bg-[rgba(160,208,255,0.2)]"
                                        >
                                            {topic}
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
