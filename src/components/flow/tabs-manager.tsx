// src/components/flow/tabs-manager.tsx
'use client';

import type { TabItem } from '@/types/flow';
import { useEffect, useState, useRef } from 'react';
import { tabsService } from '@/store/tabs-store';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { XIcon } from 'lucide-react';
import { FlowCanvas } from './flow-canvas';
import { CodePreviewPanel } from './code-preview-panel';
import { MatplotlibFigureDisplay } from './matplotlib-figure-display'; // 导入新组件
import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';
import { nanoid } from '@/lib/nanoid'; // 导入 nanoid 用于生成 figureId

export function TabsManager() {
  const [openTabs, setOpenTabs] = useState<TabItem[]>(tabsService.getTabs());
  const [activeTabId, setActiveTabId] = useState<string | null>(tabsService.getActiveTabId());
  const { t } = useTranslation();
  const isInitialMountRef = useRef(true);

  useEffect(() => {
    if (isInitialMountRef.current && typeof window !== 'undefined') {
      tabsService.rehydrateState(t);
      isInitialMountRef.current = false;
    }
  }, [t]);


  useEffect(() => {
    const tabsSub = tabsService.tabs$.subscribe(setOpenTabs);
    const activeTabSub = tabsService.activeTabId$.subscribe(setActiveTabId);
    
    // 订阅 Matplotlib 图像显示请求
    const imageSub = tabsService.matplotlibImageToShow$.subscribe(imageDataUri => {
      if (imageDataUri) {
        const figureId = nanoid(6); // 为图像生成一个简短的ID
        const tabTitle = t('appLayout.tabs.matplotlibFigureTitle', { figureId });
        const newTabId = tabsService.addTab({
          title: tabTitle,
          type: 'matplotlib-figure',
          imageDataUri: imageDataUri,
          figureId: figureId, // 将figureId传递给标签页项
          closable: true,
        });
        tabsService.setActiveTab(newTabId);
        tabsService.clearMatplotlibImage(); // 清除图像数据，防止重复打开
      }
    });

    return () => {
      tabsSub.unsubscribe();
      activeTabSub.unsubscribe();
      imageSub.unsubscribe(); // 取消订阅
    };
  }, [t]);
  
  const handleTabChange = (tabId: string) => {
    tabsService.setActiveTab(tabId);
  };

  const handleCloseTab = (e: React.MouseEvent | React.KeyboardEvent, tabId: string) => {
    e.stopPropagation(); 
    e.preventDefault(); 
    tabsService.closeTab(tabId);
  };

  useEffect(() => {
    if (!activeTabId && openTabs.length > 0) {
      tabsService.setActiveTab(openTabs[0].id);
    }
    else if (activeTabId && !openTabs.some(tab => tab.id === activeTabId) && openTabs.length > 0) {
      tabsService.setActiveTab(openTabs[0].id);
    } else if (openTabs.length === 0 && activeTabId) {
      // 如果所有标签都关闭了，理论上不应该发生，因为主画布标签不可关闭
      // 但以防万一，尝试设置主画布为活动标签
      const mainCanvasTab = tabsService.getTabs().find(t => t.id === 'flow-canvas-main');
      if (mainCanvasTab) {
        tabsService.setActiveTab(mainCanvasTab.id);
      } else {
        tabsService.setActiveTab(null); // 最终回退
      }
    }
  }, [activeTabId, openTabs]);


  return (
    <div className="flex flex-col h-full">
      <Tabs
        value={activeTabId || undefined} 
        onValueChange={handleTabChange}
        className="flex flex-col h-full bg-muted/20"
      >
        <TabsList className="flex-shrink-0 bg-muted/30 dark:bg-muted/20 border-b rounded-none justify-start h-auto min-h-[36px] p-0.5">
          {openTabs.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className={cn(
                "relative px-2 py-1.5 h-auto text-xs rounded-none data-[state=active]:bg-background data-[state=active]:shadow-sm",
                "hover:bg-muted focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-0",
                 tab.type === 'flow-canvas' && 'font-semibold'
              )}
              style={{ minWidth: '80px', maxWidth: '200px' }} 
            >
              <span className="truncate" title={tab.title}>{tab.title}</span>
              {tab.closable && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => handleCloseTab(e, tab.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      handleCloseTab(e, tab.id);
                    }
                  }}
                  className={cn(
                    "ml-1.5 h-4 w-4 p-0", 
                    "flex items-center justify-center rounded-sm", 
                    "cursor-pointer transition-colors", 
                    "hover:bg-destructive/20 hover:text-destructive", 
                    "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" 
                  )}
                  aria-label={t('appLayout.tabs.closeTabAriaLabel', { tabTitle: tab.title })}
                  data-action-button="true" 
                >
                  <XIcon className="h-3 w-3" />
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="flex-grow overflow-hidden">
          {openTabs.map((tab) => (
            <TabsContent
              key={tab.id}
              value={tab.id}
              className="h-full mt-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            >
              {activeTabId === tab.id && ( 
                <>
                  {tab.type === 'flow-canvas' && <FlowCanvas />}
                  {tab.type === 'code-preview' && tab.flowId && (
                    <CodePreviewPanel flowId={tab.flowId} />
                  )}
                  {tab.type === 'matplotlib-figure' && tab.imageDataUri && (
                    <MatplotlibFigureDisplay imageDataUri={tab.imageDataUri} />
                  )}
                </>
              )}
            </TabsContent>
          ))}
        </div>
      </Tabs>
       {openTabs.length === 0 && ( 
        <div className="flex-grow flex items-center justify-center text-muted-foreground">
          {t('appLayout.tabs.noTabsOpen')}
        </div>
      )}
    </div>
  );
}
