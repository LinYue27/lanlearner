import React, { useState, useRef, useEffect } from 'react';
import { BlockType, ContentBlock, Card, TableData } from '../types';
import { generateId, getBase64 } from '../utils/helpers';
import { Image as ImageIcon, Table as TableIcon, X, MoreHorizontal, Trash2, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Hash, Link as LinkIcon, AtSign } from 'lucide-react';

interface BlockEditorProps {
  blocks: ContentBlock[];
  onChange: (blocks: ContentBlock[]) => void;
  availableTags: string[];
  availableCards: Card[]; // For @ linking
  onAddTag: (tag: string) => void;
}

export const BlockEditor: React.FC<BlockEditorProps> = ({ blocks, onChange, availableTags, availableCards, onAddTag }) => {
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  
  // Autocomplete state
  const [showTagMenu, setShowTagMenu] = useState(false);
  const [showLinkMenu, setShowLinkMenu] = useState(false);
  const [searchText, setSearchText] = useState('');
  
  // Table Interaction State
  const [activeCell, setActiveCell] = useState<{ blockId: string; row: number; col: number; rect: DOMRect | null } | null>(null);
  const [showTableMenu, setShowTableMenu] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Block Management ---

  const addBlock = (type: BlockType, content: string = '', tableData?: TableData) => {
    const newBlock: ContentBlock = {
      id: generateId(),
      type,
      content,
      tableData: type === 'table' ? (tableData || { rows: [['', ''], ['', '']] }) : undefined
    };
    onChange([...blocks, newBlock]);
    
    // Focus logic
    if (type === 'text') {
        setTimeout(() => {
             const el = document.getElementById(`block-${newBlock.id}`);
             if (el) el.focus();
        }, 50);
    }
  };

  const updateBlock = (id: string, updates: Partial<ContentBlock>) => {
    onChange(blocks.map(b => b.id === id ? { ...b, ...updates } : b));
  };

  const removeBlock = (id: string) => {
    onChange(blocks.filter(b => b.id !== id));
    if (activeCell?.blockId === id) setActiveCell(null);
  };

  // --- Toolbar Actions ---

  const handleToolbarInsert = (char: string) => {
      let targetBlockId = activeBlockId;
      let targetBlock = blocks.find(b => b.id === activeBlockId && b.type === 'text');

      if (!targetBlock) {
          // If no active text block, create one at end or use last one
          const lastBlock = blocks[blocks.length - 1];
          if (lastBlock && lastBlock.type === 'text') {
              targetBlockId = lastBlock.id;
              targetBlock = lastBlock;
          } else {
            const newId = generateId();
            const newBlock: ContentBlock = { id: newId, type: 'text', content: char };
            onChange([...blocks, newBlock]);
            targetBlockId = newId;
            setTimeout(() => {
                const el = document.getElementById(`block-${newId}`) as HTMLTextAreaElement;
                if (el) {
                    el.focus();
                    el.setSelectionRange(char.length, char.length);
                    handleTextChange(newId, char, { target: el } as any);
                }
            }, 50);
            return;
          }
      }

      // Insert at cursor
      const el = document.getElementById(`block-${targetBlockId}`) as HTMLTextAreaElement;
      if (el) {
          const start = el.selectionStart || targetBlock!.content.length;
          const text = targetBlock!.content;
          const newText = text.slice(0, start) + char + text.slice(start);
          updateBlock(targetBlockId!, { content: newText });
          
          setTimeout(() => {
              el.focus();
              el.setSelectionRange(start + 1, start + 1);
              handleTextChange(targetBlockId!, newText, { target: el } as any);
          }, 10);
      }
  };

  const handleImageClick = () => {
      fileInputRef.current?.click();
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const base64 = await getBase64(e.target.files[0]);
      addBlock('image', base64);
    }
    if (e.target.value) e.target.value = '';
  };

  // --- Table Logic ---

  const handleTableFocus = (blockId: string, row: number, col: number, e: React.FocusEvent) => {
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      setActiveCell({ blockId, row, col, rect });
      setShowTableMenu(false); 
      setActiveBlockId(null);
  };

  const handleTableAction = (action: string) => {
    if (!activeCell) return;
    const { blockId, row: rIdx, col: cIdx } = activeCell;
    const block = blocks.find(b => b.id === blockId);
    if (!block || !block.tableData) return;

    const rows = [...block.tableData.rows.map(r => [...r])]; 
    
    if (action === 'addRowAbove') rows.splice(rIdx, 0, new Array(rows[0].length).fill(''));
    if (action === 'addRowBelow') rows.splice(rIdx + 1, 0, new Array(rows[0].length).fill(''));
    if (action === 'addColLeft') rows.forEach(r => r.splice(cIdx, 0, ''));
    if (action === 'addColRight') rows.forEach(r => r.splice(cIdx + 1, 0, ''));
    if (action === 'delRow') {
        if (rows.length > 1) rows.splice(rIdx, 1);
        else removeBlock(blockId);
    }
    if (action === 'delCol') {
        if (rows[0].length > 1) rows.forEach(r => r.splice(cIdx, 1));
    }

    updateBlock(blockId, { tableData: { rows } });
    setShowTableMenu(false);
    setActiveCell(null);
  };
  
  const updateTableCell = (blockId: string, rowIndex: number, colIndex: number, value: string) => {
      const block = blocks.find(b => b.id === blockId);
      if(!block || !block.tableData) return;
      const rows = [...block.tableData.rows];
      rows[rowIndex][colIndex] = value;
      updateBlock(blockId, { tableData: { rows } });
  };

  // --- Text & Autocomplete Logic ---

  const handleTextChange = (id: string, text: string, e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateBlock(id, { content: text });
    
    // Auto-resize
    e.target.style.height = 'auto';
    e.target.style.height = `${e.target.scrollHeight}px`;
    
    const cursor = e.target.selectionStart;
    const textBeforeCursor = text.slice(0, cursor);
    
    // Check for # (Tags)
    const tagMatch = textBeforeCursor.match(/#(\S*)$/);
    if (tagMatch) {
      const query = tagMatch[1];
      setSearchText(query);
      setShowTagMenu(true);
      setShowLinkMenu(false);
      setActiveBlockId(id);
      return;
    }

    // Check for @ (Links)
    const linkMatch = textBeforeCursor.match(/@(\S*)$/);
    if (linkMatch) {
      const query = linkMatch[1];
      setSearchText(query);
      setShowLinkMenu(true);
      setShowTagMenu(false);
      setActiveBlockId(id);
      return;
    }

    setShowTagMenu(false);
    setShowLinkMenu(false);
  };

  const insertTag = (tag: string) => {
    if (!activeBlockId) return;
    const block = blocks.find(b => b.id === activeBlockId);
    if (!block) return;

    const el = document.getElementById(`block-${activeBlockId}`) as HTMLTextAreaElement;
    const cursor = el?.selectionStart || block.content.length;
    
    const textBefore = block.content.slice(0, cursor);
    const textAfter = block.content.slice(cursor);
    // Insert with space at end
    const newTextBefore = textBefore.replace(/#\S*$/, `#${tag} `);
    
    updateBlock(activeBlockId, { content: newTextBefore + textAfter });
    onAddTag(tag);
    setShowTagMenu(false);
    
    setTimeout(() => {
        if (el) {
            el.focus();
            const newCursor = newTextBefore.length;
            el.setSelectionRange(newCursor, newCursor);
            // Trigger resize
            el.style.height = 'auto';
            el.style.height = `${el.scrollHeight}px`;
        }
    }, 10);
  };

  const insertLink = (cardTitle: string) => {
    if (!activeBlockId) return;
    const block = blocks.find(b => b.id === activeBlockId);
    if (!block) return;

    const el = document.getElementById(`block-${activeBlockId}`) as HTMLTextAreaElement;
    const cursor = el?.selectionStart || block.content.length;

    const textBefore = block.content.slice(0, cursor);
    const textAfter = block.content.slice(cursor);
    // Insert simple @Title with space
    const newTextBefore = textBefore.replace(/@\S*$/, `@${cardTitle} `); 
    
    updateBlock(activeBlockId, { content: newTextBefore + textAfter });
    setShowLinkMenu(false);

    setTimeout(() => {
        if (el) {
            el.focus();
            const newCursor = newTextBefore.length;
            el.setSelectionRange(newCursor, newCursor);
             // Trigger resize
            el.style.height = 'auto';
            el.style.height = `${el.scrollHeight}px`;
        }
    }, 10);
  };

  // --- Rendering Highlighting ---
  const renderHighlightedText = (text: string) => {
      // Split by tags (#...) or links (@...)
      const parts = text.split(/(#\S+)|(@\S+)/g);
      
      return parts.map((part, index) => {
          if (!part) return null;
          if (part.startsWith('#')) {
              return <span key={index} className="text-blue-600 font-bold bg-blue-100 px-1 mx-0.5 rounded text-sm align-baseline">{part}</span>;
          }
          if (part.startsWith('@')) {
              return <span key={index} className="text-blue-600 font-bold bg-blue-100 px-1 mx-0.5 rounded text-sm align-baseline">{part}</span>;
          }
          return <span key={index} className="text-black">{part}</span>;
      });
  };

  return (
    <div className="flex flex-col h-full relative" ref={containerRef}>
      <div className="flex-1 overflow-y-auto pb-32 space-y-4">
        {blocks.map((block) => (
          <div key={block.id} className="relative group px-1">
            {block.type === 'text' && (
              <div className="relative min-h-[40px] w-full">
                  {/* Highlighting Layer (Bottom) - VISIBLE TEXT */}
                  <div 
                    className="absolute inset-0 p-2 whitespace-pre-wrap font-sans text-base leading-loose pointer-events-none break-words"
                    aria-hidden="true"
                    style={{ color: 'transparent' }} // Ensure container is transparent, but children spans dictate color
                  >
                      {renderHighlightedText(block.content)}
                      {/* Trailing break to ensure height match with textarea if ending with newline */}
                      {block.content.endsWith('\n') && <br />}
                  </div>

                  {/* Input Layer (Top) - INVISIBLE TEXT, VISIBLE CARET */}
                  <textarea
                    id={`block-${block.id}`}
                    className="w-full resize-none outline-none text-base p-2 leading-loose bg-transparent caret-black break-words overflow-hidden relative z-10 placeholder-gray-300"
                    style={{
                        color: 'transparent',
                        caretColor: 'black',
                    }}
                    value={block.content}
                    placeholder="输入内容 (#标签 @引用)..."
                    onChange={(e) => handleTextChange(block.id, e.target.value, e)}
                    onFocus={() => {
                        setActiveBlockId(block.id);
                        setActiveCell(null);
                        setShowTableMenu(false);
                    }}
                    onInput={(e) => {
                        const target = e.target as HTMLTextAreaElement;
                        target.style.height = 'auto';
                        target.style.height = `${target.scrollHeight}px`;
                    }}
                    ref={(el) => {
                        if (el) {
                            el.style.height = 'auto';
                            el.style.height = `${el.scrollHeight}px`;
                        }
                    }}
                  />
              </div>
            )}

            {block.type === 'image' && (
              <div className="relative my-2 group-hover:bg-gray-50 rounded p-1">
                 <button 
                    onClick={() => removeBlock(block.id)}
                    className="absolute right-2 top-2 bg-black/50 text-white rounded-full p-1 z-20"
                >
                    <X size={12} />
                </button>
                <img src={block.content} alt="Content" className="max-w-full rounded-lg max-h-[300px] object-contain mx-auto shadow-sm" />
              </div>
            )}

            {block.type === 'table' && block.tableData && (
              <div className="overflow-x-auto relative my-2 pl-1">
                <table className="border-collapse border border-gray-300 text-sm">
                  <tbody>
                    {block.tableData.rows.map((row, rIdx) => (
                      <tr key={rIdx}>
                        {row.map((cell, cIdx) => (
                          <td key={`${rIdx}-${cIdx}`} className="border border-gray-300 p-0 min-w-[60px] relative">
                             <input 
                               value={cell} 
                               onChange={(e) => updateTableCell(block.id, rIdx, cIdx, e.target.value)}
                               onFocus={(e) => handleTableFocus(block.id, rIdx, cIdx, e)}
                               className="w-full h-full p-2 outline-none bg-transparent text-black"
                             />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
        {/* Padding for bottom toolbar */}
        <div className="h-12 w-full"></div>
      </div>

      {/* --- Context Menus --- */}

      {/* Table Context Menu */}
      {activeCell && (
        <>
            <div 
                className="fixed z-40 animate-fade-in"
                style={{ 
                    top: (activeCell.rect?.top || 0) - 16, 
                    left: (activeCell.rect?.right || 0) - 10 
                }}
            >
                <button 
                    onClick={() => setShowTableMenu(!showTableMenu)}
                    className="bg-blue-600 text-white rounded-full p-1 shadow-lg hover:bg-blue-700 transition-transform transform active:scale-95"
                >
                    <MoreHorizontal size={16} />
                </button>
            </div>

            {showTableMenu && (
                 <div 
                    className="fixed z-50 bg-white shadow-xl border rounded-lg p-1 flex flex-col w-32"
                    style={{ 
                        top: (activeCell.rect?.top || 0) + 20, 
                        left: Math.min((activeCell.rect?.left || 0), window.innerWidth - 140)
                    }}
                 >
                    <div className="text-[10px] text-gray-400 font-bold px-2 py-1 bg-gray-50 mb-1">表格操作</div>
                    <button onClick={() => handleTableAction('addRowAbove')} className="flex items-center px-2 py-2 hover:bg-gray-100 text-xs text-left text-black"><ArrowUp size={12} className="mr-2"/>上面加行</button>
                    <button onClick={() => handleTableAction('addRowBelow')} className="flex items-center px-2 py-2 hover:bg-gray-100 text-xs text-left text-black"><ArrowDown size={12} className="mr-2"/>下面加行</button>
                    <button onClick={() => handleTableAction('addColLeft')} className="flex items-center px-2 py-2 hover:bg-gray-100 text-xs text-left text-black"><ArrowLeft size={12} className="mr-2"/>左边加列</button>
                    <button onClick={() => handleTableAction('addColRight')} className="flex items-center px-2 py-2 hover:bg-gray-100 text-xs text-left text-black"><ArrowRight size={12} className="mr-2"/>右边加列</button>
                    <div className="h-px bg-gray-100 my-1"></div>
                    <button onClick={() => handleTableAction('delRow')} className="flex items-center px-2 py-2 hover:bg-red-50 text-red-500 text-xs text-left"><Trash2 size={12} className="mr-2"/>删除此行</button>
                    <button onClick={() => handleTableAction('delCol')} className="flex items-center px-2 py-2 hover:bg-red-50 text-red-500 text-xs text-left"><X size={12} className="mr-2"/>删除此列</button>
                 </div>
            )}
        </>
      )}

      {/* Tag Autocomplete Menu */}
      {showTagMenu && (
        <div className="fixed bottom-16 left-0 right-0 bg-white border-t shadow-2xl z-50 max-h-48 overflow-y-auto">
          <div className="p-2 border-b bg-gray-50 text-xs font-bold text-gray-500 flex justify-between items-center">
              <span>选择标签</span>
              <button onClick={() => setShowTagMenu(false)}><X size={14}/></button>
          </div>
          {availableTags.filter(t => t.toLowerCase().includes(searchText.toLowerCase())).map(tag => (
            <div 
                key={tag} 
                className="p-3 border-b hover:bg-blue-50 cursor-pointer text-sm flex items-center text-black"
                onClick={() => insertTag(tag)}
            >
              <Hash size={14} className="mr-2 text-blue-500"/> {tag}
            </div>
          ))}
          {searchText && !availableTags.includes(searchText) && (
             <div 
                className="p-3 hover:bg-green-50 cursor-pointer text-sm text-green-600 font-medium flex items-center"
                onClick={() => insertTag(searchText)}
            >
              <div className="bg-green-100 rounded-full p-1 mr-2"><Hash size={12}/></div>
              创建新标签: {searchText}
            </div>
          )}
        </div>
      )}

      {/* Link Autocomplete Menu */}
      {showLinkMenu && (
        <div className="fixed bottom-16 left-0 right-0 bg-white border-t shadow-2xl z-50 max-h-48 overflow-y-auto">
           <div className="p-2 border-b bg-gray-50 text-xs font-bold text-gray-500 flex justify-between items-center">
              <span>关联笔记</span>
              <button onClick={() => setShowLinkMenu(false)}><X size={14}/></button>
           </div>
           {availableCards
             .filter(c => c.title.toLowerCase().includes(searchText.toLowerCase()))
             .map(card => (
               <div 
                 key={card.id} 
                 className="p-3 border-b hover:bg-blue-50 cursor-pointer text-sm truncate flex items-center text-black"
                 onClick={() => insertLink(card.title)}
               >
                 <LinkIcon size={14} className="mr-2 text-blue-500"/>
                 {card.title}
               </div>
             ))
            }
            {availableCards.length === 0 && <div className="p-4 text-center text-gray-400 text-sm">无其他笔记可关联</div>}
        </div>
      )}

      {/* --- Fixed Bottom Toolbar --- */}
      <div className="absolute bottom-0 left-0 right-0 bg-white border-t shadow-lg flex justify-around items-center p-2 z-40 h-14">
        <button 
            onClick={() => handleToolbarInsert('#')}
            className="flex-1 flex justify-center items-center h-full active:bg-gray-100 rounded transition-colors"
        >
            <Hash className="text-gray-600" size={24} />
        </button>

        <button 
            onClick={handleImageClick}
            className="flex-1 flex justify-center items-center h-full active:bg-gray-100 rounded transition-colors"
        >
            <ImageIcon className="text-gray-600" size={24} />
            <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                ref={fileInputRef}
                onChange={handleImageUpload} 
            />
        </button>

        <button 
            onClick={() => handleToolbarInsert('@')}
            className="flex-1 flex justify-center items-center h-full active:bg-gray-100 rounded transition-colors"
        >
            <AtSign className="text-gray-600" size={24} />
        </button>

        <button 
            onClick={() => addBlock('table')}
            className="flex-1 flex justify-center items-center h-full active:bg-gray-100 rounded transition-colors"
        >
            <TableIcon className="text-gray-600" size={24} />
        </button>
      </div>
    </div>
  );
};