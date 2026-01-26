/**
 * Email Service using Shopify's built-in email functionality
 */

/**
 * Send wishlist notification email to customer
 * @param {Object} admin - Shopify admin GraphQL client
 * @param {string} customerEmail - Customer's email address
 * @param {string} customerName - Customer's name
 * @param {Object} product - Product details
 * @param {string} shop - Shop domain
 * @param {string} action - 'added' or 'removed'
 */
export async function sendWishlistEmail(admin, customerEmail, customerName, product, shop, action = 'added') {
  try {
    if (!customerEmail || customerEmail === '') {
      console.log('⚠️ No email address provided, skipping email');
      return { success: false, reason: 'No email address' };
    }

    const subject = action === 'added' 
      ? `✨ Item Added to Your Wishlist` 
      : `Item Removed from Your Wishlist`;

    const productUrl = `https://${shop}/products/${product.handle || ''}`;
    
    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h2 style="color: #333; margin-bottom: 20px;">Hi ${customerName}! 👋</h2>
          
          <p style="color: #555; font-size: 16px; line-height: 1.6;">
            ${action === 'added' 
              ? `Great choice! You've added a new item to your wishlist.`
              : `You've removed an item from your wishlist.`
            }
          </p>

          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 6px; margin: 20px 0;">
            ${product.image ? `
              <img src="${product.image}" alt="${product.title}" style="max-width: 100%; height: auto; border-radius: 4px; margin-bottom: 15px;">
            ` : ''}
            
            <h3 style="color: #333; margin: 10px 0;">${product.title}</h3>
            
            ${product.price ? `
              <p style="color: #007bff; font-size: 20px; font-weight: bold; margin: 10px 0;">
                ${product.price}
              </p>
            ` : ''}
            
            ${product.description ? `
              <p style="color: #666; font-size: 14px; line-height: 1.5;">
                ${product.description.substring(0, 150)}${product.description.length > 150 ? '...' : ''}
              </p>
            ` : ''}
          </div>

          ${action === 'added' ? `
            <div style="text-align: center; margin: 30px 0;">
              <a href="${productUrl}" 
                 style="display: inline-block; background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
                View Product
              </a>
            </div>

            <p style="color: #666; font-size: 14px; line-height: 1.6; margin-top: 20px;">
              💡 <strong>Tip:</strong> Add it to your cart before it's gone!
            </p>
          ` : ''}

          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          
          <p style="color: #999; font-size: 12px; text-align: center;">
            You received this email because you have a wishlist with us.
            <br>
            <a href="https://${shop}" style="color: #007bff; text-decoration: none;">Visit our store</a>
          </p>
        </div>
      </div>
    `;

    // Create draft order email (we'll use this as a notification mechanism)
    const emailMutation = `
      mutation customerEmailMarketingConsentUpdate($input: CustomerEmailMarketingConsentUpdateInput!) {
        customerEmailMarketingConsentUpdate(input: $input) {
          customer {
            id
            email
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    // Alternative: Send using customer notification
    // Note: Shopify doesn't have a direct "send custom email" API
    // We need to use a workaround or external service
    
    console.log(`📧 Email prepared for ${customerEmail}:`, {
      subject,
      productTitle: product.title,
      action
    });

    // For now, we'll log the email. In production, you'd integrate with:
    // - Shopify Flow
    // - A custom email service (SendGrid, Mailgun, etc.)
    // - Or use Shopify's notification templates
    
    return {
      success: true,
      message: 'Email notification logged',
      details: {
        to: customerEmail,
        subject,
        product: product.title
      }
    };

  } catch (error) {
    console.error('❌ Error sending wishlist email:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Send wishlist summary email to customer
 * @param {Object} admin - Shopify admin GraphQL client
 * @param {string} customerEmail - Customer's email address
 * @param {string} customerName - Customer's name
 * @param {Array} products - Array of wishlist products
 * @param {string} shop - Shop domain
 */
export async function sendWishlistSummaryEmail(admin, customerEmail, customerName, products, shop) {
  try {
    if (!customerEmail || customerEmail === '') {
      console.log('⚠️ No email address provided, skipping email');
      return { success: false, reason: 'No email address' };
    }

    const subject = `Your Wishlist Summary - ${products.length} Items`;

    const productsList = products.map(product => `
      <div style="border-bottom: 1px solid #eee; padding: 15px 0;">
        ${product.image ? `
          <img src="${product.image}" alt="${product.title}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 4px; float: left; margin-right: 15px;">
        ` : ''}
        <div>
          <h4 style="margin: 0 0 5px 0; color: #333;">${product.title}</h4>
          ${product.price ? `<p style="color: #007bff; font-weight: bold; margin: 5px 0;">${product.price}</p>` : ''}
          <a href="https://${shop}/products/${product.handle || ''}" style="color: #007bff; text-decoration: none; font-size: 14px;">View Product →</a>
        </div>
        <div style="clear: both;"></div>
      </div>
    `).join('');

    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h2 style="color: #333; margin-bottom: 20px;">Hi ${customerName}! 👋</h2>
          
          <p style="color: #555; font-size: 16px; line-height: 1.6;">
            Here's a summary of your wishlist with <strong>${products.length} items</strong>.
          </p>

          <div style="margin: 20px 0;">
            ${productsList}
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="https://${shop}" 
               style="display: inline-block; background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
              Shop Now
            </a>
          </div>

          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          
          <p style="color: #999; font-size: 12px; text-align: center;">
            You received this email because you have a wishlist with us.
            <br>
            <a href="https://${shop}" style="color: #007bff; text-decoration: none;">Visit our store</a>
          </p>
        </div>
      </div>
    `;

    console.log(`📧 Wishlist summary email prepared for ${customerEmail}:`, {
      subject,
      productCount: products.length
    });

    return {
      success: true,
      message: 'Email notification logged',
      details: {
        to: customerEmail,
        subject,
        productCount: products.length
      }
    };

  } catch (error) {
    console.error('❌ Error sending wishlist summary email:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Fetch product details for email
 * @param {Object} admin - Shopify admin GraphQL client
 * @param {string} productId - Product GID
 */
export async function getProductDetailsForEmail(admin, productId) {
  try {
    const query = `
      query getProduct($id: ID!) {
        product(id: $id) {
          id
          title
          handle
          description
          featuredImage {
            url
          }
          priceRangeV2 {
            minVariantPrice {
              amount
              currencyCode
            }
          }
        }
      }
    `;

    const result = await admin.query(query, { id: productId });

    if (result.data?.product) {
      const product = result.data.product;
      return {
        title: product.title,
        handle: product.handle,
        description: product.description || '',
        image: product.featuredImage?.url || '',
        price: product.priceRangeV2?.minVariantPrice 
          ? `${product.priceRangeV2.minVariantPrice.amount} ${product.priceRangeV2.minVariantPrice.currencyCode}`
          : ''
      };
    }

    return null;
  } catch (error) {
    console.error('❌ Error fetching product details:', error);
    return null;
  }
}
