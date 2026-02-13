// Orion Stats - Topbar Component

import { Database } from 'lucide-react';

interface TopbarProps {
    datasetName?: string;
}

export function Topbar({ datasetName }: TopbarProps) {
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

            {datasetName && (
                <div className="topbar-dataset">
                    <Database size={16} />
                    <span>{datasetName}</span>
                </div>
            )}
        </header>
    );
}
