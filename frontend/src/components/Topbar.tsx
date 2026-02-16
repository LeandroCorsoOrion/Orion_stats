// Orion Analytics - Topbar Component

import { useEffect, useState } from 'react';
import { Database, Loader2, Wifi, WifiOff } from 'lucide-react';
import { checkApiHealth } from '@/lib/api';

interface TopbarProps {
    datasetName?: string;
}

export function Topbar({ datasetName }: TopbarProps) {
    const [apiStatus, setApiStatus] = useState<'checking' | 'online' | 'offline'>('checking');
    const [apiDetail, setApiDetail] = useState<string | null>(null);
    const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null);

    async function runHealthCheck() {
        setApiStatus('checking');
        const health = await checkApiHealth();
        setApiStatus(health.ok ? 'online' : 'offline');
        setApiDetail(health.detail || null);
        setLastCheckedAt(new Date());
    }

    useEffect(() => {
        let mounted = true;

        async function check() {
            const health = await checkApiHealth();
            if (!mounted) return;
            setApiStatus(health.ok ? 'online' : 'offline');
            setApiDetail(health.detail || null);
            setLastCheckedAt(new Date());
        }

        void check();
        const interval = window.setInterval(() => {
            void check();
        }, 30000);

        return () => {
            mounted = false;
            window.clearInterval(interval);
        };
    }, []);

    const statusTitle = apiStatus === 'online'
        ? `API online${lastCheckedAt ? ` - ${lastCheckedAt.toLocaleTimeString()}` : ''}`
        : apiStatus === 'offline'
            ? `API offline${apiDetail ? ` - ${apiDetail}` : ''}`
            : 'Verificando conexao com a API...';

    return (
        <header className="topbar">
            <div className="topbar-brand">
                <img
                    src="/orion-wordmark-only.png"
                    alt="ORION"
                    className="orion-wordmark orion-wordmark-topbar"
                    loading="eager"
                />
            </div>

            <div className="topbar-right">
                {datasetName && (
                    <div className="topbar-dataset">
                        <Database size={16} />
                        <span>{datasetName}</span>
                    </div>
                )}

                <button
                    type="button"
                    onClick={() => void runHealthCheck()}
                    className={`topbar-status ${apiStatus}`}
                    title={statusTitle}
                    aria-label={statusTitle}
                >
                    {apiStatus === 'checking' ? (
                        <Loader2 size={14} className="animate-spin" />
                    ) : apiStatus === 'online' ? (
                        <Wifi size={14} />
                    ) : (
                        <WifiOff size={14} />
                    )}
                    <span>
                        {apiStatus === 'online' ? 'API online' : apiStatus === 'offline' ? 'API offline' : 'Verificando API'}
                    </span>
                </button>
            </div>
        </header>
    );
}
