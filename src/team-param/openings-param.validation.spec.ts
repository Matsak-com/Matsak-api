import { createOpeningsParamSchema } from '../common/schemas/team-param.schemas';

describe('OpeningsParam Validation', () => {
  it('should validate a valid openings param', () => {
    const validData = {
      team: '507f1f77bcf86cd799439011',
      name: 'store-hours',
      paramType: 'OpeningsParam',
      value: [
        {
          dayOfWeek: 'monday',
          isOpen: true,
          openTime: '09:00',
          closeTime: '18:00',
        },
      ],
    };

    const result = createOpeningsParamSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should reject invalid dayOfWeek', () => {
    const invalidData = {
      team: '507f1f77bcf86cd799439011',
      name: 'store-hours',
      paramType: 'OpeningsParam',
      value: [
        {
          dayOfWeek: 'invalid-day',
          isOpen: true,
          openTime: '09:00',
          closeTime: '18:00',
        },
      ],
    };

    const result = createOpeningsParamSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('should reject invalid time format', () => {
    const invalidData = {
      team: '507f1f77bcf86cd799439011',
      name: 'store-hours',
      paramType: 'OpeningsParam',
      value: [
        {
          dayOfWeek: 'monday',
          isOpen: true,
          openTime: '25:00', // Invalid hour
          closeTime: '18:00',
        },
      ],
    };

    const result = createOpeningsParamSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('should reject invalid closing time format', () => {
    const invalidData = {
      team: '507f1f77bcf86cd799439011',
      name: 'store-hours',
      paramType: 'OpeningsParam',
      value: [
        {
          dayOfWeek: 'friday',
          isOpen: true,
          openTime: '09:30',
          closeTime: '18:70', // Invalid minutes
        },
      ],
    };

    const result = createOpeningsParamSchema.safeParse(invalidData);
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
        name: 'store-hours',
        paramType: 'OpeningsParam',
        value: [
          {
            dayOfWeek: day,
            isOpen: true,
            openTime: '08:30',
            closeTime: '17:15',
          },
        ],
      };

      const result = createOpeningsParamSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });
});
