// src/lib/layout-constants.ts

/**
 * 高度：节点头部的标准高度。
 */
export const NODE_HEADER_HEIGHT = 40; // px

/**
 * 高度：每个端口行在节点内占用的高度。
 */
export const PORT_ROW_HEIGHT = 20; // px, Corresponds to h-5 in Tailwind (1.25rem = 20px)

/**
 * 间隙：同一列中各个端口之间的垂直间隙。
 */
export const PORT_GAP = 6; // px

/**
 * 内边距：节点内容区域（CardContent）的垂直内边距（顶部和底部各一半）。
 * 例如，如果 CardContent 的 p-3 (12px)，则此值为 12。
 * 此处特指在端口Y坐标计算时，从节点头部下方到第一个端口开始处的内边距。
 */
export const CARD_CONTENT_PADDING_TOP = 12; // px, from p-3 on CardContent
export const CARD_CONTENT_PADDING_BOTTOM = 12; // px, from p-3 on CardContent


/**
 * 内边距：端口区域容器（如果明确存在这样一个容器并有自己的内边距）的垂直内边距。
 * 在当前实现中，端口直接位于 CardContent 内部，因此大部分内边距由 CARD_CONTENT_PADDING_TOP/BOTTOM 处理。
 * 这个常量（如果非零）将表示在 CardContent 的内边距 *之内*，端口块周围的额外内边距。
 * 当前 `flow-canvas.tsx` 中有一个 `+ (node.inputs.length > 0 || node.outputs.length > 0 ? 8 : 0)` 的计算，
 * 这可以解释为端口区域的总垂直内边距 (顶部+底部)。
 * 这里我们定义为总的内边距，如果只取顶部，则除以2。
 */
export const PORTS_AREA_TOTAL_VERTICAL_PADDING = 8; // px; implies 4px top, 4px bottom around the ports block itself inside CardContent
