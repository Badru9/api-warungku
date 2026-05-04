import { Elysia } from 'elysia';
import { authRoutes } from './routes/auth';
import { categoriesRoutes } from './routes/categories';
import { productsRoutes } from './routes/products';
import { staffRoutes } from './routes/staff';
import { transactionsRoutes } from './routes/transactions';
import { dashboardRoutes } from './routes/dashboard';
import { cors } from '@elysia/cors';

const app = new Elysia()
  .get('/', () => 'Hello Elysia')
  .use(authRoutes)
  .use(categoriesRoutes)
  .use(productsRoutes)
  .use(staffRoutes)
  .use(transactionsRoutes)
  .use(dashboardRoutes)
  .use(cors())
  .listen(4000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
);
