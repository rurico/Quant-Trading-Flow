// src/components/flow/flow-node.tsx
'use client';

import type { Node as FlowNodeType, Port, FilePreviewData } from '@/types/flow';
import type { PointerEvent as ReactPointerEvent } from 'react'; // 导入 PointerEvent 类型
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Waypoints, GripVertical, Trash2, FileOutput, UploadCloud, ChevronDown, ChevronUp } from 'lucide-react';
import { flowService } from '@/store/flow-store';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/use-translation';
// import { useToast } from '@/hooks/use-toast'; // useToast 已被移除或不再使用
import { PythonIcon } from '@/components/icons/python-icon';
import { ExcelIcon } from '@/components/icons/excel-icon';
import { CsvIcon } from '@/components/icons/csv-icon';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '../ui/scroll-area';
import { useState, useRef, useEffect } from 'react';
import { PORT_GAP, PORT_ROW_HEIGHT } from '@/lib/layout-constants'; // 引入常量


interface FlowNodeProps {
  node: FlowNodeType;
  isSelected: boolean;
  onConnectPointerDown: (event: ReactPointerEvent, port: Port) => void;
  onPortPointerEnter: (event: ReactPointerEvent, port: Port) => void;
  onPortPointerLeave: (event: ReactPointerEvent, port: Port) => void;
}

const nodeIcons: Record<FlowNodeType['type'], (nodeId: string, isSelected?: boolean) => React.ReactNode> = {
  'python-function': (nodeId, isSelected) => <PythonIcon iconClassName="w-4 h-4" gradientIdSuffix={`flownode-${nodeId}-${isSelected ? 'selected' : 'default'}`} />,
  'excel-input': () => <ExcelIcon iconClassName="w-4 h-4" />,
  'csv-input': () => <CsvIcon iconClassName="w-4 h-4" />,
  'sub-flow': () => <Waypoints className="w-4 h-4 text-purple-500 dark:text-purple-400" />,
  'output-node': () => <FileOutput className="w-4 h-4 text-amber-500 dark:text-amber-400" />,
};

const nodeColors: Record<FlowNodeType['type'], string> = {
  'python-function': 'border-sky-500 dark:border-sky-400',
  'excel-input': 'border-emerald-500 dark:border-emerald-400',
  'csv-input': 'border-blue-500 dark:border-blue-400',
  'sub-flow': 'border-purple-500 dark:border-purple-400',
  'output-node': 'border-amber-500 dark:border-amber-400',
};


