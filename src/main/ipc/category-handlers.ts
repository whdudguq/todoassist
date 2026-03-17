/**
 * @TASK P2-R2 - Category CRUD IPC Handlers
 * @SPEC docs/planning/04-database-design.md#Category
 *
 * Registers IPC handlers for Category CRUD operations.
 * Maps IPC_CHANNELS.CATEGORY to CategoryCrudService methods.
 */

import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '@shared/types';
import { CategoryCrudService, CreateCategoryInput } from '../services/category-crud';

/**
 * Register all Category IPC handlers
 *
 * @param service - CategoryCrudService instance
 */
export function registerCategoryHandlers(service: CategoryCrudService): void {
  // @TASK P2-R2 - category:getAll
  ipcMain.handle(IPC_CHANNELS.CATEGORY.GET_ALL, () => {
    return service.getAllCategories();
  });

  // @TASK P2-R2 - category:create
  ipcMain.handle(
    IPC_CHANNELS.CATEGORY.CREATE,
    (_event, input: CreateCategoryInput) => {
      return service.createCategory(input);
    }
  );

  // @TASK P2-R2 - category:update
  ipcMain.handle(
    IPC_CHANNELS.CATEGORY.UPDATE,
    (_event, id: string, updates: Partial<CreateCategoryInput>) => {
      return service.updateCategory(id, updates);
    }
  );

  // @TASK P2-R2 - category:delete
  ipcMain.handle(IPC_CHANNELS.CATEGORY.DELETE, (_event, id: string) => {
    return service.deleteCategory(id);
  });
}
