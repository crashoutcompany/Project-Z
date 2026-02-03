import { H1 } from "@/components/typography/headings";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="m-16">
      <H1>Trading</H1>

      {children}
    </div>
  );
}
