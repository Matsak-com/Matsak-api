import { Injectable, NotFoundException } from '@nestjs/common';
import { FilterQuery } from 'mongoose';
import { ERRORS } from '../common/errors';
import { Faq, FaqDocument } from './faq.schema';
import { FaqsRepository } from './faqs.repository';
import { CreateFaqDto } from './dto/create-faq.dto';
import { UpdateFaqDto } from './dto/update-faq.dto';

@Injectable()
export class FaqsService {
  constructor(private readonly faqsRepository: FaqsRepository) {}

  async create(createFaqDto: CreateFaqDto): Promise<Faq> {
    const payload: Partial<Faq> = {
      ...createFaqDto,
      order: createFaqDto.order ?? Date.now(),
    };

    return this.faqsRepository.create({ doc: payload });
  }

  async findAll(options: {
    includeUnpublished?: boolean;
    category?: string;
    search?: string;
  }): Promise<Faq[]> {
    const filter = this.buildListFilter(options);

    return this.faqsRepository.findAll({
      filter,
      options: { sort: { order: 1, createdAt: -1 } },
    });
  }

  async findOne(id: string): Promise<Faq> {
    const faq = await this.faqsRepository.findById({ id });
    if (!faq) {
      throw new NotFoundException(ERRORS.FAQ_NOT_FOUND);
    }
    return faq;
  }

  async update(id: string, updateFaqDto: UpdateFaqDto): Promise<Faq> {
    const updated = await this.faqsRepository.update({
      id,
      update: updateFaqDto,
    });
    if (!updated) {
      throw new NotFoundException(ERRORS.FAQ_NOT_FOUND);
    }
    return updated;
  }

  async remove(id: string): Promise<{ deleted: boolean }> {
    const deleted = await this.faqsRepository.delete({ id });
    if (!deleted) {
      throw new NotFoundException(ERRORS.FAQ_NOT_FOUND);
    }
    return { deleted: true };
  }

  private buildListFilter(options: {
    includeUnpublished?: boolean;
    category?: string;
    search?: string;
  }): FilterQuery<FaqDocument> {
    const filter: FilterQuery<FaqDocument> = {};

    if (!options.includeUnpublished) {
      filter.isPublished = true;
    }

    if (options.category) {
      filter.category = new RegExp(
        `^${this.escapeRegex(options.category.trim())}$`,
        'i',
      );
    }

    if (options.search) {
      const search = this.escapeRegex(options.search.trim());
      filter.$or = [
        { 'question.fr': { $regex: search, $options: 'i' } },
        { 'question.en': { $regex: search, $options: 'i' } },
        { 'question.ar': { $regex: search, $options: 'i' } },
        { 'question.zh': { $regex: search, $options: 'i' } },
        { 'answer.fr': { $regex: search, $options: 'i' } },
        { 'answer.en': { $regex: search, $options: 'i' } },
        { 'answer.ar': { $regex: search, $options: 'i' } },
        { 'answer.zh': { $regex: search, $options: 'i' } },
      ];
    }

    return filter;
  }

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
