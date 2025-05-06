import { BehaviorSubject } from 'rxjs';
// PythonFunctionTemplate 已被移除，SelectedConfigItem 现在只包含 Node 或 null
import type { Flow, Node, Connection, Port, NodeType, SelectedConfigItem as SelectedItem } from '@/types/flow'; 
import { nanoid } from '@/lib/nanoid';
import { parsePythonFunction } from '@/lib/python-parser';

const generateFlowId = () => `flow_${nanoid(10)}`;

// 修改为接受初始名称
const createNewFlow = (initialName: string): Flow => ({
  id: generateFlowId(),
  name: initialName, // 使用提供的初始名称
  nodes: [],
  connections: [],
  viewport: { x: 50, y: 50, zoom: 1 },
  isSaved: false, // 新流程初始未保存
  createdAt: new Date().toISOString(), // 添加 createdAt 字段
});


// selectedNodeSubject 现在持有 SelectedItem 类型（来自 types/flow）
export const flowSubject = new BehaviorSubject<Flow>(createNewFlow('Untitled Flow')); // 默认初始名称
export const selectedNodeSubject = new BehaviorSubject<SelectedItem>(null);


interface AddNodeOptions {
  subFlowId?: string;
  pythonFunctionCode?: string;
  pythonFunctionId?: string; // 作为模板的 python-function 节点的 ID
  description?: string; // 节点的描述信息，主要用于从模板创建时
}

