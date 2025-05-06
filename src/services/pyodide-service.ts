// src/services/pyodide-service.ts
import type { PyodideInterface, PyProxy } from 'pyodide';
import { consoleLogService } from './console-log-service';
import { tabsService } from '@/store/tabs-store';

declare global {
  interface Window {
    loadPyodide: (config?: { indexURL: string }) => Promise<PyodideInterface>;
    pyodide?: PyodideInterface;
  }
}

let pyodideInstance: PyodideInterface | null = null;
let micropipInstance: PyProxy | null = null;
let pyodideLoadingPromise: Promise<PyodideInterface> | null = null;
let currentIsPyodideLoading = false;

const PYODIDE_INDEX_URL = "https://cdn.jsdelivr.net/pyodide/v0.27.5/full/";

const MATPLOTLIB_FIGURE_PREFIX = "MATPLOTLIB_FIGURE_BASE64:";

// Python 标准库模块集合 (与 code-preview-panel.tsx 中的列表保持一致或将来共享)
const PYTHON_STD_LIB = new Set([
    'sys', 'os', 'math', 'json', 'datetime', 're', 'collections', 
    'itertools', 'functools', 'random', 'time', 'abc', 'asyncio', 
    'builtins', 'gc', 'inspect', 'marshal', 'operator', 'pickle', 
    'pprint', 'traceback', 'types', 'warnings', 'weakref', 'textwrap',
    'argparse', 'base64', 'configparser', 'csv', 'enum', 'hashlib',
    'http', 'logging', 'pathlib', 'platform', 'queue', 'shutil',
    'socket', 'ssl', 'string', 'subprocess', 'tempfile', 'threading',
    'urllib', 'uuid', 'xml', 'zipfile', 'zlib', 'contextlib', 'io', // 'io' 模块是内置的
    '_pyodide' // Pyodide 特有的内部模块
]);


