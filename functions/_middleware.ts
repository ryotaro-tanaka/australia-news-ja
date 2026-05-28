export const onRequest: PagesFunction = async (context) => {
  const url = new URL(context.request.url);
  if (url.pathname === '/id' || url.pathname.startsWith('/id/')) {
    return new Response('Not Found', { status: 404 });
  }
  return context.next();
};
