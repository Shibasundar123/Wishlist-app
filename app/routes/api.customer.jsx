import db from "../db.server";
import shopify from "../shopify.server";

export async function action({ request }) {
  const { customerId, shop } = await request.json();
  
  console.log("📞 Customer API called with:", { customerId, shop });

  if (!customerId || !shop) {
    console.error("❌ Missing customerId or shop");
    return new Response(JSON.stringify({ error: "Missing customerId or shop" }), { 
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    // Get admin API client directly (no session needed for app proxy)
    const { admin } = await shopify.unauthenticated.admin(shop);

    // Fetch customer data from Shopify
    const response = await admin.graphql(
      `#graphql
      query getCustomer($id: ID!) {
        customer(id: $id) {
          id
          firstName
          lastName
          email
          phone
          numberOfOrders
          amountSpent {
            amount
          }
        }
      }`,
      {
        variables: {
          id: `gid://shopify/Customer/${customerId}`,
        },
      }
    );

    const result = await response.json();
    
    if (!result.data || !result.data.customer) {
      console.error("❌ Customer not found in Shopify");
      return new Response(JSON.stringify({ error: "Customer not found" }), { 
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }

    const customer = result.data.customer;

    // Save or update customer in database
    await db.customer.upsert({
      where: { customerId: customerId },
      update: {
        firstName: customer.firstName || '',
        lastName: customer.lastName || '',
        email: customer.email || '',
        phone: customer.phone || '',
        ordersCount: customer.numberOfOrders || 0,
        totalSpent: String(customer.amountSpent?.amount || '0'),
        shop: shop,
      },
      create: {
        customerId: customerId,
        firstName: customer.firstName || '',
        lastName: customer.lastName || '',
        email: customer.email || '',
        phone: customer.phone || '',
        ordersCount: customer.numberOfOrders || 0,
        totalSpent: String(customer.amountSpent?.amount || '0'),
        shop: shop,
      },
    });

    console.log(`✅ Customer ${customerId} info saved to database`);

    return new Response(JSON.stringify({ success: true, customer: customer }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("❌ Error saving customer info:", error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
