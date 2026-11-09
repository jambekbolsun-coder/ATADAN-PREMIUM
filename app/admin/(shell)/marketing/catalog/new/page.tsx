import { requireSection } from "../../../../_lib/session";
import { CATEGORIES } from "../../../../_lib/catalog-admin";
import { PageHeader } from "../../../../_ui/ui";
import { ModelForm } from "../model-form";

export const metadata = { title: "Новая модель" };

const SPECS = ["Модель двигателя", "Мощность двигателя, кВт", "Номинальные обороты, об/мин", "Привод", "Коробка передач", "Объём топливного бака, л", "Масса, кг", "Габариты (Д × Ш × В), мм"];

export default async function NewModel() {
  await requireSection("/admin/marketing/catalog");
  return (
    <div style={{ maxWidth: 860 }}>
      <PageHeader title="Новая модель" subtitle="Сначала сохраняется черновиком. На сайт попадёт, когда добавите фото и нажмёте «показать на сайте»." />
      <ModelForm
        categories={CATEGORIES}
        initial={{ slug: "", model: "", hp: "", category: CATEGORIES[0], farmArea: "", price: "", priceUsd: "", discountPercent: "", promotionLabel: "", recommended: false, popular: false, sortOrder: "0", image: "", images: [], videoUrl: "", description: "", comfort: "", equipment: "", specs: SPECS.map((k) => ({ k, v: "" })), status: "draft", priceOnRequest: false }}
      />
    </div>
  );
}
