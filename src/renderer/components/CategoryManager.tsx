// @TASK P5-S7 - CategoryManager component
// @SPEC docs/planning — 카테고리 관리 (목록, 추가, 수정, 삭제)
import type { Category } from '@shared/types';
import { Button } from '@renderer/components/ui/button';
import { Card, CardContent, CardHeader } from '@renderer/components/ui/card';
import { cn } from '@renderer/lib/cn';

interface CategoryManagerProps {
  categories: Category[];
  onAdd: () => void;
  onUpdate: (id: string, partial: Partial<Omit<Category, 'id' | 'createdAt'>>) => void;
  onDelete: (id: string) => void;
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
                <input
                  type="text"
                  value={cat.icon}
                  onChange={(e) => onUpdate(cat.id, { icon: e.target.value })}
                  className={cn(
                    'h-8 w-16 rounded-md border border-surface-200 px-2 text-sm text-center',
                    'focus:outline-none focus:ring-2 focus:ring-accent-400',
                    'bg-surface-0',
                  )}
                  aria-label={`카테고리 아이콘 ${cat.name}`}
                  maxLength={4}
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
