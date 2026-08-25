import { auth, authEnabled } from "@/auth";
import AppShell from "@/components/AppShell";
import SignIn from "@/components/SignIn";

export default async function Page() {
  if (!authEnabled) {
    return <AppShell user={null} authEnabled={false} />;
  }
  const session = await auth();
  if (!session?.user) {
    return <SignIn />;
  }
  return (
    <AppShell
      user={{ name: session.user.name ?? "", email: session.user.email ?? "" }}
      authEnabled
    />
  );
}
