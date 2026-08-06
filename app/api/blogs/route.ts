import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import {
  getBlogPosts,
  isMissingBlogPostTranslationsColumnError,
  normalizeBlogInput,
} from "@/lib/blogs";
import { getPrisma } from "@/lib/prisma";

export async function GET() {
  try {
    const blogs = await getBlogPosts();
    return NextResponse.json(blogs);
  } catch (error) {
    console.error("Error fetching blogs:", error);
    return NextResponse.json(
      { error: "Failed to fetch blogs" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const prisma = getPrisma();
    const data = normalizeBlogInput(await req.json());

    let blog;
    try {
      blog = await prisma.blogPost.create({
        data: {
          title: data.title,
          slug: data.slug,
          category: data.category,
          image: data.image,
          author: data.author,
          readTime: data.readTime,
          date: data.date,
          excerpt: data.excerpt,
          content: data.content,
          translations: data.translations,
        },
      });
    } catch (error) {
      if (!isMissingBlogPostTranslationsColumnError(error)) {
        throw error;
      }

      blog = await prisma.blogPost.create({
        data: {
          title: data.title,
          slug: data.slug,
          category: data.category,
          image: data.image,
          author: data.author,
          readTime: data.readTime,
          date: data.date,
          excerpt: data.excerpt,
          content: data.content,
        },
      });
    }
    revalidateTag("blog-posts", "max");

    return NextResponse.json(blog);
  } catch (error) {
    console.error("Error creating blog:", error);
    return NextResponse.json(
      { error: "Failed to create blog" },
      { status: 500 }
    );
  }
}
