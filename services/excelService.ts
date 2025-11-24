import * as XLSX from 'xlsx';
import { Card, TagData } from '../types';

export const exportToExcel = (cards: Card[], tags: TagData[]) => {
    // We create a "Display" sheet and a "Raw" sheet for restoration
    const displayData = cards.map(c => ({
        ID: c.id,
        Title: c.title,
        ContentSummary: c.blocks.map(b => b.type === 'text' ? b.content : `[${b.type}]`).join(' '),
        Tags: c.tags.join(', '),
        Created: new Date(c.createdAt).toISOString(),
        ReviewStage: c.stage,
        NextReview: new Date(c.nextReviewDate).toISOString()
    }));

    // The raw data sheet stores the full JSON to ensure 100% restoration fidelity
    const rawData = cards.map(c => ({
        id: c.id,
        json: JSON.stringify(c)
    }));
    
    // Export tags with pinned status
    const tagData = tags.map(t => ({ 
        tag: t.name,
        isPinned: t.isPinned ? 1 : 0
    }));

    const wb = XLSX.utils.book_new();
    
    const wsDisplay = XLSX.utils.json_to_sheet(displayData);
    XLSX.utils.book_append_sheet(wb, wsDisplay, "Cards (Readable)");

    const wsRaw = XLSX.utils.json_to_sheet(rawData);
    XLSX.utils.book_append_sheet(wb, wsRaw, "RAW_DATA");
    
    const wsTags = XLSX.utils.json_to_sheet(tagData);
    XLSX.utils.book_append_sheet(wb, wsTags, "TAGS");

    XLSX.writeFile(wb, `Lanlearner_Backup_${new Date().toISOString().slice(0,10)}.xlsx`);
};

export const importFromExcel = async (file: File): Promise<{cards: Card[], tags: TagData[]} | null> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                if (!data) return resolve(null);

                // Use 'array' type for better compatibility
                const wb = XLSX.read(data, { type: 'array' });
                
                // Try to read RAW_DATA first
                if (wb.SheetNames.includes("RAW_DATA")) {
                    const wsRaw = wb.Sheets["RAW_DATA"];
                    const rawRows = XLSX.utils.sheet_to_json<{id: string, json: string}>(wsRaw);
                    const cards = rawRows.map(r => JSON.parse(r.json) as Card);
                    
                    let tags: TagData[] = [];
                    if (wb.SheetNames.includes("TAGS")) {
                        const wsTags = wb.Sheets["TAGS"];
                        const tagRows = XLSX.utils.sheet_to_json<{tag: string, isPinned?: number}>(wsTags);
                        tags = tagRows.map(t => ({
                            name: t.tag,
                            isPinned: t.isPinned === 1
                        }));
                    }
                    
                    resolve({ cards, tags });
                } else {
                    alert("Excel文件格式不正确或缺少原始数据(RAW_DATA)工作表。");
                    resolve(null);
                }
            } catch (err) {
                console.error(err);
                reject(err);
            }
        };
        // Use readAsArrayBuffer instead of readAsBinaryString
        reader.readAsArrayBuffer(file);
    });
}
