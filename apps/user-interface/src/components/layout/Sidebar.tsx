/**
 * @file Sidebar.tsx
 * @description Sol katlanabilir ve fareyle sürüklenebilir kenar çubuğu (Sidebar).
 * Genişletilmiş (288px) ve İnce Çubuk (68px Mini Rail) modlarını destekler.
 * @design-token stitch_design_preview.html satır 143-306
 */

import React, { useState, useMemo } from 'react';
import { Tooltip } from '#components/ui/Tooltip';
import { useAuth } from '#hooks/useAuth';
import type { ChatSession } from '#types/chat.types';

export interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  width: number;
  isDragging?: boolean;
  onResizerMouseDown: (e: React.MouseEvent) => void;
  onNewChat: () => void;
  onToggleRAG: () => void;
  onOpenAppearance: () => void;
  sessions?: ChatSession[];
  activeSessionId?: string | null;
  onSelectSession?: (id: string) => void;
  onDeleteSession?: (id: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  onToggleCollapse,
  width,
  isDragging = false,
  onResizerMouseDown,
  onNewChat,
  onToggleRAG,
  onOpenAppearance,
  sessions = [],
  activeSessionId,
  onSelectSession,
  onDeleteSession,
}) => {
  const { user, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSessions = useMemo(() => {
    if (!searchQuery.trim()) return sessions;
    const q = searchQuery.toLowerCase();
    return sessions.filter((s) => s.title.toLowerCase().includes(q) || s.model.toLowerCase().includes(q));
  }, [sessions, searchQuery]);
  return (
    <>
      <aside
        id="chatSidebar"
        className={`bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between shrink-0 overflow-hidden relative select-none ${
          isDragging ? 'transition-none' : 'transition-[width] duration-200'
        }`}
        style={{ width: isCollapsed ? 68 : width, minWidth: 68 }}
      >
        {/* ================================================================= */}
        {/* 1. GENİŞLETİLMİŞ İÇERİK (EXPANDED SIDEBAR)                        */}
        {/* ================================================================= */}
        {!isCollapsed && (
          <div id="sidebarExpandedContent" className="flex flex-col justify-between h-full w-full overflow-hidden">
            <div className="p-3 flex flex-col gap-2.5 flex-1 min-h-0 overflow-hidden">
              {/* Logo, Proje İsmi ve Daralt Butonu */}
              <div className="flex items-center justify-between px-1 py-1 shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-brand-600 text-white flex items-center justify-center font-bold text-xs shadow-sm shadow-brand-500/30 shrink-0 select-none">
                    NX
                  </div>
                  <div className="min-w-0 leading-tight">
                    <h1 className="text-xs font-bold text-slate-900 dark:text-white tracking-tight truncate">
                      NexusAI Gateway
                    </h1>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                      Knowledge Base
                    </p>
                  </div>
                </div>

                <Tooltip content="Kenar Çubuğunu Daralt (Ctrl+B)">
                  <button
                    type="button"
                    onClick={onToggleCollapse}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
                    aria-label="Menüyü Daralt"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                    </svg>
                  </button>
                </Tooltip>
              </div>

              {/* Yeni Sohbet Butonu */}
              <div className="shrink-0 pt-0.5">
                <button
                  type="button"
                  onClick={onNewChat}
                  className="w-full flex items-center justify-between px-3 py-2 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white rounded-lg text-xs font-semibold shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                    Yeni Sohbet
                  </span>
                  <span className="text-[10px] bg-brand-700 px-1.5 py-0.5 rounded font-mono">⌘N</span>
                </button>
              </div>

              {/* RAG Kaynak Denetçisi Butonu */}
              <button
                type="button"
                onClick={onToggleRAG}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-brand-50 hover:bg-brand-100/80 dark:bg-brand-900/30 dark:hover:bg-brand-900/50 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800 text-xs font-semibold transition-all shrink-0"
              >
                <span className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded bg-brand-600 text-white flex items-center justify-center font-bold text-[11px] shadow-sm">
                    §
                  </span>
                  <span>RAG Kaynakları</span>
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-brand-200 dark:bg-brand-800 text-brand-800 dark:text-brand-200 font-mono font-medium">
                  2 Aktif
                </span>
              </button>

              {/* Arama Kutusu */}
              <div className="relative shrink-0">
                <svg className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Sohbet geçmişinde ara..."
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500 text-slate-800 dark:text-slate-100"
                />
              </div>

              {/* Sohbet Geçmişi Listesi */}
              <div className="overflow-y-auto flex-1 pr-1 min-h-0 pt-1">
                {filteredSessions.length === 0 ? (
                  <div className="text-center py-8 px-2 text-slate-400 dark:text-slate-500 flex flex-col items-center">
                    <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center mb-2 text-slate-400 dark:text-slate-500">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="1.5"
                          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                        />
                      </svg>
                    </div>
                    <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                      {searchQuery ? 'Sonuç Bulunamadı' : 'Sohbet Geçmişi Yok'}
                    </p>
                    <p className="text-[11px] mt-0.5 text-slate-400 max-w-[170px] leading-tight">
                      {searchQuery ? 'Farklı bir arama terimi deneyin.' : 'Yeni sohbet başlatarak soru sorabilirsiniz.'}
                    </p>
                  </div>
                ) : (
                  <div>
                    <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-2 mb-1.5 flex items-center justify-between">
                      <span>Sohbetler ({filteredSessions.length})</span>
                    </div>
                    <div className="space-y-1">
                      {filteredSessions.map((session) => {
                        const isActive = activeSessionId === session._id;
                        return (
                          <div
                            key={session._id}
                            className={`group w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium text-left transition-colors cursor-pointer ${
                              isActive
                                ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 border border-brand-200/60 dark:border-brand-800/60'
                                : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                            }`}
                            onClick={() => onSelectSession?.(session._id)}
                          >
                            <span className="truncate flex items-center gap-2 min-w-0 flex-1">
                              <span
                                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                  isActive ? 'bg-brand-600' : 'bg-slate-400'
                                }`}
                              ></span>
                              <span className="truncate">{session.title || 'Başlıksız Sohbet'}</span>
                            </span>

                            <div className="flex items-center gap-1 shrink-0 ml-1.5">
                              {session.model && (
                                <span className="text-[9px] px-1 py-0.2 rounded bg-slate-200/80 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-mono">
                                  {session.model.split(':')[0]}
                                </span>
                              )}
                              {onDeleteSession && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteSession(session._id);
                                  }}
                                  className="opacity-0 group-hover:opacity-100 p-1 hover:text-rose-600 rounded transition-opacity"
                                  title="Sohbeti Sil"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Kullanıcı Profili ve Görünüm Ayarları */}
            <div className="p-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 min-w-0 flex-1 mr-1">
                <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900/50 text-brand-700 dark:text-brand-300 font-bold text-xs flex items-center justify-center shrink-0">
                  {user ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase() : 'U'}
                </div>
                <div className="leading-tight min-w-0 flex-1">
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {user ? `${user.firstName} ${user.lastName}` : 'Kurumsal Kullanıcı'}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate flex items-center gap-1">
                    <span>
                      {user?.role === 'superadmin'
                        ? 'Super Admin'
                        : user?.role === 'tenant_admin'
                        ? 'Kurum Yöneticisi'
                        : 'Kullanıcı'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-0.5 shrink-0">
                <Tooltip content="Görünüm Ayarları">
                  <button
                    type="button"
                    onClick={onOpenAppearance}
                    className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    aria-label="Görünüm Ayarları"
                  >
                    <svg className="w-4 h-4 text-brand-600 dark:text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                      />
                    </svg>
                  </button>
                </Tooltip>

                <Tooltip content="Oturumu Kapat (Çıkış)">
                  <button
                    type="button"
                    onClick={() => void logout()}
                    className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                    aria-label="Çıkış Yap"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                      />
                    </svg>
                  </button>
                </Tooltip>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* 2. İNCE ÇUBUK / DARALTILMIŞ MOD (MINI SLIM RAIL - 68px)            */}
        {/* ================================================================= */}
        {isCollapsed && (
          <div id="sidebarMiniContent" className="flex flex-col items-center justify-between h-full w-full py-3 px-1.5 overflow-hidden">
            <div className="flex flex-col items-center gap-2.5 w-full">
              {/* Logo / Genişletme Butonu (Kapalıyken Sadece Logo) */}
              <Tooltip content="NexusAI Gateway (Genişlet - Ctrl+B)" position="right">
                <button
                  type="button"
                  onClick={onToggleCollapse}
                  className="w-10 h-10 rounded-xl bg-brand-600 hover:bg-brand-700 text-white flex items-center justify-center font-bold text-sm shadow-sm shadow-brand-500/30 hover:scale-105 transition-all shrink-0 cursor-pointer select-none"
                  aria-label="Kenar Çubuğunu Genişlet"
                >
                  NX
                </button>
              </Tooltip>

              {/* Yeni Sohbet İkon Butonu */}
              <Tooltip content="Yeni Sohbet (⌘N)" position="right">
                <button
                  type="button"
                  onClick={onNewChat}
                  className="w-10 h-10 rounded-xl bg-brand-600 hover:bg-brand-700 text-white flex items-center justify-center shadow-sm shadow-brand-500/30 transition-all shrink-0"
                  aria-label="Yeni Sohbet"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </Tooltip>

              {/* RAG Kaynakları İkon Butonu */}
              <Tooltip content="RAG Kaynak Denetçisi (2 Kaynak)" position="right">
                <button
                  type="button"
                  onClick={onToggleRAG}
                  className="w-10 h-10 rounded-xl bg-brand-50 hover:bg-brand-100 dark:bg-brand-900/40 dark:hover:bg-brand-900/60 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800 flex items-center justify-center transition-all relative shrink-0"
                  aria-label="RAG Kaynakları"
                >
                  <span className="font-bold text-sm">§</span>
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-brand-600 text-white text-[9px] font-bold flex items-center justify-center">
                    2
                  </span>
                </button>
              </Tooltip>

              {/* İnce Ayırıcı */}
              <div className="w-6 h-px bg-slate-200 dark:bg-slate-800 my-1"></div>

              {/* Son sohbet kısayolları */}
              {sessions.slice(0, 3).map((s) => (
                <Tooltip key={s._id} content={s.title || 'Sohbet'} position="right">
                  <button
                    type="button"
                    onClick={() => onSelectSession?.(s._id)}
                    className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors shrink-0 ${
                      activeSessionId === s._id
                        ? 'bg-brand-50 dark:bg-brand-900/40 text-brand-600 dark:text-brand-300 border border-brand-300 dark:border-brand-700'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </button>
                </Tooltip>
              ))}
            </div>

            {/* Alt Kısım: Ayarlar ve Çıkış */}
            <div className="flex flex-col items-center gap-2 w-full pt-2 border-t border-slate-100 dark:border-slate-800 shrink-0">
              <Tooltip content="Görünüm Ayarları" position="right">
                <button
                  type="button"
                  onClick={onOpenAppearance}
                  className="w-9 h-9 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 flex items-center justify-center transition-colors"
                  aria-label="Görünüm Ayarları"
                >
                  <svg className="w-4 h-4 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                    />
                  </svg>
                </button>
              </Tooltip>

              <Tooltip content="Oturumu Kapat (Çıkış)" position="right">
                <button
                  type="button"
                  onClick={() => void logout()}
                  className="w-9 h-9 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 flex items-center justify-center transition-colors"
                  aria-label="Çıkış Yap"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                </button>
              </Tooltip>
            </div>
          </div>
        )}
      </aside>

      {/* SÜRÜKLENEBİLİR YENİDEN BOYUTLANDIRMA TUTAMACI (RESIZER) */}
      {!isCollapsed && (
        <div
          id="sidebarResizer"
          onMouseDown={onResizerMouseDown}
          className={`w-2 cursor-col-resize select-none shrink-0 z-30 flex items-center justify-center relative transition-colors -ml-1 group ${
            isDragging ? 'bg-brand-500/30' : 'hover:bg-brand-500/20 active:bg-brand-500/40'
          }`}
          title="Sürükleyerek sol menü genişliğini ayarlayın"
        >
          <div
            className={`w-0.5 rounded-full transition-all ${
              isDragging ? 'bg-brand-600 h-16 shadow-sm' : 'bg-slate-300 dark:bg-slate-700 h-7 group-hover:bg-brand-500 group-hover:h-12'
            }`}
          ></div>
        </div>
      )}
    </>
  );
};
