import { HelpCircle } from 'lucide-react';

type AskDetail = {
    topicId?: string;
    question?: string;
    autoSend?: boolean;
};

function askOrion(detail: AskDetail) {
    window.dispatchEvent(new CustomEvent<AskDetail>('orion-ai:ask', { detail }));
}

interface Props {
    topicId?: string;
    question?: string;
    autoSend?: boolean;
    className?: string;
    title?: string;
    label?: string;
}

export function AskOrionButton({
    topicId,
    question,
    autoSend = true,
    className,
    title,
    label,
}: Props) {
    const fallbackTitle = title || 'Perguntar ao Orion.AI';

    return (
        <button
            type="button"
            className={className || 'inline-flex items-center justify-center p-1 rounded-lg hover:bg-[var(--color-surface)] transition text-muted'}
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                askOrion({ topicId, question, autoSend });
            }}
            title={fallbackTitle}
            aria-label={fallbackTitle}
        >
            <HelpCircle size={14} />
            {label ? <span className="ml-2 text-xs">{label}</span> : null}
        </button>
    );
}
