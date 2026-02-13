// Orion Stats - Sidebar Component

import { NavLink } from 'react-router-dom';
import {
    Database,
    BarChart3,
    GitBranch,
    BrainCircuit,
    FolderKanban
} from 'lucide-react';

const navItems = [
    { path: '/', icon: Database, label: 'Dataset' },
    { path: '/estatisticas', icon: BarChart3, label: 'Estatísticas' },
    { path: '/correlacao', icon: GitBranch, label: 'Correlação' },
    { path: '/modelagem', icon: BrainCircuit, label: 'Modelagem e Simulação' },
    { path: '/cenarios', icon: FolderKanban, label: 'Cenários' },
];

export function Sidebar() {
    return (
        <aside className="sidebar">
            <div className="sidebar-logo sidebar-brand">
                <img
                    src="/orion-wordmark-only.png"
                    alt="ORION"
                    className="orion-wordmark orion-wordmark-sidebar"
                    loading="eager"
                />
            </div>

            <nav className="sidebar-nav">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            `sidebar-link ${isActive ? 'active' : ''}`
                        }
                    >
                        <item.icon size={20} />
                        {item.label}
                    </NavLink>
                ))}
            </nav>
        </aside>
    );
}
