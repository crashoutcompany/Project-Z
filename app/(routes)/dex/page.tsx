import { CardDex } from "@/components/Dex";
// import { FillText } from "@/components/FillText";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
// import Link from "next/link";
import { connection } from "next/server";

import prisma from "@/prisma/db";

// Look at the meta for the page on serebii
export default async function Page() {
  // Next.js 16: Signal that this component uses dynamic data
  await connection();

  const cards = await prisma.card.findMany({
    include: { details: true, set: true },
  });
  const geneticApex = cards.filter((c) => c.set.setName === "Genetic Apex");
  const mythicalIslands = cards.filter(
    (c) => c.set.setName === "Mythical Island",
  );
  const spaceTimeSmackdown = cards.filter(
    (c) => c.set.setName === "Space-time Smackdown",
  );
  const triumphantLight = cards.filter(
    (c) => c.set.setName === "Triumphant Light",
  );
  const shiningRevelry = cards.filter(
    (c) => c.set.setName === "Shining Revelry",
  );

  return (
    <div className="m-16">
      {/* <TableOfContents /> */}
      <h2 id="mythical-islands" className="my-6 text-4xl font-bold">
        Mythical Islands
      </h2>
      <ScrollArea className="h-screen">
        <CardDex cards={mythicalIslands} />
      </ScrollArea>
      <h2 id="genetic-apex" className="my-6 text-4xl font-bold">
        Genetic Apex
      </h2>
      <ScrollArea className="h-screen">
        <CardDex cards={geneticApex} />
      </ScrollArea>
      <h2 id="space-time-smackdown" className="my-6 text-4xl font-bold">
        Space Time Smackdown
      </h2>
      <ScrollArea className="h-screen">
        <CardDex cards={spaceTimeSmackdown} />
      </ScrollArea>
      <h2 id="triumphant-light" className="my-6 text-4xl font-bold">
        Triumphant Light
      </h2>
      <ScrollArea className="h-screen">
        <CardDex cards={triumphantLight} />
      </ScrollArea>
      <h2 id="shining-revelry" className="my-6 text-4xl font-bold">
        Shining Revelry
      </h2>
      <ScrollArea className="h-screen">
        <CardDex cards={shiningRevelry} />
      </ScrollArea>
    </div>
  );
}

// const TableOfContents = () => (
//   <Card className="sticky top-10 left-0 z-10 w-64">
//     <CardHeader>
//       <CardTitle className="text-2xl font-bold">Table of Contents</CardTitle>
//     </CardHeader>
//     <CardContent className="list-disc">
//       <Link href="#mythical-islands">
//         <FillText
//           className="text-red-500 duration-300 group-hover/fill:duration-1000"
//           text="Mythical Islands"
//         />
//       </Link>
//       <Link href="#genetic-apex">
//         <FillText
//           className="text-red-500 duration-300 group-hover/fill:duration-1000"
//           text="Genetic Apex"
//         />
//       </Link>
//       <Link href="#space-time-smackdown">
//         <FillText
//           className="text-red-500 duration-300 group-hover/fill:duration-1000"
//           text="Space Time Smackdown"
//         />
//       </Link>
//     </CardContent>
//   </Card>
// );
