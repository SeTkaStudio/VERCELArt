import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { MenuPage } from './components/MenuPage';
import { PhotoGenerationPage } from './components/PhotoGenerationPage';
import { FaceSelectionPage } from './components/FaceSelectionPage';
import { UserLoginPage } from './components/UserLoginPage';
import { LoginPage } from './components/LoginPage';
import { AdminPage } from './components/AdminPage';
import { EditingPage } from './components/EditingPage';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CreditsDisplay } from './components/CreditsDisplay';
import { ProfilePage } from './components/ProfilePage';
import { FavoritesPage } from './components/FavoritesPage';
import { GeneratedImage } from './types';


const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

interface AppRouterProps {
  adapterImages: GeneratedImage[];
  setAdapterImages: React.Dispatch<React.SetStateAction<GeneratedImage[]>>;
  generationImageBatches: GeneratedImage[][];
  setGenerationImageBatches: React.Dispatch<React.SetStateAction<GeneratedImage[][]>>;
  faceImage: GeneratedImage | null;
  setFaceImage: React.Dispatch<React.SetStateAction<GeneratedImage | null>>;
  faceVariations: GeneratedImage[];
  setFaceVariations: React.Dispatch<React.SetStateAction<GeneratedImage[]>>;
  faceEmotionCache: Record<string, GeneratedImage>;
  setFaceEmotionCache: React.Dispatch<React.SetStateAction<Record<string, GeneratedImage>>>;
  editingImages: GeneratedImage[];
  setEditingImages: React.Dispatch<React.SetStateAction<GeneratedImage[]>>;
}

const AppRouter: React.FC<AppRouterProps> = ({
    adapterImages,
    setAdapterImages,
    generationImageBatches,
    setGenerationImageBatches,
    faceImage,
    setFaceImage,
    faceVariations,
    setFaceVariations,
    faceEmotionCache,
    setFaceEmotionCache,
    editingImages,
    setEditingImages,
}) => {
    const { isAuthenticated, logout } = useAuth();
    const [page, setPage] = useState('menu');

    useEffect(() => {
        if (!isAuthenticated) {
            setPage('menu');
        }
    }, [isAuthenticated]);

    if (!isAuthenticated) {
        return <UserLoginPage />;
    }
    
    const navigateTo = (targetPage: string) => setPage(targetPage);
    
    const navigateToMenu = () => setPage('menu');
    const navigateToAdapter = () => navigateTo('adapter');
    const navigateToGeneration = () => navigateTo('generation');
    const navigateToFaceSelection = () => navigateTo('faceSelection');
    const navigateToProfile = () => navigateTo('profile');
    const navigateToFavorites = () => navigateTo('favorites');
    const navigateToEditing = () => navigateTo('editing');

    const handleLogout = () => {
        logout();
        setPage('menu');
    };

    let currentPage;
    switch (page) {
        case 'menu':
            currentPage = <MenuPage onNavigateToAdapter={navigateToAdapter} onNavigateHome={navigateToMenu} onNavigateToGeneration={navigateToGeneration} onNavigateToFaceSelection={navigateToFaceSelection} onNavigateToEditing={navigateToEditing} />;
            break;
        case 'adapter':
            currentPage = <App onNavigateHome={navigateToMenu} images={adapterImages} setImages={setAdapterImages} />;
            break;
        case 'generation':
            currentPage = <PhotoGenerationPage onNavigateBack={navigateToMenu} imageBatches={generationImageBatches} setImageBatches={setGenerationImageBatches} />;
            break;
        case 'faceSelection':
            currentPage = <FaceSelectionPage 
                onNavigateBack={navigateToMenu}
                generatedImageObject={faceImage}
                setGeneratedImageObject={setFaceImage}
                variations={faceVariations}
                setVariations={setFaceVariations}
                emotionCache={faceEmotionCache}
                setEmotionCache={setFaceEmotionCache}
            />;
            break;
        case 'editing':
            currentPage = <EditingPage onNavigateBack={navigateToMenu} images={editingImages} setImages={setEditingImages} />;
            break;
        case 'profile':
            currentPage = <ProfilePage onNavigateBack={navigateToMenu} />;
            break;
        case 'favorites':
            currentPage = <FavoritesPage onNavigateBack={navigateToMenu} />;
            break;
        default:
            currentPage = <MenuPage onNavigateToAdapter={navigateToAdapter} onNavigateHome={navigateToMenu} onNavigateToGeneration={navigateToGeneration} onNavigateToFaceSelection={navigateToFaceSelection} onNavigateToEditing={navigateToEditing} />;
    }

    return (
        <>
            <CreditsDisplay onLogout={handleLogout} onProfileClick={navigateToProfile} onFavoritesClick={navigateToFavorites} />
            {currentPage}
        </>
    );
};


const Main: React.FC = () => {
  type View = 'app' | 'login' | 'admin';
  const [view, setView] = useState<View>('app');

  // State for generated images, lifted up to preserve state across views
  const [adapterImages, setAdapterImages] = useState<GeneratedImage[]>([]);
  const [generationImageBatches, setGenerationImageBatches] = useState<GeneratedImage[][]>([]);
  const [faceImage, setFaceImage] = useState<GeneratedImage | null>(null);
  const [faceVariations, setFaceVariations] = useState<GeneratedImage[]>([]);
  const [faceEmotionCache, setFaceEmotionCache] = useState<Record<string, GeneratedImage>>({});
  const [editingImages, setEditingImages] = useState<GeneratedImage[]>([]);


  useEffect(() => {
    const determineView = () => {
      if (window.location.hash === '#admin') {
        // Проверяем, есть ли в sessionStorage флаг админа
        if (sessionStorage.getItem('isAdminAuthenticated')) {
            setView('admin');
        } else {
            setView('login');
        }
      } else {
        setView('app');
      }
    };

    determineView();
    window.addEventListener('hashchange', determineView);
    return () => window.removeEventListener('hashchange', determineView);
  }, []);
  
  const handleLoginSuccess = () => {
      sessionStorage.setItem('isAdminAuthenticated', 'true');
      setView('admin');
  };
  
  const handleAdminLogout = () => {
      sessionStorage.removeItem('isAdminAuthenticated');
      window.location.hash = '';
      setView('app');
  };
  
  switch (view) {
    case 'login':
      return <LoginPage onLoginSuccess={handleLoginSuccess} />;
    case 'admin':
      return <AdminPage onLogout={handleAdminLogout} />;
    case 'app':
    default:
      return <AppRouter
        adapterImages={adapterImages}
        setAdapterImages={setAdapterImages}
        generationImageBatches={generationImageBatches}
        setGenerationImageBatches={setGenerationImageBatches}
        faceImage={faceImage}
        setFaceImage={setFaceImage}
        faceVariations={faceVariations}
        setFaceVariations={setFaceVariations}
        faceEmotionCache={faceEmotionCache}
        setFaceEmotionCache={setFaceEmotionCache}
        editingImages={editingImages}
        setEditingImages={setEditingImages}
      />;
  }
};


const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AuthProvider>
        <Main />
    </AuthProvider>
  </React.StrictMode>
);