# Decouse storefront

Responsive Next.js clothing store with 400 editable sample listings (100 each for women, men, kids, and accessories), variant-specific product photos, paginated shop browsing, customer accounts, a protected admin panel, and server-side order checks.

## Run locally

Requires Node.js 22.13 or later (the server uses the built-in SQLite module).

```bash
npm install
cp .env.example .env.local
# Edit ADMIN_EMAIL in .env.local to the address you will register with.
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

In development, signup returns a local email-verification link on the page. Verify the account, sign in, then open `/admin`. `ADMIN_EMAIL` is the only account promoted to administrator; the role is set by the server, never by a signup form. Set `ADMIN_TOTP_SECRET` to a base32 secret to require a TOTP code for administrator logins.

## Product catalogue

The product files include 400 detailed sample listings: 100 each for women, men, kids, and accessories. Edit [`data/products-upload.json`](data/products-upload.json), then sign in as an administrator and use **Admin → Products & stock → Replace catalogue from JSON** to import them. [`public/products-import-template.json`](public/products-import-template.json) contains the same editable starter catalogue. Listings include sample prices, descriptions, tags, image paths, colour variants, sizes, and stock. Replace demo details and photography with accurate retail information before taking real orders. You can also create and edit product details, upload images, edit stock by colour and size, export the current catalogue, and delete listings.

JSON format:

```json
{
  "format": "decouse-products-v1",
  "products": [
    {
      "slug": "forest-green-tailored-suit",
      "name": "Forest green tailored suit",
      "brand": "Your brand",
      "category": "Women",
      "type": "Suits",
      "price": 85000,
      "compareAt": null,
      "short": "A short product description.",
      "description": "Product details and care guidance.",
      "variants": [
        {
          "color": "Forest green",
          "colorHex": "#174B38",
          "images": ["/api/uploads/replace-with-uploaded-file.webp"],
          "sizes": [
            { "size": "S", "stock": 4 },
            { "size": "M", "stock": 6 },
            { "size": "L", "stock": 2 }
          ]
        },
        {
          "color": "Navy",
          "colorHex": "#202B45",
          "images": ["/api/uploads/replace-with-navy-photo.webp"],
          "sizes": [{ "size": "S", "stock": 2 }, { "size": "M", "stock": 3 }]
        }
      ]
    }
  ]
}
```

Add a photo for each colour in Admin → Products & stock, then use the returned `/api/uploads/...` URL in that colour variant’s `images` array. The first image is the card image. Clicking a colour changes the product gallery and available size/stock set.

## Included routes

- `/`, `/shop`, `/women`, `/men`, `/kids`, `/accessories`, `/deals` — catalogue search, brand/category/price/type/size/colour filters and numbered product pages
- `/for-you` — local, opt-in recommendations based on recent searches and product views
- `/products/[slug]` — variant images, size/stock choices, sample delivery estimate, similar listings and verified-order reviews
- `/login`, `/signup`, `/verify-email`, `/password-reset` — server accounts, email verification and reset links
- `/account`, `/cart`, `/checkout`, `/order-success`, `/track-order` — account-only orders, private tracking and printable receipts
- `/admin` — role-protected product, inventory, coupon and order controls
- `/privacy`, `/cookies`, `/terms`, `/shipping-returns`, `/faq`, `/contact`, `/size-guide`

## Security implementation

- SQLite stores user accounts, scrypt password hashes, hashed sessions, rate-limit counters, products, coupons, orders and reviews. Passwords are never stored as plain text.
- Login, signup, email verification, OTP, password-reset request/confirmation, checkout, order cancellation, reviews and image uploads have separate server-side rate limits.
- Configure the trusted reverse proxy to overwrite `x-real-ip` or `x-forwarded-for`; the rate limiter hashes the client address and should not trust user-supplied forwarding headers.
- Email verification is required before checkout. The account session uses an HttpOnly, SameSite=Lax cookie, Secure in production.
- `/admin` and every admin API verify the signed-in user’s email and server-assigned administrator role.
- Checkout accepts only product IDs, sizes, colours and quantities. The server reloads prices, validates coupon rules, checks inventory and reserves stock in a SQLite transaction. It ignores client-supplied totals and payment status.
- Preview orders remain unpaid. This build has no live payment integration and has no endpoint that marks an order paid. Do not expose production ordering until a payment provider has been configured with server-side verification/webhooks.
- Order lookup is scoped to the signed-in owner. Admins can view orders. A customer can cancel an unpaid order; cancellation releases reserved stock and coupon use. Paid-order refunds require a provider integration.
- Reviews require a shipped/delivered order marked paid and can be submitted once per order/product. The preview checkout does not create paid orders, so verified reviews become available after real payment confirmation is connected.
- Product image uploads allow PNG/JPEG/WebP up to 4 MB, check file signatures, randomize filenames, and store files outside the public directory. Malware scanning is not included.
- CSP/security headers restrict scripts, frames, fonts, connections and images to the site. The site uses local fonts, images and no analytics or ad trackers.

## Before production

This local build uses SQLite and filesystem uploads. It is suitable for a single server with persistent disk. For multiple or serverless instances, use a managed relational database and shared rate-limit store (for example Redis/Upstash). Use S3 or Cloudinary with malware scanning for uploads. Put Cloudflare WAF in front of the domain and add Turnstile on suspicious traffic. Configure Resend for verification/reset mail. Add a payment provider (for example Paystack for Nigerian cards, Verve, bank transfer and USSD), verify every transaction on the server, and add signed webhooks before changing `payment_status` to paid. PayPal and SMS delivery are not connected in this build.

The refund, terms, size, seller, product and delivery content is sample policy or merchant data. Replace it with confirmed business information before launch. Contact, newsletter and order-notification forms do not send messages in this preview.
