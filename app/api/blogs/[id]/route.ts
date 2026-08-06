import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import {
  isMissingBlogPostTranslationsColumnError,
  normalizeBlogInput,
} from "@/lib/blogs";
import { getPrisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const prisma = getPrisma();
    const { id } = await params;
    const data = normalizeBlogInput(await req.json());

    let blog;
    try {
      blog = await prisma.blogPost.update({
        where: { id },
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

      blog = await prisma.blogPost.update({
        where: { id },
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
    console.error("Error updating blog:", error);
    return NextResponse.json(
      { error: "Failed to update blog" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const prisma = getPrisma();
    const { id } = await params;
    
    await prisma.blogPost.delete({
      where: { id },
    });
    revalidateTag("blog-posts", "max");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting blog:", error);
    return NextResponse.json(
      { error: "Failed to delete blog" },
      { status: 500 }
    );
  }
}
