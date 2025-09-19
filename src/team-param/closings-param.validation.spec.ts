import { createClosingsParamSchema } from '../common/schemas/team-param.schemas';

describe('ClosingsParam Validation', () => {
  it('should validate a valid closings param', () => {
    const validData = {
      team: '507f1f77bcf86cd799439011',
      name: 'closing-hours',
      paramType: 'ClosingsParam',
      value: {
        dayOfWeek: 'friday',
        closingHour: '17:30',
      },
    };

    const result = createClosingsParamSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should reject invalid dayOfWeek', () => {
    const invalidData = {
      team: '507f1f77bcf86cd799439011',
      name: 'closing-hours',
      paramType: 'ClosingsParam',
      value: {
        dayOfWeek: 'invalid-day',
        closingHour: '17:30',
      },
    };

    const result = createClosingsParamSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('should reject invalid time format', () => {
    const invalidData = {
      team: '507f1f77bcf86cd799439011',
      name: 'closing-hours',
      paramType: 'ClosingsParam',
      value: {
        dayOfWeek: 'monday',
        closingHour: '25:00', // Invalid hour
      },
    };

    const result = createClosingsParamSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('should reject invalid closing time format with invalid minutes', () => {
    const invalidData = {
      team: '507f1f77bcf86cd799439011',
      name: 'closing-hours',
      paramType: 'ClosingsParam',
      value: {
        dayOfWeek: 'friday',
        closingHour: '18:70', // Invalid minutes
      },
    };

    const result = createClosingsParamSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('should accept all valid days of week', () => {
    const days = [
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
      'sunday',
    ];

    days.forEach((day) => {
      const validData = {
        team: '507f1f77bcf86cd799439011',
        name: 'closing-hours',
        paramType: 'ClosingsParam',
        value: {
          dayOfWeek: day,
          closingHour: '17:15',
        },
      };

      const result = createClosingsParamSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  it('should require closingHour to be present', () => {
    const invalidData = {
      team: '507f1f77bcf86cd799439011',
      name: 'closing-hours',
      paramType: 'ClosingsParam',
      value: {
        dayOfWeek: 'monday',
        // Missing closingHour
      },
    };

    const result = createClosingsParamSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });
});