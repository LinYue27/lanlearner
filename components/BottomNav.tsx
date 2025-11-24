import React from 'react';
import { Home, Grid } from 'lucide-react';
import { MainTab } from '../types';

interface BottomNavProps {
    activeTab: MainTab;
    onTabChange: (tab: MainTab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
    return (
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-200 flex justify-around items-center z-50">
            <button 
               onClick={() => onTabChange('learn')}
               className={`flex flex-col items-center justify-center w-full h-full ${activeTab === 'learn' ? 'text-slate-800' : 'text-gray-400'}`}
            >
                <div className={`p-1 rounded-xl transition-all ${activeTab === 'learn' ? 'bg-slate-100' : ''}`}>
                  <Home size={24} strokeWidth={activeTab === 'learn' ? 2.5 : 2} />
                </div>
                <span className="text-[10px] font-medium mt-1">学习</span>
            </button>
            
            <button 
               onClick={() => onTabChange('all')}
               className={`flex flex-col items-center justify-center w-full h-full ${activeTab === 'all' ? 'text-slate-800' : 'text-gray-400'}`}
            >
                <div className={`p-1 rounded-xl transition-all ${activeTab === 'all' ? 'bg-slate-100' : ''}`}>
                  <Grid size={24} strokeWidth={activeTab === 'all' ? 2.5 : 2} />
                </div>
                <span className="text-[10px] font-medium mt-1">全部</span>
            </button>
        </div>
    );
};
