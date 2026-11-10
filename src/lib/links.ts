const BASE = import.meta.env.BASE_URL;
export const SHOP_URL = `${BASE}shop.html`;
export const shopCategoryUrl = (slug: string) => `${BASE}shop.html?category=${encodeURIComponent(slug)}`;
