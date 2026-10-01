/**
 * @file UserLayout.tsx
 * @description Ana kullanıcı arayüzü çerçevesi (Layout Shell).
 * Tam ekran katlanabilir ve yeniden boyutlandırılabilir Sidebar, merkez içerik ve AppearanceModal'ı birleştirir.
 * @design-token stitch_design_preview.html satır 95-307
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from '#components/layout/Sidebar';
import { AppearanceModal } from '#components/modal/AppearanceModal';
import { useResizable } from '#hooks/useResizable';

import type { ChatSession } from '#types/chat.types';

export interface UserLayoutProps {
  children: React.ReactNode;
  onNewChat: () => void;
  onToggleRAG: () => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
  sessions?: ChatSession[];
  activeSessionId?: string | null;
  onSelectSession?: (id: string) => void;
  onDeleteSession?: (id: string) => void;
}

export const UserLayout: React.FC<UserLayoutProps> = ({
  children,
  onNewChat,
  onToggleRAG,
  isSidebarCollapsed: controlledIsCollapsed,
  onToggleSidebar: controlledToggleSidebar,
  sessions = [],
  activeSessionId,
  onSelectSession,
  onDeleteSession,
}) => {
  const [internalIsCollapsed, setInternalIsCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('nexus_sidebar_collapsed') === 'true';
  });

  const isCollapsed = controlledIsCollapsed !== undefined ? controlledIsCollapsed : internalIsCollapsed;

  const [isAppearanceOpen, setIsAppearanceOpen] = useState(false);

  const toggleSidebar = useCallback(() => {
    if (controlledToggleSidebar) {
      controlledToggleSidebar();
    } else {
      setInternalIsCollapsed((prev) => {
        const next = !prev;
        localStorage.setItem('nexus_sidebar_collapsed', next ? 'true' : 'false');
        return next;
      });
    }
  }, [controlledToggleSidebar]);

  const {
    width: sidebarWidth,
    isDragging: isSidebarDragging,
    handleMouseDown: handleSidebarResize,
  } = useResizable({
    initialWidth: 288,
    minWidth: 200,
    maxWidth: 550,
    storageKey: 'nexus_sidebar_width',
    collapseThreshold: 130,
    onCollapse: (collapsed) => {
      if (controlledToggleSidebar) {
        if (collapsed !== isCollapsed) controlledToggleSidebar();
      } else {
        setInternalIsCollapsed(collapsed);
      }
      localStorage.setItem('nexus_sidebar_collapsed', collapsed ? 'true' : 'false');
    },
  });

  // Kısayol Tuşları (Ctrl+B sidebar aç/kapa, Cmd+N yeni sohbet)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleSidebar();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        onNewChat();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleSidebar, onNewChat]);

  return (
    <div className="h-screen w-screen overflow-hidden flex bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans antialiased selection:bg-brand-500 selection:text-white transition-colors duration-200">
      {/* Sol Sidebar (100% Yükseklik) */}
      <Sidebar
        isCollapsed={isCollapsed}
        onToggleCollapse={toggleSidebar}
        width={sidebarWidth}
        isDragging={isSidebarDragging}
        onResizerMouseDown={handleSidebarResize}
        onNewChat={onNewChat}
        onToggleRAG={onToggleRAG}
        onOpenAppearance={() => setIsAppearanceOpen(true)}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={onSelectSession}
        onDeleteSession={onDeleteSession}
      />

      {/* Merkez Çalışma Alanı */}
      <main
        className={`flex-1 min-w-0 flex flex-col h-full bg-white dark:bg-slate-950 overflow-hidden relative ${
          isSidebarDragging ? 'pointer-events-none select-none' : ''
        }`}
      >
        {children}
      </main>

      {/* Görünüm ve Renk Paleti Ayarları Modalı */}
      <AppearanceModal
        isOpen={isAppearanceOpen}
        onClose={() => setIsAppearanceOpen(false)}
      />
    </div>
  );
};
