import React, { useState } from 'react';
import { X, Key, Save, Loader2, CheckCircle } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase'; // 請確保您的 firebase 初始化路徑正確

interface Props {
    isOpen: boolean;
    onClose: () => void;
    staffId: string;
    systemUsers: any[];
    updateSystemUsers: (users: any[]) => void;
}

export default function ChangePasswordModal({ isOpen, onClose, staffId, systemUsers, updateSystemUsers }: Props) {
    const [newPwd, setNewPwd] = useState('');
    const [confirmPwd, setConfirmPwd] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    if (!isOpen) return null;

    const handleSave = async () => {
        if (!newPwd || newPwd !== confirmPwd) {
            setMessage({ type: 'error', text: '密碼不一致或為空' });
            return;
        }
        setIsSaving(true);
        try {
            const userRef = doc(db!, 'system_users', staffId);
            await updateDoc(userRef, { password: newPwd });
            
            // 同步更新本地狀態
            const updated = systemUsers.map(u => u.id === staffId ? { ...u, password: newPwd } : u);
            updateSystemUsers(updated);
            
            setMessage({ type: 'success', text: '密碼修改成功！' });
            setTimeout(() => {
                onClose();
                setNewPwd('');
                setConfirmPwd('');
                setMessage({ type: '', text: '' });
            }, 1500);
        } catch (error) {
            setMessage({ type: 'error', text: '更新失敗，請重試' });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-6 text-white flex justify-between items-center">
                    <h3 className="text-xl font-bold flex items-center gap-2"><Key size={20}/> 修改登入密碼</h3>
                    <button onClick={onClose} className="hover:rotate-90 transition-transform"><X size={24}/></button>
                </div>
                <div className="p-8 space-y-6">
                    {message.text && (
                        <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {message.type === 'success' && <CheckCircle size={16}/>}
                            {message.text}
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">新密碼</label>
                        <input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} className="w-full border-slate-200 rounded-xl focus:ring-blue-500" placeholder="請輸入新密碼" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">確認新密碼</label>
                        <input type="password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} className="w-full border-slate-200 rounded-xl focus:ring-blue-500" placeholder="再次輸入新密碼" />
                    </div>
                    <button onClick={handleSave} disabled={isSaving} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all">
                        {isSaving ? <Loader2 className="animate-spin" size={20}/> : <Save size={20}/>}
                        {isSaving ? '正在儲存...' : '確認修改'}
                    </button>
                </div>
            </div>
        </div>
    );
}
