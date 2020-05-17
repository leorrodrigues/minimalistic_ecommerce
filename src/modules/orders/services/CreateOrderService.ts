import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Product from '@modules/products/infra/typeorm/entities/Product';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateProductService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,

    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,

    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const customer = await this.customersRepository.findById(customer_id);

    if (!customer) {
      throw new AppError('Customer does not exists');
    }

    const productsList = await this.productsRepository.findAllById(products);

    if (productsList.length !== products.length) {
      throw new AppError('One or more products does not exists');
    }

    const orderedProducts = [] as Product[];
    const updatedStock = [] as Product[];

    // eslint-disable-next-line array-callback-return
    products.map(product => {
      const productInStock = productsList.find(item => item.id === product.id);
      if (!productInStock) {
        throw new AppError('Product does not exists');
      }
      if (product.quantity > productInStock.quantity) {
        throw new AppError('Insufficient amount of product in stock');
      }
      orderedProducts.push({
        ...productInStock,
        quantity: product.quantity,
      });
      updatedStock.push({
        ...productInStock,
        quantity: productInStock.quantity - product.quantity,
      });
    });

    await this.productsRepository.updateQuantity(updatedStock);

    const IProductList = orderedProducts.map(product => ({
      product_id: product.id,
      price: product.price,
      quantity: product.quantity,
    }));

    const order = await this.ordersRepository.create({
      customer,
      products: IProductList,
    });

    return order;
  }
}

export default CreateProductService;
