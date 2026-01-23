import shopify from "../shopify.server";

export async function action({ request }) {
    try {
        const body = await request.json();
        const { productIds, shop } = body;

        if (!productIds || !Array.isArray(productIds)) {
            return Response.json({ 
                message: "productIds array is required.",
                products: []
            }, { status: 400 });
        }

        const shopDomain = shop || 'sp-store-20220778.myshopify.com';

        // Get offline session for GraphQL API access
        const sessionStorage = shopify.sessionStorage;
        const sessions = await sessionStorage.findSessionsByShop(shopDomain);
        
        if (!sessions || sessions.length === 0) {
            return Response.json({ 
                message: "No active session found.",
                products: []
            }, { status: 401 });
        }

        const offlineSession = sessions.find(s => s.id.includes('-offline')) || sessions[0];
        
        // Create GraphQL endpoint
        const graphqlEndpoint = `https://${shopDomain}/admin/api/2026-04/graphql.json`;
        
        // Convert product IDs to GIDs if needed
        const productGIDs = productIds.map(id => {
            if (id.startsWith('gid://')) {
                return id;
            }
            return `gid://shopify/Product/${id}`;
        });

        // Build GraphQL query to fetch multiple products
        const query = `
            query GetProducts($ids: [ID!]!) {
                nodes(ids: $ids) {
                    ... on Product {
                        id
                        title
                        handle
                        vendor
                        totalInventory
                        featuredImage {
                            url
                            altText
                        }
                        priceRangeV2 {
                            minVariantPrice {
                                amount
                                currencyCode
                            }
                        }
                        compareAtPriceRange {
                            maxVariantCompareAtPrice {
                                amount
                                currencyCode
                            }
                        }
                        variants(first: 1) {
                            edges {
                                node {
                                    id
                                    price
                                    compareAtPrice
                                    inventoryQuantity
                                }
                            }
                        }
                    }
                }
            }
        `;

        const response = await fetch(graphqlEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Shopify-Access-Token': offlineSession.accessToken,
            },
            body: JSON.stringify({ 
                query, 
                variables: { ids: productGIDs }
            }),
        });

        const result = await response.json();
        
        if (result.errors) {
            console.error('GraphQL errors:', result.errors);
            return Response.json({ 
                message: "Error fetching products.",
                products: [],
                errors: result.errors
            }, { status: 500 });
        }

        // Transform the data into a frontend-friendly format
        const products = result.data.nodes
            .filter(node => node !== null)
            .map(product => {
                const variant = product.variants.edges[0]?.node;
                const productId = product.id.split('/').pop();
                
                // Check availability based on inventory
                const available = variant ? (variant.inventoryQuantity > 0) : false;
                
                return {
                    id: product.id,
                    productId: productId,
                    title: product.title,
                    vendor: product.vendor,
                    handle: product.handle,
                    url: `/products/${product.handle}`,
                    image: product.featuredImage?.url || null,
                    price: variant ? parseFloat(variant.price) * 100 : 0, // Convert to cents
                    compareAtPrice: variant?.compareAtPrice ? parseFloat(variant.compareAtPrice) * 100 : null,
                    available: available,
                    variantId: variant?.id.split('/').pop() || null
                };
            });

        console.log('✅ Products fetched successfully:', products.length);

        return Response.json({ 
            message: "Products fetched successfully.",
            products: products,
            count: products.length
        }, { status: 200 });

    } catch (error) {
        console.error("❌ Error fetching products:", error);
        return Response.json({ 
            message: "Error fetching products.",
            error: error.message,
            products: []
        }, { status: 500 });
    }
}
