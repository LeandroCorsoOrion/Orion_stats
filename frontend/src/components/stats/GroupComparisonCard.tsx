import { FlaskConical, CheckCircle2, XCircle } from 'lucide-react';
import type { GroupComparisonTest } from '@/types';

interface Props {
    tests: GroupComparisonTest[];
}

export function GroupComparisonCard({ tests }: Props) {
    if (!tests || tests.length === 0) return null;

    return (
        <div className="mt-6">
            <h4 className="font-semibold mb-4 flex items-center gap-2">
                <FlaskConical size={16} className="text-primary" />
                Testes de Comparacao entre Grupos
            </h4>
            <div className="flex flex-col gap-3">
                {tests.map((test) => (
                    <div key={test.variable} className="glass-card p-4">
                        <div className="flex items-start justify-between mb-2">
                            <div>
                                <span className="font-medium">{test.variable_name}</span>
                                <span className="text-xs text-muted ml-2">({test.test_name_display})</span>
                            </div>
                            {test.significant ? (
                                <span className="chip active text-xs flex items-center gap-1">
                                    <CheckCircle2 size={12} /> Significativo
                                </span>
                            ) : (
                                <span className="chip text-xs flex items-center gap-1">
                                    <XCircle size={12} /> Nao significativo
                                </span>
                            )}
                        </div>

                        <div className="grid grid-cols-4 gap-3 mb-3">
                            <div>
                                <div className="text-xs text-muted">Estatistica</div>
                                <div className="text-sm font-medium">{test.statistic.toFixed(2)}</div>
                            </div>
                            <div>
                                <div className="text-xs text-muted">p-valor</div>
                                <div className={`text-sm font-medium ${test.significant ? 'text-success' : ''}`}>
                                    {test.p_value < 0.001 ? '< 0.001' : test.p_value.toFixed(4)}
                                </div>
                            </div>
                            {test.effect_size != null && (
                                <div>
                                    <div className="text-xs text-muted">{test.effect_size_name}</div>
                                    <div className="text-sm font-medium">{test.effect_size.toFixed(3)}</div>
                                </div>
                            )}
                            {test.effect_size_interpretation && (
                                <div>
                                    <div className="text-xs text-muted">Efeito</div>
                                    <div className="text-sm font-medium capitalize">{test.effect_size_interpretation}</div>
                                </div>
                            )}
                        </div>

                        <p className="text-xs text-secondary">{test.interpretation}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
