import { AppLayout } from '@/components/flow/app-layout';
// FlowCanvas 不再直接在此处渲染
// import { FlowCanvas } from '@/components/flow/flow-canvas';

export default function Home() {
  return (
    // AppLayout 不再接受 flowCanvas prop
    <AppLayout />
  );
}
