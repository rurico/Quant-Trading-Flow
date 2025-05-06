
// src/components/flow/config-panel.tsx
'use client';
import { useEffect, useState, useCallback, ChangeEvent, useRef } from 'react';
// PythonFunctionTemplate 已被移除
import type { Node, Port, OutputNodeType, FilePreviewData, SelectedConfigItem } from '@/types/flow';
import { flowService, selectedNodeSubject } from '@/store/flow-store';
// pythonFunctionTemplateService 重命名为 functionDefinitionService，并处理 Node 类型
import { functionDefinitionService } from '@/store/python-function-template-store';
import { parsePythonFunction } from '@/lib/python-parser';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PlusCircle, Trash2, Edit3, Check, X, Waypoints, FileOutput, Expand, Save, UploadCloud, Sparkles, Loader2 } from 'lucide-react'; // 移除了 Plus 图标的导入，因为它不再使用
import { toast } from '@/hooks/use-toast';
import Editor, { Monaco, type EditorProps } from '@monaco-editor/react'; // 导入 Monaco 类型和 EditorProps
import * as XLSX from 'xlsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { useTranslation } from '@/hooks/use-translation';
import { PythonIcon } from '@/components/icons/python-icon';
import { ExcelIcon } from '@/components/icons/excel-icon';
import { CsvIcon } from '@/components/icons/csv-icon';
import { getPythonSuggestions } from '@/lib/monaco-python-suggestions'; // 导入建议
import { cn } from '@/lib/utils';
import { generatePythonCode } from '@/ai/flows/generate-python-code-flow'; // 导入新的 AI flow

interface PortEditorProps {
  port: Port;
  onUpdateName: (portId: string, newName: string) => void;
  isPythonFunctionNode: boolean;
  isReadOnly?: boolean; 
}

function PortEditor({ port, onUpdateName, isPythonFunctionNode, isReadOnly }: PortEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(port.name);
  const { t } = useTranslation();

  const handleSave = () => {
    if (name.trim() !== '' && name !== port.name) {
      onUpdateName(port.id, name);
    }
    setIsEditing(false);
  };

  useEffect(() => {
    setName(port.name);
  }, [port]);

  if (isEditing && !isReadOnly) { 
    return (
      <div className="flex items-center gap-1 p-1 border rounded-md bg-muted/40"> 
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('configPanel.portNamePlaceholder')} className="h-6 text-xs" /> 
        {isPythonFunctionNode && <p className="text-xs text-muted-foreground whitespace-nowrap">({port.originalName || t('configPanel.customPort')})</p>}
        <Button size="icon" variant="ghost" onClick={handleSave} className="h-6 w-6 text-green-500 hover:text-green-600"><Check className="h-3 w-3" /></Button> 
        <Button size="icon" variant="ghost" onClick={() => setIsEditing(false)} className="h-6 w-6 text-red-500 hover:text-red-600"><X className="h-3 w-3" /></Button> 
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-1 border rounded-md hover:bg-muted/20 min-h-[36px]"> 
      <div className="flex-1">
        <p className="text-xs font-medium">{port.name}</p> 
        {isPythonFunctionNode && port.originalName && port.originalName !== port.name && (
          <p className="text-xs text-muted-foreground">
            ({t('configPanel.originalPortNameLabel')}: {port.originalName})
          </p>
        )}
      </div>
      {!isReadOnly && ( 
        <div className="flex gap-0.5"> 
          <Button size="icon" variant="ghost" onClick={() => setIsEditing(true)} className="h-5 w-5" aria-label={t('configPanel.editPortNameAriaLabel')}><Edit3 className="h-3 w-3" /></Button> 
        </div>
      )}
    </div>
  );
}

