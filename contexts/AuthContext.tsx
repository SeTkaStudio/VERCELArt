import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import * as authService from '../services/authService';
import * as imageDBService from '../services/imageDBService';
import type { User } from '../services/authService';

const ACTIVE_USER_KEY = 'setka_active_user';
const ADMIN_SESSION_KEY = 'isAdminAuthenticated';

interface AuthContextType {
  isAuthenticated: boolean;
  currentUser: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  decrementCredits: (amount: number) => Promise<boolean>;
  redeemPromoCode: (promoCode: string) => Promise<{ success: boolean; message: string }>;
  updateUserApiKey: (apiKey: string) => Promise<boolean>;
  updatePaymentMethod: (method: 'credits' | 'apiKey') => Promise<boolean>;
  addFavorite: (imageUrl: string, category: 'photos' | 'avatars', folderId: string | 'root') => Promise<void>;
  removeFavorite: (imageUrl: string) => Promise<void>;
  isFavorite: (imageUrl: string) => boolean;
  createFolder: (category: 'photos' | 'avatars', folderName: string) => Promise<{ success: boolean, newFolderId?: string }>;
  renameFolder: (category: 'photos' | 'avatars', folderId: string, newName: string) => Promise<boolean>;
  deleteFolder: (category: 'photos' | 'avatars', folderId: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [favoriteMap, setFavoriteMap] = useState<Map<string, string>>(new Map()); // Map<src, id>

  // Effect to handle initial auth check and hash changes
  useEffect(() => {
    const checkAuth = () => {
        const savedUsername = sessionStorage.getItem(ACTIVE_USER_KEY);
        const isAdminSessionActive = !!sessionStorage.getItem(ADMIN_SESSION_KEY);
        const isAppView = window.location.hash !== '#admin';
        
        const adminUser = authService.findUser('SeTkaProject');
        if (isAdminSessionActive && adminUser) {
            const userToSet = isAppView ? { ...adminUser, username: 'Admin' } : adminUser;
            setCurrentUser(userToSet);
            if (sessionStorage.getItem(ACTIVE_USER_KEY) !== 'SeTkaProject') {
                sessionStorage.setItem(ACTIVE_USER_KEY, 'SeTkaProject');
            }
        } else if (savedUsername) {
            const user = authService.findUser(savedUsername);
            setCurrentUser(user || null);
        } else {
            setCurrentUser(null);
        }
    };
    checkAuth();
    window.addEventListener('hashchange', checkAuth);
    return () => window.removeEventListener('hashchange', checkAuth);
  }, []);

  // One-time migration effect for old base64 favorites
  useEffect(() => {
    const migrateFavorites = async () => {
      if (!currentUser || !currentUser.favorites) return;
      const { photos, avatars } = currentUser.favorites;
      const imagesToMigrate = [
        ...(photos?.root || []), ...(photos?.folders || []).flatMap(f => f.images),
        ...(avatars?.root || []), ...(avatars?.folders || []).flatMap(f => f.images)
      ].filter(img => typeof img === 'string' && img.startsWith('data:image'));
      
      if (imagesToMigrate.length === 0) return;

      console.log(`Migrating ${imagesToMigrate.length} favorite images to IndexedDB...`);
      const newUser = JSON.parse(JSON.stringify(currentUser));

      for (const category of ['photos', 'avatars'] as const) {
          const cat = newUser.favorites[category];
          cat.root = await Promise.all(cat.root.map(async (img: string) => img.startsWith('data:image') ? await imageDBService.addImage(img) : img));
          for (const folder of cat.folders) {
              folder.images = await Promise.all(folder.images.map(async (img: string) => img.startsWith('data:image') ? await imageDBService.addImage(img) : img));
          }
      }
      const success = authService.updateUser(newUser);
      if (success) {
          console.log("Migration successful!");
          setCurrentUser(newUser);
      } else {
          console.error("Migration failed to save user.");
      }
    };
    migrateFavorites();
  }, [currentUser?.username]);

  // Effect to load all favorite image srcs into a map for fast checks
  useEffect(() => {
    const fetchFavorites = async () => {
        if (!currentUser?.favorites) {
            setFavoriteMap(new Map());
            return;
        }
        const { photos, avatars } = currentUser.favorites;
        const allFavoriteIds = [
            ...(photos?.root || []), ...(photos?.folders || []).flatMap(f => f.images),
            ...(avatars?.root || []), ...(avatars?.folders || []).flatMap(f => f.images)
        ].filter(id => typeof id === 'string' && !id.startsWith('data:image')); // Filter out non-migrated

        const newMap = new Map<string, string>();
        await Promise.all(allFavoriteIds.map(async id => {
            const src = await imageDBService.getImage(id);
            if (src) newMap.set(src, id);
        }));
        setFavoriteMap(newMap);
    };
    fetchFavorites();
  }, [currentUser?.favorites]);

  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    const user = authService.userLogin(username, password);
    if (user) {
      setCurrentUser(user);
      sessionStorage.setItem(ACTIVE_USER_KEY, user.username);
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    setCurrentUser(null);
    sessionStorage.removeItem(ACTIVE_USER_KEY);
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
  }, []);

  const decrementCredits = useCallback(async (amount: number): Promise<boolean> => {
    if (!currentUser || currentUser.username === 'Admin' || currentUser.credits < amount) {
      if (currentUser?.username === 'Admin') return true;
      return false;
    }
    const { success, updatedUser } = authService.useUserCredits(currentUser.username, amount);
    if (success && updatedUser) {
      setCurrentUser(updatedUser);
      return true;
    }
    return false;
  }, [currentUser]);

