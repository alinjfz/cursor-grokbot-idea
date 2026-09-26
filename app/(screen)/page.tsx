import { Suspense } from "react";
import { Screen } from "./screen";

export default function Page() {
  return (
    <Suspense fallback={<main className="opening">Opening the pot</main>}>
      <Screen />
    </Suspense>
  );
}
