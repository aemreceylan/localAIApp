/**
 * @file App.tsx
 * @description NexusAI Gateway & Knowledge Base Kullanıcı Arayüzü Ana Orkestrasyonu.
 * AuthProvider, SetupSuperAdminView, LoginView ve UserLayout akışını yönetir.
 * Tüm sahte verilerden arındırılmış, sunucudan dinamik modeller ve oturumlar ile çalışan canlı mimari.
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { AuthProvider, useAuth } from '#hooks/useAuth';
import { SetupSuperAdminView } from '#components/auth/SetupSuperAdminView';
import { LoginView } from '#components/auth/LoginView';
import { UserLayout } from '#components/layout/UserLayout';
import { ChatHeader } from '#components/chat/ChatHeader';
import { ChatStream } from '#components/chat/ChatStream';
import { RAGDrawer } from '#components/drawer/RAGDrawer';
import { ShareModal } from '#components/modal/ShareModal';
import { useChatStream } from '#hooks/useChatStream';
import { useModels } from '#hooks/useModels';
import { useResizable } from '#hooks/useResizable';
import { getSessions, getSessionMessages, createSession, deleteSession } from '#services/chatService';
import { getPrompts } from '#services/promptService';
import type { ChatSession, PersonaPrompt } from '#types/chat.types';
import type { PromptDockSendMessageOptions } from '#components/chat/PromptDock';

// RAG çekmecesinin sohbet alanını sıkıştıracağı maksimum genişlik (bu eşikten sonra chat sabit kalır, çekmece overlay olarak taşar)
const RAG_SQUEEZE_THRESHOLD = 420;

function MainApp(): React.ReactElement {
  const { isAuthenticated, isLoading, isSetupRequired } = useAuth();

  const [isRAGOpen, setIsRAGOpen] = useState<boolean>(false);
  const [isRagEnabled, setIsRagEnabled] = useState<boolean>(true);
  const [selectedCitationId, setSelectedCitationId] = useState<string | number | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);

  // Oturum ve Persona Yönetimi (Canlı API)
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [personas, setPersonas] = useState<PersonaPrompt[]>([]);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>('');

  // Kenar Çubuğu Durumu
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('nexus_sidebar_collapsed') === 'true';
  });

  const toggleSidebar = useCallback(() => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('nexus_sidebar_collapsed', next ? 'true' : 'false');
      return next;
    });
  }, []);

  // Sunucudan Aktif Modelleri Çeken Kanca
  const {
    models: availableModels,
    selectedModel,
    setSelectedModel,
    isLoading: isModelsLoading,
  } = useModels();

  // Çift Aşamalı RAG Çekmecesi Genişliği (Sol kenardan çekilir)
  const { width: ragDrawerWidth, handleMouseDown: handleRAGResize } = useResizable({
    initialWidth: 380,
    minWidth: 260,
    maxWidth: 750,
    storageKey: 'nexus_inspector_width',
    direction: 'right-to-left',
  });

  // Çekmecenin overlay (sohbet üzerine taşma) eşiği: RAG_SQUEEZE_THRESHOLD üzeri overlay moduna geçer
  const isRAGOverlay = useMemo(() => ragDrawerWidth > RAG_SQUEEZE_THRESHOLD, [ragDrawerWidth]);

  // Chat Streaming Motoru (Temiz başlangıç: initialMessages = [])
  const {
    messages,
    setMessages,
    activeCitations,
    setActiveCitations,
    isStreaming,
    sendMessage,
    abort,
    clearMessages,
  } = useChatStream({
    conversationId: activeSessionId || undefined,
    defaultModel: selectedModel,
    initialMessages: [],
  });

  // Oturumları sunucudan yükle
  const loadSessions = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const data = await getSessions();
      setSessions(data || []);
    } catch (err) {
      console.warn('[App] Oturumlar yüklenirken uyarı:', err);
    }
  }, [isAuthenticated]);

  // Personaları sunucudan yükle
  const loadPersonas = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const data = await getPrompts('persona');
      setPersonas(data || []);
      const defaultPersona = data?.find((p) => p.is_default) || data?.[0];
      if (defaultPersona) {
        setSelectedPersonaId(defaultPersona._id);
      }
    } catch (err) {
      console.warn('[App] Personalar yüklenirken uyarı:', err);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      loadSessions();
      loadPersonas();
    }
  }, [isAuthenticated, loadSessions, loadPersonas]);

  // Oturum seçildiğinde mesaj geçmişini getir
  const handleSelectSession = useCallback(
    async (sessionId: string) => {
      setActiveSessionId(sessionId);
      try {
        const sessionMessages = await getSessionMessages(sessionId);
        setMessages(sessionMessages || []);
        // Son asistan mesajındaki alıntıları çekmeceye yükle
        const lastAsst = [...(sessionMessages || [])].reverse().find((m) => m.role === 'assistant');
        if (lastAsst?.citations) {
          setActiveCitations(lastAsst.citations);
        } else {
          setActiveCitations([]);
        }
        const targetSession = sessions.find((s) => s._id === sessionId);
        if (targetSession?.model) {
          setSelectedModel(targetSession.model);
        }
      } catch (err) {
        console.warn('[App] Oturum mesajları yüklenemedi:', err);
      }
    },
    [sessions, setSelectedModel, setMessages, setActiveCitations]
  );

  // Oturum silme işlemi
  const handleDeleteSession = useCallback(
    async (sessionId: string) => {
      try {
        await deleteSession(sessionId);
        setSessions((prev) => prev.filter((s) => s._id !== sessionId));
        if (activeSessionId === sessionId) {
          setActiveSessionId(null);
          clearMessages();
        }
      } catch (err) {
        console.error('[App] Oturum silinemedi:', err);
      }
    },
    [activeSessionId, clearMessages]
  );

  const handleOpenCitation = useCallback((citationId: string | number) => {
    setSelectedCitationId(citationId);
    setIsRAGOpen(true);

    setTimeout(() => {
      const card = document.getElementById(`citation-${citationId}`);
      card?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
  }, []);

  const handleNewChat = useCallback(() => {
    clearMessages();
    setActiveSessionId(null);
  }, [clearMessages]);

  const handleSendMessage = useCallback(
    async (content: string, options?: PromptDockSendMessageOptions) => {
      let currentSessionId = activeSessionId;
      const targetModel = selectedModel || availableModels[0]?.id || '';

      // Eğer henüz aktif bir oturum yoksa, ilk mesaj ile veritabanında oturum başlat
      if (!currentSessionId && targetModel) {
        try {
          const sessionTitle = content.length > 36 ? `${content.slice(0, 36)}...` : content;
          const newSession = await createSession({
            title: sessionTitle,
            model: targetModel,
            promptId: options?.promptId || selectedPersonaId || undefined,
          });
          currentSessionId = newSession._id;
          setActiveSessionId(newSession._id);
          setSessions((prev) => [newSession, ...prev]);
        } catch (err) {
          console.warn('[App] Yeni oturum kaydı oluşturulamadı:', err);
        }
      }

      sendMessage(content, {
        conversationId: currentSessionId || undefined,
        model: targetModel,
        promptId: options?.promptId || selectedPersonaId,
        enableRag: options?.enableRag ?? isRagEnabled,
        ragDocumentIds: options?.ragDocumentIds,
      });
    },
    [activeSessionId, selectedModel, availableModels, selectedPersonaId, sendMessage, isRagEnabled]
  );


  const activeSessionTitle = useMemo(() => {
    if (!activeSessionId) return 'Yeni Sohbet';
    const s = sessions.find((item) => item._id === activeSessionId);
    return s?.title || 'Yeni Sohbet';
  }, [activeSessionId, sessions]);

  // 1. Yükleme Ekranı (Oturum durumu kontrol edilirken)
  if (isLoading) {
    return (
      <div className="min-h-screen w-screen flex flex-col items-center justify-center bg-[var(--bg-main)] text-[var(--text-main)] transition-colors duration-200">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[var(--accent-primary)] to-[var(--accent-hover)] flex items-center justify-center text-white font-bold shadow-md shadow-[var(--accent-primary)]/20 animate-pulse mb-4">
          NX
        </div>
        <div className="flex items-center gap-2.5 text-xs text-[var(--text-muted)] font-medium">
          <svg className="animate-spin h-4 w-4 text-[var(--accent-primary)]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>NexusAI Başlatılıyor...</span>
        </div>
      </div>
    );
  }

  // 2. İlk Kurulum Ekranı (Sistemde henüz Super Admin yoksa)
  if (isSetupRequired) {
    return <SetupSuperAdminView />;
  }

  // 3. Giriş Ekranı (Kullanıcı henüz oturum açmamışsa)
  if (!isAuthenticated) {
    return <LoginView />;
  }

  // 4. Ana Uygulama Arayüzü (Oturum açılmış durum)
  return (
    <UserLayout
      onNewChat={handleNewChat}
      onToggleRAG={() => setIsRAGOpen((prev) => !prev)}
      isSidebarCollapsed={isSidebarCollapsed}
      onToggleSidebar={toggleSidebar}
      sessions={sessions}
      activeSessionId={activeSessionId}
      onSelectSession={handleSelectSession}
      onDeleteSession={handleDeleteSession}
    >
      <div className="flex flex-1 h-full min-h-0 overflow-hidden relative">
        {/* Merkez Chat Bölümü */}
        <div className="flex-1 flex flex-col h-full min-h-0 min-w-0 overflow-hidden bg-white dark:bg-slate-950">
          <ChatHeader
            isSidebarCollapsed={isSidebarCollapsed}
            onExpandSidebar={toggleSidebar}
            selectedModel={selectedModel}
            onSelectModel={setSelectedModel}
            availableModels={availableModels}
            isModelsLoading={isModelsLoading}
            sessionTitle={activeSessionTitle}
            connectedKnowledgeBase={null}
            onShareChat={() => setIsShareModalOpen(true)}
            isRAGOpen={isRAGOpen}
            onToggleRAG={() => setIsRAGOpen((prev) => !prev)}
            ragCount={activeCitations.length}
          />

          <ChatStream
            messages={messages}
            isStreaming={isStreaming}
            onSendMessage={handleSendMessage}
            onStopStreaming={abort}
            onOpenCitation={handleOpenCitation}
            personas={personas}
            selectedPersonaId={selectedPersonaId}
            onSelectPersona={setSelectedPersonaId}
            enableRag={isRagEnabled}
            onToggleRag={() => setIsRagEnabled((prev) => !prev)}
          />
        </div>

        {/* RAG Flex Sıkıştırma Tutucusu (Chat alanının daralmasını sağlayan ve eşikte sabitleyen görünmez blok) */}
        {isRAGOpen && (
          <div
            style={{ width: Math.min(ragDrawerWidth, RAG_SQUEEZE_THRESHOLD) }}
            className="shrink-0 h-full pointer-events-none"
            aria-hidden="true"
          />
        )}

        {/* Sağ RAG Referans Çekmecesi */}
        <RAGDrawer
          isOpen={isRAGOpen}
          onClose={() => setIsRAGOpen(false)}
          width={ragDrawerWidth}
          onResizerMouseDown={handleRAGResize}
          citations={activeCitations}
          selectedCitationId={selectedCitationId}
          isOverlay={isRAGOverlay}
        />

      </div>

      {/* Paylaşım Modalı */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
      />
    </UserLayout>
  );
}

export default function App(): React.ReactElement {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
