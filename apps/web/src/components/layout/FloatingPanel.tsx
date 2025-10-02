import { PropsWithChildren, useCallback, useMemo, useRef } from 'react';

import { useWorkspaceLayoutStore } from '../../state/workspaceLayout';

import { useWorkspaceLayoutStore } from '../../state/workspaceLayout';

interface FloatingPanelProps {
  panelId: 'library' | 'agents' | 'models';
  footer?: React.ReactNode;
  headerContent?: React.ReactNode;
  resizable?: boolean;
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const FloatingPanel = ({
  panelId,
  children,
  footer,
  headerContent,
  resizable = false,
}: PropsWithChildren<FloatingPanelProps>): JSX.Element | null => {
  const panelState = useWorkspaceLayoutStore((state) => state.panels[panelId]);
  const updatePanel = useWorkspaceLayoutStore((state) => state.updatePanel);
  const chatDockMode = useWorkspaceLayoutStore((state) => state.chatDockMode);
  const setChatDockMode = useWorkspaceLayoutStore((state) => state.setChatDockMode);

  const dragDataRef = useRef<{
    pointerId: number;
    originX: number;
    originY: number;
    startX: number;
    startY: number;
  }>();
  const sizeDataRef = useRef<{
    pointerId: number;
    startWidth: number;
    startHeight: number;
    originX: number;
    originY: number;
  }>();

  const snapToHorizontalRef = useRef(false);

  const handleHeaderPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      const bounds = event.currentTarget.parentElement?.getBoundingClientRect();
      dragDataRef.current = {
        pointerId: event.pointerId,
        originX: event.clientX,
        originY: event.clientY,
        startX: panelState.x,
        startY: panelState.y,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
      const onPointerMove = (moveEvent: PointerEvent) => {
        if (!dragDataRef.current || dragDataRef.current.pointerId !== moveEvent.pointerId) {
          return;
        }
        const deltaX = moveEvent.clientX - dragDataRef.current.originX;
        const deltaY = moveEvent.clientY - dragDataRef.current.originY;
        let nextX = dragDataRef.current.startX + deltaX;
        let nextY = dragDataRef.current.startY + deltaY;
        const threshold = 20;
        const updatePayload: Partial<FloatingPanelState> = { x: nextX, y: nextY };

        if (panelId === 'chat' && chatDockMode === 'vertical') {
          let snappedSide = false;
          if (nextX < threshold) {
            updatePayload.x = 0;
            snappedSide = true;
          } else if (nextX > window.innerWidth - panelState.width - threshold) {
            updatePayload.x = window.innerWidth - panelState.width;
            snappedSide = true;
          }
          if (snappedSide) {
            updatePayload.y = 64;
            updatePayload.height = window.innerHeight - 124;
          }
        }

        if (panelId === 'chat' && (nextY < threshold || nextY > window.innerHeight - panelState.height - threshold)) {
          snapToHorizontalRef.current = true;
        }

        const maxX = window.innerWidth - (bounds?.width ?? panelState.width) - 16;
        const maxY = window.innerHeight - 64;
        updatePanel(panelId, {
          x: clamp(updatePayload.x ?? nextX, 16, Math.max(maxX, 16)),
          y: clamp(updatePayload.y ?? nextY, 64, Math.max(maxY, 64)),
          ...(updatePayload.height && { height: updatePayload.height }),
        });
      };
      const onPointerUp = (upEvent: PointerEvent) => {
        if (dragDataRef.current?.pointerId === upEvent.pointerId) {
          dragDataRef.current = undefined;
          event.currentTarget.releasePointerCapture(upEvent.pointerId);
          window.removeEventListener('pointermove', onPointerMove);
          window.removeEventListener('pointerup', onPointerUp);

          if (snapToHorizontalRef.current && panelId === 'chat') {
            setChatDockMode('horizontal');
            snapToHorizontalRef.current = false;
          }
        }
      };
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
    },
    [panelId, panelState.width, panelState.x, panelState.y, updatePanel]
  );

  const handleResizePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!resizable) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      sizeDataRef.current = {
        pointerId: event.pointerId,
        startWidth: panelState.width,
        startHeight: panelState.height,
        originX: event.clientX,
        originY: event.clientY,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
      const onPointerMove = (moveEvent: PointerEvent) => {
        if (!sizeDataRef.current || sizeDataRef.current.pointerId !== moveEvent.pointerId) {
          return;
        }
        const deltaX = moveEvent.clientX - sizeDataRef.current.originX;
        const deltaY = moveEvent.clientY - sizeDataRef.current.originY;
        let newWidth = Math.max(240, sizeDataRef.current.startWidth + deltaX);
        let newHeight = Math.max(240, sizeDataRef.current.startHeight + deltaY);
        if (panelId === 'chat' && chatDockMode === 'vertical') {
          newWidth = Math.min(400, newWidth);
          newHeight = Math.min(window.innerHeight - 124, Math.max(200, newHeight));
        }
        updatePanel(panelId, {
          width: newWidth,
          height: newHeight,
        });
      };
      const onPointerUp = (upEvent: PointerEvent) => {
        if (sizeDataRef.current?.pointerId === upEvent.pointerId) {
          sizeDataRef.current = undefined;
          event.currentTarget.releasePointerCapture(upEvent.pointerId);
          window.removeEventListener('pointermove', onPointerMove);
          window.removeEventListener('pointerup', onPointerUp);
        }
      };
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
    },
    [panelId, panelState.height, panelState.width, resizable, updatePanel]
  );

  const style = useMemo<React.CSSProperties>(
    () => ({
      transform: `translate(${panelState.x}px, ${panelState.y}px)`,
      width: panelState.width,
      height: panelState.height,
    }),
    [panelState.height, panelState.width, panelState.x, panelState.y]
  );

  if (!panelState.visible) {
    return null;
  }

  return (
    <section className="floating-panel" style={style} aria-label={panelState.title}>
      <div
        className="floating-panel__header"
        role="toolbar"
        onPointerDown={handleHeaderPointerDown}
      >
        <h2>{panelState.title}</h2>
        {headerContent}
      </div>
      <div className="floating-panel__body">{children}</div>
      {footer ? <div className="floating-panel__footer">{footer}</div> : null}
      {resizable ? (
        <div
          className="floating-panel__resize-handle"
          onPointerDown={handleResizePointerDown}
          aria-label="Resize panel"
        />
      ) : null}
    </section>
  );
};

export default FloatingPanel;
