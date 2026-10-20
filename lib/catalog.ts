export const products = [
  { id: "neem-tulsi", name: "Neem & Tulsi", note: "A fresh, green kind of morning", price: 24900, category: "Herbal", color: "#dee4d2", image: "/maa-assets/neem.svg", ingredients: "Saponified coconut and olive oils, shea butter, neem powder, tulsi powder, fragrance.", scent: "Green & herbaceous", description: "An earthy bar with a soft green hue and a fresh herbal scent. A small pause before the day begins." },
  { id: "rose-clay", name: "Rose & Clay", note: "For a softer end to the day", price: 27900, category: "Floral", color: "#ebdcd6", image: "/maa-assets/rose.svg", ingredients: "Saponified coconut and olive oils, shea butter, pink clay, rose petal powder, fragrance.", scent: "Soft & floral", description: "Dusty pink clay and a gentle rose fragrance make this a lovely companion to an unhurried evening." },
  { id: "haldi-honey", name: "Haldi & Honey", note: "A little sunshine, in a bar", price: 29900, category: "Warm", color: "#eee1be", image: "/maa-assets/haldi.svg", ingredients: "Saponified coconut and olive oils, shea butter, turmeric powder, honey, fragrance.", scent: "Warm & mellow", description: "A golden bar inspired by the familiar warmth of haldi and honey. A bright start to your ritual." },
  { id: "oat-milk", name: "Oat Milk", note: "Simple pleasures, softly scented", price: 25900, category: "Gentle", color: "#e7e2d7", image: "/maa-assets/oats.svg", ingredients: "Saponified coconut and olive oils, shea butter, colloidal oats, oat milk, fragrance.", scent: "Soft & comforting", description: "A creamy, oat-flecked bar with a delicate scent. An everyday choice when you like to keep things simple." },
] as const;
export type Product = typeof products[number];
export type CartItem = { productId: string; quantity: number };
export const money = (paise: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2, minimumFractionDigits: paise % 100 === 0 ? 0 : 2 }).format(paise / 100);
export const FREE_SHIPPING = 79900;
export function calculateCart(items: CartItem[], coupon = "") {
  if (!Array.isArray(items) || !items.length || items.length > 20) throw new Error("Add at least one soap to your bag.");
  const seen = new Set<string>();
  const lines = items.map(item => {
    const product = products.find(p => p.id === item.productId);
    if (!product || seen.has(item.productId) || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 10) throw new Error("Choose a quantity from 1 to 10 for each soap.");
    seen.add(item.productId);
    return { productId: product.id, name: product.name, quantity: item.quantity, unitPrice: product.price, total: product.price * item.quantity };
  });
  const subtotal = lines.reduce((sum, line) => sum + line.total, 0), normalizedCoupon = coupon.trim().toUpperCase();
  if (normalizedCoupon && normalizedCoupon !== "WELCOME10") throw new Error("That offer code is unavailable. Try WELCOME10.");
  const discount = normalizedCoupon ? Math.min(Math.round(subtotal * .1), 15000) : 0;
  const shipping = subtotal - discount >= FREE_SHIPPING ? 0 : 6000;
  return { lines, subtotal, discount, shipping, total: subtotal - discount + shipping, currency: "INR", coupon: normalizedCoupon };
}
