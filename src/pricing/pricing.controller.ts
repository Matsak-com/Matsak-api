import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { IsMongoId } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Public } from '../auth/decorator/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/user.schema';
import { CurrentUser } from '../auth/decorator/current-user.decorator';
import { UserPayload } from '../auth/jwt/jwt.strategy';
import { PricingService } from './pricing.service';
import {
  CreatePricingRuleDto,
  UpdatePricingRuleDto,
} from './dto/pricing-rule.dto';
import {
  CreatePromoCodeDto,
  UpdatePromoCodeDto,
  ValidatePromoCodeDto,
} from './dto/promo-code.dto';

// ─── Param DTO ────────────────────────────────────────────────────────────────
class IdParamDto {
  @IsMongoId()
  id: string;
}

@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  }),
)
@UseGuards(JwtAuthGuard)
@Controller('pricing')
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  // ══════════════════════════════════════════════════════════
  // PRICING RULES
  // ══════════════════════════════════════════════════════════

  @Post('rules')
  @Roles(UserRole.ADMIN)
  createRule(
    @Body() dto: CreatePricingRuleDto,
    @CurrentUser() user: UserPayload,
  ) {
    return this.pricingService.createRule(dto, user.userId);
  }

  @Get('rules')
  listRules(@Query('teamId') teamId?: string) {
    return this.pricingService.listRules(teamId);
  }

  @Patch('rules/:id')
  @Roles(UserRole.ADMIN)
  updateRule(@Param() params: IdParamDto, @Body() dto: UpdatePricingRuleDto) {
    return this.pricingService.updateRule(params.id, dto);
  }

  @Delete('rules/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.ADMIN)
  deleteRule(@Param() params: IdParamDto) {
    return this.pricingService.deleteRule(params.id);
  }

  // ══════════════════════════════════════════════════════════
  // PROMO CODES
  // ══════════════════════════════════════════════════════════

  @Post('promo-codes')
  @Roles(UserRole.ADMIN)
  createPromoCode(
    @Body() dto: CreatePromoCodeDto,
    @CurrentUser() user: UserPayload,
  ) {
    return this.pricingService.createPromoCode(dto, user.userId);
  }

  @Get('promo-codes')
  @Roles(UserRole.ADMIN)
  listPromoCodes(@Query('teamId') teamId: string | undefined) {
    return this.pricingService.listPromoCodes(teamId);
  }

  @Get('promo-codes/validate')
  validatePromoCode(@Query() dto: ValidatePromoCodeDto) {
    return this.pricingService.validatePromoCode(dto);
  }

  @Patch('promo-codes/:id')
  @Roles(UserRole.ADMIN)
  updatePromoCode(
    @Param() params: IdParamDto,
    @Body() dto: UpdatePromoCodeDto,
  ) {
    return this.pricingService.updatePromoCode(params.id, dto);
  }

  @Delete('promo-codes/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.ADMIN)
  deletePromoCode(@Param() params: IdParamDto) {
    return this.pricingService.deletePromoCode(params.id);
  }

  // ══════════════════════════════════════════════════════════
  // TOTAL PREVIEW (for frontend cart summary)
  // ══════════════════════════════════════════════════════════

  @Public()
  @Post('calculate')
  calculateTotal(
    @Body()
    body: {
      cartSubtotalEur: number;
      currentCurrency?: string;
      teamId?: string;
      promoCode?: string;
      currency?: string;
      deliveryMethod?: 'delivery' | 'pickup';
    },
  ) {
    return this.pricingService.calculateTotal(body);
  }
}
