import { Controller, Get, Post, Param, Body, Put, Delete, Headers } from '@nestjs/common';
import { AddressService, Address } from './address.service';
import { CreateAddressDto } from './dto/create-address.dto';

@Controller('addresses')
export class AddressController {
  constructor(private readonly addressService: AddressService) {}

  private getSessionId(headers: Record<string, any>): string {
    return headers['x-session-id'] || 'default-session';
  }

  @Post()
  async create(
    @Headers() headers: Record<string, any>,
    @Body() dto: CreateAddressDto
  ): Promise<Address> {
    const sessionId = this.getSessionId(headers);
    return this.addressService.create(sessionId, dto);
  }

  @Get()
  async findAll(
    @Headers() headers: Record<string, any>
  ): Promise<Address[]> {
    const sessionId = this.getSessionId(headers);
    return this.addressService.findAll(sessionId);
  }

  @Get(':id')
  async findOne(
    @Headers() headers: Record<string, any>,
    @Param('id') id: string
  ): Promise<Address> {
    const sessionId = this.getSessionId(headers);
    return this.addressService.findOne(sessionId, id);
  }

  @Put(':id')
  async update(
    @Headers() headers: Record<string, any>,
    @Param('id') id: string,
    @Body() dto: CreateAddressDto
  ): Promise<Address> {
    const sessionId = this.getSessionId(headers);
    return this.addressService.update(sessionId, id, dto);
  }

  @Delete(':id')
  async remove(
    @Headers() headers: Record<string, any>,
    @Param('id') id: string
  ): Promise<void> {
    const sessionId = this.getSessionId(headers);
    return this.addressService.remove(sessionId, id);
  }

  @Put(':id/default')
  async setDefault(
    @Headers() headers: Record<string, any>,
    @Param('id') id: string
  ): Promise<Address> {
    const sessionId = this.getSessionId(headers);
    return this.addressService.setDefault(sessionId, id);
  }
}
