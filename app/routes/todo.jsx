import { useEffect, useState } from "react";
import {
  AppProvider,
  Page,
  Card,
  TextField,
  Button,
  Checkbox,
  Layout,
  InlineStack,
  Spinner,
} from "@shopify/polaris";
import enTranslations from "@shopify/polaris/locales/en.json";

export default function AdminTodos() {
  const [todos, setTodos] = useState([]);
  const [newTitle, setNewTitle] = useState("");
  const [loading, setLoading] = useState(false);

  // Fetch todos from API
  const fetchTodos = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/custom");
      const data = await res.json();
      setTodos(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodos();
  }, []);

  // Add a new todo
  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const formData = new FormData();
    formData.append("_action", "create");
    formData.append("title", newTitle);

    const res = await fetch("/api/custom", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    if (!data.error) {
      setTodos((prev) => [data, ...prev]);
      setNewTitle("");
    }
  };

  // Toggle completed
  const handleToggle = async (id) => {
    const formData = new FormData();
    formData.append("_action", "toggle");
    formData.append("id", id);

    const res = await fetch("/api/custom", {
      method: "POST",
      body: formData,
    });

    const updated = await res.json();
    if (!updated.error) {
      setTodos((prev) =>
        prev.map((t) => (t.id === updated.id ? updated : t))
      );
    }
  };

  // Delete todo
  const handleDelete = async (id) => {
    const formData = new FormData();
    formData.append("_action", "delete");
    formData.append("id", id);

    const res = await fetch("/api/custom", {
      method: "POST",
      body: formData,
    });

    const result = await res.json();
    if (result.success) {
      setTodos((prev) => prev.filter((t) => t.id !== id));
    }
  };

  return (
    <AppProvider i18n={enTranslations}>
      <Page title="To-Do List Admin">
      <Layout>
        <Layout.Section>
          <Card sectioned>
            <form onSubmit={handleAdd}>
              <InlineStack gap="400">
                <TextField
                  label="New Todo"
                  value={newTitle}
                  onChange={setNewTitle}
                  autoComplete="off"
                />
                <Button variant="primary" submit>
                  Add
                </Button>
              </InlineStack>
            </form>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card sectioned title="Todos">
            {loading && <Spinner size="large" />}
            {!loading && todos.length === 0 && <p>No todos yet</p>}
            {!loading &&
              todos.map((todo) => (
                <InlineStack
                  key={todo.id}
                  alignment="center"
                  distribution="fillEvenly"
                >
                  <Checkbox
                    checked={todo.completed}
                    onChange={() => handleToggle(todo.id)}
                  />
                  <span
                    style={{
                      textDecoration: todo.completed
                        ? "line-through"
                        : "none",
                      flexGrow: 1,
                    }}
                  >
                    {todo.title}
                  </span>
                  <Button destructive onClick={() => handleDelete(todo.id)}>
                    Delete
                  </Button>
                </InlineStack>
              ))}
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
    </AppProvider>
  );
}
