
import React from 'react';
import { ArrowRight, ArrowLeft, SkipForward } from 'lucide-react';

interface WizardNavProps {
    onBack?: () => void;
    onNext?: () => void;
    onSkip?: () => void;
    canNext?: boolean;
    isLastStep?: boolean;
    nextLabel?: string;
    backLabel?: string;
    skipLabel?: string;
    showSkip?: boolean;
}

export const WizardNav: React.FC<WizardNavProps> = ({
    onBack,
    onNext,
    onSkip,
    canNext = true,
    isLastStep = false,
    nextLabel = 'Next',
    backLabel = 'Back',
    skipLabel = 'Skip Step',
    showSkip = false
}) => {
    return (
        <div className="flex items-center justify-between mt-8 pt-4 border-t border-slate-100 dark:border-slate-700">
            <div>
                {onBack && (
                    <button 
                        onClick={onBack}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors"
                    >
                        <ArrowLeft size={16} />
                        {backLabel}
                    </button>
                )}
            </div>
            <div className="flex gap-2">
                {showSkip && onSkip && (
                    <button 
                        onClick={onSkip}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                    >
                        <SkipForward size={16} />
                        {skipLabel}
                    </button>
                )}
                {onNext && (
                    <button 
                        onClick={onNext}
                        disabled={!canNext}
                        className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold text-white transition-all ${
                            canNext 
                                ? 'bg-scada-accent hover:bg-sky-400 shadow-md hover:shadow-lg' 
                                : 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed'
                        }`}
                    >
                        {nextLabel}
                        {!isLastStep && <ArrowRight size={16} />}
                    </button>
                )}
            </div>
        </div>
    );
};
