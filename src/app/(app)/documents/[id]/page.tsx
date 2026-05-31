import { requireAdmin } from "@/lib/auth";
import { DocumentViewer } from "@/components/document-viewer";

export const dynamic = "force-dynamic";

export default async function InternalDocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  return (
    <DocumentViewer documentId={id} backHref="/documents" backLabel="Documents" />
  );
}
