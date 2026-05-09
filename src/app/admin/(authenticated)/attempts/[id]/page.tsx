import { notFound } from "next/navigation";

import { AttemptDetailView } from "@/components/admin/attempt-detail";
import { getAttemptDetailAction } from "@/app/actions/admin/attempts";

export const dynamic = "force-dynamic";

export default async function AttemptDetailPage(
  props: PageProps<"/admin/attempts/[id]">
) {
  const { id } = await props.params;
  const result = await getAttemptDetailAction(id);

  if (!result.ok) {
    notFound();
  }

  return <AttemptDetailView detail={result.detail} />;
}
