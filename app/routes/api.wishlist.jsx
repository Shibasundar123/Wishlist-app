import prisma from "../db.server";
import shopify from "../shopify.server";

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
            // Get current wishlist from customer metafield
            let wishlistProducts = [];
            
            if (admin) {
                try {
                    const getQuery = `
                        query GetCustomerWishlist($customerId: ID!) {
                            customer(id: $customerId) {
                                id
                                metafield(namespace: "custom", key: "wishlist") {
                                    value
                                }
                            }
                        }
                    `;
                    
                    const result = await admin.query(getQuery, { customerId: customerGID });
                    console.log('Read metafield result:', JSON.stringify(result, null, 2));
                    
                    if (result.data?.customer?.metafield?.value) {
                        try {
                            wishlistProducts = JSON.parse(result.data.customer.metafield.value);
                        } catch (e) {
                            console.log('Failed to parse metafield value:', e);
                        }
                    }
                } catch (e) {
                    console.log('Failed to read metafield:', e);
                }
            }

            // Add product if not already in wishlist
            if (!wishlistProducts.includes(productGID)) {
                wishlistProducts.push(productGID);
            }

            // Save to customer metafield
            if (admin) {
                try {
                    const mutation = `
                        mutation UpdateCustomerWishlist($customerId: ID!, $value: String!) {
                            metafieldsSet(
                                metafields: [{
                                    ownerId: $customerId
                                    namespace: "custom"
                                    key: "wishlist"
                                    value: $value
                                }]
                            ) {
                                metafields {
                                    id
                                    value
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
                        value: JSON.stringify(wishlistProducts)
                    });
                    
                    console.log('Update metafield result:', JSON.stringify(result, null, 2));
                } catch (e) {
                    console.log('Failed to update metafield:', e);
                }
            }

            // Also save to database as backup
            const existing = await prisma.wishlist.findFirst({
                where: { customerId, productId, shop: shopDomain }
            });

            if (!existing) {
                await prisma.wishlist.create({
                    data: { customerId, productId, shop: shopDomain }
                });
            }

            return Response.json({ 
                message: "Added to wishlist successfully.",
                wishlist: wishlistProducts
            }, { status: 200 });

        } else if (method === "DELETE") {
            // Get current wishlist from customer metafield
            let wishlistProducts = [];
            
            if (admin) {
                try {
                    const getQuery = `
                        query GetCustomerWishlist($customerId: ID!) {
                            customer(id: $customerId) {
                                id
                                metafield(namespace: "custom", key: "wishlist") {
                                    value
                                }
                            }
                        }
                    `;
                    
                    const result = await admin.query(getQuery, { customerId: customerGID });
                    
                    if (result.data?.customer?.metafield?.value) {
                        try {
                            wishlistProducts = JSON.parse(result.data.customer.metafield.value);
                        } catch (e) {
                            console.log('Failed to parse metafield value:', e);
                        }
                    }
                } catch (e) {
                    console.log('Failed to read metafield:', e);
                }
            }

            // Remove product from wishlist
            wishlistProducts = wishlistProducts.filter(id => id !== productGID);

            // Update customer metafield
            if (admin) {
                try {
                    const mutation = `
                        mutation UpdateCustomerWishlist($customerId: ID!, $value: String!) {
                            metafieldsSet(
                                metafields: [{
                                    ownerId: $customerId
                                    namespace: "custom"
                                    key: "wishlist"
                                    value: $value
                                }]
                            ) {
                                metafields {
                                    id
                                    value
                                }
                                userErrors {
                                    field
                                    message
                                }
                            }
                        }
                    `;
                    
                    await admin.query(mutation, {
                        customerId: customerGID,
                        value: JSON.stringify(wishlistProducts)
                    });
                } catch (e) {
                    console.log('Failed to update metafield:', e);
                }
            }

            // Also remove from database
            await prisma.wishlist.deleteMany({
                where: { customerId, productId, shop: shopDomain }
            });

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
