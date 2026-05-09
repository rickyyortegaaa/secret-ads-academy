import { AdminsManager } from "@/components/admin/admins-manager";
import { listAdminsAction } from "@/app/actions/admin/team";

export const dynamic = "force-dynamic";

export default async function AdminAdminsPage() {
  const data = await listAdminsAction();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Equipo de admins
        </h1>
        <p className="text-sm text-muted-foreground">
          Gestiona quién tiene acceso al panel de administración. Los nuevos
          admins reciben un email branded con un enlace para elegir su
          contraseña.
        </p>
      </div>
      <AdminsManager
        currentEmail={data.currentEmail}
        rootEmail={data.rootEmail}
        initialAdmins={data.admins}
        initialInvitations={data.invitations}
      />
    </div>
  );
}
