import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InvoiceController } from './invoice.controller';
import { InvoiceService } from './invoice.service';
import { InvoiceRepository } from './invoice.repository';
import { Invoice, InvoiceSchema } from './invoice.schema';
import { DeliveryCheck, DeliveryCheckSchema } from './delivery-check.schema';
import { DeliveryCheckService } from './delivery-check.service';
import { ProductModule } from '../product/product.module';
import { Counter, CounterSchema } from './counter.schema';
import { NotificationModule } from '../notifications/notification.module';
import { Cart, CartSchema } from 'src/cart-item/cart-item.schema';
import { Payment, PaymentSchema } from 'src/payment/payment.schema';
import { PricingModule } from '../pricing/pricing.module';
import { User, UserSchema } from '../users/user.schema';
import { Member, MemberSchema } from '../members/member.schema';
import { Role, RoleSchema } from '../roles/role.schema';
import { HistoryModule } from 'src/history/history.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Invoice.name, schema: InvoiceSchema },
      { name: Counter.name, schema: CounterSchema },
      { name: Payment.name, schema: PaymentSchema },
      { name: Cart.name, schema: CartSchema },
      { name: User.name, schema: UserSchema },
      { name: Member.name, schema: MemberSchema },
      { name: Role.name, schema: RoleSchema },
      { name: DeliveryCheck.name, schema: DeliveryCheckSchema },
    ]),
    ProductModule,
    NotificationModule,
    PricingModule,
    HistoryModule
  ],
  controllers: [InvoiceController],
  providers: [InvoiceService, InvoiceRepository, DeliveryCheckService],
  exports: [InvoiceService, InvoiceRepository, DeliveryCheckService],
})
export class InvoiceModule {}
