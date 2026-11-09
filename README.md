# dropshiping

A 3D animated storefront for a lifestyle dropshipping store, in a quiet "museum plate" style: products sit on a warm paper stage where you can drag, spin and zoom them.

## Run it

It's a single file with no build step. Serve the folder and open it:

```
python3 -m http.server 8000
# then open http://localhost:8000
```

(Opening `index.html` straight from disk also works in most browsers; Three.js loads from a CDN, so you need to be online.)

## What's in it

- Four featured products, one per category: Fashion, Electronics, Kitchenware, Daily Essentials.
- 3D viewer: drag to turn (with momentum), scroll or pinch to zoom, turn buttons and 360°, double-click or `0` to reset, arrow keys, expand to full view, day/dusk lighting.
- Switching products flies the old one out and springs the new one in, while the product card swaps with a staggered rise.
- Cart badge, a WhatsApp VIP sign-up form (name and number), and search across products.
- Responsive: the sidebar hides under 1100px, and the layout stacks under 760px. It also respects reduced-motion settings.

## What's placeholder, not real yet

- **All product content is sample data**: the "Lumen Market" name, product names, ₹ prices, stock counts and specs. Edit the `PRODUCTS` array in `index.html`.
- **The 3D models are simple shapes built in code**, not real product scans. Real `.glb` model files will look far better.
- **Cart** is saved in the visitor's browser only. Checkout isn't connected.
- **WhatsApp sign-up form** checks the fields, then only logs them to the browser console. Nothing is saved yet.
- Nothing is connected to WooCommerce, Razorpay/UPI, Google Sheets or Dropdash yet.

## Next step

Port this into Next.js (App Router), with the product data coming from the WooCommerce REST API, real checkout, the sign-up form writing to Google Sheets, and order sync to Dropdash.
