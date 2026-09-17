import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    const client = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await client.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const url = new URL(req.url);
    const path = url.pathname.replace("/functions/v1/telemetry-api", "");

    // GET /stats — aggregate dashboard stats
    if (req.method === "GET" && path === "/stats") {
      const adminClient = createClient(supabaseUrl, serviceRoleKey!);

      const [eventsRes, vectorsRes, metricsRes] = await Promise.all([
        adminClient.from("telemetry_events").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100),
        adminClient.from("stylometry_vectors").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50),
        adminClient.from("system_metrics").select("*").eq("user_id", user.id).order("recorded_at", { ascending: false }).limit(50),
      ]);

      const events = eventsRes.data ?? [];
      const errorCount = events.filter((e: { severity: string }) => e.severity === "error" || e.severity === "critical").length;
      const warningCount = events.filter((e: { severity: string }) => e.severity === "warning").length;

      return new Response(
        JSON.stringify({
          total_events: events.length,
          error_count: errorCount,
          warning_count: warningCount,
          vectors: vectorsRes.data?.length ?? 0,
          nodes: metricsRes.data?.length ?? 0,
          e_abs: 10.0,
          protocol: "RW-IDP v1.0",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // POST /events — ingest a telemetry event
    if (req.method === "POST" && path === "/events") {
      const body = await req.json();
      const { source, event_type, severity, message, payload } = body;

      if (!source || !event_type || !message) {
        return new Response(
          JSON.stringify({ error: "Missing required fields: source, event_type, message" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const validSeverities = ["info", "warning", "error", "critical"];
      const finalSeverity = validSeverities.includes(severity) ? severity : "info";

      const { data, error } = await client.from("telemetry_events").insert({
        source,
        event_type,
        severity: finalSeverity,
        message,
        payload: payload ?? {},
      }).select().single();

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ event: data }),
        { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // GET /health — system health check
    if (req.method === "GET" && path === "/health") {
      return new Response(
        JSON.stringify({
          status: "operational",
          e_abs: 10.0,
          protocol: "RW-IDP v1.0",
          timestamp: new Date().toISOString(),
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Not found" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