export function FlowNode({ node, isSelected, onConnectPointerDown, onPortPointerEnter, onPortPointerLeave }: FlowNodeProps) {
  const { t } = useTranslation();
  // const { toast } = useToast(); // useToast 已被移除或不再使用
  const [isExpanded, setIsExpanded] = useState(false);
  const nodeHeaderRef = useRef<HTMLDivElement>(null);
  const [uniqueIconIdSuffix, setUniqueIconIdSuffix] = useState('');

  useEffect(() => {
    setUniqueIconIdSuffix(node.id + (isSelected ? '-selected' : '-default'));
  }, [node.id, isSelected]);


  const handleDelete = (event: React.MouseEvent) => {
    event.stopPropagation();
    flowService.deleteNode(node.id);
  };

  const handleNodeClick = (e: ReactPointerEvent | React.MouseEvent) => {
      if (e.target instanceof Element) {
        const interactiveSelector = 'button, [data-port-id], .monaco-editor, input, textarea, select';
        if (e.target.closest(interactiveSelector)) {
          return;
        }
      }
      flowService.selectNode({ type: 'node', data: node });
    };

  const renderOutputContent = () => {
    if (node.type !== 'output-node' || node.data.outputValue === undefined || node.data.outputValue === null) {
      return null;
    }
    const { outputValue } = node.data;
    return (
      <CardDescription className="p-1 bg-accent/10 rounded text-[10px] text-accent-foreground max-h-24 overflow-auto select-none">
        <pre className="whitespace-pre-wrap"><code>{JSON.stringify(outputValue, null, 2)}</code></pre>
      </CardDescription>
    );
  };

  const renderFilePreviewTable = (previewData: FilePreviewData) => {
    if (previewData.error) {
      return <p className="text-[10px] text-destructive/80 px-1 py-0.5 select-none">{previewData.error}</p>;
    }
    if (previewData.headers.length === 0 && previewData.firstRow.length === 0 && previewData.rowCount === 0) {
       return <p className="text-[10px] text-muted-foreground/80 px-1 py-0.5 select-none">{t('configPanel.noDataToPreview')}</p>;
    }
    const maxRowsToShow = isExpanded ? 10 : 1;
    const dataRowsToDisplay = [previewData.firstRow].slice(0, maxRowsToShow);
    return (
      <ScrollArea className={cn("mt-1 border rounded-sm bg-background/30 select-none", isExpanded ? "max-h-32" : "max-h-20")}>
        <Table className="text-[10px]">
          <TableHeader className="bg-muted/20 sticky top-0 z-10">
            <TableRow className="h-5">
              {previewData.headers.map((header, index) => (
                <TableHead key={index} className="px-1 py-0.5 h-5 text-muted-foreground/90 truncate" title={header}>
                  {header || `Col ${index + 1}`}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {dataRowsToDisplay.map((row, rowIndex) => (
                 row.length > 0 && (
                    <TableRow key={`row-${rowIndex}`} className="h-5">
                    {row.map((cell, cellIndex) => (
                        <TableCell key={cellIndex} className="px-1 py-0.5 h-5 text-foreground/90 truncate" title={cell}>
                        {cell}
                        </TableCell>
                    ))}
                    {Array(Math.max(0, previewData.headers.length - row.length)).fill(null).map((_, i) => (
                        <TableCell key={`empty-cell-${rowIndex}-${i}`} className="px-1 py-0.5 h-5" />
                    ))}
                    </TableRow>
                )
            ))}
            {isExpanded && previewData.lastRow && previewData.rowCount > maxRowsToShow && previewData.firstRow.join(',') !== previewData.lastRow.join(',') && (
                <TableRow className="h-5">
                    <TableCell colSpan={previewData.headers.length} className="px-1 py-0.5 h-5 text-center text-muted-foreground">...</TableCell>
                </TableRow>
            )}
            {isExpanded && previewData.lastRow && previewData.rowCount > 1 && previewData.rowCount <= maxRowsToShow && previewData.firstRow.join(',') !== previewData.lastRow.join(',') && (
                 previewData.lastRow.length > 0 && (
                    <TableRow key={`last-row`} className="h-5">
                        {previewData.lastRow.map((cell, cellIndex) => (
                            <TableCell key={`last-${cellIndex}`} className="px-1 py-0.5 h-5 text-foreground/90 truncate" title={cell}>
                            {cell}
                            </TableCell>
                        ))}
                        {Array(Math.max(0, previewData.headers.length - previewData.lastRow.length)).fill(null).map((_, i) => (
                            <TableCell key={`empty-last-${i}`} className="px-1 py-0.5 h-5" />
                        ))}
                    </TableRow>
                )
            )}
              {isExpanded && previewData.lastRow && previewData.rowCount > 1 && previewData.rowCount <= maxRowsToShow && previewData.firstRow.join(',') !== previewData.lastRow.join(',') && (
                     previewData.lastRow.length > 0 && (
                        <TableRow key={`last-row`} className="h-5">
                            {previewData.lastRow.map((cell, cellIndex) => (
                                <TableCell key={`last-${cellIndex}`} className="px-1 py-0.5 h-5 text-foreground/90 truncate" title={cell}>
                                {cell}
                                </TableCell>
                            ))}
                            {Array(Math.max(0, previewData.headers.length - previewData.lastRow.length)).fill(null).map((_, i) => (
                                <TableCell key={`empty-last-${i}`} className="px-1 py-0.5 h-5" />
                            ))}
                        </TableRow>
                    )
                )}
          </TableBody>
        </Table>
      </ScrollArea>
    );
  };

  const renderFileInputContent = () => {
    if ((node.type === 'excel-input' || node.type === 'csv-input') && node.data.fileName) {
      const rowCount = node.data.filePreview?.rowCount ?? 0;
      return (
        <div className="mt-1 text-xs text-muted-foreground flex flex-col select-none">
           {node.data.filePreview && renderFilePreviewTable(node.data.filePreview)}
          { rowCount > 1 && (
             <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {e.stopPropagation(); setIsExpanded(!isExpanded);}}
                className="h-5 text-[10px] self-center mt-0.5 text-muted-foreground hover:bg-muted/50"
            >
              {isExpanded ? <ChevronUp className="w-3 h-3 mr-1" /> : <ChevronDown className="w-3 h-3 mr-1" />}
              {isExpanded ? t('flowNode.showLessData') : t('flowNode.showMoreData', { count: rowCount })}
             </Button>
          )}
          <div className="flex items-center justify-end gap-1.5 mt-0.5 text-right self-end">
            <UploadCloud className="w-3 h-3 text-muted-foreground flex-shrink-0" />
            <span className="truncate flex-1 max-w-[100px]" title={node.data.fileName}>{node.data.fileName}</span>
             {node.data.fileSize !== undefined && (
                <span className="text-[9px] text-muted-foreground/80 whitespace-nowrap">
                ({(node.data.fileSize / 1024).toFixed(1)}KB)
                </span>
            )}
          </div>
        </div>
      );
    }
    return null;
  }

  const hasInputs = node.inputs.length > 0;
  // Python 函数节点在没有输入时可以不显示输入区域
  const showInputs = node.type === 'python-function' ? hasInputs : true; 

  const hasOutputs = node.outputs.length > 0;
  // Python 函数节点在没有输出时也可以不显示输出区域
  const showOutputs = node.type === 'python-function' ? hasOutputs : true;

  const hasMiddleContent = 
    (node.type === 'python-function' && node.data.code) ||
    (node.type === 'sub-flow' && node.data.subFlowId) ||
    (node.type === 'output-node' && node.data.outputValue !== undefined && node.data.outputValue !== null);

  return (
    <Card
      className={cn(
        "w-56 shadow-lg hover:shadow-xl transition-shadow duration-200 border-2",
        isSelected ? 'ring-2 ring-primary ring-offset-2 dark:ring-offset-card' : 'border-border',
        nodeColors[node.type] || 'border-gray-300',
        "dark:bg-card dark:bg-opacity-80 backdrop-blur-sm flex flex-col"
      )}
      onClick={handleNodeClick}
      style={{ cursor: 'default', touchAction: 'manipulation' }}
      aria-label={t('flowNode.ariaLabel', { name: node.name, type: node.type, selected: isSelected ? t('flowNode.selectedStatus') : '' })}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleNodeClick(e as any); }}
    >
       <CardHeader
        ref={nodeHeaderRef}
        className="p-2 pr-8 bg-muted/50 dark:bg-muted/30 rounded-t-lg relative select-none cursor-grab"
        style={{ touchAction: 'none' }}
      >
        <div className="flex items-center space-x-2 pointer-events-none">
           <GripVertical
              className="w-4 h-4 text-muted-foreground"
            />
          <div className={cn(
             'flex items-center justify-center w-4 h-4'
          )}>{nodeIcons[node.type](uniqueIconIdSuffix, isSelected)}</div>
          <CardTitle className="text-sm font-medium truncate text-foreground select-none">{node.name}</CardTitle>
        </div>
        <Button
            variant="ghost"
            size="icon"
            className="absolute top-1 right-1 h-6 w-6 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            onClick={handleDelete}
            aria-label={t('flowNode.deleteNodeAriaLabel', { name: node.name })}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
      </CardHeader>
      <CardContent className="p-3 text-xs select-none flex-1 flex flex-col">
        {/* 端口和中间内容的包装器 */}
        <div className="flex flex-col">
          {/* 输入端口部分 */}
          {showInputs && ( 
            <div className="input-ports-wrapper">
              {node.inputs.map((port, index) => (
                <div 
                  key={port.id} 
                  className="flex items-center h-5 justify-start"
                  style={{ marginBottom: index < node.inputs.length - 1 ? `${PORT_GAP}px` : '0px' }}
                  onPointerDown={(e: ReactPointerEvent) => onConnectPointerDown(e, port)}
                  onPointerEnter={(e: ReactPointerEvent) => onPortPointerEnter(e, port)}
                  onPointerLeave={(e: ReactPointerEvent) => onPortPointerLeave(e, port)}
                  data-port-id={port.id}
                  data-port-type="input"
                  onTouchStart={(e) => e.stopPropagation()}
                >
                  <div className="w-3 h-3 bg-background border-2 border-[hsl(var(--port-input-border))] rounded-full cursor-crosshair hover:bg-[hsl(var(--port-input-bg-hover))]/20 shrink-0"></div>
                  <span className="ml-1.5 truncate text-muted-foreground text-[10px]" title={port.name}>{port.name}</span>
                </div>
              ))}
            </div>
          )}

          {/* 输入和输出端口之间的间隔 */}
          {showInputs && showOutputs && ( // 仅当同时显示输入和输出时才添加间隔
            <div style={{ height: `${PORT_ROW_HEIGHT + PORT_GAP}px` }} className="flex-shrink-0"></div>
          )}

          {/* 输出端口部分 */}
          {showOutputs && ( // 根据 showOutputs 条件渲染
            <div className="output-ports-wrapper">
              {node.outputs.map((port, index) => (
                <div 
                  key={port.id} 
                  className="flex items-center h-5 justify-end"
                  style={{ marginBottom: index < node.outputs.length - 1 ? `${PORT_GAP}px` : '0px' }}
                  onPointerDown={(e: ReactPointerEvent) => onConnectPointerDown(e, port)}
                  onPointerEnter={(e: ReactPointerEvent) => onPortPointerEnter(e, port)}
                  onPointerLeave={(e: ReactPointerEvent) => onPortPointerLeave(e, port)}
                  data-port-id={port.id}
                  data-port-type="output"
                  onTouchStart={(e) => e.stopPropagation()}
                >
                  <span className="mr-1.5 truncate text-muted-foreground text-[10px]" title={port.name}>{port.name}</span>
                  <div className="w-3 h-3 bg-background border-2 border-[hsl(var(--port-output-border))] rounded-full cursor-crosshair hover:bg-[hsl(var(--port-output-bg-hover))]/20 shrink-0"></div>
                </div>
              ))}
            </div>
          )}
          
          {/* 中间内容：代码预览、子流程ID、输出节点值 */}
          {hasMiddleContent && (
            // 如果没有输入端口，但有输出端口，则中间内容块也应该有上边距
            <div className={cn(((showInputs || showOutputs)) && "mt-2")}>
              {node.type === 'python-function' && node.data.code && (
                <CardDescription className="p-1 bg-black/5 dark:bg-white/5 rounded text-[10px] text-gray-600 dark:text-gray-400 max-h-12 overflow-hidden select-text">
                    <pre className="whitespace-pre-wrap truncate"><code>{node.data.code.split('\n').slice(0,2).join('\n')}</code></pre>
                </CardDescription>
              )}
              {node.type === 'sub-flow' && node.data.subFlowId && (
                <CardDescription className="text-purple-700 dark:text-purple-400 truncate text-[10px] select-none" title={`${t('flowNode.subflowIdLabel')}: ${node.data.subFlowId}`}>
                    {t('flowNode.subflowIdLabel')}: {node.data.subFlowId.substring(0,12)}...
                </CardDescription>
              )}
              {renderOutputContent()}
            </div>
          )}
        </div>
        
        {/* 伸缩空白，将文件输入推到底部 */}
        <div className="flex-grow min-h-[6px]"></div>

        {/* 底部内容: 文件信息 */}
        <div className="mt-auto">
             {renderFileInputContent()}
        </div>
      </CardContent>
    </Card>
  );
}
