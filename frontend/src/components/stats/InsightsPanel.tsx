import { Lightbulb, AlertTriangle, TrendingUp, BarChart3 } from 'lucide-react';
import type { ColumnStats, GroupComparisonTest } from '@/types';

interface Props {
    statistics: ColumnStats[];
    comparisonTests?: GroupComparisonTest[];
}

interface Insight {
    type: 'info' | 'warning' | 'success';
    icon: typeof Lightbulb;
    title: string;
    text: string;
}

export function InsightsPanel({ statistics, comparisonTests }: Props) {
    const insights: Insight[] = [];

    for (const s of statistics) {
        // High CV
        if (s.cv != null && s.cv > 30) {
            insights.push({
                type: 'warning', icon: AlertTriangle,
                title: `Alta variabilidade: ${s.name}`,
                text: `CV = ${s.cv.toFixed(1)}%. Os dados apresentam alta dispersao relativa. Considere investigar outliers ou segmentar os dados.`,
            });
        }

        // High missing
        if (s.missing_pct != null && s.missing_pct > 20) {
            insights.push({
                type: 'warning', icon: AlertTriangle,
                title: `Muitos ausentes: ${s.name}`,
                text: `${s.missing_pct.toFixed(1)}% dos valores estao ausentes. Isso pode impactar a confiabilidade das analises.`,
            });
        }

        // Strong skewness
        if (s.skewness != null && Math.abs(s.skewness) > 1.5) {
            const dir = s.skewness > 0 ? 'positiva (cauda a direita)' : 'negativa (cauda a esquerda)';
            insights.push({
                type: 'info', icon: TrendingUp,
                title: `Distribuicao assimetrica: ${s.name}`,
                text: `Assimetria ${dir} de ${s.skewness.toFixed(2)}. Considere usar mediana ao inves de media, ou testes nao-parametricos.`,
            });
        }
    }

    // Significant comparison tests
    if (comparisonTests) {
        for (const t of comparisonTests) {
            if (t.significant) {
                insights.push({
                    type: 'success', icon: BarChart3,
                    title: `Diferenca significativa: ${t.variable_name}`,
                    text: `${t.test_name_display}: p = ${t.p_value < 0.001 ? '< 0.001' : t.p_value.toFixed(4)}${t.effect_size_interpretation ? `. Tamanho de efeito: ${t.effect_size_interpretation}` : ''}.`,
                });
            }
        }
    }

    if (insights.length === 0) return null;

    const colors = {
        info: 'border-[var(--color-primary)]',
        warning: 'border-[var(--color-warning)]',
        success: 'border-[var(--color-success)]',
    };

    const iconColors = {
        info: 'text-primary',
        warning: 'text-warning',
        success: 'text-success',
    };

    return (
        <div className="mt-6">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Lightbulb size={16} className="text-primary" />
                Insights Automaticos
            </h4>
            <div className="flex flex-col gap-2">
                {insights.slice(0, 8).map((insight, i) => (
                    <div key={i} className={`glass-card p-3 border-l-2 ${colors[insight.type]}`}>
                        <div className="flex items-start gap-2">
                            <insight.icon size={14} className={`mt-0.5 ${iconColors[insight.type]}`} />
                            <div>
                                <div className="text-sm font-medium">{insight.title}</div>
                                <p className="text-xs text-secondary mt-0.5">{insight.text}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
