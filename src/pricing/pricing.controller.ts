import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
  ForbiddenException,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { IsMongoId } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Public } from '../auth/decorator/public.decorator';
import { UserRole } from '../users/user.schema';
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
import { RequestWithUser } from '../auth/jwt/jwt.strategy';

// ─── Param DTO ────────────────────────────────────────────────────────────────
class IdParamDto {
  @IsMongoId()
  id: string;
}

// ─── Admin guard helper (inline — no separate file needed) ───────────────────
function assertAdmin(req: RequestWithUser): void {
  const { role } = req.user;
  if (role !== UserRole.ADMIN && role !== UserRole.SUPERADMIN) {
    throw new ForbiddenException('Admin access required');
  }
}

@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
@UseGuards(JwtAuthGuard)
@Controller('pricing')
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  // ══════════════════════════════════════════════════════════
  // PRICING RULES
  // ══════════════════════════════════════════════════════════

  @Post('rules')
  createRule(
    @Body() dto: CreatePricingRuleDto,
    @Request() req: RequestWithUser,
  ) {
    assertAdmin(req);
    return this.pricingService.createRule(dto, req.user.userId);
  }

  @Get('rules')
  listRules(@Query('teamId') teamId?: string) {
    return this.pricingService.listRules(teamId);
  }

  @Patch('rules/:id')
  updateRule(
    @Param() params: IdParamDto,
    @Body() dto: UpdatePricingRuleDto,
    @Request() req: RequestWithUser,
  ) {
    assertAdmin(req);
    return this.pricingService.updateRule(params.id, dto);
  }

  @Delete('rules/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteRule(@Param() params: IdParamDto, @Request() req: RequestWithUser) {
    assertAdmin(req);
    return this.pricingService.deleteRule(params.id);
  }

  // ══════════════════════════════════════════════════════════
  // PROMO CODES
  // ══════════════════════════════════════════════════════════

  @Post('promo-codes')
  createPromoCode(
    @Body() dto: CreatePromoCodeDto,
    @Request() req: RequestWithUser,
  ) {
    assertAdmin(req);
    return this.pricingService.createPromoCode(dto, req.user.userId);
  }

  @Get('promo-codes')
  listPromoCodes(
    @Query('teamId') teamId: string | undefined,
    @Request() req: RequestWithUser,
  ) {
    assertAdmin(req);
    return this.pricingService.listPromoCodes(teamId);
  }

  @Get('promo-codes/validate')
  validatePromoCode(@Query() dto: ValidatePromoCodeDto) {
    return this.pricingService.validatePromoCode(dto);
  }

  @Patch('promo-codes/:id')
  updatePromoCode(
    @Param() params: IdParamDto,
    @Body() dto: UpdatePromoCodeDto,
    @Request() req: RequestWithUser,
  ) {
    assertAdmin(req);
    return this.pricingService.updatePromoCode(params.id, dto);
  }

  @Delete('promo-codes/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deletePromoCode(
    @Param() params: IdParamDto,
    @Request() req: RequestWithUser,
  ) {
    assertAdmin(req);
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
