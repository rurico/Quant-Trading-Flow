// src/components/flow/connection-line.tsx
import React, { type MouseEvent as ReactMouseEvent } from 'react';

// 移除 Node, Port, Flow 类型的导入，因为不再需要它们来计算位置
// import type { Node, Connection, Port, Flow } from '@/types/flow';
import type { Connection } from '@/types/flow'; // 仍然需要 Connection 类型

interface Point {
  x: number;
  y: number;
}

interface ConnectionLineProps {
  connection: Connection;
  sourcePoint: Point; // 预计算的源端口坐标
  targetPoint: Point; // 预计算的目标端口坐标
  sourceNodeName?: string; // 用于 aria-label
  targetNodeName?: string; // 用于 aria-label
  sourcePortName?: string; // 用于 aria-label
  targetPortName?: string; // 用于 aria-label
  isSelected?: boolean;
  onClick?: (event: ReactMouseEvent, connectionId: string) => void;
}

const ConnectionLineComponent = ({
  connection,
  sourcePoint,
  targetPoint,
  sourceNodeName,
  targetNodeName,
  sourcePortName,
  targetPortName,
  isSelected,
  onClick
}: ConnectionLineProps) => {
  // 如果坐标无效，则不渲染
  if (isNaN(sourcePoint.x) || isNaN(sourcePoint.y) || isNaN(targetPoint.x) || isNaN(targetPoint.y)) {
    console.warn("ConnectionLine: Invalid source or target point for connection", connection.id);
    return null;
  }
  
  const pathData = `M ${sourcePoint.x} ${sourcePoint.y} C ${sourcePoint.x + 50} ${sourcePoint.y}, ${targetPoint.x - 50} ${targetPoint.y}, ${targetPoint.x} ${targetPoint.y}`;

  const ariaLabelContent = sourceNodeName && sourcePortName && targetNodeName && targetPortName
    ? `连接线从 ${sourceNodeName} 的 ${sourcePortName} 到 ${targetNodeName} 的 ${targetPortName}`
    : `连接线 ${connection.id}`;

  return (
    <g onClick={(e) => onClick?.(e, connection.id)}>
      <path
        d={pathData}
        stroke={isSelected ? 'hsl(var(--accent))' : 'hsl(var(--foreground))'}
        strokeWidth={isSelected ? 3 : 1.5}
        fill="none"
        className="cursor-pointer hover:stroke-accent transition-colors"
        markerEnd="url(#arrowhead)"
      />
      <path
        d={pathData}
        stroke="transparent"
        strokeWidth="10" // 增加点击区域
        fill="none"
        className="cursor-pointer"
        aria-label={ariaLabelContent}
      />
    </g>
  );
}

export const ConnectionLine = React.memo(ConnectionLineComponent);
