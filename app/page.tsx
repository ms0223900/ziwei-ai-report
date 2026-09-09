import { BirthForm } from "../components/birth-form/BirthForm";

export default function HomePage() {
  return (
    <main className="flex min-h-screen justify-center bg-paper px-5 py-10 md:px-6 md:py-14">
      <BirthForm />
    </main>
  );
}
