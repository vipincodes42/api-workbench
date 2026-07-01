export async function POST(request: Request) {
  try {
    const { method, url, headers, body } = await request.json();

    if (!url || typeof url !== "string") {
      return Response.json(
        { error: "Enter a URL before sending the request." },
        { status: 400 },
      );
    }

    try {
      new URL(url);
    } catch {
      return Response.json(
        { error: "Invalid URL. Include http:// or https://." },
        { status: 400 },
      );
    }

    const startTime = Date.now();

    const apiResponse = await fetch(url, {
      method,
      headers: headers || {},
      body: method === "GET" || !body ? undefined : body,
    });

    const responseTime = Date.now() - startTime;
    const responseText = await apiResponse.text();
    const responseSize = new TextEncoder().encode(responseText).length;

    return Response.json({
      status: apiResponse.status,
      statusText: apiResponse.statusText,
      responseTime,
      responseSize,
      headers: Object.fromEntries(apiResponse.headers.entries()),
      body: responseText,
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof TypeError
            ? "Network failure. Check the URL and try again."
            : "Request failed. Check the request and try again.",
      },
      { status: 500 }
    );
  }
}
