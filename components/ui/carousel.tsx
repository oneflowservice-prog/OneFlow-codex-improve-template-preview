"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

type CarouselContextValue = {
  viewportRef: React.RefObject<HTMLDivElement | null>;
  scrollByPage: (direction: -1 | 1) => void;
};

const CarouselContext = React.createContext<CarouselContextValue | null>(null);

function useCarousel() {
  const context = React.useContext(CarouselContext);

  if (!context) {
    throw new Error("Carousel components must be used inside <Carousel />");
  }

  return context;
}

type CarouselProps = React.HTMLAttributes<HTMLDivElement> & {
  opts?: {
    align?: "start" | "center" | "end";
    slidesToScroll?: number;
  };
};

const Carousel = React.forwardRef<HTMLDivElement, CarouselProps>(
  ({ className, opts, children, ...props }, ref) => {
    const viewportRef = React.useRef<HTMLDivElement | null>(null);

    const scrollByPage = React.useCallback(
      (direction: -1 | 1) => {
        const viewport = viewportRef.current;
        if (!viewport) return;

        const slidesToScroll = opts?.slidesToScroll ?? 1;
        const firstItem = viewport.querySelector<HTMLElement>(
          "[data-slot='carousel-item']",
        );
        const itemWidth = firstItem?.offsetWidth ?? viewport.clientWidth;

        viewport.scrollBy({
          left: direction * itemWidth * slidesToScroll,
          behavior: "smooth",
        });
      },
      [opts?.slidesToScroll],
    );

    return (
      <CarouselContext.Provider value={{ viewportRef, scrollByPage }}>
        <div ref={ref} className={cn("relative", className)} {...props}>
          {children}
        </div>
      </CarouselContext.Provider>
    );
  },
);
Carousel.displayName = "Carousel";

const CarouselContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const { viewportRef } = useCarousel();

  return (
    <div
      ref={(node) => {
        viewportRef.current = node;
        if (typeof ref === "function") {
          ref(node);
        } else if (ref) {
          ref.current = node;
        }
      }}
      className="overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <div
        className={cn("flex snap-x snap-mandatory", className)}
        {...props}
      />
    </div>
  );
});
CarouselContent.displayName = "CarouselContent";

const CarouselItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="carousel-item"
    className={cn("min-w-0 shrink-0 grow-0 basis-full snap-start", className)}
    {...props}
  />
));
CarouselItem.displayName = "CarouselItem";

type CarouselButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default";
  size?: "icon";
};

const carouselButtonClass =
  "inline-flex size-10 items-center justify-center rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--button))] text-[hsl(var(--button-foreground))] shadow-sm transition hover:opacity-90 disabled:pointer-events-none disabled:opacity-50";

const CarouselPrevious = React.forwardRef<
  HTMLButtonElement,
  CarouselButtonProps
>(({ className, variant: _variant, size: _size, onClick, ...props }, ref) => {
  const { scrollByPage } = useCarousel();

  return (
    <button
      ref={ref}
      type="button"
      aria-label="Previous slide"
      className={cn(carouselButtonClass, className)}
      onClick={(event) => {
        scrollByPage(-1);
        onClick?.(event);
      }}
      {...props}
    >
      <ChevronLeft className="size-4" />
    </button>
  );
});
CarouselPrevious.displayName = "CarouselPrevious";

const CarouselNext = React.forwardRef<HTMLButtonElement, CarouselButtonProps>(
  ({ className, variant: _variant, size: _size, onClick, ...props }, ref) => {
    const { scrollByPage } = useCarousel();

    return (
      <button
        ref={ref}
        type="button"
        aria-label="Next slide"
        className={cn(carouselButtonClass, className)}
        onClick={(event) => {
          scrollByPage(1);
          onClick?.(event);
        }}
        {...props}
      >
        <ChevronRight className="size-4" />
      </button>
    );
  },
);
CarouselNext.displayName = "CarouselNext";

export {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
};
