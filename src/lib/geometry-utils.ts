// src/lib/geometry-utils.ts
// import type { Node, Port } from '@/types/flow'; // 不再需要
// import { 
//   NODE_HEADER_HEIGHT, 
//   PORT_ROW_HEIGHT, 
//   PORT_GAP, 
//   CARD_CONTENT_PADDING_TOP 
// } from './layout-constants'; // 不再需要

interface Point {
  x: number;
  y: number;
}

// getPortPosition 函数已被移除，其功能由 FlowCanvas.tsx 中的
// calculateNodeDynamicHeight 和 getPortAbsolutePosition 更精确地处理。


// 给定三个共线点 p, q, r，函数检查点 q 是否在线段 'pr' 上
function onSegment(p: Point, q: Point, r: Point): boolean {
  return (
    q.x <= Math.max(p.x, r.x) &&
    q.x >= Math.min(p.x, r.x) &&
    q.y <= Math.max(p.y, r.y) &&
    q.y >= Math.min(p.y, r.y)
  );
}

// 查找有序三元组 (p, q, r) 的方向。
// 函数返回以下值：
// 0 --> p, q, r 共线
// 1 --> 顺时针
// 2 --> 逆时针
function orientation(p: Point, q: Point, r: Point): number {
  const val = (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
  if (val === 0) return 0; 
  return val > 0 ? 1 : 2; 
}

// 主函数，如果线段 'p1q1' 和 'p2q2' 相交，则返回 true。
export function segmentsIntersect(p1: Point, q1: Point, p2: Point, q2: Point): boolean {
  const o1 = orientation(p1, q1, p2);
  const o2 = orientation(p1, q1, q2);
  const o3 = orientation(p2, q2, p1);
  const o4 = orientation(p2, q2, q1);

  if (o1 !== o2 && o3 !== o4) {
    return true;
  }

  // 特殊情况: 共线检查
  if (o1 === 0 && onSegment(p1, p2, q1)) return true;
  if (o2 === 0 && onSegment(p1, q2, q1)) return true;
  if (o3 === 0 && onSegment(p2, p1, q2)) return true;
  if (o4 === 0 && onSegment(p2, q1, q2)) return true;

  return false;
}
