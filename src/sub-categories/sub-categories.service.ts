import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SubCategory, SubCategoryDocument } from './sub-category.schema';
import { CreateSubCategoryDto } from './dto/create-sub-category.dto';
import { UpdateSubCategoryDto } from './dto/update-sub-category.dto';
import { Category, CategoryDocument } from '../categories/category.schema'; // Assure-toi que le chemin est correct

@Injectable()
export class SubCategoriesService {
  constructor(
    @InjectModel(SubCategory.name)
    private readonly subCategoryModel: Model<SubCategoryDocument>,

    @InjectModel(Category.name)
    private readonly categoryModel: Model<CategoryDocument>,
  ) {}

  async create(createSubCategoryDto: CreateSubCategoryDto): Promise<SubCategory> {
    // Vérifie que la catégorie existe
    const category = await this.categoryModel.findById(createSubCategoryDto.categoryId);
    if (!category) {
      throw new NotFoundException(`Category with ID '${createSubCategoryDto.categoryId}' not found`);
    }

    const created = new this.subCategoryModel(createSubCategoryDto);
    return created.save();
  }

  async findAll(): Promise<SubCategory[]> {
    return this.subCategoryModel.find().populate('categoryId').exec();
  }

  async findOne(id: string): Promise<SubCategory> {
    const subCategory = await this.subCategoryModel.findById(id).populate('categoryId').exec();
    if (!subCategory) {
      throw new NotFoundException(`SubCategory with ID '${id}' not found`);
    }
    return subCategory;
  }

  async update(id: string, updateDto: UpdateSubCategoryDto): Promise<SubCategory> {
    const updated = await this.subCategoryModel
      .findByIdAndUpdate(id, updateDto, { new: true })
      .populate('categoryId')
      .exec();

    if (!updated) {
      throw new NotFoundException(`SubCategory with ID '${id}' not found`);
    }
    return updated;
  }

  async remove(id: string): Promise<{ deleted: boolean }> {
    const result = await this.subCategoryModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`SubCategory with ID '${id}' not found`);
    }
    return { deleted: true };
  }

  async findByCategory(categoryId: string): Promise<SubCategory[]> {
    // Vérifie que la catégorie existe
    const category = await this.categoryModel.findById(categoryId);
    if (!category) {
      throw new NotFoundException(`Category with ID '${categoryId}' not found`);
    }

    // Récupère les sous-catégories associées
    return this.subCategoryModel
      .find({ categoryId })
      .populate('categoryId')
      .exec();
  }

}
