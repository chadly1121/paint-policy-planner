import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface PolicyItem {
  id: string;
  title: string;
  content: string;
}

interface PolicySectionProps {
  items: PolicyItem[];
}

const PolicySection = ({ items }: PolicySectionProps) => {
  return (
    <Accordion type="single" collapsible className="w-full">
      {items.map((item) => (
        <AccordionItem key={item.id} value={item.id} className="border-b border-border">
          <AccordionTrigger className="py-4 font-medium text-foreground hover:text-primary hover:no-underline">
            {item.title}
          </AccordionTrigger>
          <AccordionContent className="pb-4 text-muted-foreground">
            <div className="prose prose-sm max-w-none text-muted-foreground">
              {item.content.split('\n').map((paragraph, index) => (
                <p key={index} className="mb-3 last:mb-0">
                  {paragraph}
                </p>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
};

export default PolicySection;
