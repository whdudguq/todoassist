/**
 * @TASK P2-R3 - Template CRUD IPC Handlers
 * @SPEC docs/planning/04-database-design.md#Template
 *
 * Registers IPC handlers for Template CRUD operations.
 * Maps IPC_CHANNELS.TEMPLATE to TemplateCrudService methods.
 */

import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '@shared/types';
import {
  TemplateCrudService,
  TemplateTaskNode,
} from '../services/template-crud';

/**
 * Register all Template IPC handlers
 *
 * @param service - TemplateCrudService instance
 */
export function registerTemplateHandlers(service: TemplateCrudService): void {
  // @TASK P2-R3 - template:getAll
  ipcMain.handle(IPC_CHANNELS.TEMPLATE.GET_ALL, () => {
    return service.getAllTemplates();
  });

  // @TASK P2-R3 - template:save
  ipcMain.handle(
    IPC_CHANNELS.TEMPLATE.SAVE,
    (
      _event,
      name: string,
      description: string,
      taskTree: TemplateTaskNode[]
    ) => {
      return service.saveTemplate(name, description, taskTree);
    }
  );

  // @TASK P2-R3 - template:load
  ipcMain.handle(
    IPC_CHANNELS.TEMPLATE.LOAD,
    (_event, templateId: string, parentId?: string | null) => {
      return service.loadTemplate(templateId, parentId);
    }
  );

  // @TASK P2-R3 - template:delete
  ipcMain.handle(
    IPC_CHANNELS.TEMPLATE.DELETE,
    (_event, id: string) => {
      return service.deleteTemplate(id);
    }
  );
}
