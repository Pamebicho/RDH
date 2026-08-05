import { useAreas, useUpsertArea } from "../hooks";
import { SimpleCatalogEditor } from "./SimpleCatalogEditor";

export function AreasTab() {
  const areasQuery = useAreas();
  const upsert = useUpsertArea();

  return (
    <SimpleCatalogEditor
      items={areasQuery.data ?? []}
      isLoading={areasQuery.isLoading}
      isSaving={upsert.isPending}
      onSave={(item) => upsert.mutate(item)}
    />
  );
}
