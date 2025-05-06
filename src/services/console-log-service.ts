// src/services/console-log-service.ts
import { BehaviorSubject } from 'rxjs';

export interface LogEntry {
  id: string;
  type: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG' | 'PYTHON_OUTPUT' | 'PYTHON_ERROR' | 'CMD_INPUT' | 'CMD_OUTPUT';
  timestamp: string;
  message: string;
  source?: string; // 例如：'Terminal', 'Pyodide', 'System'
}

const initialLog: LogEntry = {
  id: crypto.randomUUID(),
  type: 'INFO',
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  message: '控制台已初始化。', // 默认消息，可以被翻译
  source: 'System',
};

// BehaviorSubject 初始值设为只包含一个初始日志对象
const logSubject = new BehaviorSubject<LogEntry[]>([initialLog]);

export const consoleLogService = {
  logs$: logSubject.asObservable(),
  getLogs: () => logSubject.getValue(), // 添加一个获取当前日志的方法
  addLog: (logEntryData: Omit<LogEntry, 'id' | 'timestamp'>) => {
    const newLog: LogEntry = {
      ...logEntryData,
      id: crypto.randomUUID(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };
    // 最多保留200条日志
    const updatedLogs = [...logSubject.getValue(), newLog].slice(-200);
    logSubject.next(updatedLogs);
  },
  clearLogs: () => {
    // 清空后也保留一条初始化的消息
    const clearedInitialLog: LogEntry = {
        id: crypto.randomUUID(),
        type: 'INFO',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        message: '控制台已清空。', // 可以被翻译
        source: 'System',
    };
    logSubject.next([clearedInitialLog]);
  },
};
