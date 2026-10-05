/**
 * @file InvitationsPage.tsx
 * @description Admin Paneli Süreli ve Kriptografik Davetiye Kodu Üretim ve Yönetim Ekranı.
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Copy, Check, Trash2 } from 'lucide-react';
import { authService } from '#services/authService.js';
import { Table, type Column } from '#components/ui/Table.js';
import { Button } from '#components/ui/Button.js';
import { Badge } from '#components/ui/Badge.js';
import { Modal } from '#components/ui/Modal.js';
import { Input } from '#components/ui/Input.js';
import type { Invitation, CreateInvitationPayload } from '#types/auth.js';

export function InvitationsPage() {
  const queryClient = useQueryClient();

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const [assignedRolesInput, setAssignedRolesInput] = useState('developer');
  const [maxUses, setMaxUses] = useState(1);
  const [expiresInHours, setExpiresInHours] = useState(48);

  // Davetiyeleri sorgula
  const { data: invitations = [], isLoading } = useQuery<Invitation[]>({
    queryKey: ['invitations'],
    queryFn: () => authService.listInvitations(),
  });

  // Davetiye Üretme Mutation
  const createMutation = useMutation({
    mutationFn: (payload: CreateInvitationPayload) => authService.createInvitation(payload),
    onSuccess: () => {
      setCreateModalOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['invitations'] });
    },
  });

  // Davetiye İptal Etme Mutation
  const revokeMutation = useMutation({
    mutationFn: (code: string) => authService.revokeInvitation(code),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['invitations'] });
    },
  });

  const copyToClipboard = (code: string) => {
    void navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const columns: Column<Invitation>[] = [
    {
      key: 'code',
      header: 'Davet Kodu',
      render: (inv) => (
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-1 rounded-md border border-indigo-100 dark:border-indigo-900/60">
            {inv.code}
          </span>
          <button
            onClick={() => copyToClipboard(inv.code)}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
            title="Kopyala"
          >
            {copiedCode === inv.code ? (
              <Check className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      ),
    },
    {
      key: 'roles',
      header: 'Atanacak Roller',
      render: (inv) => (
        <div className="flex flex-wrap gap-1">
          {inv.assignedRoles && inv.assignedRoles.length > 0 ? (
            inv.assignedRoles.map((r) => (
              <span
                key={r}
                className="px-2 py-0.5 text-[11px] rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono"
              >
                {r}
              </span>
            ))
          ) : (
            <span className="text-xs text-slate-400 italic">Standart</span>
          )}
        </div>
      ),
    },
    {
      key: 'usage',
      header: 'Kullanım Durumu',
      render: (inv) => (
        <span className="font-mono text-xs">
          {inv.usedCount} / {inv.maxUses}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Durum',
      render: (inv) => {
        if (inv.isExhausted) {
          return <Badge size="sm" variant="neutral">Tükendi</Badge>;
        }
        if (inv.isExpired) {
          return <Badge size="sm" variant="danger">Süresi Doldu</Badge>;
        }
        return <Badge size="sm" variant="success" dot>Geçerli</Badge>;
      },
    },
    {
      key: 'expiresAt',
      header: 'Son Geçerlilik',
      render: (inv) => (
        <span className="text-xs text-slate-500">
          {new Date(inv.expiresAt).toLocaleDateString('tr-TR', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'İşlemler',
      align: 'right',
      render: (inv) => (
        <Button
          variant="ghost"
          size="sm"
          className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
          isLoading={revokeMutation.isPending && revokeMutation.variables === inv.code}
          onClick={() => void revokeMutation.mutate(inv.code)}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Kayıt Davetiyeleri
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Kriptografik, süreli ve kullanım kotalı davet kodları ile personelleri doğrudan aktif hesaba kaydedin.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setCreateModalOpen(true)}
        >
          Yeni Davetiye Üret
        </Button>
      </div>

      <Table
        columns={columns}
        data={invitations}
        keyExtractor={(inv) => inv.id}
        isLoading={isLoading}
        emptyMessage="Sistemde henüz aktif veya geçmiş bir davet kodu bulunmuyor."
      />

      {/* Davetiye Oluşturma Modalı */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Yeni Kayıt Davetiyesi Oluştur"
        subtitle="Davetiye ile kayıt olan personeller onay beklemeden doğrudan aktif olur ve seçili rolleri devralır."
        size="sm"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setCreateModalOpen(false)}>
              İptal
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={createMutation.isPending}
              onClick={() => {
                const roles = assignedRolesInput
                  .split(',')
                  .map((r) => r.trim())
                  .filter(Boolean);
                void createMutation.mutate({
                  assignedRoles: roles,
                  maxUses,
                  expiresInHours,
                });
              }}
            >
              Kodu Üret
            </Button>
          </>
        }
      >
        <div className="space-y-3.5">
          <Input
            label="Atanacak Roller (Virgülle Ayrılmış)"
            placeholder="developer, data_analyst"
            value={assignedRolesInput}
            onChange={(e) => setAssignedRolesInput(e.target.value)}
          />

          <Input
            type="number"
            label="Maksimum Kullanım Kotası"
            min={1}
            max={100}
            value={maxUses}
            onChange={(e) => setMaxUses(Number(e.target.value))}
            helperText="Önerilen: 1 (Tek kullanımlık güvenli bağlantı)"
          />

          <Input
            type="number"
            label="Geçerlilik Süresi (Saat)"
            min={1}
            max={720}
            value={expiresInHours}
            onChange={(e) => setExpiresInHours(Number(e.target.value))}
            helperText="Belirlenen süre sonunda davet kodu otomatik geçersiz kalır."
          />
        </div>
      </Modal>
    </div>
  );
}
