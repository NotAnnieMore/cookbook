import FullScreenMascotLoading from "@/components/full-screen-mascot-loading";

export default function Loading() {
  return (
    <FullScreenMascotLoading
      variant="reading"
      eyebrow="A rever a receita"
      title="A abrir a edição"
      message="Estamos a carregar todos os detalhes antes de alterar."
    />
  );
}
