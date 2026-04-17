import { ZodValidationPipe } from './zod-validation.pipe';
import { createUserSchema, tokenQuerySchema } from '../schemas/auth.schemas';
import { BadRequestException } from '@nestjs/common';

describe('ZodValidationPipe', () => {
  let pipe: ZodValidationPipe;

  beforeEach(() => {
    pipe = new ZodValidationPipe(createUserSchema);
  });

  it('should be defined', () => {
    expect(pipe).toBeDefined();
  });

  it('should pass valid user data', () => {
    const validData = {
      name: 'John',
      firstname: 'Doe',
      email: 'john.doe@example.com',
      password: 'password123',
    };

    const result = pipe.transform(validData, { type: 'body', metatype: null });
    expect(result).toEqual(expect.objectContaining(validData));
  });

  it('should reject invalid email', () => {
    const invalidData = {
      name: 'John',
      firstname: 'Doe',
      email: 'invalid-email',
      password: 'password123',
    };

    expect(() =>
      pipe.transform(invalidData, { type: 'body', metatype: null }),
    ).toThrow(BadRequestException);
  });

  it('should reject short password', () => {
    const invalidData = {
      name: 'John',
      firstname: 'Doe',
      email: 'john.doe@example.com',
      password: '123',
    };

    expect(() =>
      pipe.transform(invalidData, { type: 'body', metatype: null }),
    ).toThrow(BadRequestException);
  });

  it('should reject empty required fields', () => {
    const invalidData = {
      name: '',
      firstname: '',
      email: 'john.doe@example.com',
      password: 'password123',
    };

    expect(() =>
      pipe.transform(invalidData, { type: 'body', metatype: null }),
    ).toThrow(BadRequestException);
  });

  it('should validate query params (not skip non-body types)', () => {
    const queryPipe = new ZodValidationPipe(tokenQuerySchema);
    const validQuery = { token: 'some-valid-token' };
    const result = queryPipe.transform(validQuery, {
      type: 'query',
      metatype: null,
    });
    expect(result).toEqual(validQuery);
  });

  it('should reject invalid query params', () => {
    const queryPipe = new ZodValidationPipe(tokenQuerySchema);
    const invalidQuery = { token: '' };
    expect(() =>
      queryPipe.transform(invalidQuery, { type: 'query', metatype: null }),
    ).toThrow(BadRequestException);
  });

  it('should pass through custom type without validation', () => {
    const anyData = { anything: 'data' };
    const result = pipe.transform(anyData, { type: 'custom', metatype: null });
    expect(result).toEqual(anyData);
  });
});
