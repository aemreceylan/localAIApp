/**
 * @file ModelsPage.tsx
 * @description Admin Paneli Model Yönetimi, SSE İndirme ve Varsayılan Model Seçim Ekranı.
 */

import { useState, type FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Cpu,
  Download,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import { modelService } from '#services/modelService.js';
import { Button } from '#components/ui/Button.js';
import { Badge } from '#components/ui/Badge.js';
import { Modal } from '#components/ui/Modal.js';
import { Input } from '#components/ui/Input.js';
import { Progress } from '#components/ui/Progress.js';
import { Table, type Column } from '#components/ui/Table.js';
import type { AiModel, ModelPullProgress } from '#types/model.js';

export function ModelsPage() {
  const queryClient = useQueryClient();

  const [pullModalOpen, setPullModalOpen] = useState(false);
  const [modelToPull, setModelToPull] = useState('');
  const [isPulling, setIsPulling] = useState(false);
  const [pullProgress, setPullProgress] = useState<ModelPullProgress | null>(null);
  const [pullError, setPullError] = useState<string | null>(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [modelToDelete, setModelToDelete] = useState<AiModel | null>(null);

  // Model listesini sorgula
  const { data, isLoading } = useQuery<{ models: AiModel[]; defaultModel: string | null }>({
    queryKey: ['models'],
    queryFn: () => modelService.listModels(),
  });

  // Varsayılan model belirleme mutation
  const setDefaultMutation = useMutation({
    mutationFn: (modelId: string) => modelService.setDefaultModel(modelId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['models'] });
    },
  });

  // Model silme mutation
  const deleteMutation = useMutation({
    mutationFn: (modelName: string) => modelService.deleteModel(modelName),
    onSuccess: () => {
      setDeleteModalOpen(false);
      setModelToDelete(null);
      void queryClient.invalidateQueries({ queryKey: ['models'] });
    },
  });

  // Model İndirme (SSE)
  const handleStartPull = async (e: FormEvent) => {
    e.preventDefault();
    if (!modelToPull.trim() || isPulling) return;

    setIsPulling(true);
    setPullError(null);
    setPullProgress({ status: 'Bağlantı kuruluyor...', percent: 0 });

    try {
      await modelService.pullModel(modelToPull.trim(), (progress) => {
        setPullProgress(progress);
        if (progress.error) {
          setPullError(progress.error);
        }
      });

      // Başarılı indirme sonrası
      setIsPulling(false);
      void queryClient.invalidateQueries({ queryKey: ['models'] });
      setTimeout(() => {
        setPullModalOpen(false);
        setModelToPull('');
        setPullProgress(null);
      }, 1500);
    } catch (err: any) {
      setIsPulling(false);
      setPullError(err?.message || 'Model indirilirken beklenmedik bir hata oluştu.');
    }
  };

  const columns: Column<AiModel>[] = [
    {
      key: 'name',
      header: 'Model / Kimlik',
      render: (m) => (
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <div className="font-mono text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <span>{m.name}</span>
              {m.isDefault && (
                <Badge size="sm" variant="success" dot>
                  Varsayılan
                </Badge>
              )}
            </div>
            {m.description && (
              <p className="text-[11px] text-slate-400">{m.description}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'provider',
      header: 'Sağlayıcı',
      width: '120px',
      render: (m) => (
        <Badge size="sm" variant="info">
          {m.provider}
        </Badge>
      ),
    },
    {
      key: 'type',
      header: 'Dağıtım Türü',
      width: '120px',
      render: (m) => (
        <Badge size="sm" variant={m.isLocal ? 'neutral' : 'warning'}>
          {m.isLocal ? 'Yerel (On-Prem)' : 'Bulut'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'İşlemler',
      align: 'right',
      width: '200px',
      render: (m) => (
        <div className="flex items-center justify-end gap-1.5">
          {!m.isDefault && (
            <Button
              variant="outline"
              size="sm"
              isLoading={setDefaultMutation.isPending && setDefaultMutation.variables === m.id}
              onClick={() => void setDefaultMutation.mutate(m.id)}
            >
              Varsayılan Yap
            </Button>
          )}

          {m.isLocal && (
            <Button
              variant="ghost"
              size="sm"
              className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
              onClick={() => {
                setModelToDelete(m);
                setDeleteModalOpen(true);
              }}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Başlık ve İndir Butonu */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            LLM Model Yönetimi
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Yerel ve bulut yapay zeka modelleri, disk yönetimi ve varsayılan model belirleme.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          leftIcon={<Download className="w-4 h-4" />}
          onClick={() => {
            setPullProgress(null);
            setPullError(null);
            setPullModalOpen(true);
          }}
        >
          Model İndir (Ollama Pull)
        </Button>
      </div>

      {/* Model Listesi */}
      <Table
        columns={columns}
        data={data?.models || []}
        keyExtractor={(m) => m.id}
        isLoading={isLoading}
        emptyMessage="Sistemde henüz kurulu model bulunmuyor. 'Model İndir' butonuyla yerel bir model yükleyebilirsiniz."
      />

      {/* Model İndirme Modalı (SSE Progress) */}
      <Modal
        isOpen={pullModalOpen}
        onClose={() => {
          if (!isPulling) setPullModalOpen(false);
        }}
        title="Yerel Model İndir (Ollama Engine)"
        subtitle="Açık kaynak modeli doğrudan sunucunuzun diskine indirip servise alır."
        size="md"
        closeOnBackdrop={!isPulling}
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              disabled={isPulling}
              onClick={() => setPullModalOpen(false)}
            >
              Kapat
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={isPulling}
              onClick={handleStartPull}
            >
              İndirmeyi Başlat
            </Button>
          </>
        }
      >
        <form onSubmit={handleStartPull} className="space-y-4">
          <Input
            label="Model Adı / Etiketi"
            placeholder="Örn: llama3.2:3b, qwen2.5:7b, mistral:7b"
            value={modelToPull}
            onChange={(e) => setModelToPull(e.target.value)}
            disabled={isPulling}
            helperText="Ollama kütüphanesindeki resmi model adı ve tag'ini giriniz."
            autoFocus
          />

          {/* İlerleme ve Durum */}
          {pullProgress && (
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {pullProgress.status}
                </span>
                {pullProgress.percent !== undefined && (
                  <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    %{pullProgress.percent}
                  </span>
                )}
              </div>

              {pullProgress.percent !== undefined && (
                <Progress
                  value={pullProgress.percent}
                  showPercent={false}
                  animated={isPulling}
                />
              )}

              {pullProgress.digest && (
                <p className="text-[10px] font-mono text-slate-400 truncate">
                  Digest: {pullProgress.digest}
                </p>
              )}
            </div>
          )}

          {pullError && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-600 dark:text-rose-400 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{pullError}</span>
            </div>
          )}
        </form>
      </Modal>

      {/* Model Silme Onay Modalı */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Modeli Sil"
        size="sm"
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteModalOpen(false)}
            >
              Vazgeç
            </Button>
            <Button
              variant="danger"
              size="sm"
              isLoading={deleteMutation.isPending}
              onClick={() => {
                if (modelToDelete) {
                  void deleteMutation.mutate(modelToDelete.name);
                }
              }}
            >
              Evet, Sil
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600 dark:text-slate-400">
          <strong className="text-slate-900 dark:text-slate-100 font-mono">
            {modelToDelete?.name}
          </strong>{' '}
          isimli yerel model diskten kalıcı olarak silinecektir. Devam etmek istiyor musunuz?
        </p>
      </Modal>
    </div>
  );
}
