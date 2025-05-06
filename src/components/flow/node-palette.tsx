// src/components/flow/node-palette.tsx
'use client';

import type { Flow, NodeType, Node as FlowNodeObject, Locale } from '@/types/flow';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Waypoints, FileOutput, Trash2, Check, X, Search, Lock } from 'lucide-react';
import { Separator } from '../ui/separator';
import { savedFlowsService } from '@/store/saved-flows-store';
import { functionDefinitionService } from '@/store/python-function-template-store';
import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { flowService, flowSubject, selectedNodeSubject } from '@/store/flow-store';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/use-translation';
import { PythonIcon } from '@/components/icons/python-icon';
import { ExcelIcon } from '@/components/icons/excel-icon';
import { CsvIcon } from '@/components/icons/csv-icon';
import { baseFunctions } from '@/lib/base-functions';
import { ScrollArea } from '../ui/scroll-area';


interface PaletteItemProps {
  type: NodeType | 'flow-template';
  name: string;
  icon: React.ReactNode;
  description?: string;
  displayStyle: 'card' | 'list';

  onDragStart?: (event: React.DragEvent<HTMLDivElement>, nodeTypeToCreate: NodeType, name: string, options?: { subFlowId?: string; pythonFunctionCode?: string; pythonFunctionId?: string }) => void;
  onSingleClick?: (event: React.MouseEvent | React.KeyboardEvent, itemTypeForAction: NodeType | 'flow-template', name: string, options?: { subFlowId?: string; pythonFunctionCode?: string; pythonFunctionId?: string }) => void;
  onDoubleClick?: (event: React.MouseEvent | React.KeyboardEvent, itemTypeForAction: NodeType | 'flow-template', name: string, options?: { subFlowId?: string; pythonFunctionCode?: string; pythonFunctionId?: string }) => void;

  subFlowId?: string;
  pythonFunctionCode?: string;
  pythonFunctionId?: string;

  isFunctionDefinition?: boolean;
  isBaseFunction?: boolean;
  isFlowTemplate?: boolean;

  itemDefinitionId?: string; 
  onDeleteFlowTemplate?: (flowId: string, flowName: string) => void;
  onDeleteFunctionDefinition?: (definitionId: string, definitionName: string) => void;
  onUpdateFunctionDefinitionName?: (definitionId: string, newName: string) => void;
}

