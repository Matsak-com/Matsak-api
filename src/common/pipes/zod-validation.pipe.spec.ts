import { ZodValidationPipe } from './zod-validation.pipe';
import { createUserSchema } from '../schemas/auth.schemas';
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
      role: 'user',
    };

    const result = pipe.transform(validData);
    expect(result).toEqual(expect.objectContaining(validData));
  });

  it('should reject invalid email', () => {
    const invalidData = {
      name: 'John',
      firstname: 'Doe',
      email: 'invalid-email',
      password: 'password123',
      role: 'user',
    };

    expect(() =>
      pipe.transform(invalidData),
    ).toThrow(BadRequestException);
  });

  it('should reject short password', () => {
    const invalidData = {
      name: 'John',
      firstname: 'Doe',
      email: 'john.doe@example.com',
      password: '123',
      role: 'user',
    };

    expect(() =>
      pipe.transform(invalidData),
    ).toThrow(BadRequestException);
  });

  it('should reject empty required fields', () => {
    const invalidData = {
      name: '',
      firstname: '',
      email: 'john.doe@example.com',
      password: 'password123',
      role: 'user',
    };

    expect(() =>
      pipe.transform(invalidData),
    ).toThrow(BadRequestException);
  });
});
