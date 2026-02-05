// Orion Stats - Topbar Component

import { Database } from 'lucide-react';

interface TopbarProps {
    datasetName?: string;
}

export function Topbar({ datasetName }: TopbarProps) {
    return (
        <header className="topbar">
            <h1 className="topbar-title">Orion Stats</h1>

            {datasetName && (
                <div className="topbar-dataset">
                    <Database size={16} />
                    <span>{datasetName}</span>
                </div>
            )}
        </header>
    );
}
