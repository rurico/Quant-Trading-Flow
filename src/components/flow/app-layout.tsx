// src/components/flow/app-layout.tsx
'use client';

import type { ReactNode } from 'react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from './header';
import { NodePalette } from './node-palette';
import { ConfigPanel } from './config-panel';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { PanelLeftClose, PanelRightOpen, PanelRightClose, PanelLeftOpen, ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/use-translation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TerminalPanel } from './terminal-panel';
import { ConsolePanel } from './console-panel';
import { TabsManager } from './tabs-manager';
import { tabsService } from '@/store/tabs-store'; // 修复：从正确的路径导入 tabsService

const PALETTE_COLLAPSED_WIDTH = 40; 
const CONFIG_PANEL_COLLAPSED_WIDTH = 40; 
const MIN_PALETTE_WIDTH = 180;
const MAX_PALETTE_WIDTH = 400;
const MIN_CONFIG_PANEL_WIDTH = 220;
const MAX_CONFIG_PANEL_WIDTH = 500;
const DEFAULT_PALETTE_WIDTH = 220;
const DEFAULT_CONFIG_PANEL_WIDTH = 300;

const PALETTE_LS_KEY = 'appPaletteWidth';
const CONFIG_PANEL_LS_KEY = 'appConfigPanelWidth';

const BOTTOM_PANEL_COLLAPSED_HEIGHT = 36;
const BOTTOM_PANEL_DEFAULT_HEIGHT = 200; 
const MIN_BOTTOM_PANEL_HEIGHT = 70;
const MAX_BOTTOM_PANEL_HEIGHT_FACTOR = 0.5; 

const BOTTOM_PANEL_HEIGHT_LS_KEY = 'appBottomPanelHeight';
const BOTTOM_PANEL_COLLAPSED_LS_KEY = 'appBottomPanelCollapsed';


interface AppLayoutProps {}

