import Providers from "../providers";

export default function MultiplayerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // This layout specifically wraps the multiplayer section of the app
  // with the client-side Providers component.
  return <Providers>{children}</Providers>;
}
