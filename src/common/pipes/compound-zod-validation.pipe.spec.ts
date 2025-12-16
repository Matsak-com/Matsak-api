import { CompoundZodValidationPipe } from './compound-zod-validation.pipe';
import {
  createCategorySchema,
  categoryIdParamSchema,
} from '../schemas/category.schemas';
import { BadRequestException } from '@nestjs/common';

describe('CompoundZodValidationPipe', () => {
  let pipe: CompoundZodValidationPipe;

  beforeEach(() => {
    pipe = new CompoundZodValidationPipe({
      body: createCategorySchema,
      params: categoryIdParamSchema,
    });
  });

  it('should be defined', () => {
    expect(pipe).toBeDefined();
  });

  it('should validate body data correctly', () => {
    const validBodyData = {
      name: 'Electronics',
    };

    const result = pipe.transform(validBodyData, {
      type: 'body',
      metatype: null,
    });
    expect(result).toEqual(validBodyData);
  });

  it('should validate params data correctly', () => {
    const validParamsData = {
      id: '507f1f77bcf86cd799439011', // Valid ObjectId
    };

    const result = pipe.transform(validParamsData, {
      type: 'param',
      metatype: null,
    });
    expect(result).toEqual(validParamsData);
  });

  it('should reject invalid body data', () => {
    const invalidBodyData = {
      name: '', // Empty name should fail
    };

    expect(() =>
      pipe.transform(invalidBodyData, { type: 'body', metatype: null }),
    ).toThrow(BadRequestException);
  });

  it('should reject invalid param data', () => {
    const invalidParamsData = {
      id: '', // Empty ID should fail
    };

    expect(() =>
      pipe.transform(invalidParamsData, { type: 'param', metatype: null }),
    ).toThrow(BadRequestException);
  });

  it('should pass through unsupported metadata types', () => {
    const anyData = { test: 'data' };

    const result = pipe.transform(anyData, { type: 'custom', metatype: null });
    expect(result).toEqual(anyData);
  });

  it('should pass through when no schema is defined for type', () => {
    const pipeWithoutQuery = new CompoundZodValidationPipe({
      body: createCategorySchema,
      // No params or query schema
    });

    const anyData = { id: 'test' };
    const result = pipeWithoutQuery.transform(anyData, {
      type: 'param',
      metatype: null,
    });
    expect(result).toEqual(anyData);
  });
});
