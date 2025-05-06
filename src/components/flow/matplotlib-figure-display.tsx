// src/components/flow/matplotlib-figure-display.tsx
'use client';

import { ScrollArea } from '@/components/ui/scroll-area';
import Image from 'next/image';

interface MatplotlibFigureDisplayProps {
  imageDataUri: string;
}

export function MatplotlibFigureDisplay({ imageDataUri }: MatplotlibFigureDisplayProps) {
  if (!imageDataUri) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        无图像数据
      </div>
    );
  }

  return (
    <ScrollArea className="h-full w-full p-4 bg-background">
      <div className="flex items-center justify-center min-h-full">
        {/* 
          使用 next/image 可能需要配置远程模式或处理 Data URI 的方式。
          为了简单起见，并避免潜在的 Next.js 图像优化问题（对于动态生成的 data URI），
          我们直接使用 <img> 标签。
          如果需要 Next/Image 的优化，则需要进一步研究如何最好地处理 data URI。
        */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageDataUri}
          alt="Matplotlib Figure"
          className="max-w-full max-h-full object-contain rounded shadow-md"
          data-ai-hint="chart graph" // 添加 AI 提示
        />
      </div>
    </ScrollArea>
  );
}
