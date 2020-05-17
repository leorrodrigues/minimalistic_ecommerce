import { getRepository, Repository } from 'typeorm';

import IOrdersRepository from '@modules/orders/repositories/IOrdersRepository';
import ICreateOrderDTO from '@modules/orders/dtos/ICreateOrderDTO';
import Order from '../entities/Order';
import OrdersProducts from '../entities/OrdersProducts';

class OrdersRepository implements IOrdersRepository {
  private ormOrdersRepository: Repository<Order>;

  private ormOrderProductsRepository: Repository<OrdersProducts>;

  constructor() {
    this.ormOrdersRepository = getRepository(Order);
    this.ormOrderProductsRepository = getRepository(OrdersProducts);
  }

  public async create({ customer, products }: ICreateOrderDTO): Promise<Order> {
    const order = await this.ormOrdersRepository.save({
      customer,
    });

    const productsList = products.map(product => ({
      product_id: product.product_id,
      order_id: order.id,
      price: product.price,
      quantity: product.quantity,
    }));

    const orderProductsStored = await this.ormOrderProductsRepository.save(
      productsList,
    );

    order.order_products = orderProductsStored;

    await this.ormOrdersRepository.save(order);

    return order;
  }

  public async findById(id: string): Promise<Order | undefined> {
    const findOrder = await this.ormOrdersRepository.findOne(
      { id },
      {
        relations: ['customer', 'order_products'],
      },
    );

    return findOrder;
  }
}

export default OrdersRepository;
