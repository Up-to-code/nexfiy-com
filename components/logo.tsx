import Image from "next/image";
import { Poppins } from "next/font/google";

import { cn } from "@/lib/utils";

const font = Poppins({
  subsets: ["latin"],
  weight: ["400", "600"],
});

export const Logo = () => {
  return (
    <div className="flex items-center gap-2">
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
      <span className={cn("font-semibold", font.className)}>Zotion</span>
    </div>
  );
};
