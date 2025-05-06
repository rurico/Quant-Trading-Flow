// src/components/flow/terminal-panel.tsx
'use client';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTranslation } from '@/hooks/use-translation';
import { useState, useEffect, useRef } from 'react';
import { pyodideService } from '@/services/pyodide-service'; // 修复：导入 pyodideService 对象
import { consoleLogService } from '@/services/console-log-service';
import { Loader2 } from 'lucide-react'; 

const TERMINAL_DISPLAY_LOG_KEY = 'terminalDisplayLog';
const TERMINAL_COMMAND_HISTORY_KEY = 'terminalCommandHistory';
const TERMINAL_PYTHON_REPL_STATE_KEY = 'terminalPythonReplState';
const TERMINAL_DRAFT_INPUT_KEY = 'terminalDraftInput';

export function TerminalPanel() {
  const { t } = useTranslation();

  const [displayLog, setDisplayLog] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(TERMINAL_DISPLAY_LOG_KEY);
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });

  const [submittedCommands, setSubmittedCommands] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(TERMINAL_COMMAND_HISTORY_KEY);
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });
  
  const [input, setInput] = useState('');
  const [isInPythonRepl, setIsInPythonRepl] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(TERMINAL_PYTHON_REPL_STATE_KEY);
      return saved === 'true';
    }
    return false;
  });

  const [isPyodideLoadingState, setIsPyodideLoadingState] = useState(false); // 重命名以区分服务中的状态
  const [isPyodideReadyState, setIsPyodideReadyState] = useState(false); // 重命名

  const [historyBrowseIndex, setHistoryBrowseIndex] = useState<number | null>(null);
  const [draftInput, setDraftInput] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(TERMINAL_DRAFT_INPUT_KEY) || '';
    }
    return '';
  });


  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(TERMINAL_DISPLAY_LOG_KEY, JSON.stringify(displayLog));
    }
  }, [displayLog]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(TERMINAL_COMMAND_HISTORY_KEY, JSON.stringify(submittedCommands));
      setHistoryBrowseIndex(null); 
    }
  }, [submittedCommands]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(TERMINAL_PYTHON_REPL_STATE_KEY, String(isInPythonRepl));
    }
  }, [isInPythonRepl]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(TERMINAL_DRAFT_INPUT_KEY, draftInput);
    }
  }, [draftInput]);


  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollViewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
      if (scrollViewport) {
        scrollViewport.scrollTop = scrollViewport.scrollHeight;
      }
    }
  }, [displayLog]); 


  const ensurePyodideReadyInternal = async (): Promise<boolean> => { // 重命名以避免与服务中的函数混淆
    if (isPyodideReadyState) return true;
    if (pyodideService.isPyodideLoading()) { // 使用服务中的状态检查
      consoleLogService.addLog({ type: 'INFO', message: t('terminalPanel.pyodideLoadingInProgress'), source: 'Terminal'});
      return false;
    }
    setIsPyodideLoadingState(true);
    consoleLogService.addLog({ type: 'INFO', message: t('terminalPanel.pyodideInitializing'), source: 'Terminal'});
    try {
      await pyodideService.ensurePyodideReady(); // 修复：调用 pyodideService 的方法
      setIsPyodideReadyState(true);
      consoleLogService.addLog({ type: 'INFO', message: t('terminalPanel.pyodideReady'), source: 'Terminal'});
      return true;
    } catch (error) {
      console.error("Pyodide 初始化失败:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      consoleLogService.addLog({ type: 'ERROR', message: `${t('terminalPanel.pyodideFailed')}: ${errorMessage}`, source: 'Terminal'});
      return false;
    } finally {
      setIsPyodideLoadingState(false);
    }
  };


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    if (historyBrowseIndex !== null) {
      setHistoryBrowseIndex(null);
    }
  };

  const handleInputSubmit = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    const command = input.trim();

    if (e.key === 'Enter') {
      e.preventDefault();
      if (command === '') return; 

      setInput('');
      
      const promptPrefix = isInPythonRepl ? '>>>' : '>';
      const loggedInput = `${promptPrefix} ${command}`;
      setDisplayLog(prev => [...prev, loggedInput].slice(-200)); 
      consoleLogService.addLog({ type: 'CMD_INPUT', message: loggedInput, source: 'Terminal' });

      if (command) {
        const newSubmittedCommands = [...submittedCommands.filter(c => c !== command), command].slice(-50);
        setSubmittedCommands(newSubmittedCommands);
      }
      setHistoryBrowseIndex(null); 
      setDraftInput('');


      if (isInPythonRepl) {
        if (command.toLowerCase() === 'exit()' || command.toLowerCase() === 'quit()') {
          setIsInPythonRepl(false);
          const exitMsg = t('terminalPanel.pythonReplExited');
          setDisplayLog(prev => [...prev, exitMsg].slice(-200));
          consoleLogService.addLog({ type: 'INFO', message: exitMsg, source: 'Terminal' });
        } else {
          const pyodideReady = await ensurePyodideReadyInternal();
          if (!pyodideReady) {
            const errorMsg = pyodideService.isPyodideLoading() ? t('terminalPanel.pyodideLoadingInProgress') : t('terminalPanel.pyodideFailedShort');
            setDisplayLog(prev => [...prev, errorMsg].slice(-200));
            return; 
          }
          const result = await pyodideService.runPython(command); // 修复：调用 pyodideService 的方法
          if (result.trim()) { 
             setDisplayLog(prev => [...prev, ...result.trim().split('\n')].slice(-200));
          }
        }
      } else { 
        if (command.toLowerCase().startsWith('pip install ')) {
          const pyodideReady = await ensurePyodideReadyInternal();
          if (!pyodideReady) {
            const errorMsg = pyodideService.isPyodideLoading() ? t('terminalPanel.pyodideLoadingInProgress') : t('terminalPanel.pyodideFailedShort');
            setDisplayLog(prev => [...prev, errorMsg].slice(-200));
            return;
          }
          const packageName = command.substring(12).trim();
          if (packageName) {
            const installingMsg = t('terminalPanel.installingPackage', {packageName});
            setDisplayLog(prev => [...prev, installingMsg].slice(-200)); 
            consoleLogService.addLog({ type: 'CMD_OUTPUT', message: installingMsg, source: 'Terminal' });

            const result = await pyodideService.installPackage(packageName); // 修复：调用 pyodideService 的方法
            setDisplayLog(prev => [...prev, result].slice(-200)); 
          } else {
            const errorMsg = t('terminalPanel.pipInstallNoPackage');
            setDisplayLog(prev => [...prev, errorMsg].slice(-200)); 
            consoleLogService.addLog({ type: 'ERROR', message: errorMsg, source: 'Terminal' });
          }
        } else if (command.toLowerCase() === 'python') {
          const pyodideReady = await ensurePyodideReadyInternal();
          if (!pyodideReady) {
            const errorMsg = pyodideService.isPyodideLoading() ? t('terminalPanel.pyodideLoadingInProgress') : t('terminalPanel.pyodideFailedShort');
            setDisplayLog(prev => [...prev, errorMsg].slice(-200));
            return;
          }
          setIsInPythonRepl(true);
          const enteredMsg = t('terminalPanel.pythonReplEntered');
          setDisplayLog(prev => [...prev, enteredMsg].slice(-200));
          consoleLogService.addLog({ type: 'INFO', message: enteredMsg, source: 'Terminal' });
        } else if (command.toLowerCase() === 'clear') {
          setDisplayLog([]); 
          consoleLogService.clearLogs(); 
          consoleLogService.addLog({ type: 'INFO', message: t('terminalPanel.cleared'), source: 'Terminal'});
        } else if (command.toLowerCase() === 'help') {
           const helpMsg = t('terminalPanel.helpText');
           setDisplayLog(prev => [...prev, ...helpMsg.split('\n')].slice(-200)); 
           consoleLogService.addLog({ type: 'CMD_OUTPUT', message: helpMsg, source: 'Terminal' });
        } else {
          const unknownCmdMsg = t('terminalPanel.unknownCommand', {command});
          setDisplayLog(prev => [...prev, unknownCmdMsg].slice(-200));
          consoleLogService.addLog({ type: 'ERROR', message: unknownCmdMsg, source: 'Terminal'});
        }
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (submittedCommands.length === 0) return;

      if (historyBrowseIndex === null) { 
        setDraftInput(input); 
        const newIndex = submittedCommands.length - 1;
        setHistoryBrowseIndex(newIndex);
        setInput(submittedCommands[newIndex]);
      } else if (historyBrowseIndex > 0) { 
        const newIndex = historyBrowseIndex - 1;
        setHistoryBrowseIndex(newIndex);
        setInput(submittedCommands[newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (submittedCommands.length === 0 || historyBrowseIndex === null) return;

      if (historyBrowseIndex < submittedCommands.length - 1) { 
        const newIndex = historyBrowseIndex + 1;
        setHistoryBrowseIndex(newIndex);
        setInput(submittedCommands[newIndex]);
      } else if (historyBrowseIndex === submittedCommands.length - 1) { 
        setHistoryBrowseIndex(null);
        setInput(draftInput); 
      }
    }
  };
  
  const prompt = isInPythonRepl ? '>>>' : '>';

  return (
    <div className="h-full flex flex-col p-0.25 bg-card text-xs">
      <ScrollArea className="flex-1 mb-0.25" ref={scrollAreaRef}> 
        <div className="p-1 font-mono whitespace-pre-wrap text-xs"> 
          {displayLog.map((line, index) => ( 
            <div key={index} className={line.startsWith('>') || line.startsWith('>>>') ? 'text-primary' : 'text-foreground'}>
              {line}
            </div>
          ))}
          {displayLog.length === 0 && !isInPythonRepl && (
            <p className="text-muted-foreground">{t('terminalPanel.welcomeMessage')}</p>
          )}
        </div>
      </ScrollArea>
      <div className="flex items-center p-0.25 border-t"> 
        {isPyodideLoadingState && <Loader2 className="h-3 w-3 animate-spin mr-1 text-muted-foreground" />}
        <span className="font-mono mr-0.5 text-muted-foreground">{prompt}</span> 
        <Input
          ref={inputRef}
          type="text"
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleInputSubmit}
          placeholder={isInPythonRepl ? t('terminalPanel.pythonInputPlaceholder') : t('terminalPanel.inputPlaceholder')}
          className="flex-1 h-5 text-xs font-mono bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none p-0" 
          disabled={isPyodideLoadingState}
          spellCheck="false"
          autoCapitalize="none"
          autoComplete="off"
          autoCorrect="off"
        />
      </div>
    </div>
  );
}
