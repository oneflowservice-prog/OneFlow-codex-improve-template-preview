type Logo = {
  image: string;
  alt: string;
};

type LogoCloudProps = {
  logos: Logo[];
  title?: string;
  description?: string;
  className?: string;
};

const LogoCloud = ({
  logos,
  title = "Trusted by teams building faster",
  description = "Builders and teams use this workflow to move from prompt to product.",
  className = "",
}: LogoCloudProps) => {
  return (
    <section
      className={`border-t border-[hsl(var(--foreground)/0.08)] py-12 sm:py-16 lg:py-20 ${className}`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 space-y-4 text-center sm:mb-12">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-[hsl(var(--primary))]">
            Trusted By
          </p>
          <h2 className="text-balance text-2xl font-semibold tracking-tight text-[hsl(var(--foreground))] md:text-3xl lg:text-4xl">
            <span className="relative z-[1]">
              {title}
              <span className="absolute bottom-1 left-0 -z-[1] h-px w-full bg-[hsl(var(--primary))]" />
            </span>
          </h2>
          <p className="mx-auto max-w-2xl text-sm leading-7 text-[hsl(var(--muted-foreground))] sm:text-base">
            {description}
          </p>
        </div>

        <div className="border-y border-[hsl(var(--foreground)/0.08)] py-10">
          <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-8 max-sm:flex-col lg:gap-x-16">
            {logos.map((logo, index) => (
              <img
                key={`${logo.alt}-${index}`}
                src={logo.image}
                alt={logo.alt}
                className="h-7 max-w-[140px] object-contain opacity-70 grayscale transition hover:opacity-100 dark:invert"
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default LogoCloud;
