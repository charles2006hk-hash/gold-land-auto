// src/components/TeamHubDrawer.tsx
import React, { useState, useEffect, useRef } from 'react';
import { 
    X, MessageCircle, Send, Check, Trash2, 
    FileText, ListTodo, Car, Search, Loader2 
} from 'lucide-react';
import { 
    collection, addDoc, query, orderBy, onSnapshot, 
    serverTimestamp, deleteDoc, doc, updateDoc, limit 
} from 'firebase/firestore';

interface TeamHubDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    db: any;
    staffId: string;
    appId: string;
    systemUsers: any[];
    inventory: any[];
    setEditingVehicle: (vehicle: any) => void;
    currentUser: any;
    sendPushNotification?: (title: string, body: string, targetStaffIds?: string[]) => void;
}

export default function TeamHubDrawer({ 
    isOpen, onClose, db, staffId, appId, 
    systemUsers, inventory, setEditingVehicle, 
    currentUser, sendPushNotification 
}: TeamHubDrawerProps) {
    const [activeTab, setActiveTab] = useState<'notes' | 'chat' | 'tasks'>('notes');
    
    // --- 隨手記 (Notes) 狀態 ---
    const [notes, setNotes] = useState<any[]>([]);
    const [newNote, setNewNote] = useState('');
    const [noteLinkedCar, setNoteLinkedCar] = useState('');
    const [noteSearchQuery, setNoteSearchQuery] = useState(''); 
    const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({}); 

    // --- 對話與任務狀態 ---
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [chatLinkedCar, setChatLinkedCar] = useState(''); 
    
    const [tasks, setTasks] = useState<any[]>([]);
    const [newTask, setNewTask] = useState('');
    const [assignee, setAssignee] = useState('');
    const [taskLinkedCar, setTaskLinkedCar] = useState(''); 

    const [isAiThinking, setIsAiThinking] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // ★ 自動插入時間戳魔法
    useEffect(() => {
        if (isOpen && activeTab === 'notes' && newNote === '') {
            const now = new Date();
            const timeStr = `${now.getMonth() + 1}月${now.getDate()}日 ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
            setNewNote(`[${timeStr}] `);
        }
    }, [isOpen, activeTab]);

    // 1. 監聽隨手記 (Notes)
    useEffect(() => {
        if (!db || !isOpen) return;
        const q = query(collection(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'system_notes'), orderBy('timestamp', 'desc'));
        const unsub = onSnapshot(q, (snap: any) => {
            setNotes(snap.docs.map((d: any) => ({ id: d.id, ...d.data() })));
        });
        return () => unsub();
    }, [db, appId, isOpen]);

    // 2. 監聽對話庫 (Chat)
    useEffect(() => {
        if (!db || !isOpen) return;
        const q = query(collection(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'system_messages'), orderBy('timestamp', 'asc'), limit(100));
        const unsub = onSnapshot(q, (snap: any) => {
            setMessages(snap.docs.map((d: any) => ({ id: d.id, ...d.data() })));
            setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        });
        return () => unsub();
    }, [db, appId, isOpen]);

    // 3. 監聽任務庫 (Tasks)
    useEffect(() => {
        if (!db || !isOpen) return;
        const q = query(collection(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'system_tasks'), orderBy('timestamp', 'desc'));
        const unsub = onSnapshot(q, (snap: any) => {
            setTasks(snap.docs.map((d: any) => ({ id: d.id, ...d.data() })));
        });
        return () => unsub();
    }, [db, appId, isOpen]);

    // ★★★ 核心升級：動態資料過濾邏輯 (權限隔離 + 搜尋) ★★★
    const isAdmin = staffId === 'BOSS' || currentUser?.modules?.includes('all') || currentUser?.dataAccess === 'all';

    const filteredNotes = notes.filter(note => {
        // 1. 權限檢查
        let hasAccess = false;
        if (isAdmin) hasAccess = true; 
        else if (note.author === staffId) hasAccess = true; 
        else if (note.linkedRegMark && inventory.some((v:any) => v.regMark === note.linkedRegMark)) hasAccess = true;
        
        if (!hasAccess) return false;

        // 2. 搜尋字眼過濾
        if (noteSearchQuery) {
            const queryStr = noteSearchQuery.toLowerCase();
            return (note.content || '').toLowerCase().includes(queryStr) || 
                   (note.linkedRegMark || '').toLowerCase().includes(queryStr) ||
                   (note.author || '').toLowerCase().includes(queryStr);
        }
        return true;
    });

    const filteredMessages = messages.filter(msg => {
        if (isAdmin) return true; 
        if (msg.sender === staffId) return true; 
        if (msg.text?.includes(`@${staffId}`)) return true; 
        if (msg.linkedRegMark) return inventory.some((v:any) => v.regMark === msg.linkedRegMark);
        return true; 
    });

    const filteredTasks = tasks.filter(task => {
        if (isAdmin) return true; 
        return task.assigner === staffId || task.assignee === staffId || task.assignee === 'ALL';
    });

    // --- 處理儲存隨手記 ---
    const handleAddNote = async (e: React.FormEvent) => {
        e.preventDefault();
        const text = newNote.trim();
        if (!text || !db) return;

        let finalLinkedCar = noteLinkedCar;
        if (!finalLinkedCar) {
            const match = text.match(/@([a-zA-Z0-9]+)/);
            if (match) {
                const plate = match[1].toUpperCase();
                if (inventory.some((v:any) => v.regMark === plate)) finalLinkedCar = plate;
            }
        }

        await addDoc(collection(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'system_notes'), {
            author: staffId,
            content: text,
            linkedRegMark: finalLinkedCar || null,
            timestamp: serverTimestamp()
        });
        
        const now = new Date();
        const timeStr = `${now.getMonth() + 1}月${now.getDate()}日 ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        setNewNote(`[${timeStr}] `);
        setNoteLinkedCar('');
    };

    const deleteNote = async (noteId: string) => {
        if (!db || !confirm("確定刪除此筆記？")) return;
        await deleteDoc(doc(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'system_notes', noteId));
    };

    const toggleNoteExpand = (noteId: string) => {
        setExpandedNotes(prev => ({ ...prev, [noteId]: !prev[noteId] }));
    };

    // --- 處理發送對話與 AI 處理邏輯 ---
    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        const msgText = newMessage.trim();
        if (!msgText || !db) return;

        let finalLinkedCar = chatLinkedCar;
        if (!finalLinkedCar) {
            const match = msgText.match(/@([a-zA-Z0-9]+)/);
            if (match) {
                const plate = match[1].toUpperCase();
                if (inventory.some((v:any) => v.regMark === plate)) finalLinkedCar = plate;
            }
        }

        await addDoc(collection(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'system_messages'), {
            sender: staffId,
            text: msgText,
            linkedRegMark: finalLinkedCar || null, 
            timestamp: serverTimestamp()
        });

        // 發送 @提及 推送通知
        if (sendPushNotification) {
            const mentions = msgText.match(/@([a-zA-Z0-9_\-\.]+)/g);
            if (mentions) {
                const mentionedUsers = mentions
                    .map(m => m.substring(1)) 
                    .filter(username => systemUsers.some((u:any) => u.email === username && username !== staffId)); 

                if (mentionedUsers.length > 0) {
                    sendPushNotification(
                        `💬 ${staffId} 在對話中提及了您`, 
                        msgText, 
                        mentionedUsers
                    );
                }
            }
        }
        
        setNewMessage('');
        setChatLinkedCar('');
        
        // AI 處理邏輯
        if (msgText.includes('@AI') || msgText.includes('@ai')) {
            setIsAiThinking(true);
            try {
                const miniInventory = inventory.map((v:any) => {
                    const received = (v.payments || []).reduce((acc:number, p:any) => acc + (Number(p.amount) || 0), 0);
                    const cbFees = (v.crossBorder?.tasks || []).reduce((sum:number, t:any) => sum + (Number(t.fee) || 0), 0);
                    const salesAddonsTotal = (v.salesAddons || []).reduce((sum: number, addon: any) => sum + (Number(addon.amount) || 0), 0);
                    const totalReceivable = (Number(v.price) || 0) + cbFees + salesAddonsTotal;
                    const balance = totalReceivable - received;

                    return {
                        plate: v.regMark || '未出牌', 
                        make: v.make, model: v.model, year: v.year || '未填寫', status: v.status, 
                        daysInStock: v.stockInDate ? Math.floor((new Date().getTime() - new Date(v.stockInDate).getTime()) / (1000 * 60 * 60 * 24)) : 0,
                        targetPrice: v.price || 0, totalReceived: received, outstandingBalance: balance > 0 ? balance : 0,
                        managedBy: v.managedBy || '未指派',
                        licenseExpiry: v.licenseExpiry || '未填寫', previousOwners: v.previousOwners || '未填寫', ownerName: v.registeredOwnerName || '未填寫' 
                    };
                });

                const response = await fetch('/api/assistant', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prompt: msgText, inventory: miniInventory })
                });
                const data = await response.json();
                
                await addDoc(collection(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'system_messages'), {
                    sender: '🤖 金田 (AI助理)', text: data.reply || "Sorry呀，我個腦突然 hang 咗機，請稍後再試下啦。",
                    linkedRegMark: finalLinkedCar || null, timestamp: serverTimestamp()
                });
            } catch (err) { console.error("AI Error:", err); } finally { setIsAiThinking(false); }
        }
    };

    // --- 處理新增任務 ---
    const handleAddTask = async (e: React.FormEvent) => {
        e.preventDefault();
        const taskText = newTask.trim();
        if (!taskText || !assignee || !db) return;

        let finalLinkedCar = taskLinkedCar;
        if (!finalLinkedCar) {
            const match = taskText.match(/@([a-zA-Z0-9]+)/);
            if (match) {
                const plate = match[1].toUpperCase();
                if (inventory.some((v:any) => v.regMark === plate)) finalLinkedCar = plate;
            }
        }

        await addDoc(collection(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'system_tasks'), {
            assigner: staffId, assignee: assignee, content: taskText, linkedRegMark: finalLinkedCar || null, 
            status: 'pending', timestamp: serverTimestamp()
        });

        if (sendPushNotification) {
            if (assignee === 'ALL') {
                sendPushNotification(
                    `📋 新任務發佈`, 
                    `${staffId} 發佈了一項全體任務：${taskText}`
                ); 
            } else if (assignee !== staffId) { 
                sendPushNotification(
                    `📋 新任務指派`, 
                    `${staffId} 指派了一項新任務給您：${taskText}`, 
                    [assignee]
                );
            }
        }

        setNewTask(''); setTaskLinkedCar('');
    };

    const toggleTask = async (task: any) => {
        if (!db) return;
        const newStatus = task.status === 'pending' ? 'completed' : 'pending';
        await updateDoc(doc(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'system_tasks', task.id), {
            status: newStatus, completedAt: newStatus === 'completed' ? serverTimestamp() : null
        });
    };

    const deleteTask = async (taskId: string) => {
        if (!db || !confirm("確定刪除此任務？")) return;
        await deleteDoc(doc(db, 'artifacts', appId, 'staff', 'CHARLES_data', 'system_tasks', taskId));
    };

    const openCarDetails = (regMark: string) => {
        const car = inventory.find((v:any) => v.regMark === regMark);
        if (car && setEditingVehicle) setEditingVehicle(car);
        else alert(`找不到車牌 ${regMark} 的詳細資料`);
    };

    return (
        <>
            {isOpen && <div className="fixed inset-0 bg-black/20 z-[9998] md:bg-transparent md:pointer-events-none" onClick={onClose}></div>}
            
            <div className={`fixed top-0 right-0 h-full w-full md:w-[420px] bg-slate-50 shadow-2xl z-[9999] transform transition-transform duration-300 flex flex-col border-l border-slate-200 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                
                {/* 頂部 Header */}
                <div className="bg-slate-900 text-white p-4 flex justify-between items-center shadow-md flex-none safe-area-top">
                    <div className="flex items-center gap-2">
                        <div className="bg-yellow-500 text-black p-1.5 rounded-lg"><Check size={20}/></div>
                        <h3 className="font-bold text-lg tracking-wide">團隊協作中心</h3>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-full transition-colors"><X size={20}/></button>
                </div>

                {/* ★ 3個分頁按鈕 */}
                <div className="flex border-b border-slate-200 bg-white flex-none">
                    <button onClick={() => setActiveTab('notes')} className={`flex-1 py-3 text-sm font-bold flex items-center justify-center transition-colors ${activeTab === 'notes' ? 'border-b-2 border-yellow-500 text-yellow-700 bg-yellow-50/50' : 'text-slate-500 hover:bg-slate-50'}`}><FileText size={16} className="mr-1.5"/> 隨手記</button>
                    <button onClick={() => setActiveTab('chat')} className={`flex-1 py-3 text-sm font-bold flex items-center justify-center transition-colors ${activeTab === 'chat' ? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50/50' : 'text-slate-500 hover:bg-slate-50'}`}><MessageCircle size={16} className="mr-1.5"/> 內部對話</button>
                    <button onClick={() => setActiveTab('tasks')} className={`flex-1 py-3 text-sm font-bold flex items-center justify-center transition-colors ${activeTab === 'tasks' ? 'border-b-2 border-purple-600 text-purple-600 bg-purple-50/50' : 'text-slate-500 hover:bg-slate-50'}`}><ListTodo size={16} className="mr-1.5"/> 任務指派</button>
                </div>

                {/* ===== Tab 1: 隨手記 (Quick Notes) ===== */}
                {activeTab === 'notes' && (
                    <div className="flex-1 flex flex-col overflow-hidden bg-slate-100">
                        {/* 輸入區 (黃色便條紙風格) */}
                        <div className="p-3 bg-yellow-50/80 border-b border-yellow-200 shadow-sm flex-none z-10">
                            <form onSubmit={handleAddNote} className="flex flex-col gap-2">
                                <select value={noteLinkedCar} onChange={e => setNoteLinkedCar(e.target.value)} className="w-full bg-white border border-yellow-200 text-xs p-2 rounded-lg outline-none text-slate-600 shadow-sm">
                                    <option value="">🔗 關聯車輛 (選填，或輸入 @車牌)</option>
                                    {(inventory || []).filter((v:any)=>v.status!=='Withdrawn').map((v:any) => <option key={v.id} value={v.regMark}>{v.regMark} ({v.make})</option>)}
                                </select>
                                <textarea 
                                    value={newNote} 
                                    onChange={e => setNewNote(e.target.value)} 
                                    placeholder="快速記錄車輛狀況、洗車費用、過戶備註..." 
                                    className="w-full h-20 bg-white border border-yellow-300 rounded-lg p-3 text-sm outline-none focus:ring-2 ring-yellow-200 resize-none shadow-inner" 
                                />
                                <div className="flex justify-end">
                                    <button type="submit" disabled={!newNote.trim()} className="bg-yellow-500 text-yellow-950 px-6 py-2 rounded-lg text-sm font-black disabled:opacity-50 hover:bg-yellow-400 transition-colors shadow-sm active:scale-95">儲存筆記</button>
                                </div>
                            </form>
                            
                            {/* ★ 搜尋列 */}
                            <div className="mt-3 relative">
                                <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                                <input 
                                    type="text" 
                                    value={noteSearchQuery} 
                                    onChange={e => setNoteSearchQuery(e.target.value)} 
                                    placeholder="搜尋內容、車牌或作者..." 
                                    className="w-full bg-white border border-yellow-200 rounded-full py-2 pl-9 pr-4 text-xs outline-none focus:ring-1 ring-yellow-400 shadow-sm"
                                />
                            </div>
                        </div>
                        
                        {/* 筆記列表 */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
                            {filteredNotes.map(note => {
                                const timeStr = note.timestamp?.toDate ? note.timestamp.toDate().toLocaleString('zh-HK', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
                                const isExpanded = !!expandedNotes[note.id];
                                const isLong = (note.content || '').length > 150 || (note.content || '').split('\n').length > 4;

                                return (
                                    <div key={note.id} className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm relative group hover:border-yellow-300 transition-colors overflow-hidden">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-bold text-slate-800 text-sm">{note.author}</span>
                                                <span className="text-[10px] text-slate-400 font-mono">{timeStr}</span>
                                                {note.linkedRegMark && (
                                                    <div onClick={() => openCarDetails(note.linkedRegMark)} className="inline-flex items-center text-[10px] bg-yellow-100 text-yellow-800 border border-yellow-300 px-1.5 py-0.5 rounded cursor-pointer hover:bg-yellow-200 font-mono font-bold transition-colors">
                                                        <Car size={10} className="mr-1"/> {note.linkedRegMark}
                                                    </div>
                                                )}
                                            </div>
                                            {(note.author === staffId || isAdmin) && (
                                                <button onClick={() => deleteNote(note.id)} className="text-slate-300 hover:text-red-500 p-1 flex-none ml-2"><Trash2 size={14}/></button>
                                            )}
                                        </div>
                                        
                                        <p className={`text-sm text-slate-700 whitespace-pre-wrap break-words ${(!isExpanded && isLong) ? 'line-clamp-4' : ''}`} style={{ wordBreak: 'break-word' }}>
                                            {note.content}
                                        </p>
                                        
                                        {isLong && (
                                            <button 
                                                onClick={() => toggleNoteExpand(note.id)} 
                                                className="text-blue-500 hover:text-blue-700 text-xs font-bold mt-2 flex items-center"
                                            >
                                                {isExpanded ? '收起內容' : '顯示更多...'}
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                            {filteredNotes.length === 0 && <div className="text-center py-10 text-slate-400 text-sm">目前沒有隨手記紀錄</div>}
                        </div>
                    </div>
                )}

                {/* ===== Tab 2: 內部對話 (Chat) ===== */}
                {activeTab === 'chat' && (
                    <div className="flex-1 flex flex-col overflow-hidden bg-slate-100/50">
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
                            {filteredMessages.map((msg, idx) => {
                                const isMe = msg.sender === staffId;
                                const isAI = msg.sender.includes('AI') || msg.sender.includes('金田');
                                const timeStr = msg.timestamp?.toDate ? msg.timestamp.toDate().toLocaleTimeString('en-GB', {hour:'2-digit', minute:'2-digit'}) : '';
                                return (
                                    <div key={idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                        <span className="text-[10px] text-slate-400 mb-1 px-1">{isMe ? '您' : msg.sender} • {timeStr}</span>
                                        <div className={`max-w-[85%] p-3 rounded-2xl text-sm shadow-sm ${isMe ? 'bg-blue-600 text-white rounded-tr-none' : (isAI ? 'bg-gradient-to-r from-indigo-100 to-blue-50 border border-indigo-200 text-indigo-900 rounded-tl-none' : 'bg-white text-slate-700 border border-slate-200 rounded-tl-none')}`}>
                                            {msg.linkedRegMark && (
                                                <div onClick={() => openCarDetails(msg.linkedRegMark)} className="mb-2 inline-flex items-center text-[10px] bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded cursor-pointer hover:bg-yellow-300 font-mono font-bold shadow-sm active:scale-95 transition-transform">
                                                    <Car size={10} className="mr-1"/> {msg.linkedRegMark}
                                                </div>
                                            )}
                                            <div className="whitespace-pre-wrap leading-relaxed break-words" style={{ wordBreak: 'break-word' }}>{msg.text}</div>
                                        </div>
                                    </div>
                                );
                            })}
                            {isAiThinking && (
                                <div className="flex items-start">
                                    <div className="bg-indigo-50 border border-indigo-100 text-indigo-500 p-3 rounded-2xl rounded-tl-none text-xs flex items-center shadow-sm"><Loader2 size={14} className="animate-spin mr-2"/> 金田 AI 正在思考中...</div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                        
                        <div className="bg-white border-t border-slate-200 flex-none shadow-[0_-5px_15px_rgba(0,0,0,0.03)] p-3">
                            <div className="flex gap-2 mb-2">
                                <select value={chatLinkedCar} onChange={e => setChatLinkedCar(e.target.value)} className="flex-1 bg-slate-50 border border-slate-200 text-xs p-1.5 rounded outline-none text-slate-600">
                                    <option value="">🔗 不關聯車輛 (可輸入 @車牌)</option>
                                    {(inventory || []).filter((v:any)=>v.status!=='Withdrawn').map((v:any) => <option key={v.id} value={v.regMark}>{v.regMark} ({v.make})</option>)}
                                </select>
                                <button onClick={() => setNewMessage(prev => prev + '@AI ')} className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded text-[10px] font-bold hover:bg-indigo-200 transition-colors">呼叫 @AI</button>
                            </div>
                            <form onSubmit={handleSendMessage} className="flex gap-2">
                                <input value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="輸入訊息... (如: @AI @VELLFIRE 收咗幾多錢？)" className="flex-1 bg-slate-100 border border-transparent focus:border-blue-300 focus:bg-white rounded-lg px-3 py-2 text-sm outline-none transition-colors" />
                                <button type="submit" disabled={!newMessage.trim() || isAiThinking} className="bg-blue-600 text-white p-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"><Send size={16}/></button>
                            </form>
                        </div>
                    </div>
                )}

                {/* ===== Tab 3: 任務指派 (Tasks) ===== */}
                {activeTab === 'tasks' && (
                    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
                        <form onSubmit={handleAddTask} className="p-3 bg-white border-b border-slate-200 flex flex-col gap-2 flex-none shadow-sm z-10">
                            <select value={taskLinkedCar} onChange={e => setTaskLinkedCar(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-xs p-1.5 rounded outline-none text-slate-600 mb-1">
                                <option value="">🔗 選擇關聯車輛 (選填，或輸入 @車牌)</option>
                                {(inventory || []).filter((v:any)=>v.status!=='Withdrawn').map((v:any) => <option key={v.id} value={v.regMark}>{v.regMark} ({v.make} {v.model})</option>)}
                            </select>
                            
                            <input value={newTask} onChange={e => setNewTask(e.target.value)} placeholder="任務內容 (例如: @VELLFIRE 聯絡車主收尾數)" className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:ring-2 ring-blue-100" />
                            <div className="flex gap-2">
                                <select value={assignee} onChange={e => setAssignee(e.target.value)} className="flex-1 border border-slate-200 rounded-lg p-2 text-sm outline-none bg-slate-50">
                                    <option value="">-- 指派給 --</option>
                                    {(systemUsers || []).map((u:any) => <option key={u.email} value={u.email}>{u.email}</option>)}
                                    <option value="ALL">所有人 (All)</option>
                                </select>
                                <button type="submit" disabled={!newTask.trim() || !assignee} className="bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-50 hover:bg-purple-800 transition-colors shadow-sm">發佈</button>
                            </div>
                        </form>
                        
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
                            {filteredTasks.map(task => {
                                const isCompleted = task.status === 'completed';
                                return (
                                    <div key={task.id} className={`p-3 rounded-xl border flex gap-3 shadow-sm transition-all ${isCompleted ? 'bg-slate-100 border-slate-200 opacity-60' : 'bg-white border-blue-200 hover:shadow-md'}`}>
                                        <button onClick={() => toggleTask(task)} className={`mt-0.5 flex-none rounded-full w-5 h-5 flex items-center justify-center border transition-colors ${isCompleted ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300 hover:border-blue-500 text-transparent hover:text-blue-200'}`}>
                                            <Check size={12}/>
                                        </button>
                                        <div className="flex-1 min-w-0">
                                            {task.linkedRegMark && (
                                                <div onClick={() => openCarDetails(task.linkedRegMark)} className={`mb-1 inline-flex items-center text-[9px] px-1.5 py-0.5 rounded cursor-pointer font-mono font-bold border transition-colors ${isCompleted ? 'bg-gray-200 text-gray-500 border-gray-300' : 'bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-200'}`}>
                                                    <Car size={10} className="mr-1"/> {task.linkedRegMark}
                                                </div>
                                            )}
                                            <p className={`text-sm font-bold break-words ${isCompleted ? 'line-through text-slate-500' : 'text-slate-800'}`} style={{ wordBreak: 'break-word' }}>{task.content}</p>
                                            <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-100">
                                                <div className="text-[10px] text-slate-400 font-medium">
                                                    <span className="text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded mr-1">@{task.assignee}</span>
                                                    由 {task.assigner} 指派
                                                </div>
                                                {(task.assigner === staffId || isAdmin) && (
                                                    <button onClick={() => deleteTask(task.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={12}/></button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            {filteredTasks.length === 0 && <div className="text-center py-10 text-slate-400 text-sm">目前沒有與您相關的任務</div>}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
