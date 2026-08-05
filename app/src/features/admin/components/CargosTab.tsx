import { useCargos, useUpsertCargo } from "../hooks";
import { SimpleCatalogEditor } from "./SimpleCatalogEditor";

export function CargosTab() {
  const cargosQuery = useCargos();
  const upsert = useUpsertCargo();

  return (
    <SimpleCatalogEditor
      items={cargosQuery.data ?? []}
      isLoading={cargosQuery.isLoading}
      isSaving={upsert.isPending}
      onSave={(item) => upsert.mutate(item)}
    />
  );
}