export function ConfigPanel() {
  const [selectedItem, setSelectedItem] = useState<SelectedConfigItem>(null);
  const [itemName, setItemName] = useState('');
  const [itemCode, setItemCode] = useState('');
  const [debouncedItemCode, setDebouncedItemCode] = useState('');
  const [fileName, setFileName] = useState<string | undefined>(undefined);
  const [fileSize, setFileSize] = useState<number | undefined>(undefined);
  const [filePreviewDataForDisplay, setFilePreviewDataForDisplay] = useState<FilePreviewData | null>(null);
  const [subFlowId, setSubFlowId] = useState('');
  const [outputValue, setOutputValue] = useState('');
  const [outputType, setOutputType] = useState<OutputNodeType>('json');
  const [editorKey, setEditorKey] = useState(0); 
  const [isEditorDialogOpen, setIsEditorDialogOpen] = useState(false);
  const [dialogEditorCode, setDialogEditorCode] = useState('');
  const { t } = useTranslation();
  const previousItemIdRef = useRef<string | null>(null);
  const [monacoInstance, setMonacoInstance] = useState<Monaco | null>(null);
  const editorRef = useRef<Parameters<EditorProps['onMount']>[0]>(null); // 用于获取编辑器实例

  // AI 代码生成相关状态
  const [naturalLanguageInput, setNaturalLanguageInput] = useState('');
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);


  useEffect(() => {
    const subscription = selectedNodeSubject.subscribe(newItemFromSubject => {
      const newId = newItemFromSubject?.data?.id || null;
      const oldId = previousItemIdRef.current;

      setSelectedItem(newItemFromSubject);

      if (newId !== oldId) { 
        if (newItemFromSubject && newItemFromSubject.type === 'node') {
          const node = newItemFromSubject.data as Node;
          setItemName(node.name);
          let newCode = '';

          setFileName(undefined);
          setFileSize(undefined);
          setFilePreviewDataForDisplay(null);
          setSubFlowId('');
          setOutputValue('{}');
          setOutputType('json');
          setNaturalLanguageInput(''); // 清空 AI 输入

          if (node.type === 'python-function') {
            newCode = node.data.code || '';
          }
          setFileName(node.data.fileName);
          setFileSize(node.data.fileSize);
          setFilePreviewDataForDisplay(node.data.filePreview || null);
          setSubFlowId(node.data.subFlowId || '');
          if (node.type === 'output-node') {
            let initialOutputValue = node.data.outputValue;
            try {
              const stringifiedValue = JSON.stringify(initialOutputValue, null, 2);
              setOutputValue(stringifiedValue === undefined ? '{}' : stringifiedValue);
            } catch (e) {
              setOutputValue('{}');
            }
          }

          setItemCode(newCode);
          setDialogEditorCode(newCode);
          setDebouncedItemCode(newCode); 
          setEditorKey(prevKey => prevKey + 1); 
        } else {
          setItemName('');
          setItemCode('');
          setDialogEditorCode('');
          setDebouncedItemCode('');
          setFileName(undefined);
          setFileSize(undefined);
          setFilePreviewDataForDisplay(null);
          setSubFlowId('');
          setOutputValue('{}');
          setOutputType('json');
          setNaturalLanguageInput(''); // 清空 AI 输入
          setEditorKey(prevKey => prevKey + 1); 
        }
      } else if (newItemFromSubject && newItemFromSubject.type === 'node') { 
        const node = newItemFromSubject.data as Node;
        if (node.name !== itemName) {
          setItemName(node.name);
        }
        if (node.type === 'python-function') {
          if (node.data.code !== itemCode) {
            setItemCode(node.data.code || '');
            setDialogEditorCode(node.data.code || '');
          }
        }
        if (node.data.fileName !== fileName) setFileName(node.data.fileName);
        if (node.data.fileSize !== fileSize) setFileSize(node.data.fileSize);
        if (JSON.stringify(node.data.filePreview) !== JSON.stringify(filePreviewDataForDisplay)) {
           setFilePreviewDataForDisplay(node.data.filePreview || null);
        }
        if (node.data.subFlowId !== subFlowId) setSubFlowId(node.data.subFlowId || '');
        if (node.type === 'output-node') {
          let currentLocalParsedValue;
          const storeOutputValue = node.data.outputValue;
          try {
            currentLocalParsedValue = outputValue.trim() === '' ? null : JSON.parse(outputValue);
          } catch {
            currentLocalParsedValue = Symbol();
          }
          if(JSON.stringify(currentLocalParsedValue) !== JSON.stringify(storeOutputValue)) {
            try {
                const stringifiedStoreValue = JSON.stringify(storeOutputValue, null, 2);
                setOutputValue(stringifiedStoreValue === undefined ? '{}' : stringifiedStoreValue);
            } catch (e){
                setOutputValue('{}');
            }
          }
        }
      }
      previousItemIdRef.current = newId;
    });
    return () => {
      subscription.unsubscribe();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 


  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedItemCode(itemCode);
    }, 750);
    return () => {
      clearTimeout(handler);
    };
  }, [itemCode]);

  useEffect(() => {
    if (selectedItem?.type === 'node') {
      const node = selectedItem.data as Node;
      if (node.type === 'python-function' && !node.data.templateId?.startsWith('base_')) { 
        if (debouncedItemCode !== (node.data.code || '')) {
          const { inputs: parsedInputs, outputs: parsedOutputs } = parsePythonFunction(debouncedItemCode);

          const reconcilePorts = (existingPorts: Port[], parsedNames: string[], portType: 'input' | 'output'): Port[] => {
            const newPorts: Port[] = [];
            const usedExistingPortIds = new Set<string>();
            for (const parsedName of parsedNames) {
              let existingPort = existingPorts.find(p => p.originalName === parsedName && !usedExistingPortIds.has(p.id));
              if (!existingPort) {
                existingPort = existingPorts.find(p => p.name === parsedName && !p.originalName && !usedExistingPortIds.has(p.id));
              }
              if (existingPort) {
                newPorts.push({ ...existingPort, originalName: parsedName, name: existingPort.name || parsedName, type: portType, nodeId: node.id });
                usedExistingPortIds.add(existingPort.id);
              } else {
                const sanitizedNameBase = parsedName.replace(/[^a-zA-Z0-9_]/g, '');
                const defaultNameBase = portType === 'input' ? `param` : `output`;
                const finalNameBase = sanitizedNameBase || `${defaultNameBase}${newPorts.length + 1}`;
                let occurrenceIndex = 0;
                let tempNewPortId = `port_${portType}_${node.id}_${finalNameBase}_${occurrenceIndex}`;
                while (newPorts.some(p => p.id === tempNewPortId) || existingPorts.some(p => p.id === tempNewPortId && !usedExistingPortIds.has(p.id))) {
                    occurrenceIndex++;
                    tempNewPortId = `port_${portType}_${node.id}_${finalNameBase}_${occurrenceIndex}`;
                }
                const newPortId = `${tempNewPortId}_${Date.now()}`;
                newPorts.push({
                  id: newPortId,
                  name: parsedName,
                  originalName: parsedName,
                  type: portType,
                  nodeId: node.id,
                });
              }
            }
            return newPorts;
          };

          const updatedInputs = reconcilePorts(node.inputs, parsedInputs, 'input');
          const updatedOutputs = reconcilePorts(node.outputs, parsedOutputs, 'output');

          const portsChanged =
            JSON.stringify(updatedInputs) !== JSON.stringify(node.inputs) ||
            JSON.stringify(updatedOutputs) !== JSON.stringify(node.outputs);

          if (portsChanged || debouncedItemCode !== node.data.code) {
             const updatedNode: Node = {
              ...node,
              name: node.name,  
              inputs: updatedInputs,
              outputs: updatedOutputs,
              data: { ...node.data, code: debouncedItemCode },
            };
            flowService.updateNode(updatedNode);
          }
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedItemCode, selectedItem]);


  const handleUpdateItem = () => {
    if (!selectedItem || selectedItem.type !== 'node') return;

    const node = selectedItem.data as Node;
    
    if (node.data.templateId?.startsWith('base_')) return; // 基础函数定义不可修改

    let parsedOutputValue: any = node.data.outputValue;

    if (node.type === 'output-node') {
      if (outputValue.trim() !== '') {
        try {
          parsedOutputValue = JSON.parse(outputValue);
        } catch (error) {
          toast({ title: t('common.errorTitle'), description: t('toast.outputInvalidJson'), variant: "destructive" });
          return;
        }
      } else {
        parsedOutputValue = null;
      }
    }

    const currentFlow = flowService.getFlow();
    const isNodeOnCanvas = currentFlow.nodes.some(n => n.id === node.id);
    const nameToSave = itemName.trim();

    if (node.type === 'python-function' && !node.data.templateId?.startsWith('base_')) {
      if (!nameToSave) {
        toast({ title: t('common.errorTitle'), description: t('configPanel.templateNameError.empty'), variant: "destructive" });
        return;
      }
      // 名称冲突检查已移至 service 层，此处不再需要
    }


    let finalNode: Node = {
        ...node,
        name: nameToSave, 
        data: {
            ...node.data,
            ...(node.type === 'python-function' && { code: itemCode }), 
            ...(node.type === 'output-node' && { outputValue: parsedOutputValue, outputType: 'json' }),
            ...(node.type === 'sub-flow' && { subFlowId: subFlowId }),
        }
    };

    if (node.type === 'python-function') {
      let definitionToSave: Node = { // 使用 let 以便 service 层可以修改名称
        ...finalNode,
        data: {
          ...finalNode.data,
          description: finalNode.data.description || `${t('configPanel.customFunctionPrefix')}: ${finalNode.name}`
        }
      };
      if (!definitionToSave.data.templateId?.startsWith('base_')) {
        const savedDefinition = functionDefinitionService.addOrUpdateDefinition(definitionToSave);
        // 如果名称被服务层修改，更新 itemName
        if (savedDefinition.name !== itemName) {
          setItemName(savedDefinition.name);
          finalNode.name = savedDefinition.name; // 确保 finalNode 也使用最终名称
        }
        toast({ title: t('toast.functionApplied.title'), description: t('toast.functionApplied.nodeDescription', { name: finalNode.name }) });
      }
    }

    if (isNodeOnCanvas) {
      flowService.updateNode(finalNode);
    }

    setSelectedItem({ type: 'node', data: finalNode }); // 更新选中的项目数据

    if (isNodeOnCanvas) {
         toast({ title: t('toast.nodeUpdated.title'), description: t('toast.nodeUpdated.description', { name: finalNode.name }) });
    } else if (node.type !== 'python-function' || (node.type === 'python-function' && !finalNode.data.templateId?.startsWith('base_'))) {
         // 对于不在画布上的函数定义（即从函数定义列表直接编辑的）
         toast({ title: t('toast.templateUpdated.title'), description: t('toast.templateUpdated.description', { name: finalNode.name }) });
    }
  };


  const handlePortNameUpdate = (portId: string, newName: string) => {
    if (selectedItem?.type !== 'node') return;
    const node = selectedItem.data as Node;

    if (node.data.templateId?.startsWith('base_')) {
      return; // 基础函数的端口名不可修改
    }

    const updatePorts = (ports: Port[]): Port[] =>
      ports.map(p => p.id === portId ? { ...p, name: newName } : p);

    const updatedNode: Node = {
      ...node,
      inputs: updatePorts(node.inputs),
      outputs: updatePorts(node.outputs),
    };

    // 如果节点在画布上，更新画布上的节点
    if (flowService.getFlow().nodes.some(n => n.id === updatedNode.id)) {
        flowService.updateNode(updatedNode);
    }
    // 如果节点是一个函数定义（非基础函数），也更新函数定义库中的定义
    if (functionDefinitionService.getDefinitionById(updatedNode.id) && !updatedNode.data.templateId?.startsWith('base_')) {
        functionDefinitionService.addOrUpdateDefinition(updatedNode);
    }
    setSelectedItem({ type: 'node', data: updatedNode }); // 更新选择的项
  };

  const handleEditorChange = (value?: string) => {
    const newCode = value || '';
    setItemCode(newCode); 
    if (isEditorDialogOpen) {
      setDialogEditorCode(newCode);
    }
  };
  
  const handleEditorDidMount: EditorProps['onMount'] = (editorInstance, monaco) => {
    editorRef.current = editorInstance;
    setMonacoInstance(monaco); // 保存 monaco 实例

    // 配置撤销/重做
    editorInstance.addAction({
      id: 'undo-action', // 确保 ID 唯一
      label: t('common.undo') || '撤销',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyZ],
      run: () => editorInstance.trigger('','undo', null),
    });
    editorInstance.addAction({
      id: 'redo-action', // 确保 ID 唯一
      label: t('common.redo') || '重做',
      keybindings: [
        monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyZ, // Mac
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyY, // Windows/Linux
      ],
      run: () => editorInstance.trigger('','redo', null),
    });
  };


  const handleDialogEditorSave = () => {
    setItemCode(dialogEditorCode);
    setIsEditorDialogOpen(false);
    toast({ title: t('toast.codeUpdatedDialog.title'), description: t('toast.codeUpdatedDialog.description') });
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && selectedItem?.type === 'node') {
      const node = selectedItem.data as Node;
      let localFilePreview: FilePreviewData | null = null;
      let jsonDataArray: any[] = [];

      try {
        if (node.type === 'csv-input') {
          const text = await file.text();
          if(text){
            const lines = text.split(/\r\n|\n|\r/).filter(line => line.trim() !== '');
            const headers = lines[0] ? lines[0].split(',').map(h => h.trim()) : [];
            const dataRows = lines.slice(1);
            const firstRow = dataRows.length > 0 && dataRows[0] ? dataRows[0].split(',').map(c => c.trim()) : [];
            
            if (headers.length > 0 && dataRows.length > 0) {
              jsonDataArray = dataRows.map(rowStr => {
                const values = rowStr.split(',').map(v => v.trim());
                const rowObj: Record<string, string> = {};
                headers.forEach((header, index) => {
                  rowObj[header] = values[index] || ""; 
                });
                return rowObj;
              });
            }

            if (headers.length === 0 && firstRow.length === 0 && dataRows.length === 0) {
                 localFilePreview = { headers:[], firstRow:[], error: t('configPanel.emptyFileError'), rowCount: 0, jsonData: [] };
            } else {
                localFilePreview = { headers, firstRow, rowCount: dataRows.length, jsonData: jsonDataArray };
            }
          } else {
             localFilePreview = { headers:[], firstRow:[], error: t('configPanel.emptyFileError'), rowCount: 0, jsonData: [] };
          }
        } else if (node.type === 'excel-input') {
          const arrayBuffer = await file.arrayBuffer();
          const workbook = XLSX.read(arrayBuffer, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          
          jsonDataArray = XLSX.utils.sheet_to_json<any>(worksheet);
          const jsonDataForPreview = XLSX.utils.sheet_to_json<string[]>(worksheet, { header: 1 });
          
          if (jsonDataForPreview.length > 0) {
            const headers = jsonDataForPreview[0].map(String);
            const dataRows = jsonDataForPreview.slice(1);
            const firstRow = dataRows.length > 0 ? dataRows[0].map(String) : [];
            if (headers.length === 0 && firstRow.length === 0 && dataRows.length === 0) {
                 localFilePreview = { headers:[], firstRow:[], error: t('configPanel.emptyFileError'), rowCount: 0, jsonData: [] };
            } else {
                localFilePreview = { headers, firstRow, rowCount: dataRows.length, jsonData: jsonDataArray };
            }
          } else {
            localFilePreview = { headers:[], firstRow:[], error: t('configPanel.emptyFileError'), rowCount: 0, jsonData: [] };
          }
        }

        setFilePreviewDataForDisplay(localFilePreview);
        setFileName(file.name);
        setFileSize(file.size);

        const updatedNodeData = { ...node.data, fileName: file.name, fileSize: file.size, filePreview: localFilePreview };
        const updatedNode = { ...node, data: updatedNodeData };

        if (flowService.getFlow().nodes.some(n => n.id === updatedNode.id)) {
            flowService.updateNode(updatedNode);
        }
        if (functionDefinitionService.getDefinitionById(updatedNode.id)) {
            functionDefinitionService.addOrUpdateDefinition(updatedNode);
        }

        if (selectedItem?.data.id === updatedNode.id) {
            setSelectedItem({ type: 'node', data: updatedNode });
        }
        // toast({ title: t('toast.fileSelected.title'), description: t('toast.fileSelected.description', { fileName: file.name }) }); // 已根据用户要求移除

      } catch (error) {
        console.error("处理文件时出错:", error);
        const errorPreview: FilePreviewData = { headers: [], firstRow: [], error: t('toast.fileReadError.title'), rowCount: 0, jsonData: [] };
        setFilePreviewDataForDisplay(errorPreview);

        const updatedNodeData = {
            ...node.data,
            fileName: file.name,
            fileSize: file.size,
            filePreview: errorPreview
        };
        const updatedNode = { ...node, data: updatedNodeData };

        if (flowService.getFlow().nodes.some(n => n.id === updatedNode.id)) {
            flowService.updateNode(updatedNode);
        }
        if (functionDefinitionService.getDefinitionById(updatedNode.id)) {
            functionDefinitionService.addOrUpdateDefinition(updatedNode);
        }
        if (selectedItem?.data.id === updatedNode.id) {
            setSelectedItem({ type: 'node', data: updatedNode });
            setFileName(file.name);
            setFileSize(file.size);
        }
        toast({ title: t('toast.fileReadError.title'), description: t('toast.fileReadError.description'), variant: 'destructive' });
      }
    }
  };

  const handleGenerateCodeFromAI = async () => {
    if (!naturalLanguageInput.trim()) return;
    setIsGeneratingCode(true);
    toast({ title: t('configPanel.aiHelper.toast.generatingTitle') });
    try {
      // 如果编辑器中有代码，则将其传递给 AI 进行修改
      const currentCodeInEditor = itemCode.trim();
      const inputForAI: { naturalLanguagePrompt: string; existingCode?: string } = {
        naturalLanguagePrompt: naturalLanguageInput,
      };
      if (currentCodeInEditor) {
        inputForAI.existingCode = currentCodeInEditor;
      }

      const result = await generatePythonCode(inputForAI);
      if (result.pythonCode) {
        // 使用 Monaco Editor API 来更新内容，这有助于保留撤销/重做历史
        if (editorRef.current && monacoInstance) { // 确保 monacoInstance 也存在
            const currentModel = editorRef.current.getModel();
            if (currentModel) {
                editorRef.current.executeEdits("ai-generator", [{
                    range: currentModel.getFullModelRange(),
                    text: result.pythonCode,
                    forceMoveMarkers: true
                }]);
            } else {
                 setItemCode(result.pythonCode); // 回退到直接设置状态
            }
        } else {
            setItemCode(result.pythonCode); // 编辑器实例不存在时的回退
        }

        setDialogEditorCode(result.pythonCode);
        setNaturalLanguageInput(''); 
        toast({ title: t('configPanel.aiHelper.toast.successTitle'), description: t('configPanel.aiHelper.toast.successDescription') });
      } else {
        throw new Error(t('configPanel.aiHelper.toast.emptyResultError'));
      }
    } catch (error) {
      console.error("AI 生成代码失败:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast({ 
        title: t('configPanel.aiHelper.toast.errorTitle'), 
        description: t('configPanel.aiHelper.toast.errorDescription', { error: errorMessage }),
        variant: "destructive" 
      });
    } finally {
      setIsGeneratingCode(false);
    }
  };


  const isPythonFunctionTypeNode = selectedItem?.type === 'node' && (selectedItem.data as Node).type === 'python-function';
  const isBaseFunctionNode = isPythonFunctionTypeNode && selectedItem.type === 'node' && (selectedItem.data as Node).data.templateId?.startsWith('base_');


  useEffect(() => {
    if (monacoInstance && isPythonFunctionTypeNode) {
        const provider = monacoInstance.languages.registerCompletionItemProvider('python', {
            provideCompletionItems: (model, position) => {
                const word = model.getWordUntilPosition(position);
                const range = {
                    startLineNumber: position.lineNumber,
                    endLineNumber: position.lineNumber,
                    startColumn: word.startColumn,
                    endColumn: word.endColumn
                };
                const suggestions = getPythonSuggestions(monacoInstance, range);
                return { suggestions: suggestions };
            }
        });
        return () => provider.dispose();
    }
  }, [monacoInstance, isPythonFunctionTypeNode]);


  if (!selectedItem) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <p className="text-muted-foreground text-center text-sm px-4 py-2">{t('configPanel.selectNodePrompt')}</p>
      </div>
    );
  }

  const currentData = selectedItem.data as Node; 
  const nodeType = currentData.type;

  const naturalLanguagePlaceholder = itemCode.trim() ? t('configPanel.aiHelper.inputPlaceholderModify') : t('configPanel.aiHelper.inputPlaceholderGenerate');


  return (
    <Card className="h-full flex flex-col border-0 shadow-none">
      <CardHeader className="p-3 pb-2"> 
        <CardTitle className="text-sm flex items-center"> 
          {nodeType === 'python-function' && <PythonIcon iconClassName="w-4 h-4 mr-1.5" gradientIdSuffix={`config-panel-${currentData.id}`} />} 
          {nodeType === 'excel-input' && <ExcelIcon iconClassName="w-4 h-4 mr-1.5" />}
          {nodeType === 'csv-input' && <CsvIcon iconClassName="w-4 h-4 mr-1.5" />}
          {nodeType === 'sub-flow' && <Waypoints className="w-4 h-4 mr-1.5 text-purple-500 dark:text-purple-400" />}
          {nodeType === 'output-node' && <FileOutput className="w-4 h-4 mr-1.5 text-amber-500 dark:text-amber-400" />}
          {t('configPanel.configureNodeTitle', { name: itemName })}
        </CardTitle>
        <CardDescription className="text-xs">ID: {currentData.id}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 px-3 pt-2 space-y-3 overflow-y-auto"> 
        <div className="space-y-1.5"> 
          <Label htmlFor="itemName" className="text-sm"> 
            {t('configPanel.nodeNameLabel')}
          </Label>
          <Input
            id="itemName"
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            className="h-8 text-sm" 
            disabled={isBaseFunctionNode} 
          />
        </div>

        {isPythonFunctionTypeNode && (
          <div className="space-y-1.5 relative"> {/* 确保父容器是相对定位 */}
            <div className="flex justify-between items-center">
              <Label htmlFor="itemCode" className="text-sm">{t('configPanel.pythonCodeLabel')}</Label> 
              <Button variant="ghost" size="icon" onClick={() => { setDialogEditorCode(itemCode); setIsEditorDialogOpen(true); }} className="h-6 w-6"> 
                <Expand className="w-3.5 h-3.5" /> 
              </Button>
            </div>
            <div className={cn(
                "border rounded-md overflow-hidden", 
                isBaseFunctionNode && "bg-muted/30 dark:bg-muted/20 cursor-not-allowed opacity-70"
            )}>
              <Editor
                key={`panel-${editorKey}-${currentData.id}`}
                height="180px" 
                language="python"
                theme={document.documentElement.classList.contains('dark') ? "vs-dark" : "vs"}
                value={itemCode}
                onChange={handleEditorChange}
                onMount={handleEditorDidMount}
                options={{
                  minimap: { enabled: false },
                  fontSize: 12, 
                  wordWrap: 'on',
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  readOnly: isBaseFunctionNode, 
                }}
              />
            </div>
            {/* AI 代码助手输入栏 */}
            {!isBaseFunctionNode && (
                 <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-card/80 dark:bg-muted/30 backdrop-blur-sm rounded-b-md">
                    <div className="flex items-center bg-white dark:bg-card border border-input rounded-md shadow-sm h-9"> 
                        <Input
                            placeholder={naturalLanguagePlaceholder}
                            value={naturalLanguageInput}
                            onChange={(e) => setNaturalLanguageInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !isGeneratingCode && naturalLanguageInput.trim()) { e.preventDefault(); handleGenerateCodeFromAI(); }}}
                            className="flex-1 h-full px-2 bg-transparent border-none focus-visible:ring-0 text-sm"
                            disabled={isGeneratingCode}
                        />
                        <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 mx-1"
                            onClick={handleGenerateCodeFromAI}
                            disabled={isGeneratingCode || !naturalLanguageInput.trim()}
                            aria-label={t('configPanel.aiHelper.triggerButtonAriaLabel')}
                        >
                            {isGeneratingCode ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Sparkles className="h-4 w-4 text-primary" />
                            )}
                        </Button>
                    </div>
                </div>
            )}
          </div>
        )}

        {selectedItem.type === 'node' && (nodeType === 'excel-input' || nodeType === 'csv-input') && (
          <div className="space-y-1.5"> 
            <Label htmlFor="fileUpload" className="text-sm"> 
              {nodeType === 'excel-input' ? t('configPanel.excelFileLabel') : t('configPanel.csvFileLabel')}
            </Label>
            <div className="flex items-center gap-2"> 
              <Input
                id="fileUpload"
                key={`file-input-${currentData.id}-${fileName}`}
                type="file"
                accept={nodeType === 'excel-input' ? '.xlsx, .xls' : '.csv'}
                onChange={handleFileChange}
                className="h-8 text-sm flex-1 py-1.5" 
              />
            </div>
            {fileName && (
              <div className="text-xs text-muted-foreground p-1.5 border rounded-md bg-muted/30"> 
                <p>{t('configPanel.selectedFileLabel')}: {fileName}</p>
                {fileSize !== undefined && <p>{t('configPanel.fileSizeLabel')}: {(fileSize / 1024).toFixed(2)} KB</p>}
              </div>
            )}
          </div>
        )}

        {selectedItem.type === 'node' && nodeType === 'sub-flow' && (
          <div className="space-y-1.5"> 
            <Label htmlFor="subFlowId" className="text-sm">{t('configPanel.subflowIdLabel')}</Label> 
            <Input
              id="subFlowId"
              value={subFlowId}
              readOnly
              placeholder={t('configPanel.subflowIdPlaceholder')}
              className="h-8 text-sm bg-muted/50" 
            />
            <p className="text-xs text-muted-foreground">{t('configPanel.subflowIdDescription')}</p>
          </div>
        )}

        {selectedItem.type === 'node' && nodeType === 'output-node' && (
          <div className="space-y-2.5"> 
            <div className="space-y-1.5"> 
              <Label htmlFor="outputTypeSelect" className="text-sm">{t('configPanel.outputTypeLabel')}</Label> 
              <Select value={outputType} onValueChange={(value) => setOutputType(value as OutputNodeType)} disabled>
                <SelectTrigger id="outputTypeSelect" className="h-8 text-sm"> 
                  <SelectValue placeholder={t('configPanel.selectOutputTypePlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="json">JSON</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"> 
              <Label htmlFor="outputValue" className="text-sm"> 
                {t('configPanel.outputValueJsonLabel')}
              </Label>
              <Textarea
                id="outputValue"
                value={outputValue}
                onChange={(e) => setOutputValue(e.target.value)}
                placeholder='{ "key": "value" }'
                rows={3} 
                className="font-mono text-xs"
              />
            </div>
          </div>
        )}

        {selectedItem.type === 'node' && (nodeType === 'python-function' || nodeType === 'sub-flow') && (
          <>
            <div className="space-y-1.5 pt-1"> 
              <div className="flex justify-between items-center">
                <Label className="text-sm">{t('configPanel.inputParametersLabel')}</Label> 
                {nodeType !== 'python-function' && ( 
                  <Button variant="ghost" size="sm" disabled className="text-xs h-6"> 
                    <PlusCircle className="w-3 h-3 mr-1" /> {t('configPanel.addInputParameterButton')} 
                  </Button>
                )}
              </div>
              <ScrollArea className="min-h-[5rem] max-h-40 border rounded-md p-1.5 bg-muted/20"> 
                <div className="space-y-1"> 
                  {(currentData as Node).inputs.map(port => (
                    <PortEditor
                      key={port.id}
                      port={port}
                      onUpdateName={handlePortNameUpdate}
                      isPythonFunctionNode={nodeType === 'python-function'}
                      isReadOnly={isBaseFunctionNode && nodeType === 'python-function'}
                    />
                  ))}
                  {(currentData as Node).inputs.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">{t('configPanel.noInputParameters')}</p>} 
                </div>
              </ScrollArea>
            </div>

            <div className="space-y-1.5"> 
              <div className="flex justify-between items-center">
                <Label className="text-sm">{t('configPanel.outputParametersLabel')}</Label> 
                 {nodeType !== 'python-function' && ( 
                  <Button variant="ghost" size="sm" disabled className="text-xs h-6"> 
                    <PlusCircle className="w-3 h-3 mr-1" /> {t('configPanel.addOutputParameterButton')} 
                  </Button>
                 )}
              </div>
              <ScrollArea className="min-h-[5rem] max-h-40 border rounded-md p-1.5 bg-muted/20"> 
                <div className="space-y-1"> 
                  {(currentData as Node).outputs.map(port => (
                    <PortEditor
                      key={port.id}
                      port={port}
                      onUpdateName={handlePortNameUpdate}
                      isPythonFunctionNode={nodeType === 'python-function'}
                      isReadOnly={isBaseFunctionNode && nodeType === 'python-function'}
                    />
                  ))}
                  {(currentData as Node).outputs.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">{t('configPanel.noOutputParameters')}</p>} 
                </div>
              </ScrollArea>
            </div>
          </>
        )}
      </CardContent>
      <CardFooter className="p-3 pt-2"> 
        {!(isBaseFunctionNode && selectedItem.type === 'node' && selectedItem.data.type === 'python-function') && (
            <Button onClick={handleUpdateItem} className="w-full h-8"> 
            {t('configPanel.applyChangesButton')}
            </Button>
        )}
      </CardFooter>

      {isPythonFunctionTypeNode && (
        <Dialog open={isEditorDialogOpen} onOpenChange={setIsEditorDialogOpen}>
          <DialogContent className={cn(
            "w-[95vw] max-w-[95vw] h-[90vh] flex flex-col p-0",
            isBaseFunctionNode && "cursor-not-allowed"
          )}>
            <DialogHeader className="p-4 border-b">
              <DialogTitle>{t('configPanel.editPythonCodeTitle', {name: itemName})}</DialogTitle>
            </DialogHeader>
            <div className={cn(
                "flex-1 p-4 overflow-hidden",
                isBaseFunctionNode && "bg-muted/30 dark:bg-muted/20 opacity-70"
              )}>
              <Editor
                key={`dialog-${editorKey}-${currentData.id}`}
                height="100%"
                language="python"
                theme={document.documentElement.classList.contains('dark') ? "vs-dark" : "vs"}
                value={dialogEditorCode}
                onChange={(value) => setDialogEditorCode(value || '')}
                onMount={handleEditorDidMount}
                options={{
                  minimap: { enabled: true },
                  fontSize: 14,
                  wordWrap: 'on',
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  readOnly: isBaseFunctionNode, 
                }}
              />
            </div>
            <DialogFooter className="p-4 border-t">
              <DialogClose asChild>
                <Button variant="outline">{t('common.cancel')}</Button>
              </DialogClose>
              <Button onClick={handleDialogEditorSave} disabled={isBaseFunctionNode}>
                <Save className="mr-2 h-4 w-4" />
                {t('configPanel.applyCodeAndCloseButton')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}
