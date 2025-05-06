// src/store/tabs-store.ts
'use client';

import type { TabItem } from '@/types/flow';
import { BehaviorSubject } from 'rxjs';
import { nanoid } from '@/lib/nanoid';

const defaultFlowCanvasTab: TabItem = {
  id: 'flow-canvas-main',
  title: '流程画布', 
  type: 'flow-canvas',
  closable: false,
  fixed: true,
};

const initialServerTabs: TabItem[] = [defaultFlowCanvasTab];
const initialServerActiveTabId: string | null = defaultFlowCanvasTab.id;

const tabsSubject = new BehaviorSubject<TabItem[]>(initialServerTabs);
const activeTabIdSubject = new BehaviorSubject<string | null>(initialServerActiveTabId);
const matplotlibImageToShow$ = new BehaviorSubject<string | null>(null); // 用于显示 Matplotlib 图像

const initialActiveToolTabId: 'terminal' | 'console' = 'terminal';
const activeToolTabIdSubject = new BehaviorSubject<'terminal' | 'console'>(initialActiveToolTabId);

tabsSubject.subscribe(tabs => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('openTabs', JSON.stringify(tabs));
  }
});

activeTabIdSubject.subscribe(activeId => {
  if (typeof window !== 'undefined') {
    if (activeId) {
      localStorage.setItem('activeTabId', activeId);
    } else {
      localStorage.removeItem('activeTabId');
    }
  }
});

activeToolTabIdSubject.subscribe(activeToolTabId => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('activeToolTabId', activeToolTabId);
  }
});


function rehydrateStateFromLocalStorage(translateFunction: (key: string, params?: Record<string, string | number>) => string) {
  if (typeof window === 'undefined') return;

  const storedActiveTabId = localStorage.getItem('activeTabId');
  const storedTabsJson = localStorage.getItem('openTabs');
  const storedActiveToolTabId = localStorage.getItem('activeToolTabId') as 'terminal' | 'console' | null;
  
  const i18nDefaultFlowCanvasTab: TabItem = {
    ...defaultFlowCanvasTab,
    title: translateFunction('appLayout.tabs.flowCanvasTitle', { flowName: translateFunction('header.untitledFlow') }) || defaultFlowCanvasTab.title,
  };

  let rehydratedTabs: TabItem[] = [i18nDefaultFlowCanvasTab];
  let rehydratedActiveTabId: string | null = i18nDefaultFlowCanvasTab.id;

  if (storedTabsJson) {
    try {
      const parsedTabs = JSON.parse(storedTabsJson) as TabItem[];
      const otherTabs = parsedTabs.filter(tab => tab.id !== defaultFlowCanvasTab.id && tab.type !== 'matplotlib-figure'); // 不恢复图像标签页
      rehydratedTabs = [i18nDefaultFlowCanvasTab, ...otherTabs];
      
    } catch (e) {
      console.error("解析存储的标签页数据失败 (rehydrate):", e);
    }
  }
  
  tabsSubject.next(rehydratedTabs); 

  if (storedActiveTabId && rehydratedTabs.some(tab => tab.id === storedActiveTabId)) {
    rehydratedActiveTabId = storedActiveTabId;
  } else if (rehydratedTabs.length > 0) {
    rehydratedActiveTabId = rehydratedTabs[0].id;
  }
  
  activeTabIdSubject.next(rehydratedActiveTabId);

  if (storedActiveToolTabId && (storedActiveToolTabId === 'terminal' || storedActiveToolTabId === 'console')) {
    activeToolTabIdSubject.next(storedActiveToolTabId);
  } else {
    activeToolTabIdSubject.next('terminal');
  }
}


