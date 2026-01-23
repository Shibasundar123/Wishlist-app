import prisma from "../db.server";
import shopify from "../shopify.server";

// Handle GET requests - fetch wishlist
export async function loader({ request }) {
    try {
        const url = new URL(request.url);
        let customerId = url.searchParams.get('customerId');
        const shop = url.searchParams.get('shop');

        console.log('📥 GET Request - Customer ID received:', customerId);
        console.log('📥 GET Request - Shop:', shop);

        if (!customerId) {
            return Response.json({ 
                message: "customerId is required.",
                wishlist: []
            }, { status: 400 });
        }

        const shopDomain = shop || 'sp-store-20220778.myshopify.com';

        // Convert GID to numeric ID if needed for database lookup
        let numericCustomerId = customerId;
        if (customerId.includes('gid://shopify/Customer/')) {
            numericCustomerId = customerId.split('/').pop();
            console.log('🔄 Converted GID to numeric:', numericCustomerId);
        }

        // Try both formats to find wishlist items
        console.log('🔍 Searching database with Customer ID:', numericCustomerId);
        console.log('🔍 Shop domain:', shopDomain);

        const wishlistItems = await prisma.wishlist.findMany({
            where: { 
                customerId: numericCustomerId,
                shop: shopDomain 
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        console.log('✅ Found wishlist items:', wishlistItems.length);
        console.log('📦 Raw items:', JSON.stringify(wishlistItems, null, 2));

        // Extract product IDs and remove duplicates
        const productIds = [...new Set(wishlistItems.map(item => {
            return item.productId.startsWith('gid://') 
                ? item.productId 
                : `gid://shopify/Product/${item.productId}`;
        }))];

        console.log('📤 Returning unique product IDs:', productIds);

        return Response.json({ 
            message: "Wishlist fetched successfully.",
            wishlist: productIds,
            count: productIds.length
        }, { status: 200 });

    } catch (error) {
        console.error("❌ Error fetching wishlist:", error);
        return Response.json({ 
            message: "Error fetching wishlist.",
            error: error.message,
            wishlist: []
        }, { status: 500 });
    }
}

// Handle POST/DELETE requests
export async function action({ request }) {
    const method = request.method;

    try {
        const body = await request.json();
        const { customerId, productId, shop } = body;

        if (!customerId || !productId) {
            return Response.json({ 
                message: "customerId and productId are required." 
            }, { status: 400 });
        }

        const shopDomain = shop || 'sp-store-20220778.myshopify.com';

        // Convert IDs to GID format if needed
        const customerGID = customerId.startsWith('gid://') 
            ? customerId 
            : `gid://shopify/Customer/${customerId}`;
        
        const productGID = productId.startsWith('gid://') 
            ? productId 
            : `gid://shopify/Product/${productId}`;

        // Get offline session for GraphQL API access
        const sessionStorage = shopify.sessionStorage;
        const sessions = await sessionStorage.findSessionsByShop(shopDomain);
        
        let admin = null;
        if (sessions && sessions.length > 0) {
            const offlineSession = sessions.find(s => s.id.includes('-offline')) || sessions[0];
            
            // Create GraphQL endpoint
            const graphqlEndpoint = `https://${shopDomain}/admin/api/2026-04/graphql.json`;
            
            admin = {
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
        }

        if (method === "POST") {
            // Check if already exists in database
            const existing = await prisma.wishlist.findFirst({
                where: { customerId, productId, shop: shopDomain }
            });

            if (!existing) {
                // Add to database
                await prisma.wishlist.create({
                    data: { customerId, productId, shop: shopDomain }
                });
                console.log('Product added to database:', productId);
            } else {
                console.log('Product already in wishlist database');
            }

            // Get ALL wishlist items from database for this customer
            const allWishlistItems = await prisma.wishlist.findMany({
                where: { customerId, shop: shopDomain }
            });

            // Build array of product GIDs
            const wishlistProducts = allWishlistItems.map(item => {
                return item.productId.startsWith('gid://') 
                    ? item.productId 
                    : `gid://shopify/Product/${item.productId}`;
            });

            console.log('All wishlist items from DB:', wishlistProducts);
            console.log('Customer GID:', customerGID);
            console.log('Admin object exists:', !!admin);

            // Sync to customer metafield
            if (!admin) {
                console.error('Admin object is null - cannot update metafield');
            } else {
                try {
                    const metafieldValue = JSON.stringify(wishlistProducts);
                    console.log('Metafield value to set:', metafieldValue);
                    
                    const mutation = `
                        mutation UpdateCustomerWishlist($customerId: ID!, $value: String!) {
                            metafieldsSet(
                                metafields: [{
                                    ownerId: $customerId
                                    namespace: "custom"
                                    key: "wishlist"
                                    type: "list.product_reference"
                                    value: $value
                                }]
                            ) {
                                metafields {
                                    id
                                    value
                                    type
                                    namespace
                                    key
                                }
                                userErrors {
                                    field
                                    message
                                }
                            }
                        }
                    `;
                    
                    const result = await admin.query(mutation, {
                        customerId: customerGID,
                        value: metafieldValue
                    });
                    
                    console.log('Full metafield mutation result:', JSON.stringify(result, null, 2));
                    
                    if (result.data?.metafieldsSet?.userErrors?.length > 0) {
                        console.error('❌ Metafield update errors:', result.data.metafieldsSet.userErrors);
                    } else {
                        console.log('✅ Metafield updated successfully:', result.data?.metafieldsSet?.metafields);
                    }
                    
                    if (result.errors) {
                        console.error('❌ GraphQL errors:', result.errors);
                    }
                } catch (e) {
                    console.error('❌ Exception updating metafield:', e.message, e.stack);
                }
            }

            return Response.json({ 
                message: "Added to wishlist successfully.",
                wishlist: wishlistProducts
            }, { status: 200 });

        } else if (method === "DELETE") {
            // Remove from database
            await prisma.wishlist.deleteMany({
                where: { customerId, productId, shop: shopDomain }
            });
            console.log('Product removed from database:', productId);

            // Get remaining wishlist items from database
            const allWishlistItems = await prisma.wishlist.findMany({
                where: { customerId, shop: shopDomain }
            });

            // Build array of product GIDs
            const wishlistProducts = allWishlistItems.map(item => {
                return item.productId.startsWith('gid://') 
                    ? item.productId 
                    : `gid://shopify/Product/${item.productId}`;
            });

            console.log('Remaining wishlist items from DB:', wishlistProducts);
            console.log('Customer GID:', customerGID);

            // Sync to customer metafield
            if (!admin) {
                console.error('Admin object is null - cannot update metafield');
            } else {
                try {
                    const metafieldValue = JSON.stringify(wishlistProducts);
                    console.log('Metafield value to set:', metafieldValue);
                    
                    const mutation = `
                        mutation UpdateCustomerWishlist($customerId: ID!, $value: String!) {
                            metafieldsSet(
                                metafields: [{
                                    ownerId: $customerId
                                    namespace: "custom"
                                    key: "wishlist"
                                    type: "list.product_reference"
                                    value: $value
                                }]
                            ) {
                                metafields {
                                    id
                                    value
                                    type
                                    namespace
                                    key
                                }
                                userErrors {
                                    field
                                    message
                                }
                            }
                        }
                    `;
                    
                    const result = await admin.query(mutation, {
                        customerId: customerGID,
                        value: metafieldValue
                    });
                    
                    console.log('Full metafield delete mutation result:', JSON.stringify(result, null, 2));
                    
                    if (result.data?.metafieldsSet?.userErrors?.length > 0) {
                        console.error('❌ Metafield update errors:', result.data.metafieldsSet.userErrors);
                    } else {
                        console.log('✅ Metafield updated successfully after delete:', result.data?.metafieldsSet?.metafields);
                    }
                    
                    if (result.errors) {
                        console.error('❌ GraphQL errors:', result.errors);
                    }
                } catch (e) {
                    console.error('❌ Exception updating metafield:', e.message, e.stack);
                }
            }

            return Response.json({ 
                message: "Removed from wishlist successfully.",
                wishlist: wishlistProducts
            }, { status: 200 });
        }

        return Response.json({ message: "Method not allowed." }, { status: 405 });

    } catch (error) {
        console.error("Error:", error);
        return Response.json({ 
            message: "Error managing wishlist.",
            error: error.message 
        }, { status: 500 });
    }
}
