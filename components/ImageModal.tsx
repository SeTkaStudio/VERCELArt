import React, { useState, useRef, MouseEvent, WheelEvent, useEffect } from 'react';
import { GeneratedImage } from '../types';

interface ImageModalProps {
  image: GeneratedImage;
  onClose: () => void;
  onDownload: (src: string) => void;
  onRegenerate: (id: string) => void;
  onDelete: (id: string) => void;
  isFavorite: boolean;
  onAddToFavorites: (imageSrc: string) => void;
  onRemoveFromFavorites: (imageSrc: string) => void;
  showRegenerate?: boolean;
  isInteractive?: boolean;
}

const DownloadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>;
const RegenerateIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h5M20 20v-5h-5M4 4l16 16" transform="rotate(90 12 12)"/></svg>;
const DeleteIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
const CloseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>;
const StarIcon = ({ isFavorite }: { isFavorite: boolean }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${isFavorite ? 'text-yellow-400' : 'text-brand-text-primary'}`} viewBox="0 0 20 20" fill="currentColor">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
);


export const ImageModal: React.FC<ImageModalProps> = ({ image, onClose, onDownload, onRegenerate, onDelete, isFavorite, onAddToFavorites, onRemoveFromFavorites, showRegenerate = true, isInteractive = false }) => {
  if (!image.src) return null;
  
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (isInteractive) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    }
  }, [image.src, isInteractive]);


  const handleDelete = () => {
    onDelete(image.id);
    onClose();
  };

  const handleFavoriteClick = () => {
    if (isFavorite) {
        onRemoveFromFavorites(image.src!);
    } else {
        onAddToFavorites(image.src!);
    }
  }
  
  const handleWheel = (e: WheelEvent<HTMLDivElement>) => {
    if (!isInteractive) return;
    e.preventDefault();
    const zoomSpeed = 0.1;
    setScale(s => Math.max(0.2, Math.min(5, s - e.deltaY * zoomSpeed * 0.1)));
  };

  const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    if (!isInteractive) return;
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  };

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!isInteractive || !isDragging) return;
    e.preventDefault();
    setPosition({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y
    });
  };

  const handleMouseUpOrLeave = () => {
    if (!isInteractive) return;
    setIsDragging(false);
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-80 backdrop-blur-sm z-50 flex justify-center items-center p-4 transition-opacity duration-300"
      onClick={onClose}
    >
      <div 
        className="bg-brand-secondary rounded-lg shadow-2xl w-full max-w-4xl max-h-full flex flex-col relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute -top-4 -right-4 text-white bg-brand-primary rounded-full p-2 z-10 hover:bg-slate-600 transition-colors" title="Закрыть">
            <CloseIcon />
        </button>
        <div
            className="flex-grow p-4 flex items-center justify-center"
            style={isInteractive ? { cursor: isDragging ? 'grabbing' : 'grab', overflow: 'hidden' } : {}}
            onWheel={isInteractive ? handleWheel : undefined}
            onMouseDown={isInteractive ? handleMouseDown : undefined}
            onMouseMove={isInteractive ? handleMouseMove : undefined}
            onMouseUp={isInteractive ? handleMouseUpOrLeave : undefined}
            onMouseLeave={isInteractive ? handleMouseUpOrLeave : undefined}
        >
             <div className="relative inline-block">
                <img 
                    src={image.src} 
                    alt={image.prompt} 
                    className={isInteractive ? "rounded-md" : "w-full h-auto object-contain max-h-[70vh] rounded-md"}
                    style={isInteractive ? { 
                        transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`, 
                        transition: isDragging ? 'none' : 'transform 0.1s ease-out',
                        willChange: 'transform'
                    } : {}}
                    onDragStart={(e) => e.preventDefault()}
                />
                <button
                    onClick={handleFavoriteClick}
                    title={isFavorite ? "Убрать из избранного" : "Добавить в избранное"}
                    className="absolute top-2 right-2 z-10 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                >
                    <StarIcon isFavorite={isFavorite} />
                </button>
            </div>
        </div>
        <div className="flex-shrink-0 p-4 bg-brand-secondary/50 border-t border-brand-primary/50">
          <p className="text-sm text-brand-text-secondary mb-4">{image.prompt}</p>
          <div className="flex justify-center items-center gap-4">
             <button onClick={() => onDownload(image.src!)} title="Скачать" className="flex items-center gap-2 text-sm bg-slate-600 hover:bg-slate-500 text-brand-text-primary font-semibold py-2 px-4 rounded-md transition-colors"><DownloadIcon /><span>Скачать</span></button>
             {showRegenerate && (
                <button 
                    onClick={() => onRegenerate(image.id)} 
                    title="Перегенерировать"
                    className="flex items-center gap-2 text-sm bg-slate-600 hover:bg-slate-500 text-brand-text-primary font-semibold py-2 px-4 rounded-md transition-colors"
                >
                    <RegenerateIcon /><span>Заново</span>
                </button>
             )}
             <button onClick={handleDelete} title="Удалить" className="flex items-center gap-2 text-sm bg-red-800 hover:bg-red-700 text-brand-text-primary font-semibold py-2 px-4 rounded-md transition-colors"><DeleteIcon /><span>Удалить</span></button>
          </div>
        </div>
      </div>
    </div>
  );
};
