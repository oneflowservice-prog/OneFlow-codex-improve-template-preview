export type SiteliyoBlogPost = {
  id: string;
  slug: string;
  title: string;
  category: string;
  image: string;
  author: string;
  readTime: string;
  date: string;
  excerpt?: string;
};

export const siteliyoFeaturedPost: SiteliyoBlogPost = {
  id: "featured",
  slug: "blog-title-heading-will-go-here",
  title: "Blog title heading will go here",
  category: "News",
  image:
    "https://images.unsplash.com/photo-1496171367470-9ed9a91ea931?auto=format&fit=crop&w=1200&q=80",
  author: "Siteliyo team",
  readTime: "4 mins",
  date: "Nov 29, 2024",
  excerpt:
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse varius enim in eros.",
};

export const siteliyoBlogPosts: SiteliyoBlogPost[] = [
  {
    id: "1",
    slug: "news-growth-loop",
    title: "Blog title heading will go here",
    category: "News",
    image:
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80",
    author: "Siteliyo team",
    readTime: "4 mins",
    date: "Nov 29, 2024",
  },
  {
    id: "2",
    slug: "seo-content-systems",
    title: "Blog title heading will go here",
    category: "SEO",
    image:
      "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=900&q=80",
    author: "Siteliyo team",
    readTime: "4 mins",
    date: "Nov 29, 2024",
  },
  {
    id: "3",
    slug: "inspiration-team-rhythm",
    title: "Blog title heading will go here",
    category: "Inspiration",
    image:
      "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=900&q=80",
    author: "Siteliyo team",
    readTime: "4 mins",
    date: "Nov 29, 2024",
  },
  {
    id: "4",
    slug: "tutorial-landing-polish",
    title: "Blog title heading will go here",
    category: "Tutorial",
    image:
      "https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=900&q=80",
    author: "Siteliyo team",
    readTime: "4 mins",
    date: "Nov 29, 2024",
  },
  {
    id: "5",
    slug: "tutorial-editing-speed",
    title: "Blog title heading will go here",
    category: "Tutorial",
    image:
      "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=900&q=80",
    author: "Siteliyo team",
    readTime: "4 mins",
    date: "Nov 29, 2024",
  },
  {
    id: "6",
    slug: "news-collaboration-stack",
    title: "Blog title heading will go here",
    category: "News",
    image:
      "https://images.unsplash.com/photo-1522202222206-b7503b1d0b61?auto=format&fit=crop&w=900&q=80",
    author: "Siteliyo team",
    readTime: "4 mins",
    date: "Nov 29, 2024",
  },
  {
    id: "7",
    slug: "news-launch-checklist",
    title: "Blog title heading will go here",
    category: "News",
    image:
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80",
    author: "Siteliyo team",
    readTime: "4 mins",
    date: "Nov 29, 2024",
  },
  {
    id: "8",
    slug: "seo-growth-foundations",
    title: "Blog title heading will go here",
    category: "SEO",
    image:
      "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=900&q=80",
    author: "Siteliyo team",
    readTime: "4 mins",
    date: "Nov 29, 2024",
  },
  {
    id: "9",
    slug: "inspiration-studio-setups",
    title: "Blog title heading will go here",
    category: "Inspiration",
    image:
      "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=900&q=80",
    author: "Siteliyo team",
    readTime: "4 mins",
    date: "Nov 29, 2024",
  },
];

export function getSiteliyoBlogPostBySlug(slug: string) {
  if (slug === siteliyoFeaturedPost.slug) {
    return siteliyoFeaturedPost;
  }

  return siteliyoBlogPosts.find((post) => post.slug === slug) ?? null;
}
