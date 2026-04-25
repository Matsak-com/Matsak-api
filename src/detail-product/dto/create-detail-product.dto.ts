import {
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  IsMongoId,
  IsNumber,
  ValidateNested,
  Min,
  IsEnum,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  DosageForm,
  RouteOfAdministration,
  TherapeuticClass,
  PharmacologicalClass,
  PregnancyCategory,
  ControlledSubstanceSchedule,
  PackagingType,
  StorageConditionLight,
  StorageConditionMoisture,
} from '../../common/constants/pharmaceutical.constants';

export class SEODto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  keywords?: string;
}

export class DimensionsDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  length?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  width?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  height?: number;

  @IsOptional()
  @IsString()
  unit?: string;
}

export class ActiveIngredientDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsString()
  unit?: string;
}

export class StorageConditionsDto {
  @IsOptional()
  @IsNumber()
  minTemperature?: number;

  @IsOptional()
  @IsNumber()
  maxTemperature?: number;

  @IsOptional()
  @IsEnum(StorageConditionLight)
  lightCondition?: StorageConditionLight;

  @IsOptional()
  @IsEnum(StorageConditionMoisture)
  moistureCondition?: StorageConditionMoisture;

  @IsOptional()
  @IsString()
  specialInstructions?: string;
}

export class CreateDetailProductDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  // ------------------------------------------------------------------
  // Core pharmaceutical identifiers
  // ------------------------------------------------------------------
  @IsOptional()
  @IsString()
  genericName?: string;

  @IsOptional()
  @IsString()
  atcCode?: string;

  @IsOptional()
  @IsString()
  registrationNumber?: string;

  @IsOptional()
  @IsString()
  countryOfOrigin?: string;

  // ------------------------------------------------------------------
  // Pharmaceutical form & strength
  // ------------------------------------------------------------------
  @IsOptional()
  @IsEnum(DosageForm)
  dosageForm?: DosageForm;

  /** @deprecated Use dosageForm */
  @IsOptional()
  @IsString()
  form?: string;

  @IsOptional()
  @IsString()
  strength?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ActiveIngredientDto)
  activeIngredients?: ActiveIngredientDto[];

  // ------------------------------------------------------------------
  // Route & administration
  // ------------------------------------------------------------------
  @IsOptional()
  @IsEnum(RouteOfAdministration)
  routeOfAdministration?: RouteOfAdministration;

  @IsOptional()
  @IsString()
  dosageInstructions?: string;

  // ------------------------------------------------------------------
  // Therapeutic & pharmacological classification
  // ------------------------------------------------------------------
  @IsOptional()
  @IsEnum(TherapeuticClass)
  therapeuticClass?: TherapeuticClass;

  @IsOptional()
  @IsEnum(PharmacologicalClass)
  pharmacologicalClass?: PharmacologicalClass;

  // ------------------------------------------------------------------
  // Clinical information
  // ------------------------------------------------------------------
  @IsOptional()
  @IsString()
  contraindications?: string;

  @IsOptional()
  @IsString()
  sideEffects?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  warningLabels?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  drugInteractions?: string[];

  @IsOptional()
  @IsEnum(PregnancyCategory)
  pregnancyCategory?: PregnancyCategory;

  // ------------------------------------------------------------------
  // Regulatory & supply classification
  // ------------------------------------------------------------------
  @IsOptional()
  @IsBoolean()
  prescriptionRequired?: boolean;

  @IsOptional()
  @IsBoolean()
  controlledSubstance?: boolean;

  @IsOptional()
  @IsEnum(ControlledSubstanceSchedule)
  controlledSubstanceSchedule?: ControlledSubstanceSchedule;

  @IsOptional()
  @IsBoolean()
  isNarcotic?: boolean;

  // ------------------------------------------------------------------
  // Packaging & storage
  // ------------------------------------------------------------------
  @IsOptional()
  @IsEnum(PackagingType)
  packagingType?: PackagingType;

  @IsOptional()
  @IsString()
  packagingSize?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => StorageConditionsDto)
  storageConditions?: StorageConditionsDto;

  // ------------------------------------------------------------------
  // Batch & expiry tracking
  // ------------------------------------------------------------------
  @IsOptional()
  @IsString()
  batchNumber?: string;

  @IsOptional()
  @IsString()
  lotNumber?: string;

  @IsOptional()
  @IsDateString()
  expirationDate?: string;

  // ------------------------------------------------------------------
  // Manufacturer
  // ------------------------------------------------------------------
  @IsOptional()
  @IsString()
  manufacturer?: string;

  @IsOptional()
  @IsBoolean()
  isRepackaged?: boolean;

  // ------------------------------------------------------------------
  // Category references
  // ------------------------------------------------------------------
  @IsMongoId()
  categoryId: string;

  @IsOptional()
  @IsMongoId()
  subcategoryId?: string;

  // ------------------------------------------------------------------
  // Identifiers & advanced data
  // ------------------------------------------------------------------
  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsString()
  barcode?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  weight?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => DimensionsDto)
  dimensions?: DimensionsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => SEODto)
  seo?: SEODto;

  @IsOptional()
  @IsString()
  additionalInfo?: string;
}
