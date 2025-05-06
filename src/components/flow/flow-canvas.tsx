// src/components/flow/flow-canvas.tsx
'use client';

import type { PointerEvent as ReactPointerEvent, DragEvent as ReactDragEvent } from 'react'; // 修正后的导入
import { useEffect, useState, useRef, useCallback } from 'react';
import { Subject, fromEvent } from 'rxjs';
import { map, takeUntil, tap, filter, throttleTime } from 'rxjs/operators';
import type { Flow, Node, Connection, Port, NodeType } from '@/types/flow';
import { flowService, flowSubject, selectedNodeSubject } from '@/store/flow-store';
import { FlowNode } from './flow-node';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, LocateFixed, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { ConnectionLine } from './connection-line';
import { useTranslation } from '@/hooks/use-translation';
import { segmentsIntersect } from '@/lib/geometry-utils'; 
import {
  NODE_HEADER_HEIGHT,
  PORT_ROW_HEIGHT,
  PORT_GAP,
  CARD_CONTENT_PADDING_TOP,
  CARD_CONTENT_PADDING_BOTTOM,
} from '@/lib/layout-constants';


const MIN_ZOOM = 0.2;
const MAX_ZOOM = 2;
const ZOOM_STEP = 0.1;

interface Point {
  x: number;
  y: number;
}


