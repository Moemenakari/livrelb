-- The checkout loads the "Who helped you?" list on the server (secret key),
-- so staff names are not exposed through the public API.
revoke execute on function public.list_helpers() from anon, authenticated;
