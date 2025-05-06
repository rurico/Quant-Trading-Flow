// src/components/flow/code-preview-panel.tsx
'use client';

import { useTranslation }  from '@/hooks/use-translation';
import Editor from '@monaco-editor/react';
import { useEffect, useState } from 'react';
import { flowSubject } from '@/store/flow-store'; 
import { compileFlowToPython, type CompilationResult } from '@/lib/flow-compiler'; 
import { Button } from '@/components/ui/button';
import { Play } from 'lucide-react';
import { pyodideService } from '@/services/pyodide-service';
import { consoleLogService } from '@/services/console-log-service';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { tabsService } from '@/store/tabs-store';

interface CodePreviewPanelProps {
  flowId: string; 
}

// Python 标准库模块集合
const PYTHON_STD_LIB = new Set([
    'sys', 'os', 'math', 'json', 'datetime', 're', 'collections', 
    'itertools', 'functools', 'random', 'time', 'abc', 'asyncio', 
    'builtins', 'gc', 'inspect', 'marshal', 'operator', 'pickle', 
    'pprint', 'traceback', 'types', 'warnings', 'weakref', 'textwrap',
    'argparse', 'base64', 'configparser', 'csv', 'enum', 'hashlib',
    'http', 'logging', 'pathlib', 'platform', 'queue', 'shutil',
    'socket', 'ssl', 'string', 'subprocess', 'tempfile', 'threading',
    'urllib', 'uuid', 'xml', 'zipfile', 'zlib', 'contextlib', 'io',
    '_pyodide' // Pyodide 特有的内部模块
]);


// getPackagesFromImports 现在将返回所有检测到的导入，由 pyodide-service 过滤
function getPackagesFromImports(importLines: string[]): string[] {
    const packages = new Set<string>();
    importLines.forEach(line => {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('import ')) {
            const parts = trimmedLine.split(/\s+/); 
            if (parts.length >= 2) {
                const potentialPackages = parts[1].split(','); 
                potentialPackages.forEach(pkg => {
                    const packageName = pkg.trim().split('.')[0]; 
                    if (packageName) { 
                        packages.add(packageName);
                    }
                });
            }
        } else if (trimmedLine.startsWith('from ')) {
            const parts = trimmedLine.split(/\s+/);
            if (parts.length >= 2) {
                const packageName = parts[1].split('.')[0]; 
                if (packageName && !packageName.startsWith('.')) { 
                    packages.add(packageName);
                }
            }
        }
    });
    return Array.from(packages);
}


