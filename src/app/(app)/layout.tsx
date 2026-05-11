import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { listWallets } from "@/lib/repo/wallets";
import WalletSidebar from "@/components/sidebar/WalletSidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  const wallets = listWallets();

  return (
    <div className="flex min-h-screen">
      <WalletSidebar wallets={wallets} />
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}
