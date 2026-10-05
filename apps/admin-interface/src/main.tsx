/**
 * @file main.tsx
 * @description React 19 Giriş Noktası ve TanStack Query / Router Sağlayıcıları.
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from '#/App.js';
import '#/index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 10000,
    },
  },
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Kök HTML elementi (#root) bulunamadı.');
}

createRoot(rootElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
