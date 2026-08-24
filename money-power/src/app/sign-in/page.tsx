import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth";
import { SignInForm } from "./SignInForm";

export const dynamic = "force-dynamic";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await getSessionUserId()) redirect("/");
  const { error } = await searchParams;

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col justify-center bg-charcoal px-8 py-16 text-white sm:px-14">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gold text-xl font-bold text-charcoal">
          M
        </span>
        <h1 className="mt-8 text-3xl font-semibold text-white sm:text-4xl">Money Power</h1>
        <p className="mt-4 max-w-md text-lg text-white/80">
          See where it went, protect the next paycheck, and cut waste without guilt.
        </p>
        <p className="mt-8 max-w-md text-sm text-white/60">
          Protect savings and essential bills first. Money Power then exposes the flexible spending
          that can actually be cut—without turning every purchase into a moral failure.
        </p>
      </div>

      <div className="flex items-center justify-center px-6 py-16">
        <SignInForm initialError={error} />
      </div>
    </div>
  );
}
