// src/lib/flow-compiler.ts
import type { Flow, Node, Connection } from '@/types/flow';

export interface CompilationResult {
  pythonCode: string;
  imports: string[]; 
}

function sanitizeForPythonIdentifier(id: string): string {
  return id.replace(/[^a-zA-Z0-9_]/g, '_');
}

function topologicalSort(nodes: Node[], connections: Connection[]): Node[] {
  const inDegree: Record<string, number> = {};
  const adjList: Record<string, string[]> = {};
  const sortedNodes: Node[] = [];
  const queue: string[] = [];

  nodes.forEach(node => {
    inDegree[node.id] = 0;
    adjList[node.id] = [];
  });

  connections.forEach(conn => {
    if (nodes.some(n => n.id === conn.sourceNodeId) && nodes.some(n => n.id === conn.targetNodeId)) {
      adjList[conn.sourceNodeId].push(conn.targetNodeId);
      inDegree[conn.targetNodeId]++;
    }
  });

  nodes.forEach(node => {
    if (inDegree[node.id] === 0) {
      queue.push(node.id);
    }
  });

  while (queue.length > 0) {
    const u = queue.shift()!;
    const node = nodes.find(n => n.id === u);
    if (node) {
      sortedNodes.push(node);
    }

    (adjList[u] || []).forEach(v => {
      inDegree[v]--;
      if (inDegree[v] === 0) {
        queue.push(v);
      }
    });
  }

  if (sortedNodes.length !== nodes.length) {
    console.warn("流程中可能存在环路，或者部分节点不可达。生成的代码可能不完整或顺序不正确。");
    return [...nodes].sort((a, b) => {
        if (a.position.y === b.position.y) {
            return a.position.x - b.position.x;
        }
        return a.position.y - b.position.y;
    });
  }

  return sortedNodes;
}


