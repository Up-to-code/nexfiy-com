"use client";

import { Button } from "@/components/ui/button";
import { useGSAP } from "@gsap/react";
import { useConvexAuth } from "convex/react";
import gsap from "gsap";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useRef } from "react";
import { captureEvent } from "@/lib/analytics";

gsap.registerPlugin(useGSAP);

const HERO_WORDS = [
  "Collaborate",
  "Organize",
  "Automate",
  "Execute",
  "Ship",
  "Think",
] as const;

export const Hero = () => {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);
  const wordRef = useRef<HTMLSpanElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const pill = pillRef.current;
      const word = wordRef.current;
      const measure = measureRef.current;
      if (!pill || !word || !measure) return;

      let wordIndex = 0;
      const measuredWidth = () => {
        measure.textContent = word.textContent;
        const styles = window.getComputedStyle(pill);
        return (
          measure.getBoundingClientRect().width +
          Number.parseFloat(styles.paddingLeft) +
          Number.parseFloat(styles.paddingRight) +
          Number.parseFloat(styles.fontSize) * 0.37 +
          2
        );
      };
      const syncWidth = () => gsap.set(pill, { width: measuredWidth() });

      syncWidth();
      window.addEventListener("resize", syncWidth);

      const media = gsap.matchMedia();
      media.add("(prefers-reduced-motion: no-preference)", () => {
        const timeline = gsap.timeline({ repeat: -1, repeatDelay: 1.45 });
        timeline
          .to(
            word,
            {
              autoAlpha: 0,
              duration: 0.28,
              ease: "power2.in",
              yPercent: -115,
            },
            1.55,
          )
          .call(() => {
            wordIndex = (wordIndex + 1) % HERO_WORDS.length;
            word.textContent = HERO_WORDS[wordIndex];
            gsap.to(pill, {
              duration: 0.48,
              ease: "power3.inOut",
              overwrite: "auto",
              width: measuredWidth(),
            });
          })
          .set(word, { yPercent: 115 })
          .to(word, {
            autoAlpha: 1,
            duration: 0.48,
            ease: "power3.out",
            yPercent: 0,
          });

        return () => timeline.kill();
      });

      return () => {
        media.revert();
        window.removeEventListener("resize", syncWidth);
      };
    },
    { scope: headlineRef },
  );

  return (
    <section className="bg-background text-foreground relative overflow-hidden pt-12 pb-16 lg:pt-20 lg:pb-24">
      <div className="mx-auto flex max-w-7xl flex-col items-center px-4 text-center sm:px-6 lg:px-8">
        {/* Nexfiy mascot team */}
        <div className="mb-6 flex justify-center">
          <Image
            src="/landing/nexfiy-mascot-team-v1.png"
            alt="The Nexfiy workspace mascot team"
            width={420}
            height={105}
            priority
            className="h-20 w-auto object-contain sm:h-24"
          />
        </div>

        <p className="text-muted-foreground mb-6 border-l-2 border-[#2383e2] py-0.5 pl-3 text-left text-[11px] font-semibold tracking-[0.14em] uppercase">
          Nexfiy is in early access
        </p>

        {/* Main Headline */}
        <h1
          ref={headlineRef}
          className="text-foreground relative mb-6 max-w-6xl text-[clamp(1.75rem,5.7vw,4.5rem)] leading-[1.08] font-extrabold tracking-tight"
        >
          <span className="block whitespace-nowrap">Write, plan, and</span>
          <span className="mt-2 flex items-center justify-center gap-[0.18em] whitespace-nowrap">
            <span
              ref={pillRef}
              className="inline-flex h-[1.22em] w-[11ch] shrink-0 items-center justify-center gap-[0.18em] overflow-hidden rounded-full bg-[#fff2c2] px-[0.4em] align-middle font-bold text-zinc-900 shadow-2xs dark:bg-amber-950/60 dark:text-amber-200"
            >
              <span className="size-[0.19em] shrink-0 rounded-full bg-[#f59e0b]" />
              <span ref={wordRef} className="inline-block">
                {HERO_WORDS[0]}
              </span>
            </span>
            <span>with AI agents.</span>
          </span>
          <span
            ref={measureRef}
            aria-hidden="true"
            className="pointer-events-none invisible absolute font-bold whitespace-nowrap"
          >
            {HERO_WORDS[0]}
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-muted-foreground mb-8 max-w-2xl text-lg leading-relaxed font-normal sm:text-xl">
          Build documents, connected databases, and reusable knowledge in one
          workspace. Then make that context available through APIs and MCP.
        </p>

        {/* Action Buttons */}
        <div className="mb-4 flex w-full flex-col items-center justify-center gap-3.5 sm:w-auto sm:flex-row">
          {!isAuthenticated && !isLoading && (
            <>
              <Button
                size="lg"
                className="h-11 w-full rounded-xl bg-[#2383e2] px-7 text-base font-medium text-white shadow-xs hover:bg-[#1d6fc2] sm:w-auto"
                asChild
              >
                <Link
                  href="/pricing"
                  onClick={() =>
                    captureEvent("landing_cta_clicked", {
                      destination: "pricing",
                    })
                  }
                >
                  View early-access pricing
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-border/70 h-11 w-full rounded-xl px-7 text-base font-medium sm:w-auto"
                asChild
              >
                <Link
                  href="#ai"
                  onClick={() =>
                    captureEvent("landing_cta_clicked", {
                      destination: "features",
                    })
                  }
                >
                  Explore Features
                </Link>
              </Button>
            </>
          )}

          {isAuthenticated && !isLoading && (
            <Button
              size="lg"
              className="h-11 rounded-xl bg-[#2383e2] px-8 text-base font-medium text-white shadow-xs hover:bg-[#1d6fc2]"
              asChild
            >
              <Link
                href="/documents"
                onClick={() =>
                  captureEvent("landing_cta_clicked", {
                    destination: "workspace",
                  })
                }
              >
                Enter Nexfiy
                <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
          )}
        </div>

        {/* Trust micro-text */}
        <p className="text-muted-foreground mb-14 text-xs font-medium">
          Start with a personal workspace. Add a team when you are ready.
        </p>

        {/* Concept Art Card */}
        <div className="relative mx-auto w-full max-w-5xl">
          <div className="overflow-hidden rounded-[2rem] border border-zinc-200/80 bg-[#faf8f5] p-2 shadow-sm sm:p-4 dark:border-zinc-800/60 dark:bg-[#05070a]">
            <Image
              src="/landing/nexfiy-mascot-hero-v1.png"
              alt="Nexfiy mascots connecting documents, databases, files, and AI workflows"
              width={1200}
              height={800}
              priority
              className="h-auto w-full rounded-[1.5rem] object-contain"
            />
          </div>
        </div>
      </div>
    </section>
  );
};