export const flowService = {
  getFlow: () => flowSubject.getValue(),

  loadFlow: (flow: Flow) => {
    // 确保加载的流程标记为已保存
    // 并且确保 createdAt 字段存在
    flowSubject.next({ 
      ...flow, 
      isSaved: true,
      createdAt: flow.createdAt || new Date().toISOString() // 兼容旧数据
    });
    selectedNodeSubject.next(null);
  },

  createNewFlow: (initialName: string) => { // 接受翻译后的名称
    const newFlow = createNewFlow(initialName);
    flowSubject.next(newFlow);
    selectedNodeSubject.next(null);
    return newFlow;
  },

  addNode: (type: NodeType, name: string, position: { x: number; y: number }, options?: AddNodeOptions): Node => {
    const currentFlow = flowSubject.getValue();
    const newNodeId = `node_${nanoid(10)}`;

    let inputs: Port[] = [];
    let outputs: Port[] = [];
    let data: Node['data'] = {
      description: options?.description || '' // 初始化描述
    };
    

    // 如果是从一个“函数定义”创建的 python-function 节点，则记录其原始ID
    if (type === 'python-function' && options?.pythonFunctionId) {
      data.templateId = options.pythonFunctionId; 
    }
     if (type === 'sub-flow' && options?.subFlowId) {
       // 确保从选项正确分配 subFlowId
       data.subFlowId = options.subFlowId;
     }


    switch (type) {
      case 'python-function':
        // 如果提供了 pythonFunctionCode（例如来自模板），则使用它。否则使用默认值。
        const initialCode = options?.pythonFunctionCode || 'def main(param1):\n  # Your Python Code here\n  return output1';
        const parsed = parsePythonFunction(initialCode);
        inputs = parsed.inputs.map((inputName, i) => ({
            id: `port_in_${newNodeId}_${inputName.replace(/[^a-zA-Z0-9_]/g, '') || `param${i}`}_${nanoid(3)}`,
            name: inputName,
            originalName: inputName,
            type: 'input',
            nodeId: newNodeId,
        }));
        outputs = parsed.outputs.map((outputName, i) => ({
            id: `port_out_${newNodeId}_${outputName.replace(/[^a-zA-Z0-9_]/g, '') || `output${i+1}`}_${nanoid(3)}`, // 输出名称从1开始索引
            name: outputName,
            originalName: outputName,
            type: 'output',
            nodeId: newNodeId,
        }));
        data = { ...data, code: initialCode };
        break;
      case 'excel-input':
        outputs = [{ id: `port_out_${newNodeId}_data_${nanoid(3)}`, name: '数据', originalName: '数据', type: 'output', nodeId: newNodeId }];
        data = { ...data, fileName: undefined, fileSize: undefined, filePreview: null }; // 初始化 filePreview
        break;
      case 'csv-input':
        outputs = [{ id: `port_out_${newNodeId}_data_${nanoid(3)}`, name: '数据', originalName: '数据', type: 'output', nodeId: newNodeId }];
        data = { ...data, fileName: undefined, fileSize: undefined, filePreview: null }; // 初始化 filePreview
        break;
      case 'sub-flow':
        inputs = [{ id: `port_in_${newNodeId}_input_${nanoid(3)}`, name: '输入', originalName: '输入', type: 'input', nodeId: newNodeId }];
        outputs = [{ id: `port_out_${newNodeId}_output_${nanoid(3)}`, name: '输出', originalName: '输出', type: 'output', nodeId: newNodeId }];
        data = { ...data }; // 确保 data 对象存在
        break;
      case 'output-node':
        inputs = [{ id: `port_in_${newNodeId}_result_${nanoid(3)}`, name: '结果', originalName: '结果', type: 'input', nodeId: newNodeId }];
        data = { ...data, outputValue: null, outputType: 'json' };
        break;
    }

    const newNode: Node = {
      id: newNodeId,
      type,
      name,
      position,
      inputs,
      outputs,
      data,
    };
    // 添加节点会使流程变为未保存状态（如果之前已保存）
    flowSubject.next({ ...currentFlow, nodes: [...currentFlow.nodes, newNode], isSaved: false });
    return newNode;
  },

  updateNode: (updatedNode: Node) => {
    const currentFlow = flowSubject.getValue();

    if (updatedNode.type === 'python-function') {
      updatedNode.inputs = updatedNode.inputs.map(p => ({...p, originalName: p.originalName || p.name, type: 'input', nodeId: updatedNode.id }));
      updatedNode.outputs = updatedNode.outputs.map(p => ({...p, originalName: p.originalName || p.name, type: 'output', nodeId: updatedNode.id }));
    }

    if (updatedNode.type === 'output-node') {
      updatedNode.data.outputType = 'json';
    }


    const nodes = currentFlow.nodes.map(node =>
      node.id === updatedNode.id ? updatedNode : node
    );

    let connections = currentFlow.connections;
    // 当节点更新时，尤其是其端口，移除连接到不存在端口的连接线
    const nodeInputPortIds = new Set(updatedNode.inputs.map(p => p.id));
    const nodeOutputPortIds = new Set(updatedNode.outputs.map(p => p.id));

    connections = connections.filter(conn => {
        if (conn.targetNodeId === updatedNode.id && !nodeInputPortIds.has(conn.targetInputId)) {
            return false;
        }
        if (conn.sourceNodeId === updatedNode.id && !nodeOutputPortIds.has(conn.sourceOutputId)) {
            return false;
        }
        return true;
    });

    // 更新节点会使流程变为未保存状态
    flowSubject.next({ ...currentFlow, nodes, connections, isSaved: false });
    
    // 如果更新的节点是当前选中的节点，则更新选择状态
    const currentSelection = selectedNodeSubject.getValue();
    if (currentSelection?.type === 'node' && currentSelection.data.id === updatedNode.id) {
      // 在发出 selectedNodeSubject 更新前，比较节点数据以避免不必要的循环
      // 这是一个关键的修复，以防止因对象引用不同但内容相同而导致的更新循环
      if (JSON.stringify(currentSelection.data) !== JSON.stringify(updatedNode)) {
        selectedNodeSubject.next({ type: 'node', data: updatedNode });
      }
    }
  },

  updateNodePosition: (nodeId: string, position: { x: number; y: number }) => {
    const currentFlow = flowSubject.getValue();
    const nodes = currentFlow.nodes.map(node =>
      node.id === nodeId ? { ...node, position } : node
    );
    // 移动节点会使流程变为未保存状态
    flowSubject.next({ ...currentFlow, nodes, isSaved: false });
  },

  deleteNode: (nodeId: string) => {
    const currentFlow = flowSubject.getValue();
    const nodes = currentFlow.nodes.filter(node => node.id !== nodeId);
    const connections = currentFlow.connections.filter(
      conn => conn.sourceNodeId !== nodeId && conn.targetNodeId !== nodeId
    );
    // 删除节点会使流程变为未保存状态
    flowSubject.next({ ...currentFlow, nodes, connections, isSaved: false });
    const currentSelection = selectedNodeSubject.getValue();
    if (currentSelection?.type === 'node' && currentSelection.data.id === nodeId) {
      selectedNodeSubject.next(null);
    }
  },

  addConnection: (connection: Omit<Connection, 'id'>) => {
    const currentFlow = flowSubject.getValue();
    const newConnection: Connection = { ...connection, id: `conn_${nanoid(10)}` };

    // 防止连接到已连接的输入端口
     const existingConnection = currentFlow.connections.find(c => c.targetNodeId === connection.targetNodeId && c.targetInputId === connection.targetInputId);
      if (existingConnection) {
        console.warn(`输入端口 ${connection.targetInputId} (节点 ${connection.targetNodeId}) 已有连接。`);
        return; // 不添加连接
      }

    // 添加连接会使流程变为未保存状态
    flowSubject.next({ ...currentFlow, connections: [...currentFlow.connections, newConnection], isSaved: false });
  },

  deleteConnection: (connectionId: string) => {
    const currentFlow = flowSubject.getValue();
    const connections = currentFlow.connections.filter(conn => conn.id !== connectionId);
    // 删除连接会使流程变为未保存状态
    flowSubject.next({ ...currentFlow, connections, isSaved: false });
  },

  selectNode: (item: SelectedItem) => { // 更新为接受 SelectedItem
    selectedNodeSubject.next(item);
  },

  updateFlowName: (name: string) => {
    const currentFlow = flowSubject.getValue();
    if (currentFlow.name !== name) {
      // 更新名称会使流程变为未保存状态，即使之前已使用不同名称保存
      flowSubject.next({ ...currentFlow, name, isSaved: false });
    }
  },

  updateViewport: (viewport: Flow['viewport']) => {
    const currentFlow = flowSubject.getValue();
    // 视口更改通常不应将流程标记为未保存
    flowSubject.next({ ...currentFlow, viewport });
  },
};

