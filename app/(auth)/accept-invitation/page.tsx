import { AcceptInvitationClient } from "./AcceptInvitationClient";

export default async function AcceptInvitationPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  return <AcceptInvitationClient invitationId={id ?? null} />;
}
