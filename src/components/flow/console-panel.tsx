// src/components/flow/console-panel.tsx
'use client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTranslation } from '@/hooks/use-translation';
import { useEffect, useState, useRef } from 'react';
import { Button } from '../ui/button';
import { Trash2 } from 'lucide-react';
import { consoleLogService, type LogEntry } from '@/services/console-log-service'; // 导入服务和类型
import { cn } from '@/lib/utils';

export function ConsolePanel() {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<LogEntry[]>(consoleLogService.getLogs()); // 从服务获取初始日志
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const subscription = consoleLogService.logs$.subscribe(setLogs);
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollViewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
      if (scrollViewport) {
        scrollViewport.scrollTop = scrollViewport.scrollHeight;
      }
    }
  }, [logs]);

  const handleClearLogs = () => {
    consoleLogService.clearLogs();
  };

  const getLogColor = (type: LogEntry['type']) => {
    switch(type) {
      case 'ERROR': 
      case 'PYTHON_ERROR':
        return 'text-destructive';
      case 'WARN': return 'text-yellow-600 dark:text-yellow-400';
      case 'DEBUG': return 'text-blue-600 dark:text-blue-400';
      case 'CMD_INPUT': return 'text-primary';
      case 'PYTHON_OUTPUT':
      case 'CMD_OUTPUT':
        return 'text-foreground'; // 使用前景色以获得更好的对比度
      case 'INFO':
      default: return 'text-muted-foreground';
    }
  }

  return (
    <div className="h-full flex flex-col p-0.25 bg-card text-xs">
       <div className="flex justify-between items-center mb-0.25 p-0.25 border-b flex-shrink-0"> 
        <span className="text-xs text-muted-foreground ml-0.5">{t('consolePanel.title')}</span> 
        <Button variant="ghost" size="icon" onClick={handleClearLogs} className="h-4.5 w-4.5" aria-label={t('consolePanel.clearLogsAriaLabel')}> 
          <Trash2 className="h-2.5 w-2.5" /> 
        </Button>
      </div>
      <ScrollArea className="flex-1" ref={scrollAreaRef}>
        <div className="p-1 font-mono whitespace-pre-wrap text-xs"> 
          {logs.map((log) => (
            <div key={log.id} className={cn("flex items-start mb-0.25 text-xs", getLogColor(log.type))}>
              {/* 移除固定的 w-14 和 w-10，使用内边距和 shrink-0 */}
              <span className="shrink-0 pr-2 text-gray-400 dark:text-gray-500 tabular-nums">{log.timestamp}</span>
              <span className={cn("shrink-0 pr-2 font-medium", getLogColor(log.type))}>[{log.type.replace('PYTHON_', '').replace('CMD_', '')}]</span>
              {/* 为消息添加 break-words 和 min-w-0 以处理长字符串和flex布局 */}
              <span className="flex-1 min-w-0 break-words">{log.message}</span>
            </div>
          ))}
           {logs.length === 0 && <p className="text-muted-foreground">{t('consolePanel.noLogs')}</p>}
        </div>
      </ScrollArea>
    </div>
  );
}

