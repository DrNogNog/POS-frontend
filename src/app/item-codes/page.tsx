"use client";
// Cabinet code guide: type any code to see what it means, or browse them all.
import { useState } from "react";
import { CODE_TYPES, COLLECTIONS, QUARTZ_COLORS } from "@/lib/itemCodes";
import { Input, PageHeader, Panel, Table, Td, Th } from "@/components/ui";
import { CodeExplanation } from "@/components/ItemCode";

const FAMILY_LABEL: Record<string, string> = {
  wall: "Wall (upper) cabinets",
  base: "Base (lower) cabinets",
  tall: "Tall cabinets",
  vanity: "Bathroom vanity",
  trim: "Fillers, moldings & trim",
  panel: "Panels",
  accessory: "Doors & accessories",
};
const DIMS_LABEL = { WH: "width + height", WHD: "width + height (+ depth)", W: "width", none: "—" };

export default function ItemCodesPage() {
  const [code, setCode] = useState("W0930");
  const families = Object.keys(FAMILY_LABEL);
  return (
    <>
      <PageHeader
        title="Cabinet code guide"
        subtitle={'How to read item codes. Letters are the cabinet type, numbers are inches: W0930 = Wall cabinet, 9" wide, 30" high.'}
      />
      <Panel title="Look up a code">
        <Input className="max-w-sm text-lg font-semibold" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="e.g. WDC2430 or AL-DB18-3" />
        <div className="mt-5">{code && <CodeExplanation code={code} />}</div>
      </Panel>

      <div className="mt-6 grid gap-6 xl:grid-cols-[2fr_1fr]">
        <Panel title="Type codes" padded={false}>
          <Table>
            <thead><tr><Th>Code</Th><Th>Means</Th><Th>Numbers are</Th></tr></thead>
            <tbody>
              {families.map((fam) => (
                <FamilyRows key={fam} family={fam} onPick={setCode} />
              ))}
            </tbody>
          </Table>
        </Panel>
        <div className="space-y-6">
          <Panel title="Collections (door styles)" padded={false}>
            <Table>
              <tbody>
                {Object.entries(COLLECTIONS).map(([k, v]) => (
                  <tr key={k}><Td className="font-semibold text-walnut">{k}-</Td><Td>{v}</Td></tr>
                ))}
              </tbody>
            </Table>
            <p className="p-4 text-xs text-oak">A code that starts with a collection, like AL-B09, is the Avalon version of B09.</p>
          </Panel>
          <Panel title="Quartz tops" padded={false}>
            <Table>
              <tbody>
                {Object.entries(QUARTZ_COLORS).map(([k, v]) => (
                  <tr key={k}><Td className="font-semibold text-walnut">{k}</Td><Td>{v}</Td></tr>
                ))}
              </tbody>
            </Table>
            <p className="p-4 text-xs text-oak">Q001-36-1 = color Q001 for a 36&quot; vanity, 1 faucet hole. D = double sinks.</p>
          </Panel>
        </div>
      </div>
    </>
  );

}

function FamilyRows({ family, onPick }: { family: string; onPick: (code: string) => void }) {
  const rows = Object.entries(CODE_TYPES).filter(([, t]) => t.family === family);
  return (
    <>
      <tr><Td colSpan={3} className="bg-linen font-semibold text-walnut">{FAMILY_LABEL[family]}</Td></tr>
      {rows.map(([k, t]) => (
        <tr key={k}>
          <Td><button className="font-semibold text-walnut underline" onClick={() => onPick(k + (t.dims === "W" ? "18" : t.dims === "none" ? "" : "1830"))}>{k}</button></Td>
          <Td>{t.name}{t.notes && <div className="text-xs text-oak">{t.notes}</div>}</Td>
          <Td className="text-oak">{DIMS_LABEL[t.dims]}</Td>
        </tr>
      ))}
    </>
  );
}
