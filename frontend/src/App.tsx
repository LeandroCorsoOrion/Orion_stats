// Orion Analytics - Main App

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from '@/lib/context';
import { Layout } from '@/components/Layout';
import { OrionAI } from '@/components/OrionAI';
import { DatasetPage } from '@/pages/DatasetPage';
import { EstatisticasPage } from '@/pages/EstatisticasPage';
import { CorrelacaoPage } from '@/pages/CorrelacaoPage';
import { ModelagemPage } from '@/pages/ModelagemPage';
import { CenariosPage } from '@/pages/CenariosPage';
import { ProjetosPage } from '@/pages/ProjetosPage';
import { ProjetoPage } from '@/pages/ProjetoPage';
import './index.css';

function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<DatasetPage />} />
            <Route path="estatisticas" element={<EstatisticasPage />} />
            <Route path="correlacao" element={<CorrelacaoPage />} />
            <Route path="modelagem" element={<ModelagemPage />} />
            <Route path="cenarios" element={<CenariosPage />} />
            <Route path="projetos" element={<ProjetosPage />} />
            <Route path="projetos/:projectId" element={<ProjetoPage />} />
          </Route>
        </Routes>
        <OrionAI />
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;

