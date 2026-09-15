
import React, { useEffect } from 'react';

export const Spinner = () => (
    <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1877F2]"></div>
    </div>
);

export const ProfessionalLoader: React.FC = () => {
    return (
        <div className="fixed inset-0 z-[500] bg-[#050B18] flex flex-col items-center justify-center font-sans overflow-hidden">
            {/* Background elements for depth */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#1877F2]/5 rounded-full blur-[120px] animate-pulse"></div>
            
            <div className="relative flex flex-col items-center animate-fade-in">
                {/* Logo Section */}
                <div className="flex items-center gap-3 mb-8">
                    <div className="relative">
                        <i className="fas fa-globe-americas text-[#1877F2] text-[50px] animate-[spin_8s_linear_infinite]"></i>
                        <div className="absolute inset-0 bg-[#1877F2]/20 blur-xl rounded-full scale-150 animate-pulse"></div>
                    </div>
                    <h1 className="text-[42px] font-black bg-gradient-to-r from-[#1877F2] to-[#1D8AF2] text-transparent bg-clip-text tracking-tighter">
                        UNERA
                    </h1>
                </div>

                {/* Sailing Track */}
                <div className="w-64 h-[4px] bg-[#0F172A] rounded-full overflow-hidden relative">
                    {/* The "Sailor" - a highlight that glides back and forth */}
                    <div className="absolute top-0 bottom-0 w-24 bg-gradient-to-r from-transparent via-[#1877F2] to-transparent animate-[sail_2s_ease-in-out_infinite]"></div>
                    
                    {/* Progress Fill */}
                    <div className="h-full bg-[#1877F2]/30 w-full animate-pulse"></div>
                </div>

                <div className="mt-6 flex flex-col items-center">
                    <p className="text-[#94A3B8] text-sm font-black uppercase tracking-[0.3em] opacity-50 animate-pulse">
                        Connecting your world
                    </p>
                    <div className="flex gap-1.5 mt-3">
                        <div className="w-1.5 h-1.5 bg-[#1877F2] rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                        <div className="w-1.5 h-1.5 bg-[#1877F2] rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                        <div className="w-1.5 h-1.5 bg-[#1877F2] rounded-full animate-bounce"></div>
                    </div>
                </div>
            </div>

            {/* Custom Keyframes in Style Tag */}
            <style>{`
                @keyframes sail {
                    0% { transform: translateX(-100%); }
                    50% { transform: translateX(180%); }
                    100% { transform: translateX(-100%); }
                }
            `}</style>
        </div>
    );
};

interface ImageViewerProps {
    imageUrl: string;
    onClose: () => void;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({ imageUrl, onClose }) => {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    return (
        <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center animate-fade-in" onClick={onClose}>
            <div className="absolute top-4 right-4 w-10 h-10 bg-[#1E293B] hover:bg-[#334155] rounded-full flex items-center justify-center cursor-pointer transition-colors z-50" onClick={onClose}>
                <i className="fas fa-times text-[#F8FAFC] text-xl"></i>
            </div>
            <img src={imageUrl} alt="Full screen" className="max-w-full max-h-screen object-contain shadow-2xl cursor-default" onClick={(e) => e.stopPropagation()} />
        </div>
    );
};
