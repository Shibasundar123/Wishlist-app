import React, { useState } from "react";
import {
  AppProvider,
  BlockStack,
  InlineGrid,
  Card,
  Button,
  Layout,
  Page,
  DataTable,
  Badge,
  Text,
  Modal,
  TextContainer,
} from "@shopify/polaris";
import enTranslations from "@shopify/polaris/locales/en.json";
import { useLoaderData, useFetcher } from "react-router";
import db from "../db.server";

export async function loader() {
  const wishlistItems = await db.wishlist.findMany({
    orderBy: { createdAt: 'desc' }
  });

  const customerMap = new Map();
  wishlistItems.forEach(item => {
    if (!customerMap.has(item.customerId)) {
      customerMap.set(item.customerId, {
        customerId: item.customerId,
        shop: item.shop,
        productCount: 0
      });
    }
    customerMap.get(item.customerId).productCount++;
  });

  const customersData = [];
  
  for (const [customerId, data] of customerMap) {
    const customer = await db.customer.findUnique({
      where: { customerId: customerId }
    });

    if (customer) {
      customersData.push({
        ...data,
        customerInfo: customer
      });
    } else {
      customersData.push({
        ...data,
        customerInfo: {
          customerId: customerId,
          firstName: 'Unknown',
          lastName: '',
          email: 'N/A',
          phone: 'N/A',
          ordersCount: 0
        }
      });
    }
  }

  return {
    customers: customersData,
    totalCustomers: customersData.length,
    totalProducts: wishlistItems.length
  };
}

export async function action({ request }) {
  const formData = await request.formData();
  const actionType = formData.get("actionType");

  if (actionType === "sendEmail") {
    const customerId = formData.get("customerId");
    const email = formData.get("email");
    console.log(`📧 Sending email to customer ${customerId} at ${email}`);
    return { success: true, message: `Email sent to ${email}` };
  }

  return { success: false };
}

export default function SettingsPage() {
  const data = useLoaderData();
  const fetcher = useFetcher();
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [emailModalActive, setEmailModalActive] = useState(false);

  const handleSendEmail = (customer) => {
    setSelectedCustomer(customer);
    setEmailModalActive(true);
  };

  const confirmSendEmail = () => {
    if (selectedCustomer) {
      fetcher.submit(
        {
          actionType: "sendEmail",
          customerId: selectedCustomer.customerId,
          email: selectedCustomer.customerInfo.email,
        },
        { method: "post" }
      );
      setEmailModalActive(false);
    }
  };

  const rows = data.customers.map((customer) => [
    `${customer.customerInfo.firstName} ${customer.customerInfo.lastName}`,
    customer.customerInfo.email,
    customer.customerInfo.phone || 'N/A',
    <Badge tone="info">{customer.productCount}</Badge>,
    customer.customerInfo.ordersCount?.toString() || '0',
    <Button 
      size="slim" 
      onClick={() => handleSendEmail(customer)}
      disabled={customer.customerInfo.email === 'N/A'}
    >
      Send Email
    </Button>
  ]);

  return (
    <AppProvider i18n={enTranslations}>
      <Page title="Wishlist Customers">
        <Layout>
          <Layout.Section>
            <InlineGrid columns={{ xs: 1, sm: 2 }} gap="400">
              <Card>
                <BlockStack gap="200">
                  <Text variant="headingSm" as="h3">Total Customers</Text>
                  <Text variant="heading2xl" as="p">{data.totalCustomers}</Text>
                </BlockStack>
              </Card>
              <Card>
                <BlockStack gap="200">
                  <Text variant="headingSm" as="h3">Total Wishlist Items</Text>
                  <Text variant="heading2xl" as="p">{data.totalProducts}</Text>
                </BlockStack>
              </Card>
            </InlineGrid>
          </Layout.Section>

          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">Customers with Wishlist Items</Text>
                {data.customers.length > 0 ? (
                  <DataTable
                    columnContentTypes={['text', 'text', 'text', 'text', 'text', 'text']}
                    headings={['Customer Name', 'Email', 'Phone', 'Wishlist Items', 'Orders', 'Action']}
                    rows={rows}
                  />
                ) : (
                  <Text as="p" tone="subdued">No customers with wishlist items yet.</Text>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

        <Modal
          open={emailModalActive}
          onClose={() => setEmailModalActive(false)}
          title="Send Email to Customer"
          primaryAction={{
            content: 'Send Email',
            onAction: confirmSendEmail,
          }}
          secondaryActions={[{
            content: 'Cancel',
            onAction: () => setEmailModalActive(false),
          }]}
        >
          <Modal.Section>
            <TextContainer>
              <p>Send a wishlist reminder email to <strong>{selectedCustomer?.customerInfo?.email}</strong>?</p>
              <p>This customer has <strong>{selectedCustomer?.productCount}</strong> item(s) in their wishlist.</p>
            </TextContainer>
          </Modal.Section>
        </Modal>
      </Page>
    </AppProvider>
  );
}
