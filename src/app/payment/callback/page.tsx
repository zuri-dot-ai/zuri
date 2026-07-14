import { redirect } from "next/navigation";

/**
 * Flutterwave redirects here after checkout.
 * Forwards query params to the server verification route.
 */
export default async function PaymentCallbackPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const qs = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") {
      qs.set(key, value);
    } else if (Array.isArray(value) && value[0]) {
      qs.set(key, value[0]);
    }
  }

  redirect(`/api/payments/verify?${qs.toString()}`);
}
