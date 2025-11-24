import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
    Calendar, Plus, ArrowLeft, MoreHorizontal, Edit2, 
    Trash, Search, Hash, Pin, RotateCcw,
    FileUp, FileDown, XCircle, CheckCircle
} from 'lucide-react';
import { Card, ViewMode, ReviewLog, MainTab, TagData } from './types';
import { BlockEditor } from './components/BlockEditor';
import { CardItem } from './components/CardItem';
import { BottomNav } from './components/BottomNav';
import { generateId } from './utils/helpers';
import { calculateNextReview } from './services/reviewService';
import { exportToExcel, importFromExcel } from './services/excelService';
import { APP_STORAGE_KEY, MAX_STAGE } from './utils/constants';

const App = () => {
  // --- State ---
  const [cards, setCards] = useState<Card[]>([]);
  const [tags, setTags] = useState<TagData[]>([]);
  
  // Navigation State
  const [view, setView] = useState<ViewMode>('main');
  const [activeTab, setActiveTab] = useState<MainTab>('learn');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [viewingCard, setViewingCard] = useState<Card | null>(null); // For single card detail view
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('');

  // Editor State
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editorTitle, setEditorTitle] = useState('');
  const [editorBlocks, setEditorBlocks] = useState<any[]>([]); 
  const [editorRemark, setEditorRemark] = useState('');
  const [editorTags, setEditorTags] = useState<string[]>([]);

  // Menu State
  const [activeCardMenu, setActiveCardMenu] = useState<string | null>(null);
  const [activeTagMenu, setActiveTagMenu] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Effects ---
  useEffect(() => {
    const saved = localStorage.getItem(APP_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setCards(parsed.cards || []);
        
        // Migrate legacy tags
        if (parsed.tags && parsed.tags.length > 0) {
            if (typeof parsed.tags[0] === 'string') {
                setTags(parsed.tags.map((t: string) => ({ name: t, isPinned: false })));
            } else {
                setTags(parsed.tags);
            }
        } else {
            setTags([
                { name: '英语', isPinned: false }, 
                { name: '阅读', isPinned: false }, 
                { name: '编程', isPinned: false }
            ]);
        }
      } catch (e) {
        console.error("Failed to load data", e);
      }
    } else {
        setTags([
            { name: '英语', isPinned: false }, 
            { name: '阅读', isPinned: false }, 
            { name: '编程', isPinned: false }
        ]);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(APP_STORAGE_KEY, JSON.stringify({ cards, tags }));
  }, [cards, tags]);

  // --- Computed ---
  const dueCards = useMemo(() => {
    const now = Date.now();
    return cards.filter(c => c.stage < MAX_STAGE && c.nextReviewDate <= now);
  }, [cards]);

  const dailyRandomCards = useMemo(() => {
      if (view !== 'daily') return [];
      const shuffled = [...cards].sort(() => 0.5 - Math.random());
      return shuffled.slice(0, 10);
  }, [view, cards.length]); 

  const sortedTags = useMemo(() => {
      return [...tags].sort((a, b) => {
          if (a.isPinned === b.isPinned) return a.name.localeCompare(b.name, 'zh-CN');
          return a.isPinned ? -1 : 1;
      });
  }, [tags]);

  const filteredCards = useMemo(() => {
      if (!searchQuery) return [];
      const lowerQ = searchQuery.toLowerCase();
      return cards.filter(c => 
        c.title.toLowerCase().includes(lowerQ) || 
        c.tags.some(t => t.toLowerCase().includes(lowerQ)) ||
        c.blocks.some(b => b.type === 'text' && b.content.toLowerCase().includes(lowerQ))
      );
  }, [searchQuery, cards]);

  const cardsBySelectedTag = useMemo(() => {
      if (!selectedTag) return [];
      return cards.filter(c => c.tags.includes(selectedTag));
  }, [selectedTag, cards]);

  // --- Actions ---

  const handleCreateCard = () => {
    setEditingCardId(null);
    setEditorTitle('');
    setEditorBlocks([{ id: generateId(), type: 'text', content: '' }]);
    setEditorRemark('');
    setEditorTags([]);
    setView('edit');
  };

  const handleEditCard = (card: Card) => {
    setEditingCardId(card.id);
    setEditorTitle(card.title);
    setEditorBlocks(card.blocks);
    setEditorRemark(card.remark);
    setEditorTags(card.tags);
    setView('edit');
    setActiveCardMenu(null);
  };

  const handleSaveCard = () => {
    if (!editorTitle.trim()) {
      alert("请输入标题");
      return;
    }

    const now = Date.now();
    
    // Extract tags from Content Blocks
    const inlineTags = new Set<string>();
    editorBlocks.forEach(b => {
        if (b.type === 'text') {
            const matches = b.content.match(/#(\S+)/g);
            if (matches) {
                matches.forEach((m: string) => inlineTags.add(m.slice(1)));
            }
        }
    });

    // Merge explicitly added tags with inline extracted tags
    const finalTags = Array.from(new Set([...editorTags, ...Array.from(inlineTags)]));

    const existingTagNames = tags.map(t => t.name);
    const newTags = finalTags.filter(t => !existingTagNames.includes(t));
    if (newTags.length > 0) {
        setTags([...tags, ...newTags.map(t => ({ name: t, isPinned: false }))]);
    }
    
    if (editingCardId) {
      setCards(cards.map(c => c.id === editingCardId ? {
        ...c,
        title: editorTitle,
        blocks: editorBlocks,
        remark: editorRemark,
        tags: finalTags,
        updatedAt: now
      } : c));
    } else {
      const newCard: Card = {
        id: generateId(),
        title: editorTitle,
        blocks: editorBlocks,
        remark: editorRemark,
        tags: finalTags,
        createdAt: now,
        updatedAt: now,
        stage: 0,
        nextReviewDate: calculateNextReview(0, now),
        reviewCount: 0,
        history: [],
        linkedCardIds: []
      };
      setCards([newCard, ...cards]);
    }
    setView('main');
  };

  const handleDeleteCard = (id: string) => {
    if (confirm("确定删除此卡片吗？")) {
      setCards(cards.filter(c => c.id !== id));
      setActiveCardMenu(null);
      if (viewingCard?.id === id) setView('main');
    }
  };

  const handleCopyCard = (card: Card) => {
     const text = `${card.title}\n\n${card.blocks.map(b => b.content).join('\n')}`;
     navigator.clipboard.writeText(text).then(() => alert("已复制内容"));
     setActiveCardMenu(null);
  };

  const handleShareCard = (card: Card) => {
      if (navigator.share) {
          navigator.share({
              title: card.title,
              text: card.blocks.map(b => b.type === 'text' ? b.content : '').join('\n')
          });
      } else {
          alert("浏览器不支持原生分享，请使用复制功能");
      }
      setActiveCardMenu(null);
  };

  const handleReviewAction = (cardId: string, remembered: boolean) => {
      setCards(cards.map(c => {
          if (c.id !== cardId) return c;
          const now = Date.now();
          let newStage = c.stage;
          let action: 'remembered' | 'forgot' = remembered ? 'remembered' : 'forgot';

          if (remembered) {
              newStage = Math.min(c.stage + 1, MAX_STAGE);
          } else {
              newStage = 0; 
          }

          const nextDate = calculateNextReview(newStage, now);
          
          const log: ReviewLog = {
              date: now,
              action,
              stageBefore: c.stage,
              stageAfter: newStage
          };

          return {
              ...c,
              stage: newStage,
              reviewCount: c.reviewCount + 1,
              nextReviewDate: nextDate,
              history: [...c.history, log]
          };
      }));
  };

  const handleDeleteTag = (tagName: string) => {
    if(confirm(`确定删除标签 #${tagName} 吗？`)) {
        setTags(tags.filter(t => t.name !== tagName));
        setActiveTagMenu(null);
    }
  };
  
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if(e.target.files && e.target.files[0]) {
          try {
            const result = await importFromExcel(e.target.files[0]);
            if(result) {
                if(confirm(`发现 ${result.cards.length} 张卡片。这将会覆盖当前数据，确定吗？`)) {
                    setCards(result.cards);
                    setTags(result.tags);
                    alert("导入成功");
                }
            }
            // Reset input
            e.target.value = '';
          } catch(err) {
            alert("导入失败，请检查文件格式");
            console.error(err);
          }
      }
  };

  const handleExport = () => {
      exportToExcel(cards, tags);
  }

  // --- Link Navigation ---
  const handleLinkClick = (title: string) => {
      const target = cards.find(c => c.title.trim() === title.trim());
      if (target) {
          setViewingCard(target);
          setView('tag_detail');
      } else {
          alert(`未找到标题为 "${title}" 的卡片`);
      }
  };

  const renderCard = (card: Card, reviewMode = false, dailyMode = false) => (
      <CardItem 
        key={card.id}
        card={card}
        isReviewMode={reviewMode}
        isDailyMode={dailyMode}
        activeMenuId={activeCardMenu}
        onMenuClick={setActiveCardMenu}
        onEdit={handleEditCard}
        onCopy={handleCopyCard}
        onShare={handleShareCard}
        onDelete={handleDeleteCard}
        onReviewAction={handleReviewAction}
        onLinkClick={handleLinkClick}
      />
  );

  // --- Main Views ---

  if (view === 'edit') {
    return (
      <div className="flex flex-col h-full bg-white relative">
        <header className="flex items-center justify-between p-4 border-b bg-white sticky top-0 z-20">
          <button onClick={() => setView('main')}><ArrowLeft className="text-gray-600" /></button>
          <h1 className="font-bold text-lg text-black">{editingCardId ? '编辑知识卡片' : '新建知识卡片'}</h1>
          <button onClick={handleSaveCard} className="text-blue-600 font-bold">保存</button>
        </header>
        
        <div className="flex-1 overflow-hidden flex flex-col w-full max-w-2xl mx-auto">
             <div className="px-4 py-4 border-b border-gray-100">
                <input 
                    type="text" 
                    placeholder="请输入标题..." 
                    className="w-full text-xl font-bold outline-none text-black placeholder-gray-300 py-2 bg-transparent"
                    value={editorTitle}
                    onChange={e => setEditorTitle(e.target.value)}
                />
             </div>
             <div className="flex-1 overflow-hidden relative">
                <BlockEditor 
                    blocks={editorBlocks} 
                    onChange={setEditorBlocks} 
                    availableTags={tags.map(t => t.name)}
                    availableCards={cards}
                    onAddTag={(tag) => {
                        if(!editorTags.includes(tag)) setEditorTags([...editorTags, tag]);
                    }}
                />
             </div>
        </div>
      </div>
    );
  }

  // Reuse "tag_detail" view for generic card list viewing (e.g. from Link Click)
  if (view === 'tag_detail') {
      const displayCards = viewingCard ? [viewingCard] : cardsBySelectedTag;
      const title = viewingCard ? '相关笔记' : `#${selectedTag}`;

      return (
        <div className="flex flex-col h-full bg-white">
            <header className="bg-white p-4 border-b flex items-center sticky top-0 z-10">
               <button onClick={() => {
                   if (viewingCard) {
                       setViewingCard(null);
                       setView('main'); // Go back to main
                   } else {
                       setView('main');
                       setSelectedTag(null);
                   }
               }} className="mr-4 text-gray-600"><ArrowLeft/></button>
               <h1 className="font-bold text-lg text-black">{title}</h1>
           </header>
           <div className="flex-1 overflow-y-auto p-4 no-scrollbar">
                {displayCards.length === 0 ? (
                    <div className="text-center text-gray-300 mt-20">暂无内容</div>
                ) : (
                    <div className="max-w-xl mx-auto">
                        {displayCards.map(c => renderCard(c))}
                    </div>
                )}
           </div>
        </div>
      )
  }

  if (view === 'review') {
      return (
        <div className="flex flex-col h-full bg-white">
           <header className="bg-white p-4 border-b flex items-center sticky top-0 z-10">
               <button onClick={() => setView('main')} className="mr-4 text-gray-600"><ArrowLeft/></button>
               <h1 className="font-bold text-lg text-black">艾宾浩斯复习</h1>
           </header>
           <div className="flex-1 overflow-y-auto p-4 no-scrollbar">
                {dueCards.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-green-500">
                        <CheckCircle size={64} className="mb-4"/>
                        <p className="font-bold text-lg">太棒了！</p>
                        <p className="text-sm text-gray-400">所有复习任务已完成</p>
                    </div>
                ) : (
                    <div className="max-w-xl mx-auto">
                        <div className="text-sm text-gray-400 mb-4 text-center">今日待复习: {dueCards.length} 张</div>
                        {dueCards.map(c => renderCard(c, true))}
                    </div>
                )}
           </div>
        </div>
      );
  }

  if (view === 'daily') {
      return (
        <div className="flex flex-col h-full bg-white">
           <header className="bg-white p-4 border-b flex items-center sticky top-0 z-10">
               <button onClick={() => setView('main')} className="mr-4 text-gray-600"><ArrowLeft/></button>
               <h1 className="font-bold text-lg text-black">每日随机回顾</h1>
           </header>
           <div className="flex-1 overflow-y-auto p-4 no-scrollbar">
               <div className="max-w-xl mx-auto">
                   {dailyRandomCards.map(c => renderCard(c, false, true))}
               </div>
           </div>
        </div>
      );
  }

  // --- Main View (Tabs: Learn | All) ---
  return (
    <div className="flex flex-col h-full max-w-md mx-auto bg-white shadow-2xl overflow-hidden relative">
      
      {/* View Content */}
      <div className="flex-1 overflow-hidden relative flex flex-col pb-16">
          
          {/* Learn Tab */}
          {activeTab === 'learn' && (
              <div className="flex flex-col h-full relative">
                 <div className="flex-1 overflow-y-auto p-6 space-y-6 pb-32 no-scrollbar"> 
                     
                     <div className="flex gap-4">
                        <button 
                            onClick={() => setView('review')}
                            className="flex-1 bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl shadow-lg flex flex-col items-center justify-center text-white transform transition-transform active:scale-95 h-40"
                        >
                             <div className="bg-white/20 p-3 rounded-full mb-2">
                                <Calendar size={28} />
                             </div>
                             <span className="text-lg font-bold tracking-wide">艾宾浩斯</span>
                             <span className="text-xs mt-1 opacity-80 bg-black/10 px-2 py-0.5 rounded-full">
                                 待复习: {dueCards.length}
                             </span>
                        </button>

                         <button 
                            onClick={() => setView('daily')}
                            className="flex-1 bg-gradient-to-br from-orange-400 to-orange-500 rounded-3xl shadow-lg flex flex-col items-center justify-center text-white transform transition-transform active:scale-95 h-40"
                        >
                             <div className="bg-white/20 p-3 rounded-full mb-2">
                                <RotateCcw size={28} />
                             </div>
                             <span className="text-lg font-bold tracking-wide">随机回顾</span>
                             <span className="text-xs mt-1 opacity-80 bg-black/10 px-2 py-0.5 rounded-full">
                                 每日10张
                             </span>
                        </button>
                     </div>

                     <div className="mt-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-black">最近卡片</h2>
                            <button onClick={() => setActiveTab('all')} className="text-sm text-blue-500">查看全部</button>
                        </div>
                        {cards.slice(0, 5).map(c => renderCard(c))}
                        {cards.length === 0 && <div className="text-gray-300 text-center py-10">开始添加你的第一张卡片吧</div>}
                     </div>
                 </div>

                 {/* FAB Button - Fixed positioning bottom-right above navbar */}
                 <button 
                    onClick={handleCreateCard}
                    className="absolute bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-xl flex items-center justify-center hover:bg-blue-700 active:scale-90 transition-all z-40"
                 >
                    <Plus size={28} />
                 </button>
              </div>
          )}

          {/* All Tab - REVERTED TO ORIGINAL LOGIC (Tag List + Import/Export) */}
          {activeTab === 'all' && (
              <div className="flex flex-col h-full bg-white">
                  {/* Search Header */}
                  <div className="p-4 sticky top-0 bg-white z-10 border-b border-gray-50">
                      <div className="relative bg-gray-100 rounded-xl flex items-center px-4 py-3">
                          <Search size={20} className="text-gray-400 mr-2"/>
                          <input 
                             type="text" 
                             className="bg-transparent outline-none flex-1 text-base text-black placeholder-gray-400"
                             placeholder="搜索卡片、标签..."
                             value={searchQuery}
                             onChange={e => setSearchQuery(e.target.value)}
                          />
                      </div>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto no-scrollbar">
                      {searchQuery ? (
                          /* Search Results View */
                          <div className="p-4">
                              {filteredCards.length > 0 ? filteredCards.map(c => renderCard(c)) : (
                                  <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                                      <Search size={32} className="mb-2 opacity-20"/>
                                      <p className="text-sm">未找到相关内容</p>
                                  </div>
                              )}
                          </div>
                      ) : (
                          /* Original "Tags + Actions" View */
                          <div className="flex flex-col min-h-full">
                              <div className="px-4 py-2 bg-gray-50/50 text-xs font-bold text-gray-400">
                                  全部标签 ({tags.length})
                              </div>
                              <div className="divide-y divide-gray-100">
                                  {sortedTags.map(tag => (
                                      <div key={tag.name} className="flex items-center justify-between p-4 bg-white hover:bg-gray-50 active:bg-gray-100 transition-colors">
                                          <div 
                                              className="flex items-center flex-1 cursor-pointer"
                                              onClick={() => {
                                                  setSelectedTag(tag.name);
                                                  setView('tag_detail');
                                              }}
                                          >
                                              <Hash size={18} className="text-gray-400 mr-3" />
                                              <span className="text-base font-medium text-slate-700">{tag.name}</span>
                                          </div>
                                          
                                          <div className="relative">
                                              <button 
                                                  className="p-2 text-gray-300 hover:text-gray-600 rounded-full active:bg-gray-100"
                                                  onClick={(e) => {
                                                      e.stopPropagation();
                                                      setActiveTagMenu(activeTagMenu === tag.name ? null : tag.name);
                                                  }}
                                              >
                                                  <MoreHorizontal size={20} />
                                              </button>
                                              
                                              {/* Tag Menu Popover */}
                                              {activeTagMenu === tag.name && (
                                                  <div className="absolute right-0 top-10 bg-white shadow-xl border rounded-lg z-20 w-32 overflow-hidden animate-fade-in">
                                                       <button 
                                                          onClick={(e) => {
                                                              e.stopPropagation();
                                                              handleDeleteTag(tag.name);
                                                          }} 
                                                          className="w-full text-left px-4 py-3 text-red-600 hover:bg-red-50 text-sm flex items-center"
                                                       >
                                                          <Trash size={14} className="mr-2"/> 删除
                                                       </button>
                                                  </div>
                                              )}
                                          </div>
                                      </div>
                                  ))}
                              </div>

                              {/* Empty space filler */}
                              <div className="flex-1 min-h-[50px]"></div>

                              {/* Import/Export Buttons - Centered and Large */}
                              <div className="mt-8 mb-24 flex justify-center gap-16">
                                  <button onClick={handleExport} className="flex flex-col items-center gap-3 group">
                                      <div className="w-14 h-14 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-500 group-active:scale-95 transition-transform shadow-sm group-hover:bg-gray-100 group-hover:text-blue-500">
                                          <FileUp size={24}/>
                                      </div>
                                      <span className="text-sm text-gray-500 font-medium">导出数据</span>
                                  </button>
                                  
                                  <div className="relative">
                                       <button className="flex flex-col items-center gap-3 group">
                                          <div className="w-14 h-14 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-500 group-active:scale-95 transition-transform shadow-sm group-hover:bg-gray-100 group-hover:text-blue-500">
                                              <FileDown size={24}/>
                                          </div>
                                          <span className="text-sm text-gray-500 font-medium">导入数据</span>
                                      </button>
                                      <input 
                                          type="file" 
                                          accept=".xlsx" 
                                          className="absolute inset-0 opacity-0 cursor-pointer" 
                                          onChange={handleImport}
                                      />
                                  </div>
                              </div>
                          </div>
                      )}
                  </div>
              </div>
          )}
      </div>

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default App;