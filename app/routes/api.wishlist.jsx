import prisma from "../db.server";

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

        if (method === "POST") {
            // Save to database
            const existing = await prisma.wishlist.findFirst({
                where: { customerId, productId, shop: shopDomain }
            });

            if (!existing) {
                await prisma.wishlist.create({
                    data: { customerId, productId, shop: shopDomain }
                });
            }

            return Response.json({ 
                message: "Added to wishlist successfully."
            }, { status: 200 });

        } else if (method === "DELETE") {
            // Remove from database
            await prisma.wishlist.deleteMany({
                where: { customerId, productId }
            });

            return Response.json({ 
                message: "Removed from wishlist successfully."
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
