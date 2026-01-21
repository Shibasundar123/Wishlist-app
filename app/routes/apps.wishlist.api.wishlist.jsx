import prisma from "../db.server";

export async function action({ request }) {
    const method = request.method;

    try {
        const body = await request.json();
        const { customerId, productId, shop } = body;

        console.log("Received request:", { method, customerId, productId, shop });

        if (!customerId || !productId) {
            return Response.json({ 
                message: "customerId and productId are required." 
            }, { status: 400 });
        }

        const shopDomain = shop || 'sp-store-20220778.myshopify.com';

        if (method === "POST") {
            const existing = await prisma.wishlist.findFirst({
                where: { customerId, productId, shop: shopDomain }
            });

            if (!existing) {
                const created = await prisma.wishlist.create({
                    data: { customerId, productId, shop: shopDomain }
                });
                console.log("Created wishlist item:", created);
            } else {
                console.log("Item already in wishlist");
            }

            return Response.json({ 
                message: "Added to wishlist successfully."
            }, { status: 200 });

        } else if (method === "DELETE") {
            const deleted = await prisma.wishlist.deleteMany({
                where: { customerId, productId }
            });
            console.log("Deleted items:", deleted.count);

            return Response.json({ 
                message: "Removed from wishlist successfully."
            }, { status: 200 });
        }

        return Response.json({ message: "Method not allowed." }, { status: 405 });

    } catch (error) {
        console.error("Error managing wishlist:", error);
        return Response.json({ 
            message: "Error managing wishlist.",
            error: error.message 
        }, { status: 500 });
    }
}
