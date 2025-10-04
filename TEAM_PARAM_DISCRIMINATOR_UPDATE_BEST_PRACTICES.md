# TeamParam Discriminator-Aware Update Best Practices

## Problem Analysis

### Why Direct BaseRepository.update() Fails with Discriminators:

1. **Type Safety Issues**: Discriminated models have different schemas and validation rules
2. **Schema Validation**: Each discriminator (ShowNumberParam, CurrencyParam, etc.) has specific field types and constraints
3. **Value Type Confusion**: Different discriminators expect different `value` types:
   - `ShowNumberParam`: `boolean`
   - `CurrencyParam`: `string` with enum validation
   - `OpeningsParam`: `array` of time objects
   - `ClosingsParam`: `array` of closing entries

### Original Implementation Problems:

```typescript
// ❌ WRONG: Direct BaseRepository update
const updatedParam = await this.teamParamRepository.update({
  id,
  update: updateData,
});
```

**Issues:**
- Uses base `TeamParam` model validation only
- Ignores discriminator-specific schema rules
- May bypass enum validations (e.g., currency codes)
- Can cause type mismatches for complex values

## Best Practice Solution

### 1. Discriminator-Aware Repository Method

```typescript
/**
 * Update a team parameter with discriminator-aware validation
 * This method handles updates for different parameter types properly
 */
async updateWithDiscriminator({
  id,
  update,
  options = {},
}: {
  id: string | Types.ObjectId;
  update: Partial<TeamParamDocument>;
  options?: { populate?: any[] };
}): Promise<TeamParamDocument | null> {
  const objectId = typeof id === 'string' ? new Types.ObjectId(id) : id;

  // First, get the current document to determine its discriminator type
  const currentDoc = await this.findById({
    id: objectId,
    options: { lean: true },
  });

  if (!currentDoc) {
    return null;
  }

  // Use the discriminator model for type-specific validation
  const discriminatorModel =
    this.teamParamModel.discriminators?.[currentDoc.paramType];

  if (discriminatorModel) {
    // Use the specific discriminator model for the update
    const result = await discriminatorModel.findOneAndUpdate(
      this.withNotDeleted({
        _id: objectId,
      } as FilterQuery<TeamParamDocument>),
      update,
      {
        new: true,
        runValidators: true,
        ...(options.populate && { populate: options.populate }),
      },
    );
    return result;
  } else {
    // Fallback to base model if discriminator not found
    return this.update({ id: objectId, update, options });
  }
}
```

### 2. Service Layer Implementation

```typescript
// ✅ CORRECT: Use discriminator-aware update
const updatedParam = await this.teamParamRepository.updateWithDiscriminator(
  {
    id,
    update: updateData,
    options: { populate: [{ path: 'team' }] },
  },
);
```

## Benefits of This Approach

### 1. Type Safety
- Uses the correct discriminator model for validation
- Ensures field types match the specific parameter type
- Prevents type mismatches at runtime

### 2. Schema Validation
- Enforces discriminator-specific validation rules
- Validates enum values (e.g., currency codes)
- Ensures required fields are present for each type

### 3. Proper Error Handling
- Returns validation errors specific to the parameter type
- Maintains consistency with create operations
- Provides clear error messages for invalid data

### 4. Performance
- Only fetches the current document once to determine type
- Uses the appropriate model for the update operation
- Maintains populate options for efficient data loading

## Example Usage Scenarios

### Updating a Currency Parameter
```typescript
// Will use CurrencyParamSchema validation
await teamParamService.update('param_id', {
  value: 'EUR', // Must be valid currency code
});
```

### Updating a Show Number Parameter
```typescript
// Will use ShowNumberParamSchema validation
await teamParamService.update('param_id', {
  value: true, // Must be boolean
});
```

### Updating an Openings Parameter
```typescript
// Will use OpeningsParamSchema validation
await teamParamService.update('param_id', {
  value: [
    {
      dayOfWeek: 'monday',
      isOpen: true,
      openTime: '09:00',
      closeTime: '17:00'
    }
  ]
});
```

## Migration Strategy

### For Existing Code:
1. Replace calls to `repository.update()` with `repository.updateWithDiscriminator()`
2. Ensure DTOs match the expected discriminator schemas
3. Test with different parameter types to verify validation

### For New Features:
1. Always use `updateWithDiscriminator()` for TeamParam updates
2. Design DTOs with discriminator-specific validation
3. Handle discriminator-specific error cases

## Testing the Implementation

The new approach ensures:
- ✅ Currency parameters validate against enum values
- ✅ Boolean parameters reject non-boolean values
- ✅ Array parameters validate complex structures
- ✅ Population works correctly with discriminator models
- ✅ Error messages are type-specific and helpful

This implementation follows MongoDB and Mongoose best practices for discriminated models while maintaining type safety and proper validation.