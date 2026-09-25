import { FitToWidth } from "@/components/quotations/fit-to-width";
import {
  QuotationDocument,
  type QuotationDocData,
} from "@/components/quotations/quotation-document";

const SAMPLE: QuotationDocData = {
  number: "QT-2026-0006",
  title: "Full condo renovation, Mont Kiara",
  issueDate: "2026-09-18T00:00:00.000Z",
  expiryDate: "2026-10-18T00:00:00.000Z",
  currency: "MYR",
  business: {
    name: "BrightBuild Renovation",
    address: "23-G, Jalan SS 21/39, Damansara Utama,\n47400 Petaling Jaya, Selangor",
    phone: "+60 3-7890 1234",
    email: "hello@brightbuild.my",
    website: "brightbuild.my",
    registrationNumber: "202301045678 (1512345-K)",
    taxInfo: "SST No. W10-2301-32000123",
    ownerName: "Aisyah Rahman",
  },
  recipient: {
    name: "Lim Mei Ling",
    company: null,
    email: "meiling.lim@example.com",
    phone: "017-890 2231",
    address: null,
  },
  items: [
    {
      description: "Kitchen cabinets and quartz countertop",
      quantity: 1,
      unit: "lot",
      unitPrice: 18500,
      total: 18500,
    },
    {
      description: "Bathroom renovation (2 bathrooms)",
      quantity: 2,
      unit: "unit",
      unitPrice: 9800,
      total: 19600,
    },
    {
      description: "Built-in wardrobes (3 bedrooms)",
      quantity: 3,
      unit: "unit",
      unitPrice: 4200,
      total: 12600,
    },
    { description: "SPC vinyl flooring", quantity: 1100, unit: "sqft", unitPrice: 8, total: 8800 },
  ],
  totals: { subtotal: 59500, discount: 1500, taxRate: 8, tax: 4640, total: 62640 },
  notes: "Includes 12 months workmanship warranty.",
  terms:
    "Quotation is valid for 30 days from the issue date.\n50% deposit is required upon confirmation; balance upon completion.",
};

export function QuotationPreview() {
  return (
    <div className="rounded-xl border bg-canvas p-3 shadow-[0_24px_60px_-24px_rgb(16_24_40/0.25)] sm:p-4">
      <FitToWidth width={794}>
        <QuotationDocument data={SAMPLE} />
      </FitToWidth>
    </div>
  );
}
