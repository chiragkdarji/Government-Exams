import IplHeader from "@/components/ipl/IplHeader";
import IplFooter from "@/components/ipl/IplFooter";

export default function IplSectionLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <IplHeader />
      <main>{children}</main>
      <IplFooter />
    </>
  );
}
