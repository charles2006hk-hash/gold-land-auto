// src/components/ChangePasswordModal.tsx
import React, { useState } from 'react';
import { Key, X, Loader2 } from 'lucide-react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    staffId: string;
    systemUsers: any[];
    updateSystemUsers: (users: any[]) => void;
}

export default function ChangePasswordModal({ isOpen, onClose, staffId, systemUsers, updateSystemUsers }: Props) {
    const [oldPwd, setOldPwd] = useState('');
    const [newPwd, setNewPwd] = useState('');
    const [confirmPwd, setConfirmPwd] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        
        const user = systemUsers.find((u:any) => u.email === staffId);
        
        // 1. 驗證邏輯
        if (!user && staffId !== 'BOSS') { setError('找不到使用者資料'); setIsLoading(false); return; }
        if (staffId !== 'BOSS' && user.password !== oldPwd) { setError('❌ 舊密碼輸入錯誤'); setIsLoading(false); return; }
        if (newPwd !== confirmPwd) { setError('❌ 兩次輸入的新密碼不一致'); setIsLoading(false); return; }
        if (newPwd.length < 6) { setError('❌ 新密碼長度至少需要 6 個字元'); setIsLoading(false); return; }

        try {
            // 2. 更新資料庫中的密碼
            if (staffId !== 'BOSS') {
                const newUsers = systemUsers.map((u:any) => u.email === staffId ? { ...u, password: newPwd } : u);
                await updateSystemUsers(newUsers);
            }
            
            // 3. 同步更新 Firebase Auth (如果適用)
            const { getAuth, updatePassword } = await import('firebase/auth');
            const auth = getAuth();
            if (auth.currentUser && staffId !== 'BOSS') {
                await updatePassword(auth.currentUser, newPwd).catch(err => console.warn('Firebase Auth 更新略過:', err));
            }

            alert('✅ 密碼修改成功！下次登入請使用新密碼。');
            setOldPwd(''); setNewPwd(''); setConfirmPwd('');
            onClose();
        } catch (err) {
            setError('密碼修改失敗，請稍後再試或聯絡管理員');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden">
                <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
                    <h3 className="font-bold flex items-center"><Key size={18} className="mr-2 text-yellow-400"/> 修改登入密碼</h3>
                    <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors"><X size={20}/></button>
                </div>
                <form onSubmit={handleSubmit} className="p-5 space-y-4 bg-slate-50">
                    {staffId === 'BOSS' ? (
                        <div className="text-sm text-red-500 font-bold mb-4 bg-red-50 p-3 rounded-lg border border-red-200">
                            BOSS 帳號為系統預設超級管理員，密碼固定為 8888，如需更改請從源碼調整。
                        </div>
                    ) : (
                        <>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">目前密碼 (Old Password)</label>
                                <input type="password" value={oldPwd} onChange={e => setOldPwd(e.target.value)} className="w-full border border-slate-300 p-2.5 rounded-lg text-sm outline-none focus:border-blue-500" required />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-blue-600 mb-1">新密碼 (New Password)</label>
                                <input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} className="w-full border border-blue-300 p-2.5 rounded-lg text-sm outline-none focus:border-blue-500" required minLength={6} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-blue-600 mb-1">確認新密碼 (Confirm Password)</label>
                                <input type="password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} className="w-full border border-blue-300 p-2.5 rounded-lg text-sm outline-none focus:border-blue-500" required minLength={6} />
                            </div>
                            {error && <div className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-100 font-bold">{error}</div>}
                            <button type="submit" disabled={isLoading} className="w-full mt-4 bg-blue-600 text-white font-bold py-3 rounded-xl shadow-md hover:bg-blue-700 transition-colors flex justify-center items-center">
                                {isLoading ? <Loader2 size={18} className="animate-spin"/> : '確認修改'}
                            </button>
                        </>
                    )}
                </form>
            </div>
        </div>
    );
}
