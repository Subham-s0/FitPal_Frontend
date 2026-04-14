import { renderToStaticMarkup } from "react-dom/server";
import { EmptyState, InlineLoadingState, PageErrorState, PageLoadingState } from "@/shared/ui/state";

describe("shared state components", () => {
  it("renders loading states with their labels", () => {
    const pageMarkup = renderToStaticMarkup(<PageLoadingState label="Loading profile..." />);
    const inlineMarkup = renderToStaticMarkup(<InlineLoadingState label="Syncing..." />);

    expect(pageMarkup).toContain("Loading profile...");
    expect(inlineMarkup).toContain("Syncing...");
  });

  it("renders empty and error states with the provided copy", () => {
    const emptyMarkup = renderToStaticMarkup(
      <EmptyState title="Nothing here yet" description="We will show activity here later." />,
    );
    const errorMarkup = renderToStaticMarkup(
      <PageErrorState title="Load failed" message="Please refresh the page." />,
    );

    expect(emptyMarkup).toContain("Nothing here yet");
    expect(emptyMarkup).toContain("We will show activity here later.");
    expect(errorMarkup).toContain("Load failed");
    expect(errorMarkup).toContain("Please refresh the page.");
  });
});
