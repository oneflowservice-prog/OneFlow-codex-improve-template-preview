import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Rating } from "@/components/ui/rating";

export type TestimonialItem = {
  name: string;
  role: string;
  company: string;
  avatar: string;
  rating: number;
  content: string;
};

type TestimonialsComponentProps = {
  testimonials: TestimonialItem[];
  eyebrow?: string;
  title?: string;
  description?: string;
};

function getInitials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "AI"
  );
}

const TestimonialsComponent = ({
  testimonials,
  eyebrow = "Real customers",
  title = "Customers Feedback",
  description = "From first prompts to launched products, here is what builders say.",
}: TestimonialsComponentProps) => {
  if (testimonials.length === 0) {
    return null;
  }

  return (
    <section
      id="testimonials"
      className="border-t border-[hsl(var(--foreground)/0.08)] py-12 sm:py-16 lg:py-24"
    >
      <Carousel
        className="mx-auto flex max-w-7xl gap-12 px-4 max-sm:flex-col sm:items-center sm:gap-16 sm:px-6 lg:gap-24 lg:px-8"
        opts={{
          align: "start",
          slidesToScroll: 1,
        }}
      >
        <div className="space-y-4 sm:w-1/2 lg:w-1/3">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-[hsl(var(--primary))]">
            {eyebrow}
          </p>

          <h2 className="text-balance text-2xl font-semibold tracking-tight text-[hsl(var(--foreground))] sm:text-3xl lg:text-4xl">
            {title}
          </h2>

          <p className="text-base leading-7 text-[hsl(var(--muted-foreground))] sm:text-lg">
            {description}
          </p>

          <div className="flex items-center gap-4">
            <CarouselPrevious
              size="icon"
              variant="default"
              className="static translate-y-0 rounded-md disabled:bg-[hsl(var(--primary)/0.1)] disabled:text-[hsl(var(--primary))] disabled:opacity-100"
            />
            <CarouselNext
              size="icon"
              variant="default"
              className="static translate-y-0 rounded-md disabled:bg-[hsl(var(--primary)/0.1)] disabled:text-[hsl(var(--primary))] disabled:opacity-100"
            />
          </div>
        </div>

        <div className="relative max-w-[49rem] sm:w-1/2 lg:w-2/3">
          <CarouselContent className="ml-0 sm:-ml-6">
            {testimonials.map((testimonial, index) => (
              <CarouselItem
                key={`${testimonial.name}-${index}`}
                className="px-0.5 py-0.5 sm:pl-6 lg:basis-1/2"
              >
                <Card className="h-full border-[hsl(var(--foreground)/0.08)] bg-[hsl(var(--surface)/0.14)] transition-colors duration-300 hover:ring-1 hover:ring-[hsl(var(--primary)/0.38)]">
                  <CardHeader className="flex-row items-center gap-3 space-y-0">
                    <Avatar size="lg">
                      {testimonial.avatar ? (
                        <AvatarImage
                          src={testimonial.avatar}
                          alt={testimonial.name}
                        />
                      ) : null}
                      <AvatarFallback>
                        {getInitials(testimonial.name)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 flex-1">
                      <h4 className="truncate text-base font-medium text-[hsl(var(--foreground))]">
                        {testimonial.name}
                      </h4>
                      <p className="truncate text-sm text-[hsl(var(--muted-foreground))]">
                        {testimonial.role} at{" "}
                        <span className="font-semibold text-[hsl(var(--card-foreground))]">
                          {testimonial.company}
                        </span>
                      </p>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Rating
                      readOnly
                      variant="yellow"
                      size={24}
                      value={testimonial.rating}
                      precision={0.5}
                    />
                  </CardContent>
                  <CardContent className="pt-0">
                    <p className="text-base leading-7 text-[hsl(var(--foreground))]">
                      {testimonial.content}
                    </p>
                  </CardContent>
                </Card>
              </CarouselItem>
            ))}
          </CarouselContent>
        </div>
      </Carousel>
    </section>
  );
};

export default TestimonialsComponent;
