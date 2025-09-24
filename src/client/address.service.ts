import { Injectable, NotFoundException } from '@nestjs/common';
import { ERRORS } from '../common/errors';
import { CreateAddressDto } from './dto/create-address.dto';

export interface Address {
  id: string;
  name: string;
  address: string;
  phone: string;
  isDefault?: boolean;
}

@Injectable()
export class AddressService {
  // Stockage en mémoire : Map sessionId → liste d'adresses
  private addresses = new Map<string, Address[]>();

  // Créer une adresse
  create(sessionId: string, dto: CreateAddressDto): Address {
    const newAddress: Address = {
      id: Date.now().toString(), // simple id unique
      ...dto,
      isDefault: false,
    };

    const userAddresses = this.addresses.get(sessionId) || [];
    userAddresses.push(newAddress);

    // Si c’est la 1ère adresse → on la met par défaut
    if (userAddresses.length === 1) {
      newAddress.isDefault = true;
    }

    this.addresses.set(sessionId, userAddresses);
    return newAddress;
  }

  // Récupérer toutes les adresses
  findAll(sessionId: string): Address[] {
    return this.addresses.get(sessionId) || [];
  }

  // Récupérer une seule adresse
  findOne(sessionId: string, id: string): Address {
    const userAddresses = this.addresses.get(sessionId) || [];
    const address = userAddresses.find((a) => a.id === id);
    if (!address) throw new NotFoundException(ERRORS.ADDRESS_NOT_FOUND);
    return address;
  }

  // Mettre à jour une adresse
  update(sessionId: string, id: string, dto: CreateAddressDto): Address {
    const userAddresses = this.addresses.get(sessionId) || [];
    const index = userAddresses.findIndex((a) => a.id === id);
    if (index === -1) throw new NotFoundException(ERRORS.ADDRESS_NOT_FOUND);

    userAddresses[index] = { ...userAddresses[index], ...dto };
    this.addresses.set(sessionId, userAddresses);

    return userAddresses[index];
  }

  // Supprimer une adresse
  remove(sessionId: string, id: string): void {
    let userAddresses = this.addresses.get(sessionId) || [];
    const exists = userAddresses.find((a) => a.id === id);
    if (!exists) throw new NotFoundException(ERRORS.ADDRESS_NOT_FOUND);

    userAddresses = userAddresses.filter((a) => a.id !== id);

    // Si l’adresse supprimée était "default", on met la première restante en default
    if (exists.isDefault && userAddresses.length > 0) {
      userAddresses[0].isDefault = true;
    }

    this.addresses.set(sessionId, userAddresses);
  }

  // Définir une adresse par défaut
  setDefault(sessionId: string, id: string): Address {
    const userAddresses = this.addresses.get(sessionId) || [];
    const address = userAddresses.find((a) => a.id === id);
    if (!address) throw new NotFoundException(ERRORS.ADDRESS_NOT_FOUND);

    // Retirer default des autres
    userAddresses.forEach((a) => (a.isDefault = false));
    address.isDefault = true;

    this.addresses.set(sessionId, userAddresses);
    return address;
  }
}
