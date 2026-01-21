
import prisma from "../db.server";

// Loader: fetch all todos
export const loader = async () => {
  try {
    const todos = await prisma.todo.findMany({
      orderBy: { createdAt: "desc" },
    });
    return Response.json(todos);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
};

// Action: create, toggle, delete
export const action = async ({ request }) => {
  const formData = await request.formData();
  const _action = formData.get("_action");

  try {
    // Create a new todo
    if (_action === "create") {
      const title = formData.get("title");
      if (!title) {
        return Response.json({ error: "Title is required" }, { status: 400 });
      }
      const todo = await prisma.todo.create({ data: { title } });
      return Response.json(todo);
    }

    // Toggle completed
    if (_action === "toggle") {
      const id = parseInt(formData.get("id"));
      const todo = await prisma.todo.findUnique({ where: { id } });
      if (!todo) {
        return Response.json({ error: "Todo not found" }, { status: 404 });
      }
      const updated = await prisma.todo.update({
        where: { id },
        data: { completed: !todo.completed },
      });
      return Response.json(updated);
    }

    // Delete a todo
    if (_action === "delete") {
      const id = parseInt(formData.get("id"));
      await prisma.todo.delete({ where: { id } });
      return Response.json({ success: true });
    }

    return Response.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
};
