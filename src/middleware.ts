import { NextRequest, NextResponse } from "next/server";
import { getErrorResponse } from "./helpers/errorResponse";
import { verifyJWT } from "./helpers/token";

interface AuthenticatedRequest extends NextRequest {
  user: { is_admin: boolean };
}

let redirectToLogin = false;

export async function middleware(req: NextRequest) {
  const token = req.cookies.get("access_token")?.value;
  const path = req.nextUrl.pathname;

  if (!token) {
    if (path.startsWith("/login") || path.startsWith("/register")) {
      return NextResponse.next();
    }
    if (
      path.startsWith("/api/v1/admin") ||
      path.startsWith("/api/v1/auth/logout")
    ) {
      return getErrorResponse(401, "You are not logged in");
    }
    if (path.startsWith("/dashboard")) {
      const response = NextResponse.redirect(new URL("/", req.url));
      response.cookies.set("toastMessage", "Invalid credentials!", {
        path: "/",
        maxAge: 60,
      });
      response.cookies.set("toastType", "error", { path: "/", maxAge: 60 }); // Set toast type (e.g., success, error)
      return response;
    }
    if (path.startsWith("/admin")) {
      const response = NextResponse.redirect(new URL("/", req.url));
      response.cookies.set(
        "toastMessage",
        "You are unauthorised to view this page!",
        { path: "/", maxAge: 60 }
      );
      response.cookies.set("toastType", "error", { path: "/", maxAge: 60 }); // Set toast type (e.g., success, error)
      return response;
    }
  }
  const response = NextResponse.next();

  try {
    if (token) {
      const decodedToken = await verifyJWT<{
        account_no: number;
        is_admin: boolean;
      }>(token);
      console.log(token);
      const { is_admin }: any = decodedToken;
      //   response.headers.set('X-USER-ID', is_admin);
      //   (req as AuthenticatedRequest).user = decodedToken;
      if (!decodedToken.is_admin && path.startsWith("/admin")) {
        // TODO redirect to unauthorised page
        const response = NextResponse.redirect(new URL("/", req.url));
        response.cookies.set(
          "toastMessage",
          "You are unauthorised to view this page!",
          { path: "/", maxAge: 60 }
        );
        // return NextResponse.redirect(
        //   new URL(
        //     `/login?${new URLSearchParams({
        //       message: "Invalid admin credentials",
        //     })}`,
        //     req.url
        //   )
        // );
      }
      if (!decodedToken.is_admin && path.startsWith("/api/v1/admin")) {
        return getErrorResponse(403, "You are not authorised for this action");
      }
      // if (decodedToken.is_admin && path.startsWith('/login')) {
      //   return NextResponse.redirect(new URL('/admin/users', req.url));
      // }
      // if (!decodedToken.is_admin && path.startsWith('/login')) {
      //   return NextResponse.redirect(new URL('/admin/users', req.url));
      // }
    }
  } catch (error) {
    console.log(error);

    redirectToLogin = true;
    if (req.nextUrl.pathname.startsWith("api")) {
      return getErrorResponse(401, "Token is invalid or user does not exists");
    }
    const response = NextResponse.redirect(
      new URL(
        `/login?${new URLSearchParams({ message: "Invalid credentials" })}`,
        req.url
      )
    );
    response.cookies.set({
      name: "access_token",
      value: "",
      httpOnly: true,
      path: "/",
      maxAge: -1,
    });
    return response;
  }
  // const authUser = (req as AuthenticatedRequest).user;

  // if (
  //   req.nextUrl.pathname.startsWith("/login") ||
  //   (req.nextUrl.pathname.startsWith("/register") && authUser)
  // ) {
  //   return NextResponse.redirect(
  //     new URL(
  //       `/?${new URLSearchParams({ message: "You are already logged in" })}`,
  //       req.url
  //     )
  //   );
  // }
  return response;
}

export const config = {
  matcher: [
    "/login",
    "/register",
    "/dashboard",
    "/dashboard/:path*",
    "/admin",
    "/admin/:path*",
    "/api/v1/admin/:path*",
    "/api/v1/auth/logout",
    "/api/v1/admin",
  ],
};