function PaletteItem({
  type,
  name,
  icon,
  description,
  displayStyle,
  onDragStart,
  onSingleClick: handleSingleClickProp,
  onDoubleClick: handleDoubleClickProp,
  subFlowId,
  pythonFunctionCode,
  pythonFunctionId,
  isFunctionDefinition,
  isBaseFunction,
  isFlowTemplate,
  itemDefinitionId,
  onDeleteFlowTemplate,
  onDeleteFunctionDefinition,
  onUpdateFunctionDefinitionName
}: PaletteItemProps) {

  const [isEditingName, setIsEditingName] = useState(false);
  const [editableName, setEditableName] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const doubleClickScheduledRef = useRef(false);
  const { t } = useTranslation();

  const isEditableUserDefinedFunction = isFunctionDefinition && !isBaseFunction;

  const displayName = isEditableUserDefinedFunction ? `${name}.py` : name;
  const itemIcon = icon;

  useEffect(() => {
    setEditableName(name);
  }, [name]);

  useEffect(() => {
    if (isEditingName && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditingName]);

  useEffect(() => {
    return () => {
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
      }
    };
  }, []);

  const handleNameSave = () => {
    if (isEditableUserDefinedFunction && onUpdateFunctionDefinitionName && itemDefinitionId && editableName.trim() !== '' && editableName !== name) {
      onUpdateFunctionDefinitionName(itemDefinitionId, editableName.trim());
    }
    setIsEditingName(false);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditableName(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleNameSave();
    } else if (e.key === 'Escape') {
      setEditableName(name);
      setIsEditingName(false);
    }
  };

  const confirmDelete = () => {
    if (isFlowTemplate && onDeleteFlowTemplate && itemDefinitionId) {
      onDeleteFlowTemplate(itemDefinitionId, name);
    } else if (isEditableUserDefinedFunction && onDeleteFunctionDefinition && itemDefinitionId) {
      onDeleteFunctionDefinition(itemDefinitionId, name);
    }
  };

  const isDeletable = (isFlowTemplate && onDeleteFlowTemplate && itemDefinitionId) ||
    (isEditableUserDefinedFunction && onDeleteFunctionDefinition && itemDefinitionId);

  const isNameEditableByClick = isEditableUserDefinedFunction && onUpdateFunctionDefinitionName && itemDefinitionId;

  const handleCombinedClick = useCallback((e: React.MouseEvent | React.KeyboardEvent) => {
    if (e.target instanceof HTMLElement && e.target.closest('button[data-action-button="true"], input')) {
      return;
    }
    if (isEditingName) return;

    const itemTypeForAction = isFlowTemplate ? 'flow-template' : (isFunctionDefinition ? 'python-function' : type as NodeType);

    const clickOptions = {
      subFlowId: isFlowTemplate ? itemDefinitionId : undefined, 
      pythonFunctionCode: pythonFunctionCode,
      pythonFunctionId: isFunctionDefinition ? itemDefinitionId : undefined, 
    };

    if (clickTimeoutRef.current && !doubleClickScheduledRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
      doubleClickScheduledRef.current = true;

      handleDoubleClickProp?.(e, itemTypeForAction, name, clickOptions);
      setTimeout(() => {
        doubleClickScheduledRef.current = false;
      }, 50);

    } else if (!clickTimeoutRef.current && !doubleClickScheduledRef.current) {
      clickTimeoutRef.current = setTimeout(() => {
        clickTimeoutRef.current = null;
        if (!doubleClickScheduledRef.current) {
          if (isEditableUserDefinedFunction && !isEditingName && isNameEditableByClick && displayStyle === 'list') {
            setEditableName(name);
            setIsEditingName(true);
          } else {
            handleSingleClickProp?.(e, itemTypeForAction, name, clickOptions);
          }
        }
      }, 250);
    }
  }, [
    isEditingName, type, isFlowTemplate, isFunctionDefinition, isBaseFunction,
    itemDefinitionId, pythonFunctionCode, name, isNameEditableByClick,
    handleDoubleClickProp, handleSingleClickProp, subFlowId, displayStyle
  ]);

  const handleDragStartInternal = (event: React.DragEvent<HTMLDivElement>) => {
    if (isEditingName) return;

    let nodeTypeToCreate: NodeType;
    let dragOptions: { subFlowId?: string; pythonFunctionCode?: string; pythonFunctionId?: string } = {};

    if (isFlowTemplate && itemDefinitionId) { 
      nodeTypeToCreate = 'sub-flow';
      dragOptions.subFlowId = itemDefinitionId;
    } else if (isFunctionDefinition && itemDefinitionId) {
      nodeTypeToCreate = 'python-function';
      dragOptions.pythonFunctionCode = pythonFunctionCode;
      dragOptions.pythonFunctionId = itemDefinitionId;
    } else {
      nodeTypeToCreate = type as NodeType; 
    }
    onDragStart?.(event, nodeTypeToCreate, name, dragOptions);
  };

  const draggable = !isEditingName;
  const clickable = (handleSingleClickProp || handleDoubleClickProp) && !isEditingName;

  const cursorClass = clickable ? "cursor-pointer" : (draggable ? "cursor-grab" : "cursor-default");
  const role = clickable ? "button" : "listitem";
  const tabIndex = clickable ? 0 : -1;


  if (displayStyle === 'list') {
    const itemBaseClassesCompact = "flex items-center px-0.5 py-0.25 hover:bg-accent/15 dark:hover:bg-accent/5 rounded-sm group text-xs select-none min-h-[24px]"; 
    return (
      <div
        draggable={draggable}
        onDragStart={draggable ? handleDragStartInternal : undefined}
        onClick={clickable ? handleCombinedClick : undefined}
        className={cn(itemBaseClassesCompact, cursorClass)}
        aria-label={`${t('nodePalette.functionTemplateAriaLabel')}: ${displayName}${isNameEditableByClick ? (`, ${t('nodePalette.clickToEditAriaHint')}`) : ""}`}
        role={role}
        tabIndex={tabIndex}
        onKeyDown={clickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') handleCombinedClick(e); } : undefined}
        title={description || displayName}
      >
        <div className="mr-1 flex-shrink-0 w-3.5 h-3.5 flex items-center justify-center">{itemIcon}</div>
        {isEditingName && isEditableUserDefinedFunction ? (
          <div className="flex-1 flex items-center gap-0.25">
            <Input
              ref={inputRef}
              value={editableName}
              onChange={handleNameChange}
              onKeyDown={handleKeyDown}
              onBlur={handleNameSave}
              className="h-4.5 text-xs flex-1 bg-background px-0.5 py-0.25"
              onClick={(e) => e.stopPropagation()}
            />
            <span className="text-xs text-muted-foreground">.py</span>
            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleNameSave(); }} data-action-button="true" className="h-3.5 w-3.5">
              <Check className="h-2.5 w-2.5 text-green-500" />
            </Button>
            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setEditableName(name); setIsEditingName(false); }} data-action-button="true" className="h-3.5 w-3.5">
              <X className="h-2.5 w-2.5 text-red-500" />
            </Button>
          </div>
        ) : (
          <span className="text-foreground truncate flex-1 text-xs">{displayName}</span>
        )}

        <div className="ml-auto flex items-center opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
          {isBaseFunction && <Lock className="h-3.5 w-3.5 text-muted-foreground/60 mr-0.25" title={t('nodePalette.baseFunctionReadOnlyHint')} />}
          {isEditableUserDefinedFunction && !isEditingName && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  onMouseDown={(e) => e.stopPropagation()}
                  data-action-button="true"
                  aria-label={t('nodePalette.deleteFunctionTemplateAriaLabel', { name })}
                >
                  <Trash2 className="h-2.5 w-2.5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('nodePalette.confirmDeleteFunctionTemplateTitle')}</AlertDialogTitle>
                  <AlertDialogDescription>{t('nodePalette.confirmDeleteFunctionTemplateDescription', { name })}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                  <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
                    {t('common.delete')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>
    );
  }

  // Default Card rendering for other node types (including Flow Templates)
  return (
    <Card
      draggable={draggable}
      onDragStart={draggable ? handleDragStartInternal : undefined}
      onClick={clickable ? handleCombinedClick : undefined}
      className={cn(
        "p-1.5 border border-border rounded-md bg-card hover:shadow-sm transition-shadow duration-150 relative group",
         cursorClass,
        "mb-1 select-none"
      )}
      aria-label={`${isFlowTemplate ? t('nodePalette.flowTemplateAriaLabel') : t('nodePalette.draggableNodeAriaLabel')}: ${displayName}${handleSingleClickProp ? (`, ${t('nodePalette.clickToAddAriaHint')}`) : ""}${handleDoubleClickProp && isFlowTemplate ? (`, ${t('nodePalette.doubleClickToEditFlowAriaHint')}`) : ""}`}
      role={role}
      tabIndex={tabIndex}
      onKeyDown={clickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') handleCombinedClick(e); } : undefined}
      title={description || displayName}
    >
      <div className="flex items-center mb-0.25">
        <div className="mr-1 flex-shrink-0 w-3.5 h-3.5 flex items-center justify-center">{itemIcon}</div>
        <h4 className="font-medium text-foreground truncate pr-6 text-xs flex-1" title={name}>{name}</h4> {/* Adjusted pr for button space */}
      </div>
      {description && <p className="text-xs text-muted-foreground truncate" title={description}>{description}</p>}

      {isFlowTemplate && isDeletable && (
        <div className="absolute top-1/2 -translate-y-1/2 right-1.5 flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" // Adjusted size for better click target
                onMouseDown={(e) => e.stopPropagation()}
                data-action-button="true"
                aria-label={t('nodePalette.deleteFlowTemplateAriaLabel', { name })}
              >
                <Trash2 className="h-3 w-3" /> {/* Adjusted icon size slightly */}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('nodePalette.confirmDeleteFlowTemplateTitle')}</AlertDialogTitle>
                <AlertDialogDescription>{t('nodePalette.confirmDeleteFlowTemplateDescription', { name })}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
                  {t('common.delete')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </Card>
  );
}

export function NodePalette() {
  const [savedFlows, setSavedFlows] = useState<Flow[]>([]);
  const [functionDefinitions, setFunctionDefinitions] = useState<FlowNodeObject[]>([]);
  const [functionSearchQuery, setFunctionSearchQuery] = useState('');
  const [currentViewport, setCurrentViewport] = useState(flowSubject.getValue().viewport);
  const { t, locale } = useTranslation(); // 获取 locale
  const { toast } = useToast();


  useEffect(() => {
    const savedFlowsSub = savedFlowsService.savedFlows$.subscribe(setSavedFlows);
    const definitionsSub = functionDefinitionService.definitions$.subscribe(setFunctionDefinitions);
    const flowSub = flowSubject.subscribe(flow => setCurrentViewport(flow.viewport));

    return () => {
      savedFlowsSub.unsubscribe();
      definitionsSub.unsubscribe();
      flowSub.unsubscribe();
    };
  }, []);

  const filteredUserFunctionDefinitions = useMemo(() => {
    const userDefs = functionDefinitions.filter(def => !def.data.templateId?.startsWith('base_'));
    if (!functionSearchQuery) {
      return userDefs;
    }
    const lowerCaseQuery = functionSearchQuery.toLowerCase();
    return userDefs.filter(def =>
      def.name.toLowerCase().includes(lowerCaseQuery)
    );
  }, [functionDefinitions, functionSearchQuery]);

  const allBaseFunctions = useMemo(() => {
    return baseFunctions.map(bf => ({ ...bf })); 
  }, []);

  const filteredBaseFunctions = useMemo(() => {
    if (!functionSearchQuery) {
      return allBaseFunctions;
    }
    const lowerCaseQuery = functionSearchQuery.toLowerCase();
    return allBaseFunctions.filter(bf =>
      bf.name.toLowerCase().includes(lowerCaseQuery) ||
      (bf.data.description && bf.data.description.toLowerCase().includes(lowerCaseQuery))
    );
  }, [allBaseFunctions, functionSearchQuery]);


  const handleDragStart = (event: React.DragEvent<HTMLDivElement>, nodeTypeToCreate: NodeType, name: string, options?: { subFlowId?: string; pythonFunctionCode?: string, pythonFunctionId?: string }) => {
    event.dataTransfer.setData('application/reactflow-node-type', nodeTypeToCreate);
    event.dataTransfer.setData('application/reactflow-node-name', name);
    if (nodeTypeToCreate === 'sub-flow' && options?.subFlowId) {
      event.dataTransfer.setData('application/reactflow-subflow-id', options.subFlowId);
    }
    if (nodeTypeToCreate === 'python-function' && options?.pythonFunctionCode) {
      event.dataTransfer.setData('application/reactflow-python-code', options.pythonFunctionCode);
    }
    if (nodeTypeToCreate === 'python-function' && options?.pythonFunctionId) {
      event.dataTransfer.setData('application/reactflow-python-id', options.pythonFunctionId);
      const funcDef = functionDefinitionService.getDefinitionById(options.pythonFunctionId) || baseFunctions.find(bf => bf.id === options.pythonFunctionId);
      if (funcDef?.data?.description) {
        event.dataTransfer.setData('application/reactflow-node-description', funcDef.data.description);
      }
    }
    event.dataTransfer.effectAllowed = 'move';
  };

  const handlePaletteItemSingleClick = (event: React.MouseEvent | React.KeyboardEvent, itemTypeForAction: NodeType | 'flow-template', name: string, options?: { subFlowId?: string; pythonFunctionCode?: string; pythonFunctionId?: string }) => {
    const targetIsInput = event.target instanceof HTMLElement && event.target.tagName.toLowerCase() === 'input';

    if (!targetIsInput) {
      let nodeTypeToCreate: NodeType;
      let creationOptions = { ...options };

      if (itemTypeForAction === 'flow-template' && options?.subFlowId) {
        nodeTypeToCreate = 'sub-flow';
      } else if (itemTypeForAction === 'python-function') { 
        nodeTypeToCreate = 'python-function';
      } else {
        nodeTypeToCreate = itemTypeForAction as NodeType; 
      }

      const position = {
        x: (-currentViewport.x / currentViewport.zoom) + 50 + Math.random() * 10,
        y: (-currentViewport.y / currentViewport.zoom) + 50 + Math.random() * 10,
      };

      let description;
      if (nodeTypeToCreate === 'python-function' && options?.pythonFunctionId) {
        const funcDef = functionDefinitionService.getDefinitionById(options.pythonFunctionId) || baseFunctions.find(bf => bf.id === options.pythonFunctionId);
        description = funcDef?.data?.description;
      }

      const newNode = flowService.addNode(nodeTypeToCreate, name, position, { ...creationOptions, description });
      flowService.selectNode({ type: 'node', data: newNode });
      // 移除点击添加节点时的 Toast
      // toast({ title: t('toast.nodeAdded.title'), description: t('toast.nodeAdded.byClickDescription', { name: newNode.name }) });
    }
  };

  const handlePaletteItemDoubleClick = (event: React.MouseEvent | React.KeyboardEvent, itemTypeForAction: NodeType | 'flow-template', name: string, options?: { subFlowId?: string; pythonFunctionCode?: string; pythonFunctionId?: string }) => {
    if (itemTypeForAction === 'python-function' && options?.pythonFunctionId) {
      const definitionNode = allBaseFunctions.find(bf => bf.id === options.pythonFunctionId) || 
        functionDefinitionService.getDefinitionById(options.pythonFunctionId); 
      if (definitionNode) {
        selectedNodeSubject.next({ type: 'node', data: definitionNode }); 
        toast({ title: t('toast.templateSelected.title'), description: t('toast.templateSelected.description', { name: definitionNode.name }) });
      }
    } else if (itemTypeForAction === 'flow-template' && options?.subFlowId) {
      const flowToLoad = savedFlowsService.getFlowById(options.subFlowId);
      if (flowToLoad) {
        flowService.loadFlow(flowToLoad);
        toast({ title: t('toast.flowLoadedForEditing.title'), description: t('toast.flowLoadedForEditing.description', { name: flowToLoad.name }) });
      } else {
        toast({ title: t('toast.loadFailed.title'), description: t('toast.loadFailed.description'), variant: "destructive" });
      }
    }
  };

  const handleDeleteFlowTemplate = (flowId: string, flowName: string) => {
    const currentFlowId = flowService.getFlow().id;
    savedFlowsService.deleteSavedFlow(flowId);
    toast({ title: t('toast.flowTemplateDeleted.title'), description: t('toast.flowTemplateDeleted.description', { name: flowName }) });
    if (currentFlowId === flowId) {
      flowService.createNewFlow(t('header.untitledFlow'));
    }
  };

  const handleDeleteFunctionDefinition = (definitionId: string, definitionName: string) => {
    functionDefinitionService.deleteDefinition(definitionId);
    toast({ title: t('toast.functionTemplateDeleted.title'), description: t('toast.functionTemplateDeleted.description', { name: definitionName }) });
    const currentSelection = selectedNodeSubject.getValue();
    if (currentSelection && currentSelection.type === 'node' && currentSelection.data.id === definitionId) {
      selectedNodeSubject.next(null);
    }
  };

  const handleUpdateFunctionDefinitionName = (definitionId: string, newNameFromInput: string) => {
    const newName = newNameFromInput.trim();
     const oldDefinition = functionDefinitionService.getDefinitionById(definitionId);
    if (!oldDefinition) return;

    if (!newName) {
        toast({ title: t('common.errorTitle'), description: t('configPanel.templateNameError.empty'), variant: "destructive" });
        return;
    }
    if (oldDefinition.name === newName) {
      return;
    }

    const allDefinitions = functionDefinitionService.getDefinitions();
    const isDuplicate = allDefinitions.some(def => def.name === newName && def.id !== definitionId);

    if (isDuplicate) {
      toast({ title: t('common.errorTitle'), description: t('toast.functionDefinition.nameConflict', { name: newName }), variant: "destructive" });
      return;
    }

    functionDefinitionService.updateDefinitionName(definitionId, newName);
    toast({ title: t('toast.templateNameUpdated.title'), description: t('toast.templateNameUpdated.description', { oldName: oldDefinition.name, newName }) });
    
    const currentSelection = selectedNodeSubject.getValue();
    if (currentSelection && currentSelection.type === 'node' && currentSelection.data.id === definitionId) {
      const updatedDefinition = functionDefinitionService.getDefinitionById(definitionId);
      if (updatedDefinition) selectedNodeSubject.next({ type: 'node', data: updatedDefinition });
    }
  };


  const basicNodesToDisplay: Array<Omit<PaletteItemProps, 'onDragStart' | 'onSingleClick' | 'onDoubleClick' | 'itemDefinitionId' | 'pythonFunctionCode' | 'pythonFunctionId' | 'subFlowId' | 'onDeleteFlowTemplate' | 'onDeleteFunctionDefinition' | 'onUpdateFunctionDefinitionName' | 'isFunctionDefinition' | 'isBaseFunction' | 'isFlowTemplate' | 'displayStyle'> & { type: NodeType }> = [
    {
      type: 'csv-input' as NodeType,
      name: t('nodePalette.csvInputName'),
      icon: <CsvIcon iconClassName="w-3.5 h-3.5" />, 
      description: t('nodePalette.csvInputDescription')
    },
    {
      type: 'excel-input' as NodeType,
      name: t('nodePalette.excelInputName'),
      icon: <ExcelIcon iconClassName="w-3.5 h-3.5" />, 
      description: t('nodePalette.excelInputDescription')
    },
    {
      type: 'python-function' as NodeType,
      name: t('nodePalette.pythonFunctionName'),
      icon: <PythonIcon iconClassName="w-3.5 h-3.5" gradientIdSuffix='palette-generic-python-creator' />, 
      description: t('nodePalette.pythonFunctionDescription'),
    },
    {
      type: 'output-node' as NodeType,
      name: t('nodePalette.outputNodeName'),
      icon: <FileOutput className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />, 
      description: t('nodePalette.outputNodeDescription')
    }
  ];

  const formatDate = useCallback((isoString: string | undefined, currentLocale: Locale): string => {
    if (!isoString) return 'N/A';
    try {
      const date = new Date(isoString);
      return date.toLocaleString(currentLocale, { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch (e) {
      return 'Invalid Date';
    }
  }, []); 


  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0">
        <Card className="bg-background/50 shadow-none border-0">
          <CardHeader className="p-1.5 pb-0.5">
            <CardTitle className="text-xs font-medium text-muted-foreground">{t('nodePalette.basicNodesTitle')}</CardTitle>
          </CardHeader>
          <ScrollArea className="max-h-[160px] overflow-y-auto">
            <CardContent className="p-1.5 pt-1">
              {basicNodesToDisplay.map((item) => (
                <PaletteItem
                  key={`basic-${item.type}-${item.name}`}
                  type={item.type}
                  name={item.name}
                  icon={item.icon}
                  description={item.description}
                  displayStyle='card'
                  onDragStart={handleDragStart}
                  onSingleClick={handlePaletteItemSingleClick}
                  isFunctionDefinition={item.type === 'python-function'} 
                  isBaseFunction={false} 
                  isFlowTemplate={false}
                />
              ))}
            </CardContent>
          </ScrollArea>
        </Card>
      </div>

      <Separator className="my-1" />

      <div className="flex-grow flex flex-col min-h-0">
        <Card className="flex-grow flex flex-col min-h-0 bg-background/50 shadow-none border-0">
          <CardHeader className="p-1.5 pb-0.5 flex-shrink-0">
            <CardTitle className="text-xs font-medium text-muted-foreground">{t('nodePalette.functionNodesTitle')}</CardTitle>
          </CardHeader>
          <div className="relative px-1.5 pt-0.25 flex-shrink-0">
            <Search className="absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t('nodePalette.searchFunctionsPlaceholder')}
              value={functionSearchQuery}
              onChange={(e) => setFunctionSearchQuery(e.target.value)}
              className="pl-6 h-6 text-xs"
            />
          </div>
          <ScrollArea className="flex-grow overflow-y-auto min-h-0 max-h-[160px]">
            <CardContent className="px-1 py-0 space-y-0"> 
              {(filteredUserFunctionDefinitions.length === 0 && filteredBaseFunctions.length === 0 ) && (
                <p className="text-xs text-muted-foreground text-center py-1 px-1.5">
                  {functionSearchQuery ? t('nodePalette.noFunctionsFound') : t('nodePalette.noSavedFunctions')}
                </p>
              )}
              {filteredUserFunctionDefinitions.map((funcDefNode) => (
                <PaletteItem
                  key={funcDefNode.id}
                  type={funcDefNode.type as NodeType} 
                  name={funcDefNode.name}
                  icon={<PythonIcon iconClassName="w-3.5 h-3.5" gradientIdSuffix={`user-func-${funcDefNode.id}`} />}
                  description={funcDefNode.data.description || `${t('configPanel.customFunctionPrefix')}: ${funcDefNode.name}.py`}
                  displayStyle='list'
                  onDragStart={handleDragStart}
                  onSingleClick={handlePaletteItemSingleClick}
                  onDoubleClick={handlePaletteItemDoubleClick}
                  pythonFunctionCode={funcDefNode.data.code}
                  pythonFunctionId={funcDefNode.id}
                  isFunctionDefinition={true}
                  isBaseFunction={false} 
                  itemDefinitionId={funcDefNode.id}
                  onDeleteFunctionDefinition={handleDeleteFunctionDefinition}
                  onUpdateFunctionDefinitionName={handleUpdateFunctionDefinitionName}
                />
              ))}

              {filteredUserFunctionDefinitions.length > 0 && filteredBaseFunctions.length > 0 && <Separator className="my-0.25" />}

              {filteredBaseFunctions.map((baseFuncNode) => (
                <PaletteItem
                  key={baseFuncNode.id}
                  type={baseFuncNode.type as NodeType} 
                  name={baseFuncNode.name}
                  icon={<PythonIcon iconClassName="w-3.5 h-3.5" gradientIdSuffix={`base-func-${baseFuncNode.id}`} />}
                  description={baseFuncNode.data.description || baseFuncNode.name}
                  displayStyle='list'
                  onDragStart={handleDragStart}
                  onSingleClick={handlePaletteItemSingleClick} 
                  onDoubleClick={handlePaletteItemDoubleClick} 
                  pythonFunctionCode={baseFuncNode.data.code}
                  pythonFunctionId={baseFuncNode.id}
                  isFunctionDefinition={true}
                  isBaseFunction={true}
                  itemDefinitionId={baseFuncNode.id}
                />
              ))}
            </CardContent>
          </ScrollArea>
        </Card>
      </div>

      <Separator className="my-1" />

      <div className="flex-shrink-0">
        <Card className="bg-background/50 shadow-none border-0">
          <CardHeader className="p-1.5 pb-0.5">
            <CardTitle className="text-xs font-medium text-muted-foreground">{t('nodePalette.flowTemplatesTitle')}</CardTitle>
          </CardHeader>
          <ScrollArea className="max-h-[160px] overflow-y-auto">
            <CardContent className="p-1.5 pt-1">
              {savedFlows.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-1">{t('nodePalette.noSavedFlowsShort')}</p>
              )}
              {savedFlows.map((flow) => {
                const formattedDate = formatDate(flow.createdAt, locale); 
                const description = t('nodePalette.flowTemplateCreatedAtDescription', { createdAt: formattedDate });
                return (
                  <PaletteItem
                    key={flow.id}
                    type={'flow-template'}
                    name={flow.name || `${t('nodePalette.flowPrefix')}: ${flow.id.substring(0, 8)}`}
                    icon={<Waypoints className="w-3.5 h-3.5 text-purple-500 dark:text-purple-400" />}
                    description={description}
                    displayStyle='card'
                    onDragStart={handleDragStart}
                    onSingleClick={handlePaletteItemSingleClick}
                    onDoubleClick={handlePaletteItemDoubleClick}
                    subFlowId={flow.id} 
                    itemDefinitionId={flow.id}
                    onDeleteFlowTemplate={handleDeleteFlowTemplate}
                    isFlowTemplate={true}
                    isFunctionDefinition={false}
                  />
                );
              })}
            </CardContent>
          </ScrollArea>
        </Card>
      </div>
    </div>
  );
}