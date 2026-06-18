import ImageKit from "imagekit";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    if (
      !process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT ||
      !process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY ||
      !process.env.IMAGEKIT_PRIVATE_KEY
    ) {
      return NextResponse.json(
        { error: "ImageKit credentials missing in .env.local" },
        { status: 500 }
      );
    }

    const imagekit = new ImageKit({
      urlEndpoint: process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT,
      publicKey: process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY,
      privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
    });

    const authenticationParameters = imagekit.getAuthenticationParameters();
    return NextResponse.json(authenticationParameters);
  } catch (error) {
    console.error("ImageKit auth error:", error);
    return NextResponse.json(
      { error: "Failed to generate ImageKit signature" },
      { status: 500 }
    );
  }
}