  const redeemPromoCode = useCallback(async (promoCode: string): Promise<{ success: boolean, message: string }> => {
    if (!currentUser) return { success: false, message: 'Пользователь не авторизован.' };
    const result = authService.redeemPromoCodeForUser(currentUser.username, promoCode);
    if (result.success && result.updatedUser) setCurrentUser(result.updatedUser);
    return { success: result.success, message: result.message };
  }, [currentUser]);

  const updateUserApiKey = useCallback(async (apiKey: string): Promise<boolean> => {
    if (!currentUser) return false;
    const updatedUser = { ...currentUser, apiKey };
    const success = authService.updateUser(updatedUser);
    if (success) setCurrentUser(updatedUser);
    return success;
  }, [currentUser]);

  const updatePaymentMethod = useCallback(async (method: 'credits' | 'apiKey'): Promise<boolean> => {
    if (!currentUser) return false;
    const updatedUser = { ...currentUser, paymentMethod: method };
    const success = authService.updateUser(updatedUser);
    if (success) setCurrentUser(updatedUser);
    return success;
  }, [currentUser]);

  const addFavorite = useCallback(async (imageUrl: string, category: 'photos' | 'avatars', folderId: string | 'root'): Promise<void> => {
    if (!currentUser || favoriteMap.has(imageUrl)) return;
    const imageId = await imageDBService.addImage(imageUrl);
    const usernameToUpdate = currentUser.username === 'Admin' ? 'SeTkaProject' : currentUser.username;
    const { success, updatedUser } = authService.addImageToFavorites(usernameToUpdate, imageId, category, folderId);
    if (success && updatedUser) {
      const userToSet = currentUser.username === 'Admin' ? { ...currentUser, favorites: updatedUser.favorites } : updatedUser;
      setCurrentUser(userToSet);
      setFavoriteMap(prev => new Map(prev).set(imageUrl, imageId));
    }
  }, [currentUser, favoriteMap]);

  const removeFavorite = useCallback(async (imageUrl: string): Promise<void> => {
    if (!currentUser) return;
    const imageIdToRemove = favoriteMap.get(imageUrl);
    if (!imageIdToRemove) return;
    
    await imageDBService.removeImage(imageIdToRemove);
    const usernameToUpdate = currentUser.username === 'Admin' ? 'SeTkaProject' : currentUser.username;
    const { success, updatedUser } = authService.removeImageFromFavorites(usernameToUpdate, imageIdToRemove);

    if (success && updatedUser) {
      const userToSet = currentUser.username === 'Admin' ? { ...currentUser, favorites: updatedUser.favorites } : updatedUser;
      setCurrentUser(userToSet);
      setFavoriteMap(prev => {
        const newMap = new Map(prev);
        newMap.delete(imageUrl);
        return newMap;
      });
    }
  }, [currentUser, favoriteMap]);

  const isFavorite = useCallback((imageUrl: string): boolean => {
    return favoriteMap.has(imageUrl);
  }, [favoriteMap]);

  const createFolder = useCallback(async (category: 'photos' | 'avatars', folderName: string): Promise<{ success: boolean, newFolderId?: string }> => {
    if (!currentUser) return { success: false };
    const usernameToUpdate = currentUser.username === 'Admin' ? 'SeTkaProject' : currentUser.username;
    const { success, updatedUser, newFolder } = authService.createFolder(usernameToUpdate, category, folderName);
    if (success && updatedUser && newFolder) {
      const userToSet = currentUser.username === 'Admin' ? { ...currentUser, favorites: updatedUser.favorites } : updatedUser;
      setCurrentUser(userToSet);
      return { success: true, newFolderId: newFolder.id };
    }
    return { success: false };
  }, [currentUser]);

  const renameFolder = useCallback(async (category: 'photos' | 'avatars', folderId: string, newName: string): Promise<boolean> => {
    if (!currentUser) return false;
    const usernameToUpdate = currentUser.username === 'Admin' ? 'SeTkaProject' : currentUser.username;
    const { success, updatedUser } = authService.renameFolder(usernameToUpdate, category, folderId, newName);
    if (success && updatedUser) {
      const userToSet = currentUser.username === 'Admin' ? { ...currentUser, favorites: updatedUser.favorites } : updatedUser;
      setCurrentUser(userToSet);
    }
    return success;
  }, [currentUser]);

  const deleteFolder = useCallback(async (category: 'photos' | 'avatars', folderId: string): Promise<boolean> => {
    if (!currentUser) return false;
    const usernameToUpdate = currentUser.username === 'Admin' ? 'SeTkaProject' : currentUser.username;
    const { success, updatedUser } = authService.deleteFolder(usernameToUpdate, category, folderId);
    if (success && updatedUser) {
      const userToSet = currentUser.username === 'Admin' ? { ...currentUser, favorites: updatedUser.favorites } : updatedUser;
      setCurrentUser(userToSet);
    }
    return success;
  }, [currentUser]);

  const value = {
    isAuthenticated: !!currentUser,
    currentUser,
    login,
    logout,
    decrementCredits,
    redeemPromoCode,
    updateUserApiKey,
    updatePaymentMethod,
    addFavorite,
    removeFavorite,
    isFavorite,
    createFolder,
    renameFolder,
    deleteFolder,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
