import { WhitelistManager } from "@/components/admin/whitelist-manager";
import { listWhitelistAction } from "@/app/actions/admin/whitelist";

export const dynamic = "force-dynamic";

export default async function AdminWhitelistPage() {
  const { entries } = await listWhitelistAction();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Whitelist
        </h1>
        <p className="text-sm text-muted-foreground">
          Gestiona los emails autorizados para hacer el examen.
        </p>
      </div>
      <WhitelistManager initialEntries={entries} />
    </div>
  );
}