export function CodePreviewPanel({ flowId }: CodePreviewPanelProps) {
  const { t } = useTranslation();
  const [compilationResult, setCompilationResult] = useState<CompilationResult | null>(null);
  const [isRunningScript, setIsRunningScript] = useState(false);

  useEffect(() => {
    const currentFlow = flowSubject.getValue();
    if (currentFlow && currentFlow.id === flowId) {
      try {
        const result = compileFlowToPython(currentFlow);
        setCompilationResult(result);
      } catch (error) {
        console.error("编译流程时出错:", error);
        setCompilationResult({
          pythonCode: `# ${t('toast.codePreview.compilationErrorTitle')}\n# ${error instanceof Error ? error.message : String(error)}`,
          imports: []
        });
      }
    } else {
      setCompilationResult({
        pythonCode: t('toast.codePreview.flowNotAvailable', {flowId}),
        imports: []
      });
    }

    const subscription = flowSubject.subscribe(updatedFlow => {
      if (updatedFlow && updatedFlow.id === flowId) {
         try {
            const result = compileFlowToPython(updatedFlow);
            setCompilationResult(result);
          } catch (error) {
            console.error("编译流程时出错 (subscription):", error);
            setCompilationResult({
              pythonCode: `# ${t('toast.codePreview.compilationErrorTitle')}\n# ${error instanceof Error ? error.message : String(error)}`,
              imports: []
            });
          }
      }
    });

    return () => subscription.unsubscribe();
  }, [flowId, t]);

  const handleRunScript = async () => {
    if (!compilationResult || !compilationResult.pythonCode) {
      toast({ title: t('common.errorTitle'), description: "没有可执行的代码。", variant: 'destructive' });
      return;
    }
    
    tabsService.setActiveToolTab('console');


    setIsRunningScript(true);
    consoleLogService.addLog({ type: 'INFO', message: t('toast.codePreview.runningScript'), source: 'CodePreview' });

    const pyodideReady = await pyodideService.ensurePyodideReady();
    if (!pyodideReady) {
      const errorMsg = pyodideService.isPyodideLoading() ? t('terminalPanel.pyodideLoadingInProgress') : t('terminalPanel.pyodideFailedShort');
      toast({ title: t('common.errorTitle'), description: errorMsg, variant: 'destructive' });
      consoleLogService.addLog({ type: 'ERROR', message: errorMsg, source: 'CodePreview' });
      setIsRunningScript(false);
      return;
    }

    const packagesToInstall = getPackagesFromImports(compilationResult.imports);
    if (packagesToInstall.length > 0) {
        const packagesToActuallyInstall = packagesToInstall.filter(p => !PYTHON_STD_LIB.has(p.split('.')[0]));
        if (packagesToActuallyInstall.length > 0) {
            const installMsg = t('toast.codePreview.installingDependencies', { packages: packagesToActuallyInstall.join(', ') });
            consoleLogService.addLog({ type: 'INFO', message: installMsg, source: 'CodePreview' });
            try {
                await pyodideService.installPackage(packagesToActuallyInstall); // 只安装非标准库的包
                const successMsg = t('toast.codePreview.dependenciesInstalledSuccess', { packages: packagesToActuallyInstall.join(', ') });
                consoleLogService.addLog({ type: 'INFO', message: successMsg, source: 'CodePreview' });
            } catch (error) { 
                const errorMsg = error instanceof Error ? error.message : String(error);
                const failureToastDesc = t('toast.codePreview.dependenciesInstallFailedDesc', { error: errorMsg });
                toast({ title: t('toast.codePreview.dependenciesInstallFailedTitle'), description: failureToastDesc, variant: 'destructive' });
                consoleLogService.addLog({ type: 'PYTHON_ERROR', message: `依赖安装失败: ${errorMsg}`, source: 'CodePreview' });
                setIsRunningScript(false);
                return;
            }
        }
    }


    try {
      await pyodideService.runPython(compilationResult.pythonCode, 'PyodideScriptRun'); 
      consoleLogService.addLog({ type: 'INFO', message: t('toast.codePreview.scriptRunCompleteCheckTerminal'), source: 'CodePreview' });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      toast({ title: t('common.errorTitle'), description: t('toast.codePreview.scriptRunError', { error: errorMsg }), variant: 'destructive' });
    } finally {
      setIsRunningScript(false);
    }
  };

  return (
    <div className="p-0.5 flex flex-col h-full bg-card relative">
      <Button
        variant="default"
        size="icon" 
        onClick={handleRunScript}
        disabled={isRunningScript || !compilationResult}
        className={cn(
          "absolute top-2 right-2 z-10 bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700 text-white",
          "h-8 w-8 p-1.5" 
        )}
        aria-label={t('toast.codePreview.runScriptButtonAriaLabel')}
      >
        <Play className="h-4 w-4" /> 
      </Button>

      <div className="flex-grow border rounded-sm overflow-hidden mt-0"> 
        <Editor
          height="100%" 
          language="python"
          theme={document.documentElement.classList.contains('dark') ? "vs-dark" : "vs"}
          value={compilationResult?.pythonCode || t('toast.codePreview.loadingPreview')}
          options={{
            readOnly: true,
            minimap: { enabled: false },
            fontSize: 13,
            wordWrap: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
          }}
        />
      </div>
    </div>
  );
}

  
