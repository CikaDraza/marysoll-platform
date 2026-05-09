interface BlogPost {
  title: string;
  excerpt?: string;
  image?: string;
  slug?: string;
  category?: string;
}

interface Props {
  headline?: string;
  posts?: BlogPost[];
}

export function Theme6BlogPreview({
  headline = "News and Articles",
  posts = [
    { title: "Summer Nail Trends and Color Ideas", excerpt: "Discover the hottest nail trends for summer.", image: "", slug: "#", category: "Trends" },
    { title: "How to Make Your Manicure Last Longer", excerpt: "Expert tips and tricks to extend the life of your manicure.", image: "", slug: "#", category: "Tips" },
  ],
}: Props) {
  return (
    <section className="py-20 lg:py-32 bg-[var(--background)]">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="flex items-center justify-between mb-12 lg:mb-16">
          <h2 className="text-4xl lg:text-5xl font-light text-[var(--foreground)]">{headline}</h2>
          <a
            href="/blog"
            className="hidden md:inline-flex items-center gap-2 text-sm tracking-wide text-[var(--foreground)] hover:text-[var(--primary)] transition-colors"
          >
            View All Articles
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
            </svg>
          </a>
        </div>

        <div className="grid md:grid-cols-2 gap-10 lg:gap-12">
          {posts.map((post, idx) => (
            <a key={idx} href={post.slug || "#"} className="group">
              <article className="space-y-6">
                <div className="aspect-[16/10] bg-white overflow-hidden">
                  {post.image ? (
                    <img src={post.image} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#E8D5C4] to-[#D4B5A0] flex items-center justify-center">
                      <span className="text-[var(--muted)] text-sm font-mono text-center px-4">[{post.title}]</span>
                    </div>
                  )}
                </div>
                <div className="space-y-4">
                  {post.category && (
                    <p className="text-xs tracking-[0.2em] uppercase text-[var(--primary)] font-light">{post.category}</p>
                  )}
                  <h3 className="text-2xl font-light text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors">
                    {post.title}
                  </h3>
                  {post.excerpt && (
                    <p className="text-base font-light text-[var(--muted)] leading-relaxed">{post.excerpt}</p>
                  )}
                  <div className="flex items-center gap-2 text-sm font-light text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors">
                    Read More
                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </article>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
