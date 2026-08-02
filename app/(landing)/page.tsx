import { Hero } from "./_components/Hero";
import { VisionSection } from "./_components/VisionSection";
import { AiFeatures } from "./_components/AiFeatures";
import { WhyNexfiy } from "./_components/WhyNexfiy";
import { ComparisonSection } from "./_components/ComparisonSection";
import { PricingPreview } from "./_components/PricingPreview";
import { CtaSection } from "./_components/CtaSection";
import { Footer } from "./_components/Footer";
import { WorkflowSection } from "./_components/WorkflowSection";
import { FaqSection } from "./_components/FaqSection";

export default function LandingPage() {
  return (
    <div className="bg-background flex min-h-full flex-col">
      <Hero />
      <VisionSection />
      <AiFeatures />
      <WorkflowSection />
      <WhyNexfiy />
      <ComparisonSection />
      <PricingPreview />
      <FaqSection />
      <CtaSection />
      <Footer />
    </div>
  );
}
