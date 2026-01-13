import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    //console.log("Header Authorization reçu :", authHeader ? "Présent" : "Absent");

    const response = await fetch("http://localhost:3001/tickets", {
      cache: "no-store",
      headers: authHeader ? { Authorization: authHeader } : {},
    });

    //console.log("Réponse backend :", response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      //console.log("Erreur backend :", errorText);
      return NextResponse.json({ error: "Erreur backend", details: errorText }, { status: 500 });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (err) {
    //console.error("Erreur proxy tickets", err);
    return NextResponse.json({ error: "Erreur réseau" }, { status: 500 });
  }
}