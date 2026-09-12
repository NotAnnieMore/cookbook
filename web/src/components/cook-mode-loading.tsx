import FullScreenMascotLoading from "./full-screen-mascot-loading";

export default function CookModeLoading({ label = "A preparar o modo cozinhar…" }: { label?: string }) {
  return (
    <FullScreenMascotLoading
      variant="cooking"
      eyebrow="Mãos à obra"
      title={label}
      message="Estamos a pôr os ingredientes e os passos no lugar."
    />
  );
}
