import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PUBLIC_ROUTES = ["/login"];

export async function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  let cookiesToForward: {
    name: string;
    value: string;
    options?: Parameters<NextResponse["cookies"]["set"]>[2];
  }[] = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToForward = cookiesToSet;
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
        },
      },
    }
  );

  // getUser() valida o token com o servidor Supabase (não confia só no cookie).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublicRoute = PUBLIC_ROUTES.some((route) => path.startsWith(route));

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  if (user && path === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Não repassar o id do usuário por header: o matcher abaixo pula alguns
  // caminhos, e neles um header forjado pelo cliente chegaria intacto às
  // páginas/actions. O dal.ts valida a sessão por conta própria.
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  for (const { name, value, options } of cookiesToForward) {
    response.cookies.set(name, value, options);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
