import { Navbar } from "./_components/Navbar";
import "./landing-theme.css";

const LandingLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="marketing-shell dark:bg-background dark:text-foreground min-h-full bg-white font-sans text-zinc-900 antialiased">
      <Navbar />
      <main className="dark:bg-background min-h-full bg-white pt-16">
        {children}
      </main>
    </div>
  );
};
export default LandingLayout;
