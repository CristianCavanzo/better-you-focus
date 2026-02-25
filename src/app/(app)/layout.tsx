import { AppShell } from "@/src/components/shell/AppShell";
import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/nextjs";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SignedIn>
        <AppShell>{children}</AppShell>
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
}