export function AppLayout({}: AppLayoutProps) { 
  const [isPaletteCollapsed, setIsPaletteCollapsed] = useState(false);
  const [isConfigPanelCollapsed, setIsConfigPanelCollapsed] = useState(false);

  const [expandedPaletteWidth, setExpandedPaletteWidth] = useState(DEFAULT_PALETTE_WIDTH);
  const [expandedConfigPanelWidth, setExpandedConfigPanelWidth] = useState(DEFAULT_CONFIG_PANEL_WIDTH);

  const [isResizingPalette, setIsResizingPalette] = useState(false);
  const [isResizingConfigPanel, setIsResizingConfigPanel] = useState(false);

  const [isBottomPanelCollapsed, setIsBottomPanelCollapsed] = useState(true);
  const [bottomPanelHeight, setBottomPanelHeight] = useState(BOTTOM_PANEL_DEFAULT_HEIGHT);
  const [isResizingBottomPanel, setIsResizingBottomPanel] = useState(false);

  // 新增：用于管理工具面板活动标签页的状态
  const [activeToolTab, setActiveToolTab] = useState<'terminal' | 'console'>(tabsService.getActiveToolTabId());


  const paletteResizeRef = useRef<HTMLDivElement>(null);
  const configPanelResizeRef = useRef<HTMLDivElement>(null);
  const bottomPanelResizeRef = useRef<HTMLDivElement>(null);
  const centerColumnRef = useRef<HTMLDivElement>(null); 

  const { t } = useTranslation();

  // 订阅 activeToolTabId$ 的变化
  useEffect(() => {
    const sub = tabsService.activeToolTabId$.subscribe(setActiveToolTab);
    return () => sub.unsubscribe();
  }, []);


  useEffect(() => {
    const storedPaletteWidth = localStorage.getItem(PALETTE_LS_KEY);
    if (storedPaletteWidth) {
      setExpandedPaletteWidth(Math.max(MIN_PALETTE_WIDTH, Math.min(MAX_PALETTE_WIDTH, parseInt(storedPaletteWidth, 10))));
    }
    const storedConfigPanelWidth = localStorage.getItem(CONFIG_PANEL_LS_KEY);
    if (storedConfigPanelWidth) {
      setExpandedConfigPanelWidth(Math.max(MIN_CONFIG_PANEL_WIDTH, Math.min(MAX_CONFIG_PANEL_WIDTH, parseInt(storedConfigPanelWidth, 10))));
    }
    const storedBottomPanelHeight = localStorage.getItem(BOTTOM_PANEL_HEIGHT_LS_KEY);
    if (storedBottomPanelHeight) {
      setBottomPanelHeight(Math.max(MIN_BOTTOM_PANEL_HEIGHT, parseInt(storedBottomPanelHeight, 10)));
    }
    const storedBottomPanelCollapsed = localStorage.getItem(BOTTOM_PANEL_COLLAPSED_LS_KEY);
    setIsBottomPanelCollapsed(storedBottomPanelCollapsed === 'true'); 

  }, []);

  useEffect(() => {
    if (!isResizingPalette) {
      localStorage.setItem(PALETTE_LS_KEY, expandedPaletteWidth.toString());
    }
  }, [expandedPaletteWidth, isResizingPalette]);

  useEffect(() => {
    if (!isResizingConfigPanel) {
      localStorage.setItem(CONFIG_PANEL_LS_KEY, expandedConfigPanelWidth.toString());
    }
  }, [expandedConfigPanelWidth, isResizingConfigPanel]);

  useEffect(() => {
    if (!isResizingBottomPanel) {
      localStorage.setItem(BOTTOM_PANEL_HEIGHT_LS_KEY, bottomPanelHeight.toString());
    }
  }, [bottomPanelHeight, isResizingBottomPanel]);

  useEffect(() => {
    localStorage.setItem(BOTTOM_PANEL_COLLAPSED_LS_KEY, isBottomPanelCollapsed.toString());
  }, [isBottomPanelCollapsed]);


  const handlePaletteResizeStart = useCallback((e: React.MouseEvent) => {
    if (isPaletteCollapsed) return;
    e.preventDefault();
    setIsResizingPalette(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [isPaletteCollapsed]);

  const handleConfigPanelResizeStart = useCallback((e: React.MouseEvent) => {
    if (isConfigPanelCollapsed) return;
    e.preventDefault();
    setIsResizingConfigPanel(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [isConfigPanelCollapsed]);

  const handleBottomPanelResizeStart = useCallback((e: React.MouseEvent) => {
    if (isBottomPanelCollapsed) return;
    e.preventDefault();
    setIsResizingBottomPanel(true);
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
  }, [isBottomPanelCollapsed]);

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (isResizingPalette) {
      const newWidth = event.clientX;
      setExpandedPaletteWidth(Math.max(MIN_PALETTE_WIDTH, Math.min(MAX_PALETTE_WIDTH, newWidth)));
    }
    if (isResizingConfigPanel) {
      const newWidth = window.innerWidth - event.clientX;
      setExpandedConfigPanelWidth(Math.max(MIN_CONFIG_PANEL_WIDTH, Math.min(MAX_CONFIG_PANEL_WIDTH, newWidth)));
    }
    if (isResizingBottomPanel && centerColumnRef.current) {
      const mainContentArea = centerColumnRef.current.querySelector(':scope > div:first-child') as HTMLDivElement;
      if (mainContentArea) {
        const mainContentRect = mainContentArea.getBoundingClientRect();
        const totalCenterHeight = centerColumnRef.current.clientHeight;
        let newBottomPanelHeight = totalCenterHeight - (event.clientY - mainContentRect.top) ;
        if (!isBottomPanelCollapsed) newBottomPanelHeight -= 1; 

        const maxAllowedHeight = totalCenterHeight * MAX_BOTTOM_PANEL_HEIGHT_FACTOR;
        setBottomPanelHeight(Math.max(MIN_BOTTOM_PANEL_HEIGHT, Math.min(maxAllowedHeight, newBottomPanelHeight)));
      }
    }
  }, [isResizingPalette, isResizingConfigPanel, isResizingBottomPanel, isBottomPanelCollapsed]);

  const handleMouseUp = useCallback(() => {
    if (isResizingPalette || isResizingConfigPanel || isResizingBottomPanel) {
      setIsResizingPalette(false);
      setIsResizingConfigPanel(false);
      setIsResizingBottomPanel(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
  }, [isResizingPalette, isResizingConfigPanel, isResizingBottomPanel]);

  useEffect(() => {
    if (isResizingPalette || isResizingConfigPanel || isResizingBottomPanel) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingPalette, isResizingConfigPanel, isResizingBottomPanel, handleMouseMove, handleMouseUp]);

  const currentPaletteDisplayWidth = isPaletteCollapsed ? PALETTE_COLLAPSED_WIDTH : expandedPaletteWidth;
  const currentConfigPanelDisplayWidth = isConfigPanelCollapsed ? CONFIG_PANEL_COLLAPSED_WIDTH : expandedConfigPanelWidth;
  const currentBottomPanelDisplayHeight = isBottomPanelCollapsed ? BOTTOM_PANEL_COLLAPSED_HEIGHT : bottomPanelHeight;

  const toggleBottomPanel = () => setIsBottomPanelCollapsed(!isBottomPanelCollapsed);

  const handleToolTabChange = (value: string) => {
    tabsService.setActiveToolTab(value as 'terminal' | 'console');
  };

  return (
    <div className="flex flex-col h-screen bg-muted overflow-hidden">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <aside
          style={{ width: `${currentPaletteDisplayWidth}px` }}
          className={cn(
            "bg-card border-r border-border shadow-sm transition-width duration-300 ease-in-out flex flex-col flex-shrink-0",
            isResizingPalette && "transition-none"
          )}
        >
          <div className={cn(
            "flex items-center shrink-0 h-[36px]", 
            isPaletteCollapsed ? "justify-center px-1" : "justify-between pl-2 pr-1 border-b", 
            !isPaletteCollapsed && "mb-0.5"
          )}>
            {!isPaletteCollapsed && <h2 className="text-xs font-semibold text-foreground">{t('appLayout.nodeLibraryTitle')}</h2>}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsPaletteCollapsed(!isPaletteCollapsed)}
              aria-label={isPaletteCollapsed ? t('appLayout.expandNodeLibraryAriaLabel') : t('appLayout.collapseNodeLibraryAriaLabel')}
              className="h-6 w-6" 
            >
              {isPaletteCollapsed ? <PanelRightOpen className="h-3.5 w-3.5" /> : <PanelLeftClose className="h-3.5 w-3.5" />} 
            </Button>
          </div>
          {!isPaletteCollapsed && (
            <ScrollArea className="flex-1 min-h-0 px-1.5 pb-1.5">
              <NodePalette />
            </ScrollArea>
          )}
        </aside>

        {!isPaletteCollapsed && (
          <div
            ref={paletteResizeRef}
            onMouseDown={handlePaletteResizeStart}
            className="w-px h-full cursor-col-resize bg-border/20 hover:bg-primary/5 transition-colors flex-shrink-0"
            aria-hidden="true"
            role="separator"
            aria-orientation="vertical"
          />
        )}

        <div ref={centerColumnRef} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 relative overflow-hidden"> {/* 确保 TabsManager 的父容器是相对定位的 */}
             <TabsManager />
          </div>

          {!isBottomPanelCollapsed && (
            <div
              ref={bottomPanelResizeRef}
              onMouseDown={handleBottomPanelResizeStart}
              className={cn(
                "h-px w-full cursor-row-resize bg-border/20 hover:bg-primary/5 transition-colors flex-shrink-0",
                isResizingBottomPanel && "bg-primary/10"
              )}
              aria-hidden="true"
              role="separator"
              aria-orientation="horizontal"
            />
          )}

          <aside
            style={{ height: `${currentBottomPanelDisplayHeight}px` }}
            className={cn(
                "bg-card border-t border-border shadow-sm flex flex-col flex-shrink-0 overflow-hidden",
                isResizingBottomPanel ? "transition-none" : "transition-height duration-200 ease-in-out"
            )}
          >
            <div className="flex items-center justify-between pl-2 pr-1 h-[36px] border-b flex-shrink-0">
              <div className="flex items-center">
                {!isBottomPanelCollapsed && <h3 className="text-xs font-semibold text-foreground mr-2">{t('appLayout.toolsPanelTitle')}</h3>}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleBottomPanel}
                aria-label={isBottomPanelCollapsed ? t('appLayout.tabs.expandToolsPanelAriaLabel') : t('appLayout.tabs.collapseToolsPanelAriaLabel')}
                className="h-6 w-6" 
              >
                {isBottomPanelCollapsed ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </Button>
            </div>
            {!isBottomPanelCollapsed && (
              <Tabs 
                value={activeToolTab} // 使用来自 service 的状态
                onValueChange={handleToolTabChange} // 更新 service 中的状态
                className="flex-1 flex flex-col overflow-hidden p-0.5 pt-0"
              >
                <TabsList className="shrink-0 justify-start h-8 px-0.5 bg-muted/30 dark:bg-muted/20">
                  <TabsTrigger value="terminal" className="text-xs px-1.5 py-0.5 h-auto data-[state=active]:bg-card">{t('appLayout.toolsPanelTabTerminal')}</TabsTrigger>
                  <TabsTrigger value="console" className="text-xs px-1.5 py-0.5 h-auto data-[state=active]:bg-card">{t('appLayout.toolsPanelTabConsole')}</TabsTrigger>
                </TabsList>
                <TabsContent value="terminal" className="flex-1 overflow-auto mt-0.5 rounded-sm border bg-card"> 
                  <TerminalPanel />
                </TabsContent>
                <TabsContent value="console" className="flex-1 overflow-auto mt-0.5 rounded-sm border bg-card"> 
                  <ConsolePanel />
                </TabsContent>
              </Tabs>
            )}
          </aside>
        </div>

        {!isConfigPanelCollapsed && (
          <div
            ref={configPanelResizeRef}
            onMouseDown={handleConfigPanelResizeStart}
            className="w-px h-full cursor-col-resize bg-border/20 hover:bg-primary/5 transition-colors flex-shrink-0"
            aria-hidden="true"
            role="separator"
            aria-orientation="vertical"
          />
        )}

        <aside
          style={{ width: `${currentConfigPanelDisplayWidth}px` }}
          className={cn(
            "bg-card border-l border-border shadow-sm transition-width duration-300 ease-in-out flex flex-col flex-shrink-0",
            isResizingConfigPanel && "transition-none"
          )}
        >
          <div className={cn(
            "flex items-center shrink-0 h-[36px]", 
             isConfigPanelCollapsed ? "justify-center px-1" : "flex-row-reverse justify-between pl-1 pr-2 border-b", 
            !isConfigPanelCollapsed && "mb-0.5"
          )}>
            {!isConfigPanelCollapsed && <h2 className="text-xs font-semibold text-foreground">{t('appLayout.nodeConfigTitle')}</h2>}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsConfigPanelCollapsed(!isConfigPanelCollapsed)}
              aria-label={isConfigPanelCollapsed ? t('appLayout.expandNodeConfigAriaLabel') : t('appLayout.collapseNodeConfigAriaLabel')}
              className="h-6 w-6" 
            >
              {isConfigPanelCollapsed ? <PanelLeftOpen className="h-3.5 w-3.5" /> : <PanelRightClose className="h-3.5 w-3.5" />}
            </Button>
          </div>
          {!isConfigPanelCollapsed && (
            <ScrollArea className="flex-1 min-h-0 px-0.5"> 
              <ConfigPanel />
            </ScrollArea>
          )}
        </aside>
      </div>
    </div>
  );
}
