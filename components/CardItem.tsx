import React from 'react';
import { Card } from '../types';
import { formatDate } from '../utils/helpers';
import { MoreHorizontal, Edit2, Copy, Share2, Trash, XCircle, CheckCircle } from 'lucide-react';

interface CardItemProps {
    card: Card;
    isReviewMode?: boolean;
    isDailyMode?: boolean;
    activeMenuId: string | null;
    onMenuClick: (id: string | null) => void;
    onEdit: (card: Card) => void;
    onCopy: (card: Card) => void;
    onShare: (card: Card) => void;
    onDelete: (id: string) => void;
    onReviewAction: (id: string, remembered: boolean) => void;
    onLinkClick: (title: string) => void;
}

export const CardItem: React.FC<CardItemProps> = ({
    card,
    isReviewMode = false,
    isDailyMode = false,
    activeMenuId,
    onMenuClick,
    onEdit,
    onCopy,
    onShare,
    onDelete,
    onReviewAction,
    onLinkClick
}) => {
    
    // --- Content Parser (for Links & Tags) ---
    const renderContentWithLinks = (text: string) => {
        const parts = text.split(/(#\S+)|(@\S+)/g);
        return parts.map((part, i) => {
            if (!part) return null;
            if (part.startsWith('#')) {
                return <span key={i} className="text-blue-600 font-bold bg-blue-100 px-1 mx-0.5 rounded text-sm">{part}</span>;
            }
            if (part.startsWith('@')) {
                const title = part.substring(1);
                return (
                  <span 
                      key={i} 
                      className="text-blue-600 font-bold bg-blue-100 px-1 mx-0.5 rounded text-sm cursor-pointer hover:bg-blue-200"
                      onClick={(e) => {
                          e.stopPropagation();
                          onLinkClick(title);
                      }}
                  >
                      {part}
                  </span>
                );
            }
            return <span key={i} className="text-black">{part}</span>;
        });
    };

    return (
        <div className="bg-[#FFFBEB] rounded-lg shadow-sm border border-amber-100 p-4 mb-3 relative animate-fade-in">
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-bold text-lg text-black">{card.title}</h3>
            {!isReviewMode && (
              <button onClick={() => onMenuClick(activeMenuId === card.id ? null : card.id)} className="text-slate-400 p-1">
                <MoreHorizontal size={20} />
              </button>
            )}
          </div>
          
          {activeMenuId === card.id && (
              <div className="absolute right-2 top-10 bg-white shadow-lg border rounded-md z-20 w-32 flex flex-col py-1">
                  <button onClick={() => onEdit(card)} className="flex items-center px-4 py-2 text-sm hover:bg-slate-50 text-slate-700">
                      <Edit2 size={14} className="mr-2"/> 修改
                  </button>
                  <button onClick={() => onCopy(card)} className="flex items-center px-4 py-2 text-sm hover:bg-slate-50 text-slate-700">
                      <Copy size={14} className="mr-2"/> 复制
                  </button>
                  <button onClick={() => onShare(card)} className="flex items-center px-4 py-2 text-sm hover:bg-slate-50 text-slate-700">
                      <Share2 size={14} className="mr-2"/> 转发
                  </button>
                  <button onClick={() => onDelete(card.id)} className="flex items-center px-4 py-2 text-sm hover:bg-red-50 text-red-600 border-t">
                      <Trash size={14} className="mr-2"/> 删除
                  </button>
              </div>
          )}
    
          {/* Content Rendering */}
          <div className="text-black text-sm mb-3 max-h-40 overflow-hidden text-ellipsis leading-relaxed whitespace-pre-wrap">
             {card.blocks.map((b, idx) => {
                 if (b.type === 'text') return <span key={idx}>{renderContentWithLinks(b.content)} </span>;
                 if (b.type === 'image') return <div key={idx} className="my-1 text-xs text-gray-400">[图片]</div>;
                 if (b.type === 'table') return <div key={idx} className="my-1 text-xs text-gray-400">[表格]</div>;
                 return null;
             })}
          </div>
    
          <div className="flex justify-between items-center text-xs text-slate-400 mt-2">
              <span>{formatDate(card.createdAt).split(' ')[0]} 创建</span>
              <span>复习: {card.reviewCount}次 | 阶段: {card.stage}</span>
          </div>
    
          {isReviewMode && (
              <div className="mt-4 flex gap-2 pt-3 border-t border-amber-200">
                  <button 
                    onClick={() => onReviewAction(card.id, false)}
                    className="flex-1 bg-white border border-red-100 text-red-600 py-2 rounded-md font-medium text-sm flex justify-center items-center hover:bg-red-50"
                  >
                      <XCircle size={16} className="mr-1"/> 未记住
                  </button>
                  <button 
                    onClick={() => onReviewAction(card.id, true)}
                    className="flex-1 bg-white border border-green-100 text-green-600 py-2 rounded-md font-medium text-sm flex justify-center items-center hover:bg-green-50"
                  >
                      <CheckCircle size={16} className="mr-1"/> 记住了
                  </button>
              </div>
          )}
          
          {isDailyMode && (
             <div className="mt-2 text-center text-xs text-orange-400 bg-white/50 py-1 rounded">
                 每日随机回顾
             </div>
          )}
        </div>
      );
}