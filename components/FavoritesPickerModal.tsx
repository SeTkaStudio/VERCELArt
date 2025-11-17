import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import * as imageDBService from '../services/imageDBService';
import { GeneratedImage, ResolutionOption } from '../types';

const CloseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>;
const FolderIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-brand-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>;
const BackIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>;
const LoadingSpinner = () => <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-accent"></div>;


interface FavoritesPickerModalProps {
  onClose: () => void;
  onImageSelect: (image: GeneratedImage) => void;
}

const getImageResolutionOption = async (src: string): Promise<ResolutionOption> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const ratio = img.width / img.height;
            if (ratio > 1.2) resolve(ResolutionOption.Landscape);
            if (ratio < 0.8) resolve(ResolutionOption.Portrait);
            resolve(ResolutionOption.Square);
        };
        img.onerror = () => resolve(ResolutionOption.Square);
        img.src = src;
    });
};

export const FavoritesPickerModal: React.FC<FavoritesPickerModalProps> = ({ onClose, onImageSelect }) => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'photos' | 'avatars'>('photos');
  const [activeFolderId, setActiveFolderId] = useState<string | 'root'>('root');
  const [imageObjects, setImageObjects] = useState<GeneratedImage[]>([]);
  const [isLoadingImages, setIsLoadingImages] = useState(true);

  const favorites = useMemo(() => currentUser?.favorites || { photos: { root: [], folders: [] }, avatars: { root: [], folders: [] } }, [currentUser]);
  const currentCategory = useMemo(() => favorites[activeTab], [favorites, activeTab]);

  useEffect(() => {
    const fetchImages = async () => {
        setIsLoadingImages(true);
        const sourceIds = activeFolderId === 'root'
            ? currentCategory.root
            : currentCategory.folders.find(f => f.id === activeFolderId)?.images || [];
        
        const fetchedImages = await Promise.all(
            sourceIds.map(async (id) => {
                const src = await imageDBService.getImage(id);
                if (!src) return null;
                return {
                    id: id,
                    src,
                    prompt: 'Избранное изображение',
                    status: 'success' as const,
                    resolution: await getImageResolutionOption(src),
                    backgroundPrompt: '',
                };
            })
        );
        setImageObjects(fetchedImages.filter(Boolean) as GeneratedImage[]);
        setIsLoadingImages(false);
    };
    fetchImages();
  }, [currentCategory, activeFolderId]);

  const handleTabChange = (tab: 'photos' | 'avatars') => {
    setActiveTab(tab);
    setActiveFolderId('root');
  };
  
  const folderName = activeFolderId === 'root' ? null : currentCategory.folders.find(f => f.id === activeFolderId)?.name;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 backdrop-blur-sm z-50 flex justify-center items-center p-4" onClick={onClose}>
      <div className="bg-brand-secondary p-4 md:p-6 rounded-lg shadow-xl w-full max-w-4xl h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex-shrink-0 flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">Выбрать из избранного</h3>
          <button onClick={onClose} className="text-brand-text-secondary hover:text-white"><CloseIcon /></button>
        </div>
        
        <div className="flex-shrink-0 border-b border-brand-secondary mb-4">
            <nav className="flex space-x-2">
                <button onClick={() => handleTabChange('photos')} className={`flex-1 text-center py-2 px-4 text-sm font-medium ${activeTab === 'photos' ? 'border-b-2 border-brand-accent text-brand-accent' : 'text-brand-text-secondary hover:text-brand-text-primary'}`}>Мои Фото</button>
                <button onClick={() => handleTabChange('avatars')} className={`flex-1 text-center py-2 px-4 text-sm font-medium ${activeTab === 'avatars' ? 'border-b-2 border-brand-accent text-brand-accent' : 'text-brand-text-secondary hover:text-brand-text-primary'}`}>Мои Аватары</button>
            </nav>
        </div>

        <div className="flex-grow overflow-y-auto">
            <div className="flex items-center text-sm mb-4">
              {activeFolderId !== 'root' && (
                <button onClick={() => setActiveFolderId('root')} className="flex items-center text-brand-accent hover:underline mr-2">
                  <BackIcon />
                  Все папки
                </button>
              )}
              {folderName && <span className="text-brand-text-secondary">&gt; {folderName}</span>}
            </div>

            {isLoadingImages ? (
                <div className="flex justify-center items-center h-full"><LoadingSpinner /></div>
            ) : activeFolderId === 'root' ? (
                 <div className="space-y-2">
                    {currentCategory.folders.map(folder => (
                        <button key={folder.id} onClick={() => setActiveFolderId(folder.id)} className="w-full flex items-center p-3 rounded-md text-left bg-brand-primary hover:bg-slate-700 transition-colors">
                           <FolderIcon />
                           <span>{folder.name} ({folder.images.length})</span>
                        </button>
                    ))}
                    {currentCategory.root.length > 0 && (
                        <div className="pt-2 mt-2 border-t border-brand-secondary/50">
                             <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                                {imageObjects.filter(img => currentCategory.root.includes(img.id)).map(image => (
                                    <div key={image.id} className="aspect-square bg-brand-primary rounded-md overflow-hidden cursor-pointer group" onClick={() => onImageSelect(image)}>
                                        <img src={image.src!} alt="Favorite" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                imageObjects.length > 0 ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                        {imageObjects.map(image => (
                            <div key={image.id} className="aspect-square bg-brand-primary rounded-md overflow-hidden cursor-pointer group" onClick={() => onImageSelect(image)}>
                                <img src={image.src!} alt="Favorite" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16 text-brand-text-secondary">
                        <p>В этой папке нет изображений.</p>
                    </div>
                )
            )}
        </div>
      </div>
    </div>
  );
};
