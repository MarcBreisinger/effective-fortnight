import React, { createContext, useState, useContext, useCallback } from 'react';
import { translations } from '../i18n/translations';

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export const LanguageProvider = ({ children }) => {
  // Get initial language from localStorage or default to German
  const [language, setLanguageState] = useState(() => {
    const saved = localStorage.getItem('language');
    return saved || 'de';
  });

  const setLanguage = useCallback((lang) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
  }, []);

  // Listen for language changes from AuthContext (when user logs in)
  React.useEffect(() => {
    const handleLanguageChanged = (event) => {
      setLanguageState(event.detail);
    };
    window.addEventListener('languageChanged', handleLanguageChanged);
    return () => window.removeEventListener('languageChanged', handleLanguageChanged);
  }, []);

  const toggleLanguage = useCallback(() => {
    const newLang = language === 'en' ? 'de' : 'en';
    setLanguage(newLang);
  }, [language, setLanguage]);

  const t = useCallback((key, params = {}) => {
    // Support nested keys like "activityLog.slotGivenUp"
    const keys = key.split('.');
    let translation = translations[language];
    
    // Navigate through nested objects
    for (const k of keys) {
      if (translation && typeof translation === 'object' && k in translation) {
        translation = translation[k];
      } else {
        // Key not found, return the original key
        return key;
      }
    }
    
    // If translation is not a string, return the key
    if (typeof translation !== 'string') {
      return key;
    }
    
    // Replace {{param}} placeholders with actual values
    if (params) {
      Object.keys(params).forEach(param => {
        if (params[param] !== undefined && params[param] !== null) {
          translation = translation.replace(new RegExp(`{{${param}}}`, 'g'), params[param]);
        }
      });
    }
    
    return translation;
  }, [language]);

  const value = {
    language,
    setLanguage,
    toggleLanguage,
    t
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};
