import { notFound } from "next/navigation";

// Sends unknown URLs under /en or /ar to the localized not-found page.
export default function CatchAllPage() {
  notFound();
}
