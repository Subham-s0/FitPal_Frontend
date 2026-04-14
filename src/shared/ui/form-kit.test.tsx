import { renderToStaticMarkup } from "react-dom/server";
import { Field, FieldError, Pill, SectionLabel, TextInput } from "@/shared/ui/form-kit";

describe("form-kit", () => {
  it("renders field labels, errors, and text inputs consistently", () => {
    const markup = renderToStaticMarkup(
      <Field label="Email" error="Required">
        <TextInput type="email" placeholder="you@example.com" />
      </Field>,
    );

    expect(markup).toContain("Email");
    expect(markup).toContain("Required");
    expect(markup).toContain("you@example.com");
  });

  it("renders shared pills and section labels", () => {
    const markup = renderToStaticMarkup(
      <div>
        <SectionLabel>Payment Method</SectionLabel>
        <Pill label="Yearly" selected onClick={() => undefined} />
        <FieldError message="Invalid phone" />
      </div>,
    );

    expect(markup).toContain("Payment Method");
    expect(markup).toContain("Yearly");
    expect(markup).toContain("Invalid phone");
  });
});
