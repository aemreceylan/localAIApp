/**
 * @file OnboardingPage.tsx
 * @description Admin Paneli Onay Bekleyen Personel Başvuruları Yönetim Ekranı.
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, X } from 'lucide-react';
import { authService } from '#services/authService.js';
import { Table, type Column } from '#components/ui/Table.js';
import { Button } from '#components/ui/Button.js';
import { Badge } from '#components/ui/Badge.js';
import { Modal } from '#components/ui/Modal.js';
import { Input } from '#components/ui/Input.js';
import type { User } from '#types/auth.js';

export function OnboardingPage() {
  const queryClient = useQueryClient();

  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const [rolesInput, setRolesInput] = useState('default_user');
  const [rejectReason, setRejectReason] = useState('');

  // Bekleyen personelleri sorgula
  const { data: pendingUsers = [], isLoading } = useQuery<User[]>({
    queryKey: ['users', 'pending'],
    queryFn: () => authService.getPendingUsers(),
  });

  // Onaylama Mutation
  const approveMutation = useMutation({
    mutationFn: ({ id, roles }: { id: string; roles?: string[] }) =>
      authService.approveUser(id, roles),
    onSuccess: () => {
      setApproveModalOpen(false);
      setSelectedUser(null);
      void queryClient.invalidateQueries({ queryKey: ['users'] });
      void queryClient.invalidateQueries({ queryKey: ['users', 'pending'] });
    },
  });

  // Reddetme Mutation
  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      authService.rejectUser(id, reason),
    onSuccess: () => {
      setRejectModalOpen(false);
      setSelectedUser(null);
      void queryClient.invalidateQueries({ queryKey: ['users', 'pending'] });
    },
  });

  const columns: Column<User>[] = [
    {
      key: 'name',
      header: 'Başvuran Personel',
      render: (u) => (
        <div>
          <div className="font-semibold text-slate-900 dark:text-slate-100">
            {u.firstName} {u.lastName}
          </div>
          <div className="text-xs text-slate-400 font-mono">{u.email}</div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Başvuru Durumu',
      render: () => (
        <Badge size="sm" variant="warning" dot>
          Onay Bekliyor
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Onay Aksiyonu',
      align: 'right',
      render: (u) => (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-rose-600 border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-950/40"
            leftIcon={<X className="w-3.5 h-3.5" />}
            onClick={() => {
              setSelectedUser(u);
              setRejectReason('');
              setRejectModalOpen(true);
            }}
          >
            Reddet
          </Button>

          <Button
            variant="primary"
            size="sm"
            leftIcon={<Check className="w-3.5 h-3.5" />}
            onClick={() => {
              setSelectedUser(u);
              setRolesInput('default_user');
              setApproveModalOpen(true);
            }}
          >
            Onayla
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
          Kayıt Onay Havuzu
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Açık kayıt formundan başvuran personelleri inceleyin, rolleri atayarak hesabı aktifleştirin veya reddedin.
        </p>
      </div>

      <Table
        columns={columns}
        data={pendingUsers}
        keyExtractor={(u) => u.id}
        isLoading={isLoading}
        emptyMessage="Şu anda onay bekleyen yeni personel başvurusu bulunmuyor."
      />

      {/* Onaylama Modalı */}
      <Modal
        isOpen={approveModalOpen}
        onClose={() => setApproveModalOpen(false)}
        title="Personel Başvurusunu Onayla"
        subtitle="Kullanıcıya atanacak rolleri belirleyerek hesabı anında etkinleştirin."
        size="sm"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setApproveModalOpen(false)}>
              Vazgeç
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={approveMutation.isPending}
              onClick={() => {
                if (selectedUser) {
                  const roles = rolesInput
                    .split(',')
                    .map((r) => r.trim())
                    .filter(Boolean);
                  void approveMutation.mutate({ id: selectedUser.id, roles });
                }
              }}
            >
              Onayla & Aktif Et
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-xs text-slate-600 dark:text-slate-400">
            <strong>{selectedUser?.email}</strong> personeline tanımlanacak fonksiyonel rolleri giriniz:
          </p>
          <Input
            label="Roller (Virgülle Ayrılmış)"
            placeholder="default_user, developer"
            value={rolesInput}
            onChange={(e) => setRolesInput(e.target.value)}
          />
        </div>
      </Modal>

      {/* Reddetme Modalı */}
      <Modal
        isOpen={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        title="Kayıt Başvurusunu Reddet"
        size="sm"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setRejectModalOpen(false)}>
              Vazgeç
            </Button>
            <Button
              variant="danger"
              size="sm"
              isLoading={rejectMutation.isPending}
              onClick={() => {
                if (selectedUser) {
                  void rejectMutation.mutate({ id: selectedUser.id, reason: rejectReason });
                }
              }}
            >
              Başvuruyu Reddet
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-xs text-slate-600 dark:text-slate-400">
            <strong>{selectedUser?.email}</strong> kaydı reddedilecek ve hesabı kilitlenecektir.
          </p>
          <Input
            label="Gerekçe (Opsiyonel)"
            placeholder="Örn: Kurum dışı e-posta"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
}
