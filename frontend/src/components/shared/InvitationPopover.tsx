import { Check, X } from 'lucide-react';
import type { GroupInvitation } from '@/types';

interface InvitationPopoverProps {
  invitations: GroupInvitation[];
  onAccept: (invitation: GroupInvitation) => void;
  onDecline: (invitation: GroupInvitation) => void;
}

export default function InvitationPopover({ invitations, onAccept, onDecline }: InvitationPopoverProps) {
  if (invitations.length === 0) return null;

  const getRoleLabel = (role: GroupInvitation['role']) => (role === 'MANAGER' ? 'Gestionnaire' : 'Membre');

  return (
    <div className="w-72 bg-white/70 backdrop-blur-2xl shadow-2xl rounded-2xl border border-white/65 z-50 animate-in fade-in slide-in-from-left-2 overflow-hidden">
      <div className="p-3 border-b border-white/60 bg-blue-50/45 flex justify-between items-center">
        <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">Invitations en attente</span>
        <span className="bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded-full">{invitations.length}</span>
      </div>
      <div className="max-h-64 overflow-y-auto">
        {invitations.map((invite) => (
          <div key={invite.id} className="p-3 border-b border-white/60 last:border-none hover:bg-white/45 transition-colors">
            <p className="text-sm font-semibold text-slate-800">{invite.groupName || 'Groupe'}</p>
            <p className="text-xs text-slate-500 mb-2">Rôle: {getRoleLabel(invite.role)}</p>
            <div className="flex gap-2">
              <button
                onClick={() => onAccept(invite)}
                className="flex-1 bg-blue-600 text-white py-1.5 rounded-md text-xs font-medium hover:bg-blue-700 flex items-center justify-center gap-1"
              >
                <Check size={14} /> Accepter
              </button>
              <button
                onClick={() => onDecline(invite)}
                className="px-2 py-1.5 border border-slate-200 text-slate-400 rounded-md hover:text-red-500 hover:bg-red-50 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
