/**
 * @file UsersPage.tsx
 * @description Admin Paneli Personel Listesi, Rol Atama, Ban/Unban ve Yetki Ezme Yönetimi.
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  UserX,
  Edit2,
} from 'lucide-react';
import { authService } from '#services/authService.js';
import { Table, type Column } from '#components/ui/Table.js';
import { Button } from '#components/ui/Button.js';
import { Badge } from '#components/ui/Badge.js';
import { Modal } from '#components/ui/Modal.js';
import { Input } from '#components/ui/Input.js';
import type { User } from '#types/auth.js';

export function UsersPage() {
  const queryClient = useQueryClient();

  const [banModalOpen, setBanModalOpen] = useState(false);
  const [userToBan, setUserToBan] = useState<User | null>(null);
  const [banReason, setBanReason] = useState('');

  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [userToEditRoles, setUserToEditRoles] = useState<User | null>(null);
  const [selectedRolesInput, setSelectedRolesInput] = useState('');

  // Kullanıcıları getir
  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: () => authService.listUsers(),
  });

  // Ban Mutation
  const banMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      authService.banUser(id, reason),
    onSuccess: () => {
      setBanModalOpen(false);
      setUserToBan(null);
      setBanReason('');
      void queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  // Unban Mutation
  const unbanMutation = useMutation({
    mutationFn: (id: string) => authService.unbanUser(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  // Rol Atama Mutation
  const assignRolesMutation = useMutation({
    mutationFn: ({ id, roles }: { id: string; roles: string[] }) =>
      authService.assignUserRoles(id, roles),
    onSuccess: () => {
      setRoleModalOpen(false);
      setUserToEditRoles(null);
      void queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const columns: Column<User>[] = [
    {
      key: 'name',
      header: 'Personel',
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
      key: 'systemRole',
      header: 'Sistem Rolü',
      render: (u) => (
        <Badge
          size="sm"
          variant={
            u.systemRole === 'superadmin'
              ? 'danger'
              : u.systemRole === 'admin'
              ? 'info'
              : 'neutral'
          }
        >
          {u.systemRole}
        </Badge>
      ),
    },
    {
      key: 'roles',
      header: 'Fonksiyonel Roller',
      render: (u) => (
        <div className="flex flex-wrap gap-1">
          {u.roles && u.roles.length > 0 ? (
            u.roles.map((r) => (
              <span
                key={r}
                className="px-2 py-0.5 text-[11px] rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono"
              >
                {r}
              </span>
            ))
          ) : (
            <span className="text-xs text-slate-400 italic">Atanmamış</span>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Durum',
      render: (u) => {
        if (!u.isActive || u.status === 'banned') {
          return (
            <Badge size="sm" variant="danger" dot>
              Askıda / Yasaklı
            </Badge>
          );
        }
        return (
          <Badge size="sm" variant="success" dot>
            Aktif
          </Badge>
        );
      },
    },
    {
      key: 'actions',
      header: 'İşlemler',
      align: 'right',
      render: (u) => {
        if (u.systemRole === 'superadmin') {
          return <span className="text-xs text-slate-400 italic">Korumalı Hesap</span>;
        }

        return (
          <div className="flex items-center justify-end gap-1.5">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Edit2 className="w-3.5 h-3.5" />}
              onClick={() => {
                setUserToEditRoles(u);
                setSelectedRolesInput(u.roles?.join(', ') || '');
                setRoleModalOpen(true);
              }}
            >
              Roller
            </Button>

            {u.isActive ? (
              <Button
                variant="ghost"
                size="sm"
                className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                onClick={() => {
                  setUserToBan(u);
                  setBanModalOpen(true);
                }}
              >
                <UserX className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="text-emerald-600 border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                isLoading={unbanMutation.isPending && unbanMutation.variables === u.id}
                onClick={() => void unbanMutation.mutate(u.id)}
              >
                Aktif Et
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
          Personel & Rol Yönetimi
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Kayıtlı kullanıcılar, yetkilendirmeler, departman rolleri ve hesap güvenliği.
        </p>
      </div>

      <Table
        columns={columns}
        data={users}
        keyExtractor={(u) => u.id}
        isLoading={isLoading}
      />

      {/* Hesap Yasaklama (Ban) Modalı */}
      <Modal
        isOpen={banModalOpen}
        onClose={() => setBanModalOpen(false)}
        title="Kullanıcı Hesabını Askıya Al / Yasakla"
        size="sm"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setBanModalOpen(false)}>
              İptal
            </Button>
            <Button
              variant="danger"
              size="sm"
              isLoading={banMutation.isPending}
              onClick={() => {
                if (userToBan) {
                  void banMutation.mutate({ id: userToBan.id, reason: banReason });
                }
              }}
            >
              Hesabı Askıya Al
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-xs text-slate-600 dark:text-slate-400">
            <strong>{userToBan?.email}</strong> hesabının oturumları anında sonlandırılacak ve sisteme girişi engellenecektir.
          </p>
          <Input
            label="Gerekçe (Opsiyonel)"
            placeholder="Örn: Güvenlik politikası ihlali"
            value={banReason}
            onChange={(e) => setBanReason(e.target.value)}
          />
        </div>
      </Modal>

      {/* Rol Düzenleme Modalı */}
      <Modal
        isOpen={roleModalOpen}
        onClose={() => setRoleModalOpen(false)}
        title="Departman / Fonksiyonel Rolleri Düzenle"
        size="sm"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setRoleModalOpen(false)}>
              İptal
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={assignRolesMutation.isPending}
              onClick={() => {
                if (userToEditRoles) {
                  const roles = selectedRolesInput
                    .split(',')
                    .map((r) => r.trim())
                    .filter(Boolean);
                  void assignRolesMutation.mutate({ id: userToEditRoles.id, roles });
                }
              }}
            >
              Rolleri Kaydet
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-xs text-slate-600 dark:text-slate-400">
            <strong>{userToEditRoles?.email}</strong> personeline atanacak rolleri virgülle ayırarak giriniz:
          </p>
          <Input
            label="Roller (Virgülle Ayrılmış)"
            placeholder="developer, hr, finance"
            value={selectedRolesInput}
            onChange={(e) => setSelectedRolesInput(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
}
