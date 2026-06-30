export async function POST(request: Request) {
  try {
    const { method, url, headers, body } = await request.json();

    const startTime = Date.now();

    const apiResponse = await fetch(url, {
      method,
      headers: headers || {},
      body: method === "GET" ? undefined : body,
    });

    const responseTime = Date.now() - startTime;
    const responseText = await apiResponse.text();

    return Response.json({
      status: apiResponse.status,
      statusText: apiResponse.statusText,
      responseTime,
      headers: Object.fromEntries(apiResponse.headers.entries()),
      body: responseText,
    });
  } catch {
    return Response.json(
      {
        error: "Request failed. Check the URL and try again.",
      },
      { status: 500 }
    );
  }
}