# Email Functionality - Quick Start Guide

## ✅ What's Been Added

### 1. Email Service (`app/email.server.js`)
Core email functionality with:
- `sendWishlistEmail()` - Single product add/remove notifications
- `sendWishlistSummaryEmail()` - Full wishlist summary
- `getProductDetailsForEmail()` - Product data fetcher
- Beautiful HTML email templates with responsive design

### 2. Automatic Notifications (`app/routes/api.wishlist.jsx`)
When customer adds/removes items:
- ✉️ Email automatically prepared
- 📧 Includes product details and images
- 🔗 Direct links to products
- 👤 Personalized with customer name

### 3. Manual Email Sending (`app/routes/app.settings.jsx`)
Admin can:
- View all customers with wishlists
- Send wishlist summary emails
- See customer details and item counts
- Button to trigger emails per customer

### 4. Email API (`app/routes/api.send-email.jsx`)
Dedicated endpoint for external integrations:
- `POST /api/send-email`
- Send summary or single product emails
- JSON API for flexibility

## 🚀 How to Test

### Test Automatic Emails (when adding to wishlist):
1. Add a product to wishlist from storefront
2. Check server console logs:
   ```
   📧 Preparing to send wishlist email...
   📧 Email result: { success: true, ... }
   ```
3. Verify email details are logged

### Test Manual Emails (from admin):
1. Go to Settings page in admin
2. Find customer with wishlist items
3. Click "Send Email" button
4. Check console for email preparation
5. Modal should confirm action

### Verify Customer Data:
```bash
# Check database has customer emails
cd wishlist
npm run prisma studio
# Look at Customer table
```

## 📧 Email Preview

### Addition Email:
```
Subject: ✨ Item Added to Your Wishlist

Hi John! 👋

Great choice! You've added a new item to your wishlist.

[Product Image]
Product Name
$99.99
Product description...

[View Product Button]

💡 Tip: Add it to your cart before it's gone!
```

### Summary Email:
```
Subject: Your Wishlist Summary - 5 Items

Hi John! 👋

Here's a summary of your wishlist with 5 items.

[Product 1 Image] Product 1 - $99.99 → View Product
[Product 2 Image] Product 2 - $149.99 → View Product
...

[Shop Now Button]
```

## ⚙️ Current Status

✅ **Working:**
- Email content generation
- Customer data fetching
- Product details fetching  
- Email logging and tracking
- Integration with wishlist actions

⚠️ **Note:**
Emails are currently **prepared and logged** but not sent to actual inboxes. This is because Shopify doesn't provide a direct custom email API.

## 🔧 To Send Real Emails

Choose one of these options:

### Option A: SendGrid (Recommended)
```bash
cd wishlist
npm install @sendgrid/mail
```

Add to `.env`:
```
SENDGRID_API_KEY=your_key_here
```

Update `email.server.js` (line ~100):
```javascript
import sgMail from '@sendgrid/mail';
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Replace console.log with:
await sgMail.send({
  to: customerEmail,
  from: 'noreply@yourstore.com',
  subject: subject,
  html: emailBody,
});
```

### Option B: Shopify Flow (Shopify Plus)
Create Flow workflow:
- Trigger: Customer metafield updated
- Action: Send email template
- Use wishlist metafield changes

### Option C: Other Services
- **Mailgun**: Great for developers
- **Resend**: Modern, simple API
- **Amazon SES**: Cost-effective for volume

## 📁 Files Changed

1. ✨ **NEW:** `app/email.server.js` - Email service
2. ✨ **NEW:** `app/routes/api.send-email.jsx` - Email API
3. ✨ **NEW:** `EMAIL_DOCUMENTATION.md` - Full docs
4. ✨ **NEW:** `EMAIL_QUICK_START.md` - This file
5. 🔧 **UPDATED:** `app/routes/api.wishlist.jsx` - Added email triggers
6. 🔧 **UPDATED:** `app/routes/app.settings.jsx` - Added email sending

## 🐛 Troubleshooting

**Email not preparing?**
- Check customer has email in database
- Verify customer table is updated (fixed earlier)
- Look for errors in console

**"Admin object not available"?**
- Session might be expired
- Check shop parameter is correct
- Verify app is installed on store

**No customer email?**
- Customer info might not be saved
- Check api.wishlist.jsx saves customer data
- Verify customer metafield fetch works

## 📊 Console Logs to Watch

```bash
# Good signs:
📧 Preparing to send wishlist email...
📧 Email result: { success: true, ... }
✅ Customer 12345 (john@example.com) saved to database

# Issues to investigate:
❌ Error sending wishlist email: ...
⚠️ No customer email found, skipping email notification
❌ Admin object not available, cannot fetch customer info
```

## 🎯 Next Steps

1. **Test the flow:**
   - Add item to wishlist
   - Remove item from wishlist  
   - Send manual email from settings
   
2. **Check console logs** for email preparation

3. **Verify customer data** in database

4. **Choose email provider** for production

5. **Customize email templates** in `email.server.js`

6. **Set up email preferences** (optional)

## 💡 Tips

- Email styling can be customized in `email.server.js`
- Add your logo by modifying the HTML template
- Change colors to match your brand
- Add more product details if needed
- Create custom email types for special campaigns

---

**Ready to send real emails?** Choose a provider from the options above and update the email service! 🚀
