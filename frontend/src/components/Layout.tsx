// Orion Analytics - Layout Component

import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { useApp } from '@/lib/context';

export function Layout() {
    const { currentDataset } = useApp();

    return (
        <div className="app-layout">
            <Sidebar />
            <div className="page-container">
                <Topbar datasetName={currentDataset?.name} />
                <main className="main-content">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