export const tabsService = {
  tabs$: tabsSubject.asObservable(),
  activeTabId$: activeTabIdSubject.asObservable(),
  activeToolTabId$: activeToolTabIdSubject.asObservable(),
  matplotlibImageToShow$: matplotlibImageToShow$.asObservable(), // 暴露图像数据

  getTabs: () => tabsSubject.getValue(),
  getActiveTabId: () => activeTabIdSubject.getValue(),
  getActiveToolTabId: () => activeToolTabIdSubject.getValue(),
  
  rehydrateState: rehydrateStateFromLocalStorage, 

  addTab: (tabData: Omit<TabItem, 'id' | 'fixed'> & { closable?: boolean, fixed?: boolean }): string => {
    const existingTabs = tabsSubject.getValue();
    
    let newTabId: string;
    if (tabData.type === 'code-preview' && tabData.flowId) {
        newTabId = `preview-${tabData.flowId}`;
    } else if (tabData.type === 'matplotlib-figure') {
        newTabId = tabData.figureId || `figure-${nanoid(8)}`; // 使用提供的 figureId 或生成新的
    } else {
        newTabId = `tab_${nanoid(8)}`;
    }


    const existingTab = existingTabs.find(tab => tab.id === newTabId);
    if (existingTab) {
        // 如果是图像标签页且图像数据不同，则更新现有标签页
        if (existingTab.type === 'matplotlib-figure' && tabData.type === 'matplotlib-figure' && existingTab.imageDataUri !== tabData.imageDataUri) {
             const updatedTabs = existingTabs.map(t => t.id === newTabId ? { ...t, imageDataUri: tabData.imageDataUri, title: tabData.title } : t);
             tabsSubject.next(updatedTabs);
        }
        tabsService.setActiveTab(existingTab.id);
        return existingTab.id;
    }

    const newTab: TabItem = {
      id: newTabId,
      fixed: tabData.fixed ?? false,
      closable: tabData.closable ?? true,
      createdAt: Date.now(),
      ...tabData,
    };

    tabsSubject.next([...existingTabs, newTab]);
    tabsService.setActiveTab(newTab.id);
    return newTab.id;
  },

  closeTab: (tabId: string) => {
    const currentTabs = tabsSubject.getValue();
    const tabToClose = currentTabs.find(tab => tab.id === tabId);

    if (!tabToClose || tabToClose.fixed || !tabToClose.closable) return;

    const newTabs = currentTabs.filter(tab => tab.id !== tabId);
    tabsSubject.next(newTabs);

    if (activeTabIdSubject.getValue() === tabId) {
      if (newTabs.length > 0) {
        const closingTabIndex = currentTabs.findIndex(tab => tab.id === tabId);
        let newActiveIndex = Math.max(0, closingTabIndex -1);
        // 确保新索引在 newTabs 的范围内
        if (newActiveIndex >= newTabs.length) {
            newActiveIndex = newTabs.length - 1;
        }
        const newActiveTab = newTabs[newActiveIndex] || newTabs[0]; // 以防万一
        activeTabIdSubject.next(newActiveTab.id);
      } else {
        activeTabIdSubject.next(null); 
      }
    }
  },

  setActiveTab: (tabId: string | null) => {
    const currentTabs = tabsSubject.getValue();
    if (tabId && currentTabs.some(tab => tab.id === tabId)) {
      activeTabIdSubject.next(tabId);
    } else if (currentTabs.length > 0) {
      activeTabIdSubject.next(currentTabs[0].id);
    } else {
        activeTabIdSubject.next(null); 
    }
  },

  setActiveToolTab: (toolTabId: 'terminal' | 'console') => {
    activeToolTabIdSubject.next(toolTabId);
  },
  
  updateFlowCanvasTabTitle: (newTitle: string) => {
    const currentTabs = [...tabsSubject.getValue()]; 
    const flowCanvasTabIndex = currentTabs.findIndex(tab => tab.id === 'flow-canvas-main');
    if (flowCanvasTabIndex !== -1 && currentTabs[flowCanvasTabIndex].title !== newTitle) {
      currentTabs[flowCanvasTabIndex] = { ...currentTabs[flowCanvasTabIndex], title: newTitle };
      tabsSubject.next(currentTabs);
    }
  },

  displayMatplotlibImage: (imageDataUri: string, flowId?: string) => {
    matplotlibImageToShow$.next(imageDataUri);
    // 可选：立即清除，以便下次可以再次触发，或者由 TabsManager 在处理后清除
    // setTimeout(() => matplotlibImageToShow$.next(null), 0); 
  },

  clearMatplotlibImage: () => { // 添加一个方法来清除图像，防止重复打开
    matplotlibImageToShow$.next(null);
  }
};
