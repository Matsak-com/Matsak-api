import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { FaqsService } from './faqs.service';
import { FaqsRepository } from './faqs.repository';
import { ERRORS } from '../common/errors';

const mockFaqsRepository = {
  create: jest.fn(),
  findAll: jest.fn(),
  findById: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

describe('FaqsService', () => {
  let service: FaqsService;
  let repository: typeof mockFaqsRepository;

  const faq = {
    id: 'faq-id',
    question: { fr: 'Question ?', en: 'Question?' },
    answer: { fr: 'Reponse', en: 'Answer' },
    isPublished: true,
    category: 'General',
    order: 1,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FaqsService,
        {
          provide: FaqsRepository,
          useValue: mockFaqsRepository,
        },
      ],
    }).compile();

    service = module.get<FaqsService>(FaqsService);
    repository = module.get(FaqsRepository);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should forward payload to repository', async () => {
      repository.create.mockResolvedValue(faq);
      const dto = {
        question: faq.question,
        answer: faq.answer,
        category: 'General',
      } as any;

      const result = await service.create(dto);

      expect(repository.create).toHaveBeenCalledWith({ doc: dto });
      expect(result).toEqual(faq);
    });
  });

  describe('findAll', () => {
    it('should apply default published filter and sorting', async () => {
      repository.findAll.mockResolvedValue([faq]);

      const result = await service.findAll({});

      expect(repository.findAll).toHaveBeenCalledWith({
        filter: { isPublished: true },
        options: { sort: { order: 1, createdAt: -1 } },
      });
      expect(result).toEqual([faq]);
    });

    it('should build filters for category and search when includeUnpublished is true', async () => {
      repository.findAll.mockResolvedValue([faq]);

      await service.findAll({
        includeUnpublished: true,
        category: 'General ',
        search: 'payment.',
      });

      const callArgs = repository.findAll.mock.calls[0][0];
      expect(callArgs.filter.isPublished).toBeUndefined();
      expect(callArgs.filter.category).toBeInstanceOf(RegExp);
      expect(callArgs.filter.category.source).toBe('^General$');
      expect(callArgs.filter.$or).toHaveLength(8);
      expect(callArgs.filter.$or[0]['question.fr'].$regex).toBe('payment\\.');
      expect(callArgs.options).toEqual({ sort: { order: 1, createdAt: -1 } });
    });
  });

  describe('findOne', () => {
    it('should return the faq when found', async () => {
      repository.findById.mockResolvedValue(faq);

      const result = await service.findOne('faq-id');

      expect(repository.findById).toHaveBeenCalledWith({ id: 'faq-id' });
      expect(result).toEqual(faq);
    });

    it('should throw when faq is not found', async () => {
      repository.findById.mockResolvedValue(null);

      const call = service.findOne('missing');

      await expect(call).rejects.toThrow(NotFoundException);
      await expect(call).rejects.toThrow(ERRORS.FAQ_NOT_FOUND);
    });
  });

  describe('update', () => {
    it('should return updated faq', async () => {
      repository.update.mockResolvedValue({ ...faq, category: 'New' });

      const result = await service.update('faq-id', { category: 'New' } as any);

      expect(repository.update).toHaveBeenCalledWith({
        id: 'faq-id',
        update: { category: 'New' },
      });
      expect(result.category).toBe('New');
    });

    it('should throw when faq is not found', async () => {
      repository.update.mockResolvedValue(null);

      const call = service.update('missing', {} as any);

      await expect(call).rejects.toThrow(NotFoundException);
      await expect(call).rejects.toThrow(ERRORS.FAQ_NOT_FOUND);
    });
  });

  describe('remove', () => {
    it('should return deleted true when repository succeeds', async () => {
      repository.delete.mockResolvedValue(true);

      const result = await service.remove('faq-id');

      expect(repository.delete).toHaveBeenCalledWith({ id: 'faq-id' });
      expect(result).toEqual({ deleted: true });
    });

    it('should throw when delete returns false', async () => {
      repository.delete.mockResolvedValue(false);

      const call = service.remove('missing');

      await expect(call).rejects.toThrow(NotFoundException);
      await expect(call).rejects.toThrow(ERRORS.FAQ_NOT_FOUND);
    });
  });
});
