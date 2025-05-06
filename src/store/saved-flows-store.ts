
import type { Flow } from '@/types/flow';
import { BehaviorSubject } from 'rxjs';
import { nanoid } from '@/lib/nanoid';

const LOCAL_STORAGE_KEY = 'savedFunctionFlows';

function getInitialSavedFlows(): Flow[] {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      try {
        const parsedFlows = JSON.parse(saved) as Flow[];
        return parsedFlows.map(flow => ({ 
          ...flow, 
          id: flow.id || nanoid(),
          createdAt: flow.createdAt || new Date().toISOString() // 兼容旧数据，添加 createdAt
        })); 
      } catch (error) {
        console.error("从LocalStorage解析已保存流程时出错:", error);
        return [];
      }
    }
  }
  return [];
}

const savedFlowsSubject = new BehaviorSubject<Flow[]>([]);

if (typeof window !== 'undefined') {
  savedFlowsSubject.next(getInitialSavedFlows());
}

savedFlowsSubject.subscribe(flows => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(flows));
  }
});

export const savedFlowsService = {
  getSavedFlows: () => savedFlowsSubject.getValue(),
  savedFlows$: savedFlowsSubject.asObservable(),

  saveFlow: (flowToSave: Omit<Flow, 'id' | 'isSaved' | 'createdAt'> & { id?: string; createdAt?: string }): Flow => {
    const currentSavedFlows = savedFlowsSubject.getValue();
    const id = flowToSave.id || nanoid(); 
    
    let createdAt = flowToSave.createdAt;
    if (!createdAt) { 
      const existingFlow = currentSavedFlows.find(f => f.id === id);
      createdAt = existingFlow?.createdAt || new Date().toISOString(); 
    }

    const newSavedFlow: Flow = { 
        ...(flowToSave as Omit<Flow, 'id' | 'isSaved' | 'createdAt'>), // 类型断言以匹配
        id,
        name: flowToSave.name || `流程 - ${id.substring(0,6)}`, // 修正名称创建
        isSaved: true,
        createdAt, // 分配 createdAt
        nodes: flowToSave.nodes.map(n => ({...n})), 
        connections: flowToSave.connections.map(c => ({...c})),
        viewport: {...flowToSave.viewport}
    };

    const existingIndex = currentSavedFlows.findIndex(f => f.id === newSavedFlow.id);
    let updatedFlows;
    if (existingIndex > -1) {
      updatedFlows = [...currentSavedFlows];
      updatedFlows[existingIndex] = newSavedFlow;
    } else {
      updatedFlows = [...currentSavedFlows, newSavedFlow];
    }
    savedFlowsSubject.next(updatedFlows);
    return newSavedFlow;
  },

  deleteSavedFlow: (flowId: string) => {
    const currentSavedFlows = savedFlowsSubject.getValue();
    const updatedFlows = currentSavedFlows.filter(f => f.id !== flowId);
    savedFlowsSubject.next(updatedFlows);
  },
  
  getFlowById: (flowId: string): Flow | undefined => {
    return savedFlowsSubject.getValue().find(f => f.id === flowId);
  }
};

