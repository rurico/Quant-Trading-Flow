// src/components/flow/header.tsx
'use client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { flowService, flowSubject } from '@/store/flow-store';
import { savedFlowsService } from '@/store/saved-flows-store';
import { tabsService } from '@/store/tabs-store'; 
// Play 图标更改为 Eye
import { Save, Eye, Download, Settings2, FilePlus2, Edit } from 'lucide-react'; 
import { useEffect, useState, useRef } from 'react';
import { toast } from '@/hooks/use-toast';
import type { Flow } from '@/types/flow';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { useTranslation } from '@/hooks/use-translation';
import { SettingsDialog } from './settings-dialog';
import { useIsMobile } from '@/hooks/use-mobile'; 
import { cn } from '@/lib/utils'; 
import { compileFlowToPython } from '@/lib/flow-compiler'; // 导入编译函数

export function Header() {
  const [currentFlow, setCurrentFlow] = useState<Flow>(flowSubject.getValue());
  const [flowName, setFlowName] = useState(currentFlow.name);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [isNameEditDialogOpen, setIsNameEditDialogOpen] = useState(false); 
  const [dialogFlowName, setDialogFlowName] = useState(''); 

  const { t } = useTranslation();
  const nameInputRef = useRef<HTMLInputElement>(null);
  const dialogNameInputRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile(); 

  useEffect(() => {
    const subFlow = flowSubject.subscribe(flow => {
      setCurrentFlow(flow);
      if (flow.name !== flowName && document.activeElement !== nameInputRef.current && document.activeElement !== dialogNameInputRef.current) {
        setFlowName(flow.name);
      }
      if (flow.id !== currentFlow.id) { 
        setFlowName(flow.name);
        tabsService.updateFlowCanvasTabTitle(t('appLayout.tabs.flowCanvasTitle', { flowName: flow.name }));
      }
    });
    // 确保在组件挂载时，主流程画布标签页的标题基于当前流程名称进行更新
    // 只有在 tabsService 准备好之后才调用（例如，在 rehydrate 完成后，或通过一个标志）
    // 简单起见，这里假设 t 函数和 currentFlow.name 是立即可用的
    tabsService.updateFlowCanvasTabTitle(t('appLayout.tabs.flowCanvasTitle', { flowName: currentFlow.name }));

    return () => {
      subFlow.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flowName, currentFlow.id, currentFlow.name, t]); // 将 t 添加到依赖项数组

  useEffect(() => {
    // 当对话框关闭时，将对话框中的流程名称重置为当前的流程名称
    if (!isNameEditDialogOpen) {
      setDialogFlowName(flowName);
    }
  }, [flowName, isNameEditDialogOpen]);

  const handleDesktopNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFlowName(event.target.value);
  };

  const handleDesktopNameBlur = () => {
    const trimmedName = flowName.trim();
    if (currentFlow.name !== trimmedName && trimmedName !== "") {
      flowService.updateFlowName(trimmedName);
      tabsService.updateFlowCanvasTabTitle(t('appLayout.tabs.flowCanvasTitle', { flowName: trimmedName }));
      // toast({ title: t('toast.flowNameUpdatedTitle'), description: t('toast.flowNameUpdatedDescription', { name: trimmedName }) });
    } else if (trimmedName === "") {
      // 如果名称为空，则恢复为当前流程名称
      setFlowName(currentFlow.name); 
    }
  };

  const handleDesktopNameKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleDesktopNameBlur();
      event.currentTarget.blur(); 
    }
  };

  const handleDialogNameSave = () => {
    const trimmedName = dialogFlowName.trim();
    if (trimmedName !== "" && currentFlow.name !== trimmedName) {
      flowService.updateFlowName(trimmedName);
      tabsService.updateFlowCanvasTabTitle(t('appLayout.tabs.flowCanvasTitle', { flowName: trimmedName }));
      setFlowName(trimmedName); // 更新非对话框状态的流程名称
      // toast({ title: t('toast.flowNameUpdatedTitle'), description: t('toast.flowNameUpdatedDescription', { name: trimmedName }) });
    } else if (trimmedName === "") {
      // 如果名称为空，则保持对话框中的名称为之前的有效流程名称
      setDialogFlowName(flowName); 
    }
    setIsNameEditDialogOpen(false);
  };


  const handleSave = () => {
    const nameToSave = flowName.trim() || t('header.untitledFlow');
    if (currentFlow.name !== nameToSave) { 
        flowService.updateFlowName(nameToSave); 
        tabsService.updateFlowCanvasTabTitle(t('appLayout.tabs.flowCanvasTitle', { flowName: nameToSave }));
    }
    const flowToSave = flowService.getFlow(); 
    const savedFlow = savedFlowsService.saveFlow(flowToSave);
    
    // 更新当前流程的状态，包括ID、保存状态和名称
    flowSubject.next({ ...flowToSave, id: savedFlow.id, isSaved: true, name: savedFlow.name, createdAt: savedFlow.createdAt });
    setCurrentFlow({ ...flowToSave, id: savedFlow.id, isSaved: true, name: savedFlow.name, createdAt: savedFlow.createdAt }); // 同时更新本地状态
    setFlowName(savedFlow.name); // 确保输入框反映已保存的名称
    toast({ title: t('toast.flowSavedTitle'), description: t('toast.flowSavedDescription', { name: savedFlow.name }) });
  };

  const handleNewFlow = () => {
    const newFlow = flowService.createNewFlow(t('header.untitledFlow'));
    // 更新流程画布标签页的标题
    tabsService.updateFlowCanvasTabTitle(t('appLayout.tabs.flowCanvasTitle', { flowName: newFlow.name }));
    // 确保流程画布标签页是活动的
    tabsService.setActiveTab('flow-canvas-main');
  };

  // "运行" 按钮的功能现在是 "预览"
  const handlePreview = () => { 
    const currentFlowData = flowService.getFlow();
    // 确保流程名称不是空的，否则使用默认名称
    const actualFlowName = currentFlowData.name.trim() || t('header.untitledFlow');
    const tabTitle = t('appLayout.tabs.codePreviewTitle', { flowName: actualFlowName });
    
    tabsService.addTab({
      title: tabTitle,
      type: 'code-preview',
      flowId: currentFlowData.id,
      flowName: actualFlowName, // 传递实际使用的流程名称
      closable: true,
    });
    console.log(t('header.previewFlowLog'), currentFlowData); // 日志消息更改
    // toast({ title: t('toast.previewFlowTitle'), description: t('toast.previewFlowDescription') });
  };

  const handleExport = () => {
    const flowData = currentFlow;
    const compilationResult = compileFlowToPython(flowData); // 使用编译函数
    const pythonCode = compilationResult.pythonCode; // 获取编译后的Python代码

    const blob = new Blob([pythonCode.trim()], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    const fileName = (flowData.name || 'flow').replace(/\s+/g, '_') + '.py';
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: t('toast.flowExportedTitle'), description: t('toast.flowExportedDescription', { name: fileName }) });
  };


  return (
    <header className="flex items-center justify-between p-2 md:p-3 border-b border-border bg-card shadow-sm h-14 md:h-16">
      <div className="flex items-center gap-2 md:gap-3">
        <svg width="28" height="28" viewBox="0 0 100 100" className="text-primary md:w-8 md:h-8">
          <path fill="currentColor" d="M20 20h20v20H20z M60 20h20v20H60z M20 60h20v20H20z M60 60h20v20H60z M40 42.5V30h20v12.5L70 50l-10 7.5V70H40V57.5L30 50z" />
        </svg>
        {isMobile ? (
          <Dialog open={isNameEditDialogOpen} onOpenChange={setIsNameEditDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" className="p-1 h-auto">
                <span className="text-lg font-semibold text-foreground truncate max-w-[100px] sm:max-w-[150px]">{flowName}</span>
                <Edit className="ml-1.5 h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>{t('header.editFlowNameDialogTitle')}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="mobile-flow-name" className="text-right sr-only">
                    {t('header.flowNameAriaLabel')}
                  </Label>
                  <Input
                    id="mobile-flow-name"
                    ref={dialogNameInputRef}
                    value={dialogFlowName}
                    onChange={(e) => setDialogFlowName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { handleDialogNameSave(); e.currentTarget.blur(); } }}
                    className="col-span-4 h-10"
                  />
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                    <Button type="button" variant="outline">{t('common.cancel')}</Button>
                </DialogClose>
                <Button type="button" onClick={handleDialogNameSave}>{t('common.save')}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        ) : (
          <Input
            ref={nameInputRef}
            className="text-xl font-semibold text-foreground w-64 h-10"
            value={flowName}
            onChange={handleDesktopNameChange}
            onBlur={handleDesktopNameBlur}
            onKeyDown={handleDesktopNameKeyDown}
            aria-label={t('header.flowNameAriaLabel')}
          />
        )}
      </div>
      <div className="flex items-center gap-1 md:gap-2">
        <Button variant="outline" size={isMobile ? "icon" : "sm"} onClick={handleNewFlow} aria-label={isMobile ? t('header.newButton') : undefined}>
          <FilePlus2 className={cn(isMobile ? "h-4 w-4" : "mr-2 h-4 w-4")} />
          {!isMobile && t('header.newButton')}
        </Button>
        <Button variant="outline" size={isMobile ? "icon" : "sm"} onClick={handleSave} aria-label={isMobile ? t('header.saveButton') : undefined}>
          <Save className={cn(isMobile ? "h-4 w-4" : "mr-2 h-4 w-4")} />
          {!isMobile && t('header.saveButton')}
        </Button>
        
        {/* "运行" 按钮更改为 "预览" */}
        <Button variant="default" size={isMobile ? "icon" : "sm"} onClick={handlePreview} className="bg-accent hover:bg-accent/90 text-accent-foreground" aria-label={isMobile ? t('header.previewButtonAriaLabel') : undefined}>
          <Eye className={cn(isMobile ? "h-4 w-4" : "mr-2 h-4 w-4")} /> {/* 图标更改为 Eye */}
          {!isMobile && t('header.previewButton')} {/* 文本更改为 "预览" */}
        </Button>
        <Button variant="outline" size={isMobile ? "icon" : "sm"} onClick={handleExport} aria-label={isMobile ? t('header.exportButton') : undefined}>
          <Download className={cn(isMobile ? "h-4 w-4" : "mr-2 h-4 w-4")} />
          {!isMobile && t('header.exportButton')}
        </Button>
        <Button variant="ghost" size="icon" onClick={() => setIsSettingsDialogOpen(true)} aria-label={t('header.settingsAriaLabel')}>
          <Settings2 className="h-4 w-4 md:h-5 md:w-5" />
        </Button>
        <SettingsDialog isOpen={isSettingsDialogOpen} onOpenChange={setIsSettingsDialogOpen} />
      </div>
    </header>
  );
}
