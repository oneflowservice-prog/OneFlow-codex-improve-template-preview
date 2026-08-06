"use client";

import { useState } from "react";
import {
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Search,
  Image as ImageIcon,
  LayoutTemplate,
  PenSquare,
  ScanText,
} from "lucide-react";
import { format } from "date-fns";
import dynamic from "next/dynamic";
import type { BlogPostLocaleOverrides, BlogPostView } from "@/lib/blogs";

const BlockEditor = dynamic(() => import("./block-editor"), {
  ssr: false,
  loading: () => <div className="h-64 flex items-center justify-center bg-muted/20 rounded-md">Loading editor...</div>,
});

type Blog = BlogPostView;
type EditableBlogLocale = "en" | "tr";

export function BlogManagement({ initialBlogs }: { initialBlogs: Blog[] }) {
  const [blogs, setBlogs] = useState<Blog[]>(initialBlogs);
  const [isEditing, setIsEditing] = useState(false);
  const [currentBlog, setCurrentBlog] = useState<Partial<Blog> | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeLocale, setActiveLocale] = useState<EditableBlogLocale>("en");
  const isTurkish = activeLocale === "tr";

  const filteredBlogs = blogs.filter(blog => 
    blog.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    blog.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateNew = () => {
    setCurrentBlog({
      title: "",
      slug: "",
      category: "News",
      image: "",
      author: "Admin",
      readTime: "5 mins",
      excerpt: "",
      content: "",
      translations: {},
    });
    setIsEditing(true);
  };

  const handleEdit = (blog: Blog) => {
    setCurrentBlog(blog);
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!currentBlog?.title) return;

    try {
      const isNew = !currentBlog.id;
      const url = isNew ? "/api/blogs" : `/api/blogs/${currentBlog.id}`;
      const method = isNew ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(currentBlog),
      });

      if (res.ok) {
        const savedBlog = await res.json();
        
        if (isNew) {
          setBlogs([savedBlog, ...blogs]);
        } else {
          setBlogs(blogs.map(b => b.id === savedBlog.id ? savedBlog : b));
        }
        
        setIsEditing(false);
        setCurrentBlog(null);
      } else {
        console.error("Failed to save blog");
      }
    } catch (error) {
      console.error("Error saving blog:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this blog post?")) return;

    try {
      const res = await fetch(`/api/blogs/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setBlogs(blogs.filter(b => b.id !== id));
      } else {
        console.error("Failed to delete blog");
      }
    } catch (error) {
      console.error("Error deleting blog:", error);
    }
  };

  function getLocalizedFieldValue(
    key: keyof BlogPostLocaleOverrides,
    baseValue: string | null | undefined,
  ) {
    if (!currentBlog) return "";
    return isTurkish
      ? currentBlog.translations?.tr?.[key] ?? ""
      : baseValue ?? "";
  }

  function updateLocalizedField(
    key: keyof BlogPostLocaleOverrides,
    value: string,
    baseKey: keyof Blog,
  ) {
    if (!currentBlog) return;

    if (!isTurkish) {
      setCurrentBlog({ ...currentBlog, [baseKey]: value });
      return;
    }

    setCurrentBlog({
      ...currentBlog,
      translations: {
        ...(currentBlog.translations ?? {}),
        tr: {
          ...(currentBlog.translations?.tr ?? {}),
          [key]: value,
        },
      },
    });
  }

  if (isEditing && currentBlog) {
    return (
      <div className="overflow-hidden rounded-[28px] border border-[hsl(var(--border))] bg-[linear-gradient(180deg,hsl(var(--background)/0.98),hsl(var(--secondary)/0.92))] shadow-[0_28px_90px_-60px_hsl(var(--foreground)/0.3)]">
        <div className="border-b border-[hsl(var(--border)/0.8)] p-5 md:p-7">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <p className="text-[11px] uppercase tracking-[0.24em] text-[hsl(var(--accent))]">
                Blog editor
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-[-0.02em] text-[hsl(var(--foreground))]">
                {currentBlog.id ? "Edit blog post" : "Create a new blog post"}
              </h2>
              <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                Write in a calmer, higher-contrast workspace with more room for long-form content and clearer publishing fields.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                onClick={() => setIsEditing(false)}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.72)] px-4 py-3 text-sm font-medium text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--background))]"
              >
                <X className="h-4 w-4" /> Cancel
              </button>
              <button
                onClick={handleSave}
                className="theme-button-primary inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium transition hover:opacity-95"
              >
                <Save className="h-4 w-4" /> Save Post
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-6 p-5 md:p-7 xl:grid-cols-[minmax(0,0.95fr)_minmax(340px,0.72fr)]">
          <section className="space-y-4">
            <div className="rounded-[26px] border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.54)] p-5">
              <p className="text-[11px] uppercase tracking-[0.24em] text-[hsl(var(--accent))]">
                Localization
              </p>
              <h3 className="mt-3 text-lg font-semibold text-[hsl(var(--foreground))]">
                Edit post content by locale
              </h3>
              <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                English stays as the base content. Turkish fields are optional overrides and fall back to English whenever you leave them empty.
              </p>

              <div className="mt-4 flex flex-wrap gap-3">
                {[
                  { value: "en", label: "English base" },
                  { value: "tr", label: "Turkish override" },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setActiveLocale(option.value as EditableBlogLocale)}
                    className={`rounded-2xl border px-4 py-2 text-sm font-medium transition ${
                      activeLocale === option.value
                        ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"
                        : "border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))]"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-[26px] border border-[hsl(var(--border))] bg-[linear-gradient(180deg,hsl(var(--background)/0.88),hsl(var(--secondary)/0.82))] p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--foreground))]">
                  <PenSquare className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[hsl(var(--foreground))]">
                    Content
                  </p>
                  <p className="mt-1 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                    The writing canvas is now larger and darker so headings, paragraphs, and toolbar controls stay visible during longer editing sessions.
                  </p>
                </div>
              </div>

              <div className="mt-5 overflow-hidden rounded-[24px] border border-[hsl(var(--border))] bg-[#111318] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                <BlockEditor
                  key={`${currentBlog.id ?? "new"}-${activeLocale}`}
                  initialContent={getLocalizedFieldValue("content", currentBlog.content)}
                  onChange={(content) =>
                    updateLocalizedField("content", content, "content")
                  }
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-[22px] border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.64)] p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">
                  Writing mode
                </p>
                <p className="mt-2 text-sm text-[hsl(var(--foreground))]">
                  Long-form friendly
                </p>
              </div>
              <div className="rounded-[22px] border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.64)] p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">
                  Surface
                </p>
                <p className="mt-2 text-sm text-[hsl(var(--foreground))]">
                  Reduced glare
                </p>
              </div>
              <div className="rounded-[22px] border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.64)] p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-[hsl(var(--muted-foreground))]">
                  Visibility
                </p>
                <p className="mt-2 text-sm text-[hsl(var(--foreground))]">
                  Stronger contrast
                </p>
              </div>
            </div>
          </section>

          <aside className="space-y-4">
            <div className="rounded-[26px] border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.54)] p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--foreground))]">
                  <LayoutTemplate className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[hsl(var(--foreground))]">
                    Post settings
                  </p>
                  <p className="mt-1 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                    Keep metadata grouped on the side so your writing area stays spacious.
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[hsl(var(--foreground))]">
                    Title *
                  </label>
                  <input
                    value={getLocalizedFieldValue("title", currentBlog.title)}
                    onChange={e => updateLocalizedField("title", e.target.value, "title")}
                    className="w-full rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.78)] px-4 py-3 text-sm text-[hsl(var(--foreground))] outline-none transition placeholder:text-[hsl(var(--muted-foreground)/0.8)] focus:ring-2 focus:ring-[hsl(var(--primary)/0.16)]"
                    placeholder={isTurkish ? "Falls back to English when empty" : "Blog post title"}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-[hsl(var(--foreground))]">
                    Slug (URL)
                  </label>
                  <input
                    value={currentBlog.slug || ""}
                    onChange={e => setCurrentBlog({ ...currentBlog, slug: e.target.value })}
                    className="w-full rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.78)] px-4 py-3 text-sm text-[hsl(var(--foreground))] outline-none transition placeholder:text-[hsl(var(--muted-foreground)/0.8)] focus:ring-2 focus:ring-[hsl(var(--primary)/0.16)]"
                    placeholder="auto-generated-if-empty"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[hsl(var(--foreground))]">
                      Category
                    </label>
                    <input
                      value={getLocalizedFieldValue("category", currentBlog.category)}
                      onChange={e =>
                        updateLocalizedField("category", e.target.value, "category")
                      }
                      className="w-full rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.78)] px-4 py-3 text-sm text-[hsl(var(--foreground))] outline-none transition placeholder:text-[hsl(var(--muted-foreground)/0.8)] focus:ring-2 focus:ring-[hsl(var(--primary)/0.16)]"
                      placeholder={isTurkish ? "Falls back to English when empty" : "e.g. News, Tutorial"}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[hsl(var(--foreground))]">
                      Author
                    </label>
                    <input
                      value={getLocalizedFieldValue("author", currentBlog.author)}
                      onChange={e =>
                        updateLocalizedField("author", e.target.value, "author")
                      }
                      className="w-full rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.78)] px-4 py-3 text-sm text-[hsl(var(--foreground))] outline-none transition placeholder:text-[hsl(var(--muted-foreground)/0.8)] focus:ring-2 focus:ring-[hsl(var(--primary)/0.16)]"
                      placeholder={isTurkish ? "Falls back to English when empty" : "Author name"}
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[hsl(var(--foreground))]">
                      Read time
                    </label>
                    <input
                      value={getLocalizedFieldValue("readTime", currentBlog.readTime)}
                      onChange={e =>
                        updateLocalizedField("readTime", e.target.value, "readTime")
                      }
                      className="w-full rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.78)] px-4 py-3 text-sm text-[hsl(var(--foreground))] outline-none transition placeholder:text-[hsl(var(--muted-foreground)/0.8)] focus:ring-2 focus:ring-[hsl(var(--primary)/0.16)]"
                      placeholder={isTurkish ? "Falls back to English when empty" : "5 mins"}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[hsl(var(--foreground))]">
                      Published date
                    </label>
                    <input
                      value={getLocalizedFieldValue("date", currentBlog.date)}
                      onChange={e =>
                        updateLocalizedField("date", e.target.value, "date")
                      }
                      className="w-full rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.78)] px-4 py-3 text-sm text-[hsl(var(--foreground))] outline-none transition placeholder:text-[hsl(var(--muted-foreground)/0.8)] focus:ring-2 focus:ring-[hsl(var(--primary)/0.16)]"
                      placeholder={isTurkish ? "Falls back to English when empty" : "Nov 29, 2024"}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-[hsl(var(--foreground))]">
                    Cover image URL
                  </label>
                  <input
                    value={currentBlog.image || ""}
                    onChange={e => setCurrentBlog({ ...currentBlog, image: e.target.value })}
                    className="w-full rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.78)] px-4 py-3 text-sm text-[hsl(var(--foreground))] outline-none transition placeholder:text-[hsl(var(--muted-foreground)/0.8)] focus:ring-2 focus:ring-[hsl(var(--primary)/0.16)]"
                    placeholder="https://..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-[hsl(var(--foreground))]">
                    Excerpt
                  </label>
                  <textarea
                    value={getLocalizedFieldValue("excerpt", currentBlog.excerpt)}
                    onChange={e =>
                      updateLocalizedField("excerpt", e.target.value, "excerpt")
                    }
                    className="min-h-[110px] w-full rounded-[22px] border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.78)] px-4 py-3 text-sm text-[hsl(var(--foreground))] outline-none transition placeholder:text-[hsl(var(--muted-foreground)/0.8)] focus:ring-2 focus:ring-[hsl(var(--primary)/0.16)]"
                    placeholder={isTurkish ? "Falls back to English when empty" : "Brief summary of the post..."}
                  />
                </div>
              </div>
            </div>

            <div className="rounded-[26px] border border-[hsl(var(--border))] bg-[hsl(var(--background)/0.54)] p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--foreground))]">
                  <ScanText className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[hsl(var(--foreground))]">
                    Editing guidance
                  </p>
                  <p className="mt-1 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                    Keep the article scannable and readable as you build it.
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-3 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                <p>Use short paragraphs so the editor remains easy to scan.</p>
                <p>Break sections with headings to improve blog reading flow.</p>
                <p>Preview your image URL and excerpt before publishing.</p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 p-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
            placeholder="Search blogs..."
          />
        </div>
        <button
          onClick={handleCreateNew}
          className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity flex items-center justify-center gap-2 w-full sm:w-auto shrink-0"
        >
          <Plus className="w-4 h-4" /> New Post
        </button>
      </div>

      <div className="bg-card border rounded-lg shadow-sm overflow-hidden">
        {filteredBlogs.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No blog posts found. Create your first one!
          </div>
        ) : (
          <div className="divide-y">
            {filteredBlogs.map((blog) => (
              <div key={blog.id} className="p-4 flex items-center gap-4 hover:bg-muted/30 transition-colors">
                <div className="w-16 h-16 rounded-md bg-muted/50 overflow-hidden shrink-0 flex items-center justify-center border">
                  {blog.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={blog.image} alt={blog.title} className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-muted-foreground/50" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-lg truncate">{blog.title}</h3>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-muted-foreground">
                    <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs font-medium">
                      {blog.category}
                    </span>
                    <span>{blog.author}</span>
                    <span>•</span>
                    <span>{format(new Date(blog.createdAt), "MMM d, yyyy")}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleEdit(blog)}
                    className="p-2 hover:bg-muted rounded-md transition-colors text-muted-foreground hover:text-foreground"
                    title="Edit"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(blog.id)}
                    className="p-2 hover:bg-destructive/10 rounded-md transition-colors text-muted-foreground hover:text-destructive"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
