import { DocumentViewer } from "@/components/document-viewer";

export const dynamic = "force-dynamic";

export default async function ProjectDocumentPage({
  params,
}: {
  params: Promise<{ id: string; docId: string }>;
}) {
  const { id, docId } = await params;
  return (
    <DocumentViewer
      documentId={docId}
      backHref={`/projects/${id}`}
      backLabel="Project"
    />
  );
}
