import React, { useState } from "react";
import { AppProvider, BlockStack, InlineGrid, Card, TextField, Divider, useBreakpoints, Button, Layout, Page } from "@shopify/polaris";
import enTranslations from '@shopify/polaris/locales/en.json';
import { useLoaderData, Form } from "react-router";

export async function loader() {
  const data = { name: "My App", description: "This is my app description." };
  return data;
}

export async function action({ request }) {
  const formData = await request.formData();
  const name = formData.get("name");
  const description = formData.get("description");
  // Here you would typically save the data to your database or perform other actions
  return { success: true, name, description };
}

export default function SettingsPage() {
  const { smUp } = useBreakpoints();
  const data = useLoaderData();
  const [formData, setFormData] = useState({
    name: data.name,
    description: data.description
  });

  return (
    <AppProvider i18n={enTranslations}>
      <Page title="Settings">
        <Layout>
          <Layout.Section>
            <BlockStack gap={{ xs: "800", sm: "400" }}>
              {smUp ? <Divider /> : null}
              <InlineGrid columns={{ xs: "1fr", md: "2fr 5fr" }} gap="400">
                <Card roundedAbove="sm">
                  <Form method="post">
                    <BlockStack gap="400">
                      <TextField 
                        label="App Name" 
                        name="name"
                        value={formData.name} 
                        onChange={(value) => setFormData({ ...formData, name: value })}
                        autoComplete="off"
                      />
                      <TextField 
                        label="Description" 
                        name="description"
                        value={formData.description} 
                        onChange={(value) => setFormData({ ...formData, description: value })}
                        autoComplete="off"
                        
                      />
                      <Button submit variant="primary">Save</Button>
                    </BlockStack>
                  </Form>
                </Card>
              </InlineGrid>
            </BlockStack>
          </Layout.Section>
        </Layout>
      </Page>
    </AppProvider>
  );
}