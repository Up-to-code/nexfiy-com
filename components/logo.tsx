import Image from "next/image";
import Link from "next/link";
import { Poppins } from "next/font/google";

import { cn } from "@/lib/utils";

const font = Poppins({
  subsets: ["latin"],
  weight: ["400", "600"],
});

export const Logo = () => {
  return (
    <Link
      href="/"
      aria-label="Go to the Nexfiy home page"
      className="group focus-visible:ring-ring/50 flex items-center gap-2 rounded-lg outline-none focus-visible:ring-2"
    >
      <Image
        width={40}
        height={40}
        src="/logo.svg"
        alt=""
        className="size-9 dark:hidden"
        priority
      />
      <Image
        width={40}
        height={40}
        src="/logo-dark.svg"
        alt=""
        className="hidden size-9 dark:block"
        priority
      />
      <span
        className={cn(
          "font-semibold transition-opacity group-hover:opacity-75",
          font.className,
        )}
      >
        Nexfiy
      </span>
    </Link>
  );
};
