// src/types/flow.ts
export interface Port {
  id: string;
  name: string; // 用户可编辑的显示名称
  originalName: string; // 从代码派生的名称，例如 Python 参数名（如果不是来自代码，可以与 name 相同）
  nodeId: string;
  type: 'input' | 'output';
}

export type NodeType = 'python-function' | 'excel-input' | 'csv-input' | 'sub-flow' | 'output-node';

export type OutputNodeType = 'json'; // 目前仅支持 JSON 输出类型

export interface FilePreviewData {
  headers: string[];
  firstRow: string[];
  lastRow?: string[]; // 可选：用于预览的最后一行数据
  rowCount: number; // 数据行总数（不包括标题行）
  error?: string; // 可选错误消息，如果解析失败或预览受限
  jsonData?: any[]; // 新增：用于存储解析后的文件内容的JSON表示
}

export interface NodeData {
  code?: string; // Python 函数节点的代码
  subFlowId?: string; // 子流程节点的ID (引用已保存流程的 ID)
  templateId?: string; // 如果此 python-function 节点是从一个“定义”创建的，则为其“模板”ID
  // 对于 output-node
  outputValue?: any; 
  outputType?: OutputNodeType; // 如果设置，则始终为 'json'
  // 对于文件输入节点
  fileName?: string;
  fileSize?: number;
  filePreview?: FilePreviewData | null; // 存储标题和第一行数据以供预览
  description?: string; // 用于作为模板的 python-function 节点的描述
}

export interface Node {
  id:string;
  type: NodeType;
  name: string;
  position: { x: number; y: number };
  inputs: Port[];
  outputs: Port[];
  data: NodeData;
}

export interface Connection {
  id: string;
  sourceNodeId: string;
  sourceOutputId: string;
  targetNodeId: string;
  targetInputId: string;
}

export interface Flow {
  id: string;
  name: string;
  nodes: Node[];
  connections: Connection[];
  viewport: { x: number; y: number; zoom: number };
  isSaved?: boolean; // 指示此 Flow 对象是否代表已保存的流程模板
  createdAt?: string; // 流程创建时间戳 (可选以兼容旧数据)
}

// Types for i18n
export type Locale = 'en' | 'ja' | 'ko' | 'zh-CN' | 'zh-HK' | 'zh-TW' | 'ru';
export interface Language {
  code: Locale;
  name: string; // 用于在选择器中显示的原生名称
}
export type Translations = Record<string, string | Record<string, string | Record<string, string>>>; // 支持更深层级的嵌套


// 可在配置面板中选择的项目的类型
export type SelectedConfigItem =
  | { type: 'node'; data: Node }
  | null;

export type FontSize = 'small' | 'default' | 'medium' | 'large';

// 标签页相关类型
export type TabType = 'flow-canvas' | 'code-preview' | 'matplotlib-figure'; // 新增 'matplotlib-figure'

export interface TabItem {
  id: string; // 标签页的唯一ID
  title: string; // 标签页的显示标题
  type: TabType; // 标签页内容的类型
  closable: boolean; // 标签页是否可关闭
  fixed: boolean; // 如果为 true，则标签页不可关闭且位置可能固定
  flowId?: string; // 对于 'code-preview' 或 'matplotlib-figure' 类型的标签页，用于标识关联的流程
  flowName?: string; // 主要用于 'code-preview'
  imageDataUri?: string; // 对于 'matplotlib-figure' 类型的标签页，存储图像数据
  figureId?: string; // 用于 'matplotlib-figure' 类型的标签页，以生成唯一标题
  createdAt?: number; // 标签页创建时间戳，用于排序或记录
}

