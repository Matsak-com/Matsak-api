export class CreateProductDto {
  name: string;
  price: number;
  isActive?: boolean;
  detail: string;        // ObjectId en string
  subcategory: string;   // ObjectId en string
  team: string;          // ObjectId en string
  images?: string[];     // tableau d’ObjectId en string
}