export function compileFlowToPython(flow: Flow): CompilationResult {
  let header = `"""\n流程名称: ${flow.name}\n流程ID: ${flow.id}\n导出时间: ${new Date().toISOString()}\n"""\n\n`;
  const allImports = new Set<string>();
  const nodeFunctionDefinitions: string[] = [];
  const definedFunctionNames = new Set<string>();
  const nodeOutputsMapping: Record<string, string> = {}; 

  const sortedNodes = topologicalSort(flow.nodes, flow.connections);

  // 确保 matplotlib.pyplot, io, base64 在 Output Node 处理图像时可用
  allImports.add('import matplotlib.pyplot as plt');
  allImports.add('from io import BytesIO');
  allImports.add('import base64');


  sortedNodes.forEach(node => {
    if (node.type === 'python-function' && node.data.code) {
      const lines = node.data.code.split('\n');
      let functionBody = "";
      let currentOriginalFuncName: string | null = null;

      lines.forEach(line => {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('import ') || trimmedLine.startsWith('from ')) {
          allImports.add(line);
        } else {
          functionBody += line + '\n';
          if (!currentOriginalFuncName) {
            const funcNameMatch = line.match(/def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/);
            if (funcNameMatch) {
              currentOriginalFuncName = funcNameMatch[1];
            }
          }
        }
      });
      
      const originalFuncName = currentOriginalFuncName || `execute_default_${sanitizeForPythonIdentifier(node.id)}`;
      
      if (!definedFunctionNames.has(originalFuncName)) {
        nodeFunctionDefinitions.push(`# --- 节点: ${node.name} (${node.id}) 的函数定义 ---\n${functionBody.trim()}\n# --- 结束 ${node.name} 的函数定义 ---\n`);
        definedFunctionNames.add(originalFuncName);
      }
      
      if (node.outputs.length === 1) {
        nodeOutputsMapping[node.outputs[0].id] = `${originalFuncName}_output_${sanitizeForPythonIdentifier(node.id)}`;
      } else if (node.outputs.length > 1) {
        node.outputs.forEach((port, index) => {
          nodeOutputsMapping[port.id] = `${originalFuncName}_output_${index}_${sanitizeForPythonIdentifier(node.id)}`;
        });
      }

    } else if (node.type === 'excel-input' || node.type === 'csv-input') {
      allImports.add('import pandas as pd');
      if (node.data.filePreview && node.data.filePreview.jsonData !== undefined) {
        allImports.add('import json');
      }
      const varName = `df_${sanitizeForPythonIdentifier(node.id)}`;
      if (node.outputs.length > 0) {
        nodeOutputsMapping[node.outputs[0].id] = varName;
      }
    }
  });

  let pythonCode = header;
  pythonCode += Array.from(allImports).join('\n') + '\n\n';
  pythonCode += nodeFunctionDefinitions.join('\n');

  pythonCode += 'def run_flow():\n';
  pythonCode += '    """主流程执行函数"""\n';
  pythonCode += '    print("开始执行流程...")\n\n';
  
  const runFlowBodyStatements: string[] = [];

  sortedNodes.forEach(node => {
    let nodeStatement = `    # --- 开始处理节点: ${node.name} (ID: ${node.id}) ---\n`;
    if (node.type === 'excel-input' || node.type === 'csv-input') {
        const varName = nodeOutputsMapping[node.outputs[0]?.id] || `df_fallback_${sanitizeForPythonIdentifier(node.id)}`;
        if (node.data.filePreview && node.data.filePreview.jsonData) {
            const jsonDataString = JSON.stringify(node.data.filePreview.jsonData);
            nodeStatement += `    ${varName}_json_data_str = r"""${jsonDataString.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')}"""\n`;
            nodeStatement += `    ${varName} = pd.DataFrame(json.loads(${varName}_json_data_str))`;
        } else {
            const filePathComment = node.data.fileName ? ` (源文件: '${node.data.fileName}')` : '(请指定文件路径)';
            if (node.type === 'excel-input') {
                nodeStatement += `    ${varName} = pd.read_excel("your_excel_file_path.xlsx")  # TODO: 替换为实际Excel文件路径${filePathComment}`;
            } else {
                nodeStatement += `    ${varName} = pd.read_csv("your_csv_file_path.csv")  # TODO: 替换为实际CSV文件路径${filePathComment}`;
            }
        }
    } else if (node.type === 'sub-flow') {
        const subFlowId = node.data.subFlowId || '未知子流程';
        nodeStatement += `    # 调用子流程: ${node.name} (模板ID: ${subFlowId})\n    # sub_flow_output_${sanitizeForPythonIdentifier(node.id)} = run_sub_flow_${sanitizeForPythonIdentifier(node.id)}(...) # TODO: 实现子流程调用逻辑`;
    } else if (node.type === 'python-function' && node.data.code) {
        const funcNameMatch = node.data.code.match(/def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/);
        const originalFuncName = funcNameMatch ? funcNameMatch[1] : `execute_default_${sanitizeForPythonIdentifier(node.id)}`;
        
        const inputArgs: string[] = [];
        node.inputs.forEach(inputPort => {
            const connection = flow.connections.find(conn => conn.targetNodeId === node.id && conn.targetInputId === inputPort.id);
            if (connection && nodeOutputsMapping[connection.sourceOutputId]) {
                inputArgs.push(nodeOutputsMapping[connection.sourceOutputId]);
            } else {
                inputArgs.push(`${inputPort.originalName}=None  # TODO: 为输入参数 '${inputPort.name}' 提供值或默认处理`);
            }
        });
        
        if (node.outputs.length > 0) {
            const outputVarsList = node.outputs.map((port) => nodeOutputsMapping[port.id]);
            const outputVarsAssignment = outputVarsList.length === 1 ? outputVarsList[0] : outputVarsList.join(', ');
            if (outputVarsList.length > 1) {
                 nodeStatement += `    ${outputVarsAssignment} = ${originalFuncName}(${inputArgs.join(', ')})`;
            } else if (outputVarsList.length === 1) {
                nodeStatement += `    ${outputVarsAssignment} = ${originalFuncName}(${inputArgs.join(', ')})`;
            } else { 
                nodeStatement += `    ${originalFuncName}(${inputArgs.join(', ')}) # 假定无输出或输出被忽略`;
            }
        } else {
            nodeStatement += `    ${originalFuncName}(${inputArgs.join(', ')})`;
        }
    } else if (node.type === 'output-node') {
        const inputPort = node.inputs[0];
        if (inputPort) {
            const connection = flow.connections.find(conn => conn.targetNodeId === node.id && conn.targetInputId === inputPort.id);
            const sourceVar = connection && nodeOutputsMapping[connection.sourceOutputId] 
                ? nodeOutputsMapping[connection.sourceOutputId] 
                : `None  # 源未定义 for ${node.name}`;
 
            const outputVarName = `output_value_for_${sanitizeForPythonIdentifier(node.id)}`;
            nodeStatement += `    ${outputVarName} = ${sourceVar}\n`;
            // 检查 outputVarName 是否为 Matplotlib Figure 对象
            nodeStatement += `    if hasattr(${outputVarName}, 'savefig') and callable(getattr(${outputVarName}, 'savefig')) and isinstance(${outputVarName}, plt.Figure):\n`;
            nodeStatement += `        buf = BytesIO()\n`;
            nodeStatement += `        ${outputVarName}.savefig(buf, format='png')\n`;
            nodeStatement += `        plt.close(${outputVarName}) # 关闭图像以释放内存\n`;
            nodeStatement += `        buf.seek(0)\n`;
            nodeStatement += `        img_str = base64.b64encode(buf.getvalue()).decode('utf-8')\n`;
            nodeStatement += `        print(f"MATPLOTLIB_FIGURE_BASE64:{img_str}")\n`;
            nodeStatement += `    else:\n`;
            nodeStatement += `        print(f"--- 输出节点: ${node.name} ---\\n    Value: {${outputVarName}}")`;
        } else {
            nodeStatement += `    print(f"--- 输出节点: ${node.name} (无输入连接) ---")`;
        }
    }
    nodeStatement += `\n    # --- 结束处理节点: ${node.name} ---`;
    runFlowBodyStatements.push(nodeStatement);
  });

  pythonCode += runFlowBodyStatements.join('\n\n') + '\n';
  pythonCode += '\n    print("流程执行完毕。")\n';

  pythonCode += `\nif __name__ == "__main__":\n    run_flow()\n`;

  return { pythonCode, imports: Array.from(allImports) };
}
