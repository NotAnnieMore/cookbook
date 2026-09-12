import FullScreenMascotLoading from "./full-screen-mascot-loading";

export default function HomeLoadingSkeleton() {
  return (
    <FullScreenMascotLoading
      variant="full"
      eyebrow="Bem-vindos à mesa"
      title="A abrir o Cookbook"
      message="Estamos a trazer as receitas e os favoritos."
    />
  );
}
