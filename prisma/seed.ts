import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  console.log("Starting seed...");

  // Clean existing data
  await prisma.priceHistory.deleteMany();
  await prisma.stockTransaction.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();

  // Create users
  const passwordHash = await bcrypt.hash("password123", 10);
  const admin = await prisma.user.create({
    data: {
      email: "admin@warsija.com",
      password_hash: passwordHash,
      role: "admin",
      full_name: "Administrator",
    },
  });

  const staff = await prisma.user.create({
    data: {
      email: "staff@warsija.com",
      password_hash: passwordHash,
      role: "staff",
      full_name: "Staff User",
    },
  });

  console.log("Created users:", admin.email, staff.email);

  // Create categories
  const categories = await Promise.all([
    prisma.category.create({ data: { name: "Minuman" } }),
    prisma.category.create({ data: { name: "Makanan" } }),
    prisma.category.create({ data: { name: "Snack" } }),
    prisma.category.create({ data: { name: "Alat Tulis" } }),
  ]);

  console.log("Created categories:", categories.length);

  // Create products
  const products = await Promise.all([
    prisma.product.create({
      data: {
        name: "Aqua 600ml",
        sku: "AQU600",
        barcode: "1000000000001",
        category_id: categories[0].id,
        current_stock: 100,
        min_stock: 20,
        sell_price: 4000,
        buy_price: 3500,
        created_by: admin.id,
      },
    }),
    prisma.product.create({
      data: {
        name: "Kopi Sachet",
        sku: "KOP01",
        barcode: "1000000000002",
        category_id: categories[0].id,
        current_stock: 50,
        min_stock: 10,
        sell_price: 2000,
        buy_price: 1500,
        created_by: admin.id,
      },
    }),
    prisma.product.create({
      data: {
        name: "Indomie Goreng",
        sku: "IND01",
        barcode: "1000000000003",
        category_id: categories[1].id,
        current_stock: 30,
        min_stock: 5,
        sell_price: 3500,
        buy_price: 2800,
        created_by: staff.id,
      },
    }),
    prisma.product.create({
      data: {
        name: "Oreo Pack",
        sku: "ORE01",
        barcode: "1000000000004",
        category_id: categories[2].id,
        current_stock: 20,
        min_stock: 5,
        sell_price: 15000,
        buy_price: 12000,
        created_by: staff.id,
      },
    }),
    prisma.product.create({
      data: {
        name: "Pulpen Pilot",
        sku: "PLT01",
        barcode: "1000000000005",
        category_id: categories[3].id,
        current_stock: 15,
        min_stock: 3,
        sell_price: 5000,
        buy_price: 3500,
        created_by: admin.id,
      },
    }),
  ]);

  console.log("Created products:", products.length);

  // Create stock transactions
  await Promise.all([
    prisma.stockTransaction.create({
      data: {
        product_id: products[0].id,
        type: "IN",
        quantity: 100,
        stock_before: 0,
        stock_after: 100,
        price_at_time: 3500,
        note: "Initial stock",
        created_by: admin.id,
      },
    }),
    prisma.stockTransaction.create({
      data: {
        product_id: products[0].id,
        type: "OUT",
        quantity: 10,
        stock_before: 100,
        stock_after: 90,
        price_at_time: 4000,
        note: "Sale",
        created_by: staff.id,
      },
    }),
  ]);

  console.log("Created stock transactions");

  // Create price history
  await prisma.priceHistory.create({
    data: {
      product_id: products[0].id,
      old_price: 3500,
      new_price: 4000,
      changed_by: admin.id,
    },
  });

  console.log("Created price history");

  console.log("Seed completed!");
  console.log("\nTest accounts:");
  console.log("  Admin: admin@warsija.com / password123");
  console.log("  Staff: staff@warsija.com / password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
