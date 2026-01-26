import prisma from "../db.server";
import shopify from "../shopify.server";
import { sendWishlistSummaryEmail, sendWishlistEmail, getProductDetailsForEmail } from "../email.server";

/**
 * API endpoint for sending wishlist emails
 * POST /api/send-email
 */
export async function action({ request }) {
  try {
    const body = await request.json();
    const { customerId, shop, emailType, productId } = body;

    console.log('📧 Email API called:', { customerId, shop, emailType, productId });

    if (!customerId || !shop) {
      return Response.json({ 
        success: false,
        message: "customerId and shop are required." 
      }, { status: 400 });
    }

    // Get customer info from database
    const customer = await prisma.customer.findUnique({
      where: { customerId: customerId }
    });

    if (!customer || !customer.email) {
      return Response.json({ 
        success: false,
        message: "Customer email not found." 
      }, { status: 404 });
    }

    // Get Shopify admin client
    const sessionStorage = shopify.sessionStorage;
    const sessions = await sessionStorage.findSessionsByShop(shop);
    
    if (!sessions || sessions.length === 0) {
      return Response.json({ 
        success: false,
        message: "Shop session not found." 
      }, { status: 404 });
    }

    const offlineSession = sessions.find(s => s.id.includes('-offline')) || sessions[0];
    const graphqlEndpoint = `https://${shop}/admin/api/2026-04/graphql.json`;
    
    const admin = {
      async query(query, variables) {
        const response = await fetch(graphqlEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': offlineSession.accessToken,
          },
          body: JSON.stringify({ query, variables }),
        });
        return await response.json();
      }
    };

    const customerName = `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'Customer';

    // Handle different email types
    if (emailType === 'summary') {
      // Send wishlist summary
      const wishlistItems = await prisma.wishlist.findMany({
        where: { 
          customerId: customerId,
          shop: shop 
        }
      });

      if (wishlistItems.length === 0) {
        return Response.json({ 
          success: false,
          message: "No wishlist items found." 
        }, { status: 404 });
      }

      // Fetch product details
      const productDetails = [];
      for (const item of wishlistItems) {
        const productGID = item.productId.startsWith('gid://') 
          ? item.productId 
          : `gid://shopify/Product/${item.productId}`;
        
        const details = await getProductDetailsForEmail(admin, productGID);
        if (details) {
          productDetails.push(details);
        }
      }

      const emailResult = await sendWishlistSummaryEmail(
        admin,
        customer.email,
        customerName,
        productDetails,
        shop
      );

      return Response.json(emailResult, { 
        status: emailResult.success ? 200 : 500 
      });

    } else if (emailType === 'product' && productId) {
      // Send single product notification
      const productGID = productId.startsWith('gid://') 
        ? productId 
        : `gid://shopify/Product/${productId}`;

      const productDetails = await getProductDetailsForEmail(admin, productGID);
      
      if (!productDetails) {
        return Response.json({ 
          success: false,
          message: "Product details not found." 
        }, { status: 404 });
      }

      const emailResult = await sendWishlistEmail(
        admin,
        customer.email,
        customerName,
        productDetails,
        shop,
        'added'
      );

      return Response.json(emailResult, { 
        status: emailResult.success ? 200 : 500 
      });

    } else {
      return Response.json({ 
        success: false,
        message: "Invalid email type or missing parameters." 
      }, { status: 400 });
    }

  } catch (error) {
    console.error("❌ Error in email API:", error);
    return Response.json({ 
      success: false,
      message: "Error sending email.",
      error: error.message
    }, { status: 500 });
  }
}
