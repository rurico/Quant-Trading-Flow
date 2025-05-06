'use client';
import type { ReactNode } from 'react';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { FontSize } from '@/types/flow';
import { loader } from '@monaco-editor/react'; // 导入 loader

type Theme = 'light' | 'dark';

interface ThemeProviderState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  fontSize: FontSize;
  setFontSize: (fontSize: FontSize) => void;
}

const initialState: ThemeProviderState = {
  theme: 'light',
  setTheme: () => null,
  fontSize: 'medium', // 默认字体大小更改为 'medium'
  setFontSize: () => null,
};

const ThemeContext = createContext<ThemeProviderState>(initialState);

// 更新 FONT_SIZE_MAP 以确保 'medium' 是 16px
export const FONT_SIZE_MAP: Record<FontSize, string> = {
  small: '12px',
  default: '14px',
  medium: '16px',
  large: '18px',
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, _setTheme] = useState<Theme>('light');
  const [fontSize, _setFontSize] = useState<FontSize>('medium'); // 默认值设为 'medium'

  useEffect(() => {
    // 配置 Monaco Editor Loader
    // 这个 effect 只在客户端运行，并且只运行一次
    // 使用一个静态变量来确保 loader.config 只被调用一次
    if (typeof window !== 'undefined' && !(window as any).__monaco_loader_configured) {
      try {
        // console.log('尝试配置 Monaco Editor Loader 使用 CDN 版本 0.52.2');
        loader.config({ paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs' } }); // 更新 CDN 版本
        (window as any).__monaco_loader_configured = true; // 标记为已配置
      } catch (error) {
        console.error("配置 Monaco Editor loader 失败:", error);
      }
    }
  }, []); // 空依赖数组确保只运行一次

  // 初始化主题
  useEffect(() => {
    const storedTheme = localStorage.getItem('theme') as Theme | null;
    if (storedTheme && (storedTheme === 'light' || storedTheme === 'dark')) {
      _setTheme(storedTheme);
    } else {
      _setTheme('light'); 
    }
  }, []);

  // 初始化字体大小
  useEffect(() => {
    const storedFontSize = localStorage.getItem('fontSize') as FontSize | null;
    if (storedFontSize && FONT_SIZE_MAP[storedFontSize]) {
      _setFontSize(storedFontSize);
    } else {
      _setFontSize('medium'); // 默认值设为 'medium'
    }
  }, []);

  // 应用主题
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // 应用字体大小
  useEffect(() => {
    const root = window.document.documentElement;
    root.style.fontSize = FONT_SIZE_MAP[fontSize];
    localStorage.setItem('fontSize', fontSize);
  }, [fontSize]);

  const setTheme = useCallback((newTheme: Theme) => {
    _setTheme(newTheme);
  }, []);

  const setFontSize = useCallback((newFontSize: FontSize) => {
    _setFontSize(newFontSize);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, fontSize, setFontSize }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
