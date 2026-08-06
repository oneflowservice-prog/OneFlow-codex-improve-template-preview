import { getBlogPosts } from "@/lib/blogs";
import { BlogManagement } from "./blog-management";

export const metadata = {
  title: "Blog Management | Admin Dashboard",
};

export default async function AdminBlogsPage() {
  const initialBlogs = await getBlogPosts();

  return (
    <div className="mx-auto max-w-6xl w-full p-4 md:p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Blog Posts</h1>
        <p className="text-muted-foreground mt-2">
          Manage your blog content, create new posts, and edit existing ones.
        </p>
      </div>

      <BlogManagement initialBlogs={initialBlogs} />
    </div>
  );
}
