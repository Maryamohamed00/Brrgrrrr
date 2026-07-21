import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // --- Cashiers ---
  const pinHash = await bcrypt.hash("1234", 10);
  const adminPinHash = await bcrypt.hash("0000", 10);

  await prisma.cashier.upsert({
    where: { id: "seed-cashier-1" },
    update: {},
    create: {
      id: "seed-cashier-1",
      name: "Ahmed",
      pinHash,
      role: "CASHIER",
    },
  });
  await prisma.cashier.upsert({
    where: { id: "seed-admin-1" },
    update: {},
    create: {
      id: "seed-admin-1",
      name: "Manager",
      pinHash: adminPinHash,
      role: "ADMIN",
    },
  });

  const viewerPinHash = await bcrypt.hash("2222", 10);
  await prisma.cashier.upsert({
    where: { id: "seed-viewer-1" },
    update: {},
    create: {
      id: "seed-viewer-1",
      name: "Investor",
      pinHash: viewerPinHash,
      role: "VIEWER",
    },
  });

  // --- Category ---
  const burgersCat = await prisma.category.upsert({
    where: { id: "cat-burgers" },
    update: {},
    create: { id: "cat-burgers", name: "Burgers", sortOrder: 0 },
  });
  const sidesCat = await prisma.category.upsert({
    where: { id: "cat-sides" },
    update: {},
    create: { id: "cat-sides", name: "Sides", sortOrder: 1 },
  });

  // --- Ingredients ---
  // A pack of patties has 20; warn (fixed threshold) once fewer than 4 remain.
  const patty = await prisma.ingredient.upsert({
    where: { id: "ing-patty" },
    update: {},
    create: {
      id: "ing-patty",
      name: "Burger Patty",
      unit: "patty",
      stockQty: 20,
      lowStockThreshold: 4,
      packSize: 20,
    },
  });
  const bun = await prisma.ingredient.upsert({
    where: { id: "ing-bun" },
    update: {},
    create: {
      id: "ing-bun",
      name: "Burger Bun",
      unit: "bun",
      stockQty: 30,
      lowStockThreshold: 6,
      packSize: 30,
    },
  });
  const cheese = await prisma.ingredient.upsert({
    where: { id: "ing-cheese" },
    update: {},
    create: {
      id: "ing-cheese",
      name: "Cheese Slice",
      unit: "slice",
      stockQty: 40,
      lowStockThreshold: 8,
      packSize: 40,
    },
  });
  const friesPortion = await prisma.ingredient.upsert({
    where: { id: "ing-fries" },
    update: {},
    create: {
      id: "ing-fries",
      name: "Fries (portion)",
      unit: "portion",
      stockQty: 25,
      lowStockThreshold: 5,
      packSize: 25,
    },
  });

  // --- Products + recipes ---
  const cheeseburger = await prisma.product.upsert({
    where: { id: "prod-cheeseburger" },
    update: {},
    create: {
      id: "prod-cheeseburger",
      name: "Cheeseburger",
      price: 90,
      categoryId: burgersCat.id,
    },
  });
  await prisma.productIngredient.upsert({
    where: { productId_ingredientId: { productId: cheeseburger.id, ingredientId: patty.id } },
    update: {},
    create: { productId: cheeseburger.id, ingredientId: patty.id, quantityUsed: 1 },
  });
  await prisma.productIngredient.upsert({
    where: { productId_ingredientId: { productId: cheeseburger.id, ingredientId: bun.id } },
    update: {},
    create: { productId: cheeseburger.id, ingredientId: bun.id, quantityUsed: 1 },
  });
  await prisma.productIngredient.upsert({
    where: { productId_ingredientId: { productId: cheeseburger.id, ingredientId: cheese.id } },
    update: {},
    create: { productId: cheeseburger.id, ingredientId: cheese.id, quantityUsed: 1 },
  });

  const doubleCheeseburger = await prisma.product.upsert({
    where: { id: "prod-double-cheeseburger" },
    update: {},
    create: {
      id: "prod-double-cheeseburger",
      name: "Double Cheeseburger",
      price: 130,
      categoryId: burgersCat.id,
    },
  });
  // Double = 2 patties, 2 cheese slices, still 1 bun.
  await prisma.productIngredient.upsert({
    where: {
      productId_ingredientId: { productId: doubleCheeseburger.id, ingredientId: patty.id },
    },
    update: {},
    create: { productId: doubleCheeseburger.id, ingredientId: patty.id, quantityUsed: 2 },
  });
  await prisma.productIngredient.upsert({
    where: {
      productId_ingredientId: { productId: doubleCheeseburger.id, ingredientId: bun.id },
    },
    update: {},
    create: { productId: doubleCheeseburger.id, ingredientId: bun.id, quantityUsed: 1 },
  });
  await prisma.productIngredient.upsert({
    where: {
      productId_ingredientId: { productId: doubleCheeseburger.id, ingredientId: cheese.id },
    },
    update: {},
    create: { productId: doubleCheeseburger.id, ingredientId: cheese.id, quantityUsed: 2 },
  });

  const fries = await prisma.product.upsert({
    where: { id: "prod-fries" },
    update: {},
    create: {
      id: "prod-fries",
      name: "Fries",
      price: 35,
      categoryId: sidesCat.id,
    },
  });
  await prisma.productIngredient.upsert({
    where: { productId_ingredientId: { productId: fries.id, ingredientId: friesPortion.id } },
    update: {},
    create: { productId: fries.id, ingredientId: friesPortion.id, quantityUsed: 1 },
  });

  // Combo meal: a product that itself just bundles a burger + fries worth of
  // ingredient consumption. Simplest approach for now — give the combo its
  // own recipe lines mirroring both components.
  const comboMeal = await prisma.product.upsert({
    where: { id: "prod-combo-cheeseburger" },
    update: {},
    create: {
      id: "prod-combo-cheeseburger",
      name: "Cheeseburger Combo",
      price: 115,
      categoryId: burgersCat.id,
    },
  });
  await prisma.productIngredient.upsert({
    where: { productId_ingredientId: { productId: comboMeal.id, ingredientId: patty.id } },
    update: {},
    create: { productId: comboMeal.id, ingredientId: patty.id, quantityUsed: 1 },
  });
  await prisma.productIngredient.upsert({
    where: { productId_ingredientId: { productId: comboMeal.id, ingredientId: bun.id } },
    update: {},
    create: { productId: comboMeal.id, ingredientId: bun.id, quantityUsed: 1 },
  });
  await prisma.productIngredient.upsert({
    where: { productId_ingredientId: { productId: comboMeal.id, ingredientId: cheese.id } },
    update: {},
    create: { productId: comboMeal.id, ingredientId: cheese.id, quantityUsed: 1 },
  });
  await prisma.productIngredient.upsert({
    where: {
      productId_ingredientId: { productId: comboMeal.id, ingredientId: friesPortion.id },
    },
    update: {},
    create: { productId: comboMeal.id, ingredientId: friesPortion.id, quantityUsed: 1 },
  });

  console.log("Seed complete.");
  console.log("Cashier PIN: 1234 (Ahmed)   Admin PIN: 0000 (Manager)   Viewer PIN: 2222 (Investor)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