export function FlowCanvas() {
  const [flow, setFlow] = useState<Flow>(() => flowService.getFlow());
  const [selectedNodeState, setSelectedNodeState] = useState<Node | null>(null);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [connectingPort, setConnectingPort] = useState<Port | null>(null);
  const [pointerPosition, setPointerPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hoveredPortId, setHoveredPortId] = useState<string | null>(null);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ clientX: number; clientY: number, viewportX: number, viewportY: number }>({ clientX: 0, clientY: 0, viewportX: 0, viewportY: 0 });

  const [isSwipingToCut, setIsSwipingToCut] = useState(false);
  const [swipeCutStartPoint, setSwipeCutStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [lastSwipeCutPoint, setLastSwipeCutPoint] = useState<{ x: number; y: number } | null>(null);


  const { t } = useTranslation();

  const svgRef = useRef<SVGSVGElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const pointerMoveSubject = useRef(new Subject<PointerEvent>()).current;
  const pointerUpSubject = useRef(new Subject<PointerEvent>()).current;


  useEffect(() => {
    const flowSub = flowSubject.subscribe(setFlow);
    const selectedItemSub = selectedNodeSubject.subscribe(selectedItem => {
      if (selectedItem && selectedItem.type === 'node') {
        setSelectedNodeState(selectedItem.data as Node);
      } else {
        setSelectedNodeState(null);
      }
    });
    return () => {
      flowSub.unsubscribe();
      selectedItemSub.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const moveSubscription = fromEvent<PointerEvent>(window, 'pointermove').subscribe(pointerMoveSubject);
    const upSubscription = fromEvent<PointerEvent>(window, 'pointerup').subscribe(pointerUpSubject);
    return () => {
      moveSubscription.unsubscribe();
      upSubscription.unsubscribe();
    };
  }, [pointerMoveSubject, pointerUpSubject]);

  const getCanvasRelativeCoords = useCallback((event: PointerEvent | ReactPointerEvent<HTMLDivElement | SVGSVGElement>) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left - flow.viewport.x) / flow.viewport.zoom,
      y: (event.clientY - rect.top - flow.viewport.y) / flow.viewport.zoom,
    };
  }, [flow.viewport.x, flow.viewport.y, flow.viewport.zoom]);

 const calculateNodeDynamicHeight = useCallback((node: Node): number => {
    const hasInputs = node.inputs.length > 0;
    const showInputs = node.type === 'python-function' ? hasInputs : true;
    const hasOutputs = node.outputs.length > 0;
    const showOutputs = node.type === 'python-function' ? hasOutputs : true;


    const inputPortsSectionHeight = showInputs && hasInputs
      ? (node.inputs.length * PORT_ROW_HEIGHT) + (Math.max(0, node.inputs.length - 1) * PORT_GAP)
      : 0;
      
    const outputPortsSectionHeight = showOutputs && hasOutputs
      ? (node.outputs.length * PORT_ROW_HEIGHT) + (Math.max(0, node.outputs.length - 1) * PORT_GAP)
      : 0;
    
    const spacerBetweenInputOutput = (showInputs && showOutputs) ? (PORT_ROW_HEIGHT + PORT_GAP) : 0;
    
    let middleContentItselfHeight = 0;
    if (node.type === 'python-function' && node.data.code) middleContentItselfHeight = Math.max(middleContentItselfHeight, 30);
    if (node.type === 'sub-flow' && node.data.subFlowId) middleContentItselfHeight = Math.max(middleContentItselfHeight, 20);
    if (node.type === 'output-node' && node.data.outputValue !== undefined && node.data.outputValue !== null) middleContentItselfHeight = Math.max(middleContentItselfHeight, 60);

    let middleContentSectionHeight = 0;
    if (middleContentItselfHeight > 0) {
      middleContentSectionHeight = middleContentItselfHeight;
      if (showInputs || showOutputs) { 
        middleContentSectionHeight += 8; 
      }
    }
    
    let fileInputSectionHeight = 0;
    if ((node.type === 'csv-input' || node.type === 'excel-input') && node.data.fileName) {
      fileInputSectionHeight += 4; 
      fileInputSectionHeight += 20; 
      if (node.data.filePreview) {
        if (node.data.filePreview.error || (node.data.filePreview.headers.length === 0 && node.data.filePreview.firstRow.length === 0 && node.data.filePreview.rowCount === 0)) {
        } else {
          fileInputSectionHeight += 40; 
        }
        if (node.data.filePreview.rowCount > 1) { 
          fileInputSectionHeight += 20;
        }
      }
       fileInputSectionHeight += 20; 
    }

    const flexGrowSpacerMinHeight = 6; 

    const totalHeight = NODE_HEADER_HEIGHT +
                        CARD_CONTENT_PADDING_TOP +
                        inputPortsSectionHeight +
                        ( (showInputs && hasInputs && showOutputs && hasOutputs) ? spacerBetweenInputOutput : 0 ) + // 仅当实际输入和输出都显示时才添加此间隔
                        outputPortsSectionHeight +
                        middleContentSectionHeight +
                        flexGrowSpacerMinHeight + 
                        fileInputSectionHeight +
                        CARD_CONTENT_PADDING_BOTTOM +
                        10; 

    return totalHeight;
  }, []);


  const getPortAbsolutePosition = useCallback((node: Node, port: Port): Point => {
    const portIndex = port.type === 'input' 
      ? node.inputs.findIndex(p => p.id === port.id)
      : node.outputs.findIndex(p => p.id === port.id);
  
    if (portIndex === -1) {
      console.warn(`getPortAbsolutePosition: 端口 ${port.id} 在节点 ${node.id} 中未找到`);
      return { x: node.position.x, y: node.position.y }; 
    }
  
    const portX = node.position.x + (port.type === 'output' ? 224 : 0); 
    let portY = node.position.y + NODE_HEADER_HEIGHT + CARD_CONTENT_PADDING_TOP;
  
    const hasInputs = node.inputs.length > 0;
    // `showInputs` 逻辑与 FlowNode.tsx 保持一致
    const showInputs = node.type === 'python-function' ? hasInputs : true; 
    const hasOutputs = node.outputs.length > 0; // 假设如果 port.type 是 'output'，则 hasOutputs 为 true
    const showOutputs = node.type === 'python-function' ? hasOutputs : true;

    if (port.type === 'input') {
      if (showInputs && hasInputs) { 
         portY += (portIndex * (PORT_ROW_HEIGHT + PORT_GAP)) + (PORT_ROW_HEIGHT / 2);
      } else {
        // 对于不显示输入端口或没有输入端口的情况 (例如 CSV/Excel)，此分支不应被 input 端口触及
        // 但为保险起见，使其位于内容区域的顶部
         portY += PORT_ROW_HEIGHT / 2; 
      }
    } else { // port.type === 'output'
        if (showInputs && hasInputs) { // 如果实际渲染了输入端口
            portY += (node.inputs.length * PORT_ROW_HEIGHT) + (Math.max(0, node.inputs.length - 1) * PORT_GAP);
            if (showOutputs && hasOutputs) { // 如果输入和输出之间有间隔
                 portY += (PORT_ROW_HEIGHT + PORT_GAP);
            }
        } else if (showInputs && !hasInputs && showOutputs && hasOutputs) {
            // 对应 CSV/Excel 节点：showInputs 为 true（表示输入区域概念上存在），但无实际输入。
            // FlowNode.tsx 中会渲染输入和输出之间的间隔符。
            portY += (PORT_ROW_HEIGHT + PORT_GAP);
        }
        // 如果 !showInputs (例如 python 函数无输入)，则输出端口直接在顶部内边距之后
        // 此情况已由 portY 的初始值覆盖。
        
        portY += (portIndex * (PORT_ROW_HEIGHT + PORT_GAP)) + (PORT_ROW_HEIGHT / 2);
    }
    
    return { x: portX, y: portY };
  }, []);


  const handleCanvasPointerDown = (event: ReactPointerEvent<HTMLDivElement | SVGSVGElement>) => {
    const target = event.target;
    if (!(target instanceof Element) || event.button !== 0) {
      return;
    }

    const isCanvasOrSvgBackground = target === canvasRef.current ||
                                    target === svgRef.current ||
                                    (svgRef.current && svgRef.current.contains(target) && (target as SVGElement).classList.contains('flow-background-rect'));

    if (isCanvasOrSvgBackground) {
      if (event.pointerType === 'touch' && event.altKey) { // 修改为 Alt + 触摸来触发切割
        setIsSwipingToCut(true);
        const startPoint = getCanvasRelativeCoords(event);
        setSwipeCutStartPoint(startPoint);
        setLastSwipeCutPoint(startPoint);
        (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
        return;
      }

      setIsPanning(true);
      setPanStart({
        clientX: event.clientX,
        clientY: event.clientY,
        viewportX: flow.viewport.x,
        viewportY: flow.viewport.y
      });
      setSelectedConnectionId(null);
      flowService.selectNode(null);
      if (canvasRef.current) canvasRef.current.style.cursor = 'grabbing';
      (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
    }
  };

  useEffect(() => {
    const handleGlobalPointerMove = (event: globalThis.PointerEvent) => {
      if (isPanning) {
        const deltaX = event.clientX - panStart.clientX;
        const deltaY = event.clientY - panStart.clientY;
        flowService.updateViewport({
          ...flow.viewport,
          x: panStart.viewportX + deltaX / flow.viewport.zoom,
          y: panStart.viewportY + deltaY / flow.viewport.zoom,
        });
      } else if (isSwipingToCut && swipeCutStartPoint && lastSwipeCutPoint && canvasRef.current) {
        const currentCutPoint = getCanvasRelativeCoords(event);
        const swipeSegmentP1 = lastSwipeCutPoint;
        const swipeSegmentP2 = currentCutPoint;

        const cutConnections: string[] = [];

        for (const conn of flow.connections) {
          const sourceNode = flow.nodes.find(n => n.id === conn.sourceNodeId);
          const targetNode = flow.nodes.find(n => n.id === conn.targetNodeId);
          const sourcePort = sourceNode?.outputs.find(p => p.id === conn.sourceOutputId);
          const targetPort = targetNode?.inputs.find(p => p.id === conn.targetInputId);

          if (sourceNode && targetNode && sourcePort && targetPort) {
            const sourcePortPos = getPortAbsolutePosition(sourceNode, sourcePort);
            const targetPortPos = getPortAbsolutePosition(targetNode, targetPort);

            const connectionLineSegmentP1 = sourcePortPos;
            const connectionLineSegmentP2 = targetPortPos;

            if (segmentsIntersect(swipeSegmentP1, swipeSegmentP2, connectionLineSegmentP1, connectionLineSegmentP2)) {
              cutConnections.push(conn.id);
            }
          }
        }

        if (cutConnections.length > 0) {
          cutConnections.forEach(connIdToDelete => {
            const connBeingDeleted = flow.connections.find(c => c.id === connIdToDelete);
            flowService.deleteConnection(connIdToDelete);
            if(connBeingDeleted) {
                const sourceN = flow.nodes.find(n=>n.id === connBeingDeleted.sourceNodeId);
                const targetN = flow.nodes.find(n=>n.id === connBeingDeleted.targetNodeId);
            }
          });
        }
        setLastSwipeCutPoint(currentCutPoint);
      }
    };

    const handleGlobalPointerUp = (event: globalThis.PointerEvent) => {
      if (isPanning) {
        setIsPanning(false);
        if (canvasRef.current) canvasRef.current.style.cursor = 'grab';
        (event.target as HTMLElement).releasePointerCapture?.(event.pointerId);
      }
      if (isSwipingToCut) {
        setIsSwipingToCut(false);
        setSwipeCutStartPoint(null);
        setLastSwipeCutPoint(null);
        (event.target as HTMLElement).releasePointerCapture?.(event.pointerId);
      }
    };

    if (isPanning || isSwipingToCut) {
      window.addEventListener('pointermove', handleGlobalPointerMove);
      window.addEventListener('pointerup', handleGlobalPointerUp);
      window.addEventListener('pointercancel', handleGlobalPointerUp);
    }

    return () => {
      window.removeEventListener('pointermove', handleGlobalPointerMove);
      window.removeEventListener('pointerup', handleGlobalPointerUp);
      window.removeEventListener('pointercancel', handleGlobalPointerUp);
    };
  }, [isPanning, panStart, flow.viewport, isSwipingToCut, swipeCutStartPoint, lastSwipeCutPoint, getCanvasRelativeCoords, flow.connections, flow.nodes, t, getPortAbsolutePosition]);


  const handleNodePointerDown = (event: ReactPointerEvent, nodeId: string) => {
    event.stopPropagation();
    if (event.button !== 0) return;

    const node = flow.nodes.find(n => n.id === nodeId);
    if (!node || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const initialPointerX = (event.clientX - rect.left - flow.viewport.x) / flow.viewport.zoom;
    const initialPointerY = (event.clientY - rect.top - flow.viewport.y) / flow.viewport.zoom;

    setDraggingNodeId(nodeId);
    setDragOffset({
      x: initialPointerX - node.position.x,
      y: initialPointerY - node.position.y,
    });
    flowService.selectNode({ type: 'node', data: node });
    setSelectedConnectionId(null);
    (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
  };

  useEffect(() => {
    if (!draggingNodeId) return;

    const dragSubscription = pointerMoveSubject.pipe(
      throttleTime(16),
      map(event => {
        if (!canvasRef.current) return null;
        const rect = canvasRef.current.getBoundingClientRect();
        return {
          x: (event.clientX - rect.left - flow.viewport.x) / flow.viewport.zoom - dragOffset.x,
          y: (event.clientY - rect.top - flow.viewport.y) / flow.viewport.zoom - dragOffset.y,
        };
      }),
      filter(position => position !== null),
      takeUntil(pointerUpSubject.pipe(tap((event) => {
        setDraggingNodeId(null);
        (event.target as HTMLElement).releasePointerCapture?.(event.pointerId);
      })))
    ).subscribe(newPosition => {
      if (newPosition) {
        flowService.updateNodePosition(draggingNodeId, newPosition);
      }
    });
    return () => dragSubscription.unsubscribe();
  }, [draggingNodeId, dragOffset, pointerMoveSubject, pointerUpSubject, flow.viewport.x, flow.viewport.y, flow.viewport.zoom]);


  const handleConnectPointerDown = (event: ReactPointerEvent, port: Port) => {
    event.stopPropagation();
    if (event.button !== 0) return;

    setConnectingPort(port);
    setSelectedConnectionId(null);
    (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
  };

  useEffect(() => {
    if (!connectingPort) return;

    const connectMoveSub = pointerMoveSubject.pipe(
      map(event => {
        if (!canvasRef.current) return { x: 0, y: 0 };
        const rect = canvasRef.current.getBoundingClientRect();
        return {
          x: (event.clientX - rect.left - flow.viewport.x) / flow.viewport.zoom,
          y: (event.clientY - rect.top - flow.viewport.y) / flow.viewport.zoom,
        };
      }),
      takeUntil(pointerUpSubject)
    ).subscribe(setPointerPosition);

    const connectEndSub = pointerUpSubject.pipe(
    ).subscribe((event) => { 
      let resolvedTargetPort: Port | null = null;
      let resolvedTargetNode: Node | null = null;

      if (connectingPort && hoveredPortId) {
        const targetNodeElement = document.querySelector(`[data-port-id="${hoveredPortId}"]`)?.closest('[data-node-id]');
        if (targetNodeElement) {
          const targetNodeId = targetNodeElement.getAttribute('data-node-id');
          const node = flow.nodes.find(n => n.id === targetNodeId);
          if (node) {
            const portElement = document.querySelector(`[data-port-id="${hoveredPortId}"]`);
            const portTypeAttr = portElement?.getAttribute('data-port-type') as 'input' | 'output' | undefined;
            if (portTypeAttr) {
              const portList = portTypeAttr === 'input' ? node.inputs : node.outputs;
              const port = portList.find(p => p.id === hoveredPortId);
              if (port) {
                resolvedTargetPort = port;
                resolvedTargetNode = node;
              }
            }
          }
        }
      }

      if (connectingPort && !resolvedTargetPort) {
        const upElement = document.elementFromPoint(event.clientX, event.clientY);
        if (upElement) {
            const portDiv = upElement.closest('[data-port-id]');
            if (portDiv) {
                const pId = portDiv.getAttribute('data-port-id');
                const pType = portDiv.getAttribute('data-port-type') as 'input' | 'output' | undefined;
                const nDiv = portDiv.closest('[data-node-id]');
                const nId = nDiv?.getAttribute('data-node-id');

                if (pId && pType && nId) {
                    const node = flow.nodes.find(n => n.id === nId);
                    if (node) {
                        const portList = pType === 'input' ? node.inputs : node.outputs;
                        const port = portList.find(p => p.id === pId);
                        if (port) {
                            resolvedTargetPort = port;
                            resolvedTargetNode = node;
                        }
                    }
                }
            }
        }
      }

      if (connectingPort && !resolvedTargetPort) {
        const { x: upX, y: upY } = pointerPosition; 
        const touchTolerance = event.pointerType === 'touch' ? 30 / flow.viewport.zoom : 15 / flow.viewport.zoom;

        for (const node of flow.nodes) {
          if (node.id === connectingPort.nodeId) continue;
          const portsToCheck = connectingPort.type === 'output' ? node.inputs : node.outputs;
          for (const port of portsToCheck) {
            if (port.type === connectingPort.type) continue;
            const portAbsPos = getPortAbsolutePosition(node, port);
            const distSq = (upX - portAbsPos.x) ** 2 + (upY - portAbsPos.y) ** 2;
            if (distSq <= touchTolerance ** 2) {
              resolvedTargetPort = port;
              resolvedTargetNode = node;
              break;
            }
          }
          if (resolvedTargetPort) break;
        }
      }

      if (connectingPort && resolvedTargetPort && resolvedTargetNode) {
        if (resolvedTargetPort.type !== connectingPort.type && resolvedTargetPort.nodeId !== connectingPort.nodeId) {
          const source = connectingPort.type === 'output' ? connectingPort : resolvedTargetPort;
          const target = connectingPort.type === 'input' ? connectingPort : resolvedTargetPort;

          const existingConnection = flow.connections.find(c => c.targetNodeId === target.nodeId && c.targetInputId === target.id);
          if (existingConnection) {
            toast({ title: t('toast.connectionFailed.title'), description: t('toast.connectionFailed.portAlreadyConnected', { portName: target.name }), variant: "destructive" });
          } else {
            flowService.addConnection({
              sourceNodeId: source.nodeId,
              sourceOutputId: source.id,
              targetNodeId: target.nodeId,
              targetInputId: target.id,
            });
          }
        } else {
          toast({ title: t('toast.connectionFailed.title'), description: t('toast.connectionFailed.invalidConnectionTarget'), variant: "destructive" });
        }
      }

      const currentConnectingPortElement = document.querySelector(`[data-port-id="${connectingPort?.id}"]`);
      if (currentConnectingPortElement) {
        currentConnectingPortElement.releasePointerCapture?.(event.pointerId);
      }
      setConnectingPort(null);
      setHoveredPortId(null);
    });

    return () => {
      connectMoveSub.unsubscribe();
      connectEndSub.unsubscribe();
    };
  }, [connectingPort, hoveredPortId, flow.nodes, flow.connections, pointerMoveSubject, pointerUpSubject, flow.viewport, t, pointerPosition, getPortAbsolutePosition]);

  const handlePortPointerEnter = (event: ReactPointerEvent, port: Port) => {
    if (connectingPort) {
      if (port.id !== connectingPort.id && port.type !== connectingPort.type) {
        setHoveredPortId(port.id);
      }
    }
  };
  const handlePortPointerLeave = (event: ReactPointerEvent, port: Port) => {
     if (connectingPort) {
        if (port.id === hoveredPortId) {
            setHoveredPortId(null);
        }
     }
  };


  const handleDragOver = useCallback((event: ReactDragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback((event: ReactDragEvent) => {
    event.preventDefault();
    if (!canvasRef.current) return;

    const type = event.dataTransfer.getData('application/reactflow-node-type') as NodeType;
    const name = event.dataTransfer.getData('application/reactflow-node-name') || t('flowCanvas.newNodeDefaultName');
    const subFlowId = event.dataTransfer.getData('application/reactflow-subflow-id') || undefined;
    const pythonFunctionCode = event.dataTransfer.getData('application/reactflow-python-code') || undefined;
    const pythonFunctionId = event.dataTransfer.getData('application/reactflow-python-id') || undefined;
    const nodeDescription = event.dataTransfer.getData('application/reactflow-node-description') || undefined;


    if (!type) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const position = {
      x: (event.clientX - rect.left - flow.viewport.x) / flow.viewport.zoom,
      y: (event.clientY - rect.top - flow.viewport.y) / flow.viewport.zoom,
    };

    const nodeOptions: any = { description: nodeDescription };
    if (subFlowId) nodeOptions.subFlowId = subFlowId;
    if (pythonFunctionCode) nodeOptions.pythonFunctionCode = pythonFunctionCode;
    if (pythonFunctionId) nodeOptions.pythonFunctionId = pythonFunctionId;


    const newNode = flowService.addNode(type, name, position, nodeOptions);
    flowService.selectNode({ type: 'node', data: newNode });
  }, [flow.viewport.x, flow.viewport.y, flow.viewport.zoom, t]);


  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const pointerX = event.clientX - rect.left;
    const pointerY = event.clientY - rect.top;

    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, flow.viewport.zoom - event.deltaY * 0.001 * ZOOM_STEP * 10));

    const newX = pointerX - (pointerX - flow.viewport.x) * (newZoom / flow.viewport.zoom);
    const newY = pointerY - (pointerY - flow.viewport.y) * (newZoom / flow.viewport.zoom);

    flowService.updateViewport({ x: newX, y: newY, zoom: newZoom });
  };

  const zoom = (direction: 'in' | 'out') => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const zoomFactor = direction === 'in' ? 1 + ZOOM_STEP : 1 - ZOOM_STEP;
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, flow.viewport.zoom * zoomFactor));

    const newX = centerX - (centerX - flow.viewport.x) * (newZoom / flow.viewport.zoom);
    const newY = centerY - (centerY - flow.viewport.y) * (newZoom / flow.viewport.zoom);

    flowService.updateViewport({ x: newX, y: newY, zoom: newZoom });
  };

  const resetView = () => {
    flowService.updateViewport({ x: 50, y: 50, zoom: 1 });
  };

  const handleConnectionClick = (event: ReactPointerEvent, connectionId: string) => {
    event.stopPropagation();
    setSelectedConnectionId(connectionId);
    flowService.selectNode(null);
  };

  const deleteSelectedConnection = () => {
    if (selectedConnectionId) {
      flowService.deleteConnection(selectedConnectionId);
      setSelectedConnectionId(null);
    }
  };

  const renderConnectingLine = () => {
    if (!connectingPort || !canvasRef.current) return null;

    const sourceNode = flow.nodes.find(n => n.id === connectingPort.nodeId);
    if (!sourceNode) return null;
    
    const portAbsPos = getPortAbsolutePosition(sourceNode, connectingPort);
    const x1 = portAbsPos.x;
    const y1 = portAbsPos.y;

    return (
      <line
        x1={x1}
        y1={y1}
        x2={pointerPosition.x}
        y2={pointerPosition.y}
        stroke="hsl(var(--primary))"
        strokeWidth="2"
        strokeDasharray="5,5"
        aria-hidden="true"
      />
    );
  };


  return (
    <div
      ref={canvasRef}
      className="w-full h-full relative overflow-hidden bg-background cursor-grab"
      style={{ touchAction: 'none' }} // 允许 Pointer Events，但浏览器默认的触摸操作（如滚动）被禁用
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onWheel={handleWheel}
      onPointerDown={handleCanvasPointerDown} // 使用 onPointerDown
      aria-label={t('flowCanvas.ariaLabel')}
    >
      <svg
        ref={svgRef}
        className="w-full h-full"
        onPointerDown={handleCanvasPointerDown} // 使用 onPointerDown
      >
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" fill="hsl(var(--border) / 0.5)" />
          </pattern>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="hsl(var(--foreground))" />
          </marker>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="url(#grid)"
          className="pointer-events-auto flow-background-rect" // 确保背景可以接收事件
        />

        <g transform={`translate(${flow.viewport.x}, ${flow.viewport.y}) scale(${flow.viewport.zoom})`}>
          {flow.connections.map((conn) => {
            const sourceNode = flow.nodes.find(n => n.id === conn.sourceNodeId);
            const targetNode = flow.nodes.find(n => n.id === conn.targetNodeId);
            const sourcePort = sourceNode?.outputs.find(p => p.id === conn.sourceOutputId);
            const targetPort = targetNode?.inputs.find(p => p.id === conn.targetInputId);

            if (!sourceNode || !targetNode || !sourcePort || !targetPort) return null;
            
            const sourcePoint = getPortAbsolutePosition(sourceNode, sourcePort);
            const targetPoint = getPortAbsolutePosition(targetNode, targetPort);
            
            return (
              <ConnectionLine
                key={conn.id}
                connection={conn}
                sourcePoint={sourcePoint}
                targetPoint={targetPoint}
                sourceNodeName={sourceNode.name}
                sourcePortName={sourcePort.name}
                targetNodeName={targetNode.name}
                targetPortName={targetPort.name}
                isSelected={conn.id === selectedConnectionId}
                onClick={handleConnectionClick as any} // 转换为 any 以兼容 MouseEvent
              />
            );
          })}

          {renderConnectingLine()}
          
          {isSwipingToCut && swipeCutStartPoint && lastSwipeCutPoint && (
            <line
              x1={swipeCutStartPoint.x}
              y1={swipeCutStartPoint.y}
              x2={lastSwipeCutPoint.x}
              y2={lastSwipeCutPoint.y}
              stroke="hsl(var(--destructive) / 0.7)"
              strokeWidth={3 / flow.viewport.zoom} // 根据缩放调整线宽
              strokeDasharray={`6 ${4 / flow.viewport.zoom}`}
              strokeLinecap="round"
            />
          )}


          {flow.nodes.map((node) => {
            const totalCalculatedHeight = calculateNodeDynamicHeight(node);
            return (
              <foreignObject
                key={node.id}
                x={node.position.x}
                y={node.position.y}
                width="224" 
                height={totalCalculatedHeight}
                className={cn(draggingNodeId === node.id && "opacity-70", "overflow-visible")}
                data-node-id={node.id}
                onPointerDown={(e: ReactPointerEvent<SVGForeignObjectElement>) => { // 使用 onPointerDown
                  let currentElement: Element | null = null;
                  if (e.target instanceof Element) {
                      currentElement = e.target;
                  }
                  while (currentElement && currentElement !== e.currentTarget) {
                      if (currentElement.hasAttribute('data-port-id') ||
                          currentElement.tagName?.toLowerCase() === 'button' ||
                          currentElement.closest('.monaco-editor')) {
                          return;
                      }
                      currentElement = currentElement.parentElement;
                  }
                  handleNodePointerDown(e, node.id);
                }}
              >
                <div style={{ width: '224px', height: '100%' }} className="select-none">
                  <FlowNode
                    node={node}
                    isSelected={selectedNodeState?.id === node.id}
                    onConnectPointerDown={handleConnectPointerDown} // 传递 onPointerDown
                    onPortPointerEnter={handlePortPointerEnter} // 传递 onPointerEnter
                    onPortPointerLeave={handlePortPointerLeave} // 传递 onPointerLeave
                  />
                </div>
              </foreignObject>
            );
          })}
        </g>
      </svg>

      <div className="absolute bottom-4 right-4 flex flex-col space-y-2">
        {selectedConnectionId && (
          <Button variant="destructive" size="icon" onClick={deleteSelectedConnection} aria-label={t('flowCanvas.deleteConnectionAriaLabel')}>
            <Trash2 />
          </Button>
        )}
        <Button variant="outline" size="icon" onClick={() => zoom('in')} aria-label={t('flowCanvas.zoomInAriaLabel')}>
          <ZoomIn />
        </Button>
        <Button variant="outline" size="icon" onClick={() => zoom('out')} aria-label={t('flowCanvas.zoomOutAriaLabel')}>
          <ZoomOut />
        </Button>
        <Button variant="outline" size="icon" onClick={resetView} aria-label={t('flowCanvas.resetViewAriaLabel')}>
          <LocateFixed />
        </Button>
      </div>
      <div className="absolute top-4 left-4 text-xs text-muted-foreground">
        Zoom: {flow.viewport.zoom.toFixed(2)} | X: {flow.viewport.x.toFixed(0)}, Y: {flow.viewport.y.toFixed(0)}
      </div>
    </div>
  );
}
