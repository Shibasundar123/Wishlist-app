# Wishlist Email Functionality

## Overview
The wishlist app now includes automated email notifications using Shopify's infrastructure.

## Features

### 1. **Automatic Email Notifications**
- ✅ Email sent when customer **adds** a product to wishlist
- ✅ Email sent when customer **removes** a product from wishlist
- ✅ Includes product details (title, image, price, description)
- ✅ Direct link to product page

### 2. **Manual Email Sending**
From the Settings page, you can:
- Send wishlist summary emails to customers
- View all customers with wishlist items
- See customer details and wishlist item count

### 3. **Email API Endpoint**
**Endpoint:** `POST /api/send-email`

**Request Body:**
```json
{
  "customerId": "123456789",
  "shop": "your-shop.myshopify.com",
  "emailType": "summary" | "product",
  "productId": "gid://shopify/Product/123" // Required for "product" type
}
```

**Response:**
```json
{
  "success": true,
  "message": "Email notification logged",
  "details": {
    "to": "customer@example.com",
    "subject": "✨ Item Added to Your Wishlist",
    "productCount": 5
  }
}
```

## Email Types

### 1. Product Addition/Removal Email
Triggered automatically when:
- Customer adds item to wishlist → "Item Added" email
- Customer removes item → "Item Removed" email

**Content:**
- Personalized greeting
- Product image
- Product title and price
- Short description
- "View Product" button
- Store link in footer

### 2. Wishlist Summary Email
Sent manually from Settings page:
- Lists all wishlist items
- Shows product images, titles, prices
- Links to each product
- "Shop Now" call-to-action

## Files Structure

```
app/
├── email.server.js              # Email service functions
├── routes/
│   ├── api.wishlist.jsx         # Wishlist API (with email integration)
│   ├── api.send-email.jsx       # Dedicated email API endpoint
│   └── app.settings.jsx         # Admin settings with email button
```

## Key Functions

### `sendWishlistEmail(admin, customerEmail, customerName, product, shop, action)`
Sends email for single product addition/removal.

**Parameters:**
- `admin`: Shopify admin GraphQL client
- `customerEmail`: Customer's email address
- `customerName`: Customer's full name
- `product`: Product details object
- `shop`: Shop domain
- `action`: 'added' | 'removed'

### `sendWishlistSummaryEmail(admin, customerEmail, customerName, products, shop)`
Sends summary email with all wishlist items.

**Parameters:**
- `admin`: Shopify admin GraphQL client
- `customerEmail`: Customer's email address
- `customerName`: Customer's full name
- `products`: Array of product details
- `shop`: Shop domain

### `getProductDetailsForEmail(admin, productId)`
Fetches product data needed for emails.

**Returns:**
```javascript
{
  title: "Product Name",
  handle: "product-handle",
  description: "Product description...",
  image: "https://cdn.shopify.com/...",
  price: "99.99 USD"
}
```

## Implementation Details

### Customer Table Requirements
The customer table must have these fields for emails to work:
- `customerId` (unique)
- `email` (required for sending)
- `firstName` 
- `lastName`
- `shop`

### Email Flow

**1. Product Added:**
```
Customer adds item → api.wishlist.jsx (POST)
  ↓
Save to database
  ↓
Fetch customer info
  ↓
Fetch product details
  ↓
Send email via sendWishlistEmail()
  ↓
Log result (email prepared for sending)
```

**2. Manual Summary:**
```
Admin clicks "Send Email" → app.settings.jsx
  ↓
Fetch all wishlist items
  ↓
Fetch product details for each
  ↓
Send via sendWishlistSummaryEmail()
  ↓
Show success/error message
```

## Email Template Styling

All emails include:
- ✅ Responsive design (max-width: 600px)
- ✅ Professional styling with cards and shadows
- ✅ Branded colors (customizable)
- ✅ Mobile-friendly layout
- ✅ Clear call-to-action buttons

## Important Notes

### ⚠️ Current Limitation
Shopify doesn't provide a direct "send custom email" API. The current implementation:
- Prepares the email content
- Logs it to console
- Returns email details

### 🚀 Production Implementation Options

**Option 1: Shopify Flow** (Recommended)
- Use Shopify Flow to trigger emails
- Create custom workflow based on metafield changes
- Requires Shopify Plus

**Option 2: External Email Service**
Add one of these services:
- **SendGrid** - Popular, reliable
- **Mailgun** - Developer-friendly
- **Resend** - Modern, simple API
- **Amazon SES** - Cost-effective

**Option 3: Shopify Scripts**
- Use Shopify Scripts to trigger notification templates
- Limited customization

### To Integrate External Service (e.g., SendGrid):

1. Install package:
```bash
npm install @sendgrid/mail
```

2. Update `email.server.js`:
```javascript
import sgMail from '@sendgrid/mail';
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// In sendWishlistEmail function:
const msg = {
  to: customerEmail,
  from: 'noreply@yourstore.com',
  subject: subject,
  html: emailBody,
};

await sgMail.send(msg);
```

3. Add to `.env`:
```
SENDGRID_API_KEY=your_api_key_here
```

## Testing

### Test Email Functionality:
1. Add product to wishlist
2. Check console logs for email preparation
3. Verify customer data is saved with email
4. Test manual email from Settings page

### Console Output:
```
📧 Preparing to send wishlist email...
📧 Email result: {
  success: true,
  message: 'Email notification logged',
  details: { ... }
}
```

## Future Enhancements

- [ ] Email preferences (opt-in/opt-out)
- [ ] Email templates customization from admin
- [ ] Scheduled wishlist reminder emails
- [ ] Price drop notifications
- [ ] Back-in-stock alerts
- [ ] Abandoned wishlist campaigns

## Support

For issues or questions:
1. Check console logs for email preparation
2. Verify customer email exists in database
3. Ensure shop session is valid
4. Review error messages in catch blocks
