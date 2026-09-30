-- The storefront reads these numbers on the server (secret key) only.
revoke execute on function public.storefront_stats() from anon, authenticated;
