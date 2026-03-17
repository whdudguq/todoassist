/**
 * @TASK P2-R2 - Category CRUD API (TDD_MODE:RED_FIRST)
 * @SPEC docs/planning/04-database-design.md#Category
 *
 * Tests for CategoryCrudService
 * - CRUD operations on Category table
 * - Validation (unique name, color format)
 * - Seed data verification
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from '../../main/database/migrations';
import { CategoryCrudService } from '../../main/services/category-crud';
import type { Category } from '@shared/types';

describe('CategoryCrudService', () => {
  let db: Database.Database;
  let service: CategoryCrudService;

  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    runMigrations(db);
    service = new CategoryCrudService(db);
  });

  afterEach(() => {
    if (db) {
      db.close();
    }
  });

  describe('seed data', () => {
    it('should have 5 seed categories after migration', () => {
      const categories = service.getAllCategories();
      expect(categories.length).toBe(5);
    });

    it('should include all expected seed category names', () => {
      const categories = service.getAllCategories();
      const names = categories.map((c) => c.name).sort();
      expect(names).toEqual(
        ['기타', '보고서', '이메일', '회의', '품질검사'].sort()
      );
    });
  });

  describe('createCategory', () => {
    it('should create a category and return it with all fields', () => {
      const result = service.createCategory({
        name: '테스트카테고리',
        color: '#AABBCC',
        icon: 'star',
      });

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(typeof result.id).toBe('string');
      expect(result.name).toBe('테스트카테고리');
      expect(result.color).toBe('#AABBCC');
      expect(result.icon).toBe('star');
      expect(typeof result.createdAt).toBe('number');
      expect(result.createdAt).toBeGreaterThan(0);
    });

    it('should generate a unique UUID for each category', () => {
      const cat1 = service.createCategory({
        name: '카테고리A',
        color: '#111111',
        icon: 'a',
      });
      const cat2 = service.createCategory({
        name: '카테고리B',
        color: '#222222',
        icon: 'b',
      });

      expect(cat1.id).not.toBe(cat2.id);
    });

    it('should persist the category in the database', () => {
      const created = service.createCategory({
        name: '영구카테고리',
        color: '#DDEEFF',
        icon: 'save',
      });

      const fetched = service.getCategoryById(created.id);
      expect(fetched).not.toBeNull();
      expect(fetched!.name).toBe('영구카테고리');
      expect(fetched!.color).toBe('#DDEEFF');
      expect(fetched!.icon).toBe('save');
    });

    it('should throw on duplicate name', () => {
      service.createCategory({
        name: '중복이름',
        color: '#AAAAAA',
        icon: 'dup',
      });

      expect(() =>
        service.createCategory({
          name: '중복이름',
          color: '#BBBBBB',
          icon: 'dup2',
        })
      ).toThrow();
    });

    it('should throw on invalid color format (missing #)', () => {
      expect(() =>
        service.createCategory({
          name: '잘못된색상',
          color: 'FF6B6B',
          icon: 'bad',
        })
      ).toThrow();
    });

    it('should accept valid hex colors with #', () => {
      expect(() =>
        service.createCategory({
          name: '올바른색상',
          color: '#FF6B6B',
          icon: 'good',
        })
      ).not.toThrow();
    });
  });

  describe('getCategoryById', () => {
    it('should return a category by id', () => {
      const created = service.createCategory({
        name: '찾기테스트',
        color: '#ABCDEF',
        icon: 'search',
      });

      const found = service.getCategoryById(created.id);
      expect(found).not.toBeNull();
      expect(found!.id).toBe(created.id);
      expect(found!.name).toBe('찾기테스트');
    });

    it('should return null for non-existent id', () => {
      const found = service.getCategoryById('non-existent-id');
      expect(found).toBeNull();
    });

    it('should return seed category by known id', () => {
      const found = service.getCategoryById('cat-001');
      expect(found).not.toBeNull();
      expect(found!.name).toBe('품질검사');
    });
  });

  describe('getAllCategories', () => {
    it('should return all categories including seed and newly created', () => {
      service.createCategory({
        name: '신규카테고리',
        color: '#123456',
        icon: 'new',
      });

      const all = service.getAllCategories();
      expect(all.length).toBe(6); // 5 seed + 1 new
    });

    it('should return Category objects with correct shape', () => {
      const all = service.getAllCategories();
      for (const cat of all) {
        expect(cat).toHaveProperty('id');
        expect(cat).toHaveProperty('name');
        expect(cat).toHaveProperty('color');
        expect(cat).toHaveProperty('icon');
        expect(cat).toHaveProperty('createdAt');
      }
    });
  });

  describe('updateCategory', () => {
    it('should update name only', () => {
      const created = service.createCategory({
        name: '원래이름',
        color: '#AAAAAA',
        icon: 'edit',
      });

      const updated = service.updateCategory(created.id, { name: '변경이름' });
      expect(updated.name).toBe('변경이름');
      expect(updated.color).toBe('#AAAAAA'); // unchanged
      expect(updated.icon).toBe('edit'); // unchanged
    });

    it('should update color only', () => {
      const created = service.createCategory({
        name: '색상변경',
        color: '#AAAAAA',
        icon: 'palette',
      });

      const updated = service.updateCategory(created.id, { color: '#BBBBBB' });
      expect(updated.color).toBe('#BBBBBB');
      expect(updated.name).toBe('색상변경'); // unchanged
    });

    it('should update icon only', () => {
      const created = service.createCategory({
        name: '아이콘변경',
        color: '#CCCCCC',
        icon: 'old_icon',
      });

      const updated = service.updateCategory(created.id, { icon: 'new_icon' });
      expect(updated.icon).toBe('new_icon');
      expect(updated.name).toBe('아이콘변경'); // unchanged
    });

    it('should update multiple fields at once', () => {
      const created = service.createCategory({
        name: '다중변경',
        color: '#111111',
        icon: 'multi',
      });

      const updated = service.updateCategory(created.id, {
        name: '변경완료',
        color: '#999999',
        icon: 'done',
      });

      expect(updated.name).toBe('변경완료');
      expect(updated.color).toBe('#999999');
      expect(updated.icon).toBe('done');
    });

    it('should throw when updating non-existent category', () => {
      expect(() =>
        service.updateCategory('non-existent', { name: '없는카테고리' })
      ).toThrow();
    });

    it('should throw when updating to duplicate name', () => {
      service.createCategory({
        name: '기존이름',
        color: '#AAAAAA',
        icon: 'a',
      });
      const second = service.createCategory({
        name: '두번째',
        color: '#BBBBBB',
        icon: 'b',
      });

      expect(() =>
        service.updateCategory(second.id, { name: '기존이름' })
      ).toThrow();
    });

    it('should throw when updating color to invalid format', () => {
      const created = service.createCategory({
        name: '색상검증',
        color: '#AAAAAA',
        icon: 'check',
      });

      expect(() =>
        service.updateCategory(created.id, { color: 'invalid' })
      ).toThrow();
    });
  });

  describe('deleteCategory', () => {
    it('should delete existing category and return true', () => {
      const created = service.createCategory({
        name: '삭제대상',
        color: '#FF0000',
        icon: 'trash',
      });

      const result = service.deleteCategory(created.id);
      expect(result).toBe(true);

      const found = service.getCategoryById(created.id);
      expect(found).toBeNull();
    });

    it('should return false for non-existent category', () => {
      const result = service.deleteCategory('non-existent-id');
      expect(result).toBe(false);
    });

    it('should not affect other categories when deleting', () => {
      const cat1 = service.createCategory({
        name: '유지대상',
        color: '#00FF00',
        icon: 'keep',
      });
      const cat2 = service.createCategory({
        name: '삭제대상2',
        color: '#0000FF',
        icon: 'remove',
      });

      service.deleteCategory(cat2.id);

      const remaining = service.getCategoryById(cat1.id);
      expect(remaining).not.toBeNull();
      expect(remaining!.name).toBe('유지대상');
    });
  });
});
