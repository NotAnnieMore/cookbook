import type { CookbookMascotVariant } from "./cookbook-mascot";
import FullScreenMascotLoading from "./full-screen-mascot-loading";

export default function ImportPageLoading({ variant, title, message }: { variant: CookbookMascotVariant; title: string; message: string }) {
  return (
    <FullScreenMascotLoading
      variant={variant}
      eyebrow="A organizar tudo"
      title={title}
      message={message}
    />
  );
}
