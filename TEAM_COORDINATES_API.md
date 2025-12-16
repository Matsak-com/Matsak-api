# Team Coordinates API Usage Examples

## Overview
The Teams API now properly supports adding and updating geographic coordinates for teams. The `coordinates` field is now used consistently across both frontend payloads and backend storage, eliminating the need for field mapping.

## Recent Changes (v2.0)
- ✅ **BREAKING CHANGE**: Schema field changed from `geoLoc` to `coordinates`
- ✅ **Consistency**: Frontend and backend now use identical field names
- ✅ **Migration**: Provided migration script for existing data
- ✅ **Validation**: Enhanced coordinate validation with proper ranges

## Create Team with Coordinates

### Endpoint
`POST /teams`

### Content-Type
`multipart/form-data` (supports file upload for logo)

### Example Payload
```json
{
  "name": "Pharmacy Central Antananarivo",
  "phone": "+261 20 22 123 45",
  "email": "contact@pharmacy-central.mg",
  "address": "Avenue de l'Indépendance, 101",
  "city": "Antananarivo",
  "country": "Madagascar",
  "coordinates": {
    "lat": -18.8792,
    "lng": 47.5079
  },
  "language": "fr"
}
```

### cURL Example
```bash
curl -X POST http://localhost:3000/teams \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Pharmacy Central Antananarivo",
    "phone": "+261 20 22 123 45",
    "email": "contact@pharmacy-central.mg",
    "address": "Avenue de l'\''Indépendance, 101",
    "city": "Antananarivo",
    "country": "Madagascar",
    "coordinates": {
      "lat": -18.8792,
      "lng": 47.5079
    },
    "language": "fr"
  }'
```

## Update Team Coordinates

### Endpoint
`PUT /teams/:id`

### Example Payload (Update only coordinates)
```json
{
  "coordinates": {
    "lat": -18.9148,
    "lng": 47.5317
  }
}
```

### cURL Example
```bash
curl -X PUT http://localhost:3000/teams/TEAM_ID \
  -H "Content-Type: application/json" \
  -d '{
    "coordinates": {
      "lat": -18.9148,
      "lng": 47.5317
    }
  }'
```

## Coordinate Validation

### Latitude Rules
- Must be a number
- Range: -90 to 90 degrees
- Examples:
  - ✅ Valid: -18.8792 (Madagascar)
  - ✅ Valid: 48.8566 (Paris)
  - ❌ Invalid: 91 (exceeds maximum)
  - ❌ Invalid: -95 (below minimum)

### Longitude Rules
- Must be a number
- Range: -180 to 180 degrees
- Examples:
  - ✅ Valid: 47.5079 (Madagascar)
  - ✅ Valid: 2.3522 (Paris)
  - ❌ Invalid: 181 (exceeds maximum)
  - ❌ Invalid: -185 (below minimum)

## Important Notes

1. **Consistent Field Naming**: Both API and database now use `coordinates` field for consistency with frontend
2. **Optional Field**: Coordinates are optional - teams can be created without them
3. **JSON String Support**: Coordinates can be sent as JSON strings and will be automatically parsed
4. **Partial Updates**: You can update only coordinates without affecting other team fields
5. **Validation**: Both client-side (DTO) and schema-level validation ensure coordinate validity

## Database Storage

In the MongoDB collection, coordinates are now stored consistently as:
```json
{
  "_id": "...",
  "name": "Pharmacy Central Antananarivo",
  "coordinates": {
    "lat": -18.8792,
    "lng": 47.5079
  },
  // ... other fields
}
```

## Madagascar Geographic Reference Points

For testing with Madagascar locations:
- **Antananarivo**: { "lat": -18.8792, "lng": 47.5079 }
- **Toamasina**: { "lat": -18.1667, "lng": 49.4000 }
- **Antsirabe**: { "lat": -19.8667, "lng": 47.0333 }
- **Mahajanga**: { "lat": -15.7167, "lng": 46.3167 }
- **Toliara**: { "lat": -23.3500, "lng": 43.6667 }