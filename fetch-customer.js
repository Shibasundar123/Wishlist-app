import { PrismaClient } from '@prisma/client';
import shopify from './app/shopify.server.js';

const prisma = new PrismaClient();

async function fetchCustomerInfo() {
  try {
    const shop = 'sp-store-20220778.myshopify.com';
    const customerId = '26902623945074';
    
    // Get session
    const sessions = await shopify.sessionStorage.findSessionsByShop(shop);
    if (!sessions || sessions.length === 0) {
      console.error('No session found');
      return;
    }
    
    const session = sessions.find(s => s.id.includes('-offline')) || sessions[0];
    
    // Fetch customer from Shopify
    const response = await fetch(`https://${shop}/admin/api/2026-04/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': session.accessToken,
      },
      body: JSON.stringify({
        query: `
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
          }
        `,
        variables: {
          id: `gid://shopify/Customer/${customerId}`
        }
      })
    });
    
    const result = await response.json();
    console.log('GraphQL Response:', JSON.stringify(result, null, 2));
    
    if (result.data?.customer) {
      const customer = result.data.customer;
      
      await prisma.customer.upsert({
        where: { customerId: customerId },
        update: {
          firstName: customer.firstName || '',
          lastName: customer.lastName || '',
          email: customer.email || '',
          phone: customer.phone || '',
          ordersCount: customer.numberOfOrders || 0,
          totalSpent: parseFloat(customer.amountSpent?.amount || 0),
          shop: shop,
        },
        create: {
          customerId: customerId,
          firstName: customer.firstName || '',
          lastName: customer.lastName || '',
          email: customer.email || '',
          phone: customer.phone || '',
          ordersCount: customer.numberOfOrders || 0,
          totalSpent: parseFloat(customer.amountSpent?.amount || 0),
          shop: shop,
        },
      });
      
      console.log('✅ Customer info saved to database');
      
      // Verify
      const saved = await prisma.customer.findUnique({
        where: { customerId: customerId }
      });
      console.log('Saved customer:', saved);
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fetchCustomerInfo();
