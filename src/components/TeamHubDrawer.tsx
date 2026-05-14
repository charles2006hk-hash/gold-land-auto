import React, { useState, useEffect } from 'react';
import { X, MessageCircle, Send, User, Clock, CheckCircle2, ListTodo, Ship } from 'lucide-react';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    db: any;
    appId: string;
    staffName: string;
}

export default function TeamHubDrawer({ isOpen, onClose, db, appId, staffName }: Props) {
    const [activeTab, setActiveTab] = useState<'chat' | 'tasks'>('chat');
    const [msg, setMsg] = useState('');
    const [chats, setChats] = useState<any[]>([]);

    // 監聽聊天訊息
    useEffect(() => {
        if (!isOpen || !db) return;
        const q = query(collection(db, 'artifacts', appId, 'team_chats'), orderBy('timestamp', 'asc'));
        return onSnapshot(q, (snap) => {
            setChats(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
    }, [isOpen, db, appId]);

    const sendMsg = async () => {
        if (!msg.trim()) return;
        await addDoc(collection(db, 'artifacts', appId, 'team_chats'), {
            sender: staffName,
            text: msg,
            timestamp: serverTimestamp()
        });
        setMsg('');
    };

    return (
        <div className={`fixed inset-y-0 right-0 z-[9500] w-full md:w-[450px] bg-white shadow-2xl transform transition-transform duration-500 ease-in-out border-l border-slate-200 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
            <div className="h-full flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-700 to-indigo-800 p-6 text-white flex justify-between items-center shadow-lg">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/20 p-2 rounded-lg"><MessageCircle size={24}/></div>
                        <div>
                            <h2 className="text-xl font-bold">團隊協作中心</h2>
                            <p className="text-xs text-blue-100 opacity-80">即時通訊與任務追蹤</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="hover:rotate-90 transition-transform"><X size={28}/></button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-100 bg-slate-50/50 p-2 gap-2">
                    <button onClick={() => setActiveTab('chat')} className={`flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'chat' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:bg-slate-100'}`}>
                        <MessageCircle size={18}/> 團隊對話
                    </button>
                    <button onClick={() => setActiveTab('tasks')} className={`flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'tasks' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:bg-slate-100'}`}>
                        <ListTodo size={18}/> 待辦事項
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-4 bg-slate-50/30">
                    {activeTab === 'chat' ? (
                        <div className="space-y-4">
                            {chats.map((c, i) => (
                                <div key={i} className={`flex flex-col ${c.sender === staffName ? 'items-end' : 'items-start'}`}>
                                    <span className="text-[10px] text-slate-400 mb-1 px-1">{c.sender}</span>
                                    <div className={`max-w-[85%] p-3 rounded-2xl text-sm shadow-sm ${c.sender === staffName ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white text-slate-800 rounded-tl-none border border-slate-100'}`}>
                                        {c.text}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-20 text-slate-400">
                            <Ship size={48} className="mx-auto mb-4 opacity-20"/>
                            <p className="text-sm">任務模組開發中...</p>
                        </div>
                    )}
                </div>

                {/* Input Area */}
                {activeTab === 'chat' && (
                    <div className="p-4 bg-white border-t border-slate-100">
                        <div className="flex gap-2 bg-slate-100 p-2 rounded-2xl items-center">
                            <input value={msg} onChange={e => setMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMsg()} placeholder="輸入訊息..." className="flex-1 bg-transparent border-none focus:ring-0 text-sm px-2" />
                            <button onClick={sendMsg} className="bg-blue-600 text-white p-2.5 rounded-xl hover:bg-blue-700 transition-colors shadow-md"><Send size={18}/></button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