export const pyodideService = {
  async ensurePyodideReady(): Promise<boolean> {
    if (pyodideInstance) {
      return true;
    }
    if (pyodideLoadingPromise) {
      await pyodideLoadingPromise;
      return !!pyodideInstance;
    }
    currentIsPyodideLoading = true;
    pyodideLoadingPromise = new Promise(async (resolve, reject) => {
      try {
        if (typeof window.loadPyodide === 'undefined') {
          const script = document.createElement('script');
          script.src = `${PYODIDE_INDEX_URL}pyodide.js`;
          script.onload = async () => {
            try {
              window.pyodide = await window.loadPyodide({ indexURL: PYODIDE_INDEX_URL });
              await window.pyodide.loadPackage(["micropip", "matplotlib"]); // 确保 matplotlib 也被加载
              micropipInstance = window.pyodide.pyimport("micropip");
              pyodideInstance = window.pyodide;
              resolve(pyodideInstance);
            } catch (error) {
              reject(error);
            } finally {
              pyodideLoadingPromise = null;
              currentIsPyodideLoading = false;
            }
          };
          script.onerror = (error) => {
            reject(new Error("加载 Pyodide 脚本失败。"));
            pyodideLoadingPromise = null;
            currentIsPyodideLoading = false;
          };
          document.body.appendChild(script);
        } else {
           window.pyodide = await window.loadPyodide({ indexURL: PYODIDE_INDEX_URL });
           await window.pyodide.loadPackage(["micropip", "matplotlib"]); // 确保 matplotlib 也被加载
           micropipInstance = window.pyodide.pyimport("micropip");
           pyodideInstance = window.pyodide;
           resolve(pyodideInstance);
           pyodideLoadingPromise = null;
           currentIsPyodideLoading = false;
        }
      } catch (error) {
        reject(error);
        pyodideLoadingPromise = null;
        currentIsPyodideLoading = false;
      }
    });
    try {
        await pyodideLoadingPromise;
        return !!pyodideInstance;
    } catch {
        return false;
    }
  },

  async runPython(code: string, source: 'PyodideREPL' | 'PyodideScriptRun' = 'PyodideREPL'): Promise<string> {
    const pyodideReady = await this.ensurePyodideReady();
    if (!pyodideInstance || !pyodideReady) {
        const errorMsg = currentIsPyodideLoading ? "Pyodide 正在初始化，请稍候..." : "Pyodide 初始化失败。";
        consoleLogService.addLog({ type: 'ERROR', message: errorMsg, source: 'PyodideService' });
        return errorMsg;
    }

    let stdoutOutput = "";
    let stderrOutput = "";
    let imageDisplayedViaPrint = false;

    try {
      pyodideInstance.setStdout({
        batched: (msg: string) => {
          const lines = msg.split('\n');
          lines.forEach(line => {
            if (line.startsWith(MATPLOTLIB_FIGURE_PREFIX)) {
              const base64Data = line.substring(MATPLOTLIB_FIGURE_PREFIX.length);
              if (base64Data) {
                tabsService.displayMatplotlibImage(`data:image/png;base64,${base64Data}`);
                imageDisplayedViaPrint = true;
              }
            } else if (line.trim() !== "") {
              stdoutOutput += line + "\n";
              consoleLogService.addLog({ type: 'PYTHON_OUTPUT', message: line, source: source });
            }
          });
        }
      });
      pyodideInstance.setStderr({
        batched: (msg: string) => {
          stderrOutput += msg + "\n";
          consoleLogService.addLog({ type: 'PYTHON_ERROR', message: msg, source: source });
        }
      });

      const result = await pyodideInstance.runPythonAsync(code);
      
      let finalOutput = stdoutOutput;
      if (stderrOutput) {
          finalOutput += (finalOutput ? "\n" : "") + stderrOutput.trim();
      }

      // 如果有返回值，并且不是通过 print 语句显示的图像，则记录返回值
      if (result !== undefined && result !== null && !imageDisplayedViaPrint) {
          const resultStr = String(result);
          // 仅当没有其他标准输出或错误输出时，才在 REPL 中显示 Python 表达式的直接结果
          if (source === 'PyodideREPL' && !stdoutOutput.trim() && !stderrOutput.trim()) {
            finalOutput += resultStr + "\n";
            consoleLogService.addLog({ type: 'PYTHON_OUTPUT', message: resultStr, source: source });
          }
      }
      return finalOutput.trim() || (source === 'PyodideREPL' ? "" : "脚本已执行。");
    } catch (error: any) {
      const errorMsg = `运行 Python 代码时出错: ${error.message}`;
      consoleLogService.addLog({ type: 'PYTHON_ERROR', message: error.message, source: source });
      return errorMsg;
    } finally {
      pyodideInstance.setStdout({});
      pyodideInstance.setStderr({});
    }
  },

  async installPackage(packageNameOrList: string | string[]): Promise<string> {
    const pyodideReady = await this.ensurePyodideReady();
    if (!pyodideInstance || !pyodideReady) {
      return currentIsPyodideLoading ? "Pyodide 正在初始化，请稍候..." : "Pyodide 初始化失败。";
    }
    if (!micropipInstance) {
      return "错误: Micropip 未初始化。";
    }

    const packagesToProcess = Array.isArray(packageNameOrList) ? packageNameOrList : [packageNameOrList];
    const packagesToActuallyInstall: string[] = [];
    const skippedPackages: string[] = [];

    packagesToProcess.forEach(pkgName => {
      const basePkgName = pkgName.split('.')[0].trim(); // 获取基础包名，例如 'pandas' from 'pandas.io'
      if (PYTHON_STD_LIB.has(basePkgName)) {
        skippedPackages.push(pkgName);
        // consoleLogService.addLog({ type: 'DEBUG', message: `包 "${pkgName}" 是内置模块，跳过安装。`, source: 'Micropip' });
      } else {
        packagesToActuallyInstall.push(pkgName);
      }
    });

    if (packagesToActuallyInstall.length === 0) {
      const message = `请求的包 (${packagesToProcess.join(', ')}) 均为内置模块或已被跳过，无需安装。`;
      consoleLogService.addLog({ type: 'INFO', message: message, source: 'Micropip' });
      return message;
    }

    const packagesStr = packagesToActuallyInstall.join(', ');

    try {
      await micropipInstance.install(packagesToActuallyInstall);
      const successMsg = `包 "${packagesStr}" 安装成功。`;
      consoleLogService.addLog({ type: 'CMD_OUTPUT', message: successMsg, source: 'Micropip' });
      return successMsg;
    } catch (error: any) {
      const errorMessage = error.message || String(error);
      const errorMsgForUser = `安装包 "${packagesStr}" 时出错: ${errorMessage}`;
      consoleLogService.addLog({ type: 'PYTHON_ERROR', message: `安装失败: ${errorMessage}`, source: 'Micropip' });
      return errorMsgForUser;
    }
  },
  isPyodideLoading: () => currentIsPyodideLoading,
};

  