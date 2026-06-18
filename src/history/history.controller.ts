import { Controller, Get, Param, Query } from '@nestjs/common';
import { HistoryService } from './history.service';
import { HistoryAction, HistoryEntityType } from './history.schema';

export class GetHistoriesQueryDto {
  entityType?: HistoryEntityType;
  action?: HistoryAction;
  from?: string;
  to?: string;
  limit?: number;
}

@Controller('history')
export class HistoryController {
  constructor(private readonly historyService: HistoryService) {}

  // ══════════════════════════════════════════════════════════════
  // GET /history
  // Liste tous les historiques avec filtres optionnels
  // ══════════════════════════════════════════════════════════════
  @Get()
  async findAll(@Query() query: GetHistoriesQueryDto) {
    return this.historyService.findAll({
      entityType: query.entityType,
      action: query.action,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
      limit: query.limit ? Number(query.limit) : undefined,
    });
  }

  // ══════════════════════════════════════════════════════════════
  // GET /history/user/:userId
  // Liste tous les historiques d'un utilisateur
  // ══════════════════════════════════════════════════════════════
  @Get('user/:userId')
  async findByUser(@Param('userId') userId: string) {
    return this.historyService.findByUser(userId);
  }

  // ══════════════════════════════════════════════════════════════
  // GET /history/entity/:entityType/:entityId
  // Liste tous les historiques d'une entité précise
  // ══════════════════════════════════════════════════════════════
  @Get('entity/:entityType/:entityId')
  async findByEntity(
    @Param('entityType') entityType: HistoryEntityType,
    @Param('entityId') entityId: string,
  ) {
    return this.historyService.findByEntity(entityType, entityId);
  }
}
