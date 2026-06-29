import { Product, Store } from "../domain/entity.ts";
import type { ProductDto, StoreDto } from "./dto.ts";

export const StoreMapper = {
  toDto(e: Store): StoreDto {
    return { id: e.id, name: e.name, color: e.color };
  },
  toEntity(d: StoreDto): Store {
    const e = new Store();
    if (d.id != null) e.id = d.id;
    e.setName(d.name);
    e.setColor(d.color);
    return e;
  },
};

export const ProductMapper = {
  toDto(
    e: Product,
    storeName: string,
    currentPrice: number,
  ): ProductDto {
    return {
      id: e.id,
      storeId: e.storeId,
      storeName,
      name: e.name,
      unit: e.unit,
      productType: e.productType,
      category: e.category,
      currentPrice,
    };
  },
  toEntity(d: ProductDto): Product {
    const e = new Product();
    if (d.id != null) e.id = d.id;
    e.setStoreId(d.storeId);
    e.setName(d.name);
    e.setUnit(d.unit);
    e.setProductType(d.productType);
    e.setCategory(d.category);
    return e;
  },
};
