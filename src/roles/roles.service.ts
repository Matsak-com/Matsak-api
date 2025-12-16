import { Injectable } from '@nestjs/common';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { Role } from './role.schema';
import { RolesRepository } from './roles.repository';
import { FilterQuery } from 'mongoose';

@Injectable()
export class RolesService {
  constructor(private readonly rolesRepository: RolesRepository) {}

  async create(createRoleDto: CreateRoleDto): Promise<Role> {
    return this.rolesRepository.create({ doc: createRoleDto });
  }

  async findAll(): Promise<Role[]> {
    return this.rolesRepository.findAll();
  }

  async findOne({
    filter,
  }: {
    filter: FilterQuery<Role>;
  }): Promise<Role | null> {
    return this.rolesRepository.findOne({ filter });
  }

  async findById(id: string): Promise<Role | null> {
    return this.rolesRepository.findById({ id });
  }

  async update(id: string, updateRoleDto: UpdateRoleDto): Promise<Role | null> {
    return this.rolesRepository.update({ id, update: updateRoleDto });
  }

  async remove(id: string): Promise<Role | null> {
    return this.rolesRepository.delete({ id }); // soft delete (avec `deleted_at`)
  }
}
