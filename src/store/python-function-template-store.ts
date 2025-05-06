// src/store/function-definition-store.ts (原 python-function-template-store.ts)
import type { Node } from '@/types/flow'; // 导入 Node 类型
import { BehaviorSubject, type Observable } from 'rxjs';
import { nanoid } from '@/lib/nanoid'; // 导入 nanoid

const LOCAL_STORAGE_KEY = 'functionDefinitions'; // 更改本地存储键名

function sanitizeNodeName(name: string): string {
  // 对于节点名称，如果它们用作文件名，则可能需要类似的清理
  // 但通常节点名称不需要 .py 后缀
  if (name.toLowerCase().endsWith('.py')) {
    return name.slice(0, -3);
  }
  return name;
}

function getInitialDefinitions(): Node[] {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      try {
        const parsedNodes = JSON.parse(saved) as Node[];
        // 确保节点都是 'python-function' 类型，并清理名称
        return parsedNodes
          .filter(n => n.type === 'python-function')
          .map(n => ({...n, name: sanitizeNodeName(n.name)}));
      } catch (error) {
        console.error("从 LocalStorage 解析函数定义时出错:", error);
        return [];
      }
    }
  }
  return [];
}

const definitionsSubject = new BehaviorSubject<Node[]>([]);

// 客户端挂载后初始化 subject
if (typeof window !== 'undefined') {
  definitionsSubject.next(getInitialDefinitions());
}

definitionsSubject.subscribe(definitions => {
  if (typeof window !== 'undefined') {
    // 保存前确保名称已清理
    const sanitizedDefinitions = definitions.map(n => ({...n, name: sanitizeNodeName(n.name)}));
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(sanitizedDefinitions));
  }
});

export const functionDefinitionService = {
  getDefinitions: (): Node[] => definitionsSubject.getValue(),
  
  definitions$: definitionsSubject.asObservable() as Observable<Node[]>,

  addOrUpdateDefinition: (nodeDefinition: Node): Node => { // 返回添加或更新后的节点
    if (nodeDefinition.type !== 'python-function') {
      console.warn("尝试将非 python-function 节点添加到函数定义存储中:", nodeDefinition);
      return nodeDefinition; // 或者抛出错误
    }
    const currentDefinitions = definitionsSubject.getValue();
    let finalDefinition = { // 使用 let 以便在名称冲突时可以修改
      ...nodeDefinition,
      name: sanitizeNodeName(nodeDefinition.name),
    };
    const existingIndex = currentDefinitions.findIndex(n => n.id === finalDefinition.id);
    let updatedDefinitions;

    if (existingIndex > -1) { // 更新现有定义
      // 如果是更新操作，通常我们不会修改名称冲突，除非明确要求
      // 但如果需要，可以在这里添加与下面 "Add new" 类似的名称冲突处理逻辑
      updatedDefinitions = [...currentDefinitions];
      updatedDefinitions[existingIndex] = finalDefinition;
    } else { // 添加新定义
      let tempName = finalDefinition.name;
      // 检查名称冲突，如果冲突则添加后缀
      while (currentDefinitions.some(def => def.name === tempName)) {
        tempName = `${sanitizeNodeName(nodeDefinition.name)}_${nanoid(4).toLowerCase()}`;
      }
      finalDefinition.name = tempName; // 更新定义中的名称
      updatedDefinitions = [...currentDefinitions, finalDefinition];
    }
    definitionsSubject.next(updatedDefinitions);
    return finalDefinition; // 返回最终的定义（可能包含修改后的名称）
  },

  updateDefinitionName: (definitionId: string, newName: string): string => {
    const currentDefinitions = definitionsSubject.getValue();
    let sanitizedNewName = sanitizeNodeName(newName);
    
    // 检查新名称是否与其他定义（不包括当前正在重命名的定义）冲突
    const isDuplicate = currentDefinitions.some(
        def => def.name === sanitizedNewName && def.id !== definitionId
    );

    if (isDuplicate) {
        let uniqueNameFound = false;
        let tempName = sanitizedNewName;
        // 循环直到找到唯一的名称
        while(!uniqueNameFound) {
            // 使用原始（未加后缀的）新名称作为基础，避免后缀累加
            tempName = `${sanitizeNodeName(newName)}_${nanoid(4).toLowerCase()}`; 
            if (!currentDefinitions.some(def => def.name === tempName && def.id !== definitionId)) {
                uniqueNameFound = true;
                sanitizedNewName = tempName;
            }
        }
    }

    const updatedDefinitions = currentDefinitions.map(t =>
      t.id === definitionId ? { ...t, name: sanitizedNewName } : t
    );
    definitionsSubject.next(updatedDefinitions);
    return sanitizedNewName; // 返回最终确定的名称
  },

  deleteDefinition: (definitionId: string): void => {
    const currentDefinitions = definitionsSubject.getValue();
    const updatedDefinitions = currentDefinitions.filter(n => n.id !== definitionId);
    definitionsSubject.next(updatedDefinitions);
  },

  getDefinitionById: (definitionId: string): Node | undefined => {
    return definitionsSubject.getValue().find(n => n.id === definitionId);
  }
};
