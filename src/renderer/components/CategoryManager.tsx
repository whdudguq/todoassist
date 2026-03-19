// @TASK P5-S7 - CategoryManager component
// @SPEC docs/planning — 카테고리 관리 (목록, 추가, 수정, 삭제)
import { useState, useRef } from 'react';
import type { Category } from '@shared/types';
import { Button } from '@renderer/components/ui/button';
import { Card, CardContent, CardHeader } from '@renderer/components/ui/card';
import { cn } from '@renderer/lib/cn';

const EMOJI_OPTIONS = [
  '📌', '📝', '📊', '📋', '📁', '📂', '📎', '🔖',
  '✅', '⭐', '🔔', '💡', '🎯', '🏷️', '🗂️', '📅',
  '👥', '💬', '📧', '📞', '🔧', '⚙️', '🏠', '🚀',
  '❤️', '🔥', '⚡', '🌟', '🎨', '🧪', '📈', '🛒',
];

interface CategoryManagerProps {
  categories: Category[];
  onAdd: () => void;
  onUpdate: (id: string, partial: Partial<Omit<Category, 'id' | 'createdAt'>>) => void;
  onDelete: (id: string) => void;
}

function EmojiPicker({ value, onChange }: { value: string; onChange: (emoji: string) => void }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  function handleOpen() {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, left: rect.left });
    }
    setOpen(!open);
  }

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        onClick={handleOpen}
        className={cn(
          'h-8 w-10 rounded-md border border-surface-200 text-lg',
          'hover:bg-surface-100 focus:outline-none focus:ring-2 focus:ring-accent-400',
          'bg-surface-0 flex items-center justify-center',
        )}
        aria-label="아이콘 선택"
      >
        {value}
      </button>
      {open && (
        <div
          className={cn(
            'fixed z-[9999] grid grid-cols-8 gap-1 p-2 rounded-lg',
            'border border-surface-200 bg-surface-0 shadow-lg',
          )}
          style={{ top: pos.top, left: pos.left }}
        >
          {EMOJI_OPTIONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => { onChange(emoji); setOpen(false); }}
              className={cn(
                'w-8 h-8 rounded text-lg flex items-center justify-center',
                'hover:bg-surface-100',
                value === emoji && 'bg-accent-100 ring-1 ring-accent-400',
              )}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function CategoryManager({ categories, onAdd, onUpdate, onDelete }: CategoryManagerProps) {
  return (
    <Card>
      <CardHeader>
        <h3 className="text-sm font-semibold text-surface-700">카테고리 목록</h3>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {categories.length === 0 ? (
          <p className="text-sm text-surface-400">카테고리가 없습니다.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2',
                  'border border-surface-200 bg-surface-50',
                )}
              >
                {/* 이름 */}
                <input
                  type="text"
                  value={cat.name}
                  onChange={(e) => onUpdate(cat.id, { name: e.target.value })}
                  className={cn(
                    'h-8 flex-1 rounded-md border border-surface-200 px-2 text-sm',
                    'focus:outline-none focus:ring-2 focus:ring-accent-400',
                    'bg-surface-0',
                  )}
                  aria-label={`카테고리 이름 ${cat.name}`}
                />

                {/* 색상 */}
                <input
                  type="color"
                  value={cat.color}
                  onChange={(e) => onUpdate(cat.id, { color: e.target.value })}
                  className="h-8 w-10 cursor-pointer rounded border border-surface-200 bg-surface-0 p-0.5"
                  aria-label={`카테고리 색상 ${cat.name}`}
                />

                {/* 아이콘 */}
                <EmojiPicker
                  value={cat.icon}
                  onChange={(emoji) => onUpdate(cat.id, { icon: emoji })}
                />

                {/* 삭제 */}
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={() => onDelete(cat.id)}
                  aria-label="삭제"
                >
                  삭제
                </Button>
              </div>
            ))}
          </div>
        )}

        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onAdd}
          className="self-start"
          aria-label="카테고리 추가"
        >
          + 추가
        </Button>
      </CardContent>
    </Card>
  );
}
